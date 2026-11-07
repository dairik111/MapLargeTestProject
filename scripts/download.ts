// File selection and download. Plain script (not a module): shares globals with app.ts, so load it after js/app.js in index.html.
// renderRows() in app.ts calls makeSelectable(), updateDownloadUi() and the selected set defined here.

// Paths (home-relative) of the files currently selected for download. Cleared whenever the rows are rebuilt.
const selected = new Set<string>();

function makeSelectable(e: FileEntry, tr: HTMLTableRowElement): HTMLSpanElement {
    const span = document.createElement("span");
    span.className = "fileName";
    span.tabIndex = 0;
    span.setAttribute("role", "button");
    span.setAttribute("aria-pressed", "false");
    span.textContent = "📄 " + e.name;

    const toggle = (): void => {
        const on = !selected.has(e.path);
        if (on) selected.add(e.path); else selected.delete(e.path);
        tr.classList.toggle("selected", on);
        span.setAttribute("aria-pressed", String(on));
        updateDownloadUi();
    };
    span.onclick = toggle;
    span.onkeydown = (ev: KeyboardEvent): void => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(); }
    };
    return span;
}

function updateDownloadUi(): void {
    const n = selected.size;
    const btn = $<HTMLButtonElement>("downloadBtn");
    btn.disabled = n === 0;
    btn.textContent = n > 1 ? `Download ${n} files (.zip)` : "Download";
    $<HTMLButtonElement>("deleteBtn").disabled = n === 0;
    $<HTMLButtonElement>("clearSelection").disabled = n === 0;
}

function clearSelection(): void {
    selected.clear();
    for (const tr of Array.from($("rows").querySelectorAll("tr.selected"))) {
        tr.classList.remove("selected");
        tr.querySelector(".fileName")?.setAttribute("aria-pressed", "false");
    }
    updateDownloadUi();
}

// ---- File download ----

// Shared status line for the Download and Delete buttons.
// autoClear is false for in-progress messages so they aren't cleared while a long operation is still running.
function setDownloadOrDeleteStatus(msg: string, isError: boolean = false, autoClear: boolean = true): void {
    setTimedStatus("downloadOrDeleteStatus", msg, isError, autoClear);
}

// Uses the server's Content-Disposition filename (filename*= is RFC 5987 encoded), falling back to the given name.
function filenameFrom(res: Response, fallback: string): string {
    const cd = res.headers.get("Content-Disposition") ?? "";
    const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (star) { try { return decodeURIComponent(star[1]); } catch { /* fall through */ } }
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    return plain ? plain[1] : fallback;
}

function saveBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function downloadSelected(): Promise<void> {
    const paths = Array.from(selected);
    if (paths.length === 0) return;

    let url: string;
    let fallback: string;
    if (paths.length === 1) {
        url = "/api/file/download?path=" + encodeURIComponent(paths[0]);
        fallback = paths[0].slice(paths[0].lastIndexOf("/") + 1);
    } else {
        const qs = new URLSearchParams();
        for (const p of paths) qs.append("files", p);
        url = "/api/file/download-multi?" + qs.toString();
        fallback = "Downloads.zip";
    }

    $<HTMLButtonElement>("downloadBtn").disabled = true;
    $<HTMLButtonElement>("deleteBtn").disabled = true;
    try {
        setDownloadOrDeleteStatus("Downloading…", false, false);
        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.text()) || res.statusText);
        saveBlob(await res.blob(), filenameFrom(res, fallback));
        setDownloadOrDeleteStatus(paths.length === 1 ? "Downloaded 1 file" : `Downloaded ${paths.length} files`);
        clearSelection();   // Only after success; on failure the selection stays so the user can retry
    } catch (err) {
        setDownloadOrDeleteStatus(errorMessage(err), true);
    } finally {
        updateDownloadUi();   // Re-enables Download and Delete if anything is still selected
    }
}

$("downloadBtn").onclick = (): void => { void downloadSelected(); };
$("clearSelection").onclick = clearSelection;

// ---- END of File download ----

// ---- File delete ----

// Sends the selected paths to DELETE /api/file?files=...&files=... and reports the count the server returns.
async function deleteSelected(): Promise<void> {
    const paths = Array.from(selected);
    if (paths.length === 0) return;

    // Deleting can't be undone, so confirm first.
    const what = paths.length === 1 ? `"${paths[0].slice(paths[0].lastIndexOf("/") + 1)}"` : `${paths.length} files`;
    if (!confirm(`Delete ${what}? This cannot be undone.`)) return;

    const qs = new URLSearchParams();
    for (const p of paths) qs.append("files", p);

    $<HTMLButtonElement>("downloadBtn").disabled = true;
    $<HTMLButtonElement>("deleteBtn").disabled = true;
    try {
        setDownloadOrDeleteStatus("Deleting…", false, false);
        const res = await fetch("/api/file?" + qs.toString(), { method: "DELETE" });
        if (!res.ok) throw new Error((await res.text()) || res.statusText);

        const deleted = await res.json() as number;   // The controller returns the number of files deleted
        setDownloadOrDeleteStatus(`Deleted ${deleted} file${deleted === 1 ? "" : "s"}`);

        // Clear the stale selection now, then refresh the table so the deleted files disappear.
        // Keep the user in search results if they were searching.
        clearSelection();
        const query = $<HTMLInputElement>("query").value.trim();
        void (query ? search(query) : load(currentPath));
    } catch (err) {
        setDownloadOrDeleteStatus(errorMessage(err), true);
    } finally {
        updateDownloadUi();
    }
}

$("deleteBtn").onclick = (): void => { void deleteSelected(); };

// ---- END of File delete ----
