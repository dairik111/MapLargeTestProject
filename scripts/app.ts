interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number | null;
    modified: string;
}

interface DirectoryListing {
    path: string;
    parent: string | null;
    homePath: string;
    entries: FileEntry[];
}

interface SearchResult {
    query: string;
    truncated: boolean;
    entries: FileEntry[];
}

let currentPath: string = "";

// Incremented by every request that updates the view; a response is ignored if a newer request has started.
let requestSeq: number = 0;

function $<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el as T;
}

// ---- Auto-clearing status messages (StatusTimeout in appsettings.json, in seconds) ----
// Declared up here because setStatus runs during the initial load, before the rest of the file executes.

let statusTimeoutMs: number = 0;   // 0 = never clear
const statusTimers = new Map<string, number>();

// Sets the message on a status element and (re)starts its clear timer.
// An empty message just cancels any pending timer.
function setTimedStatus(id: string, msg: string, isError: boolean, autoClear: boolean): void {
    const el = $(id);
    const existing = statusTimers.get(id);
    if (existing !== undefined) { clearTimeout(existing); statusTimers.delete(id); }

    el.textContent = msg;
    // Red for errors; green for completed results; neutral for in-progress messages (autoClear=false) and empty text.
    el.className = !msg ? "" : isError ? "error" : autoClear ? "success" : "";

    if (autoClear && msg && statusTimeoutMs > 0) {
        statusTimers.set(id, window.setTimeout(() => {
            el.textContent = "";
            el.className = "";
            statusTimers.delete(id);
        }, statusTimeoutMs));
    }
}

// autoClear is false for in-progress messages ("Loading…") so they aren't blanked mid-request.
function setStatus(msg: string, isError: boolean = false, autoClear: boolean = true): void {
    setTimedStatus("status", msg, isError, autoClear);
}

function setUploadMessage(msg: string): void {
    setTimedStatus("uploadMessage", msg, false, true);
}

// Fetched once at startup; if it fails, messages simply stay until replaced.
api<{ seconds: number }>("/api/settings/statustimeout")
    .then(r => { statusTimeoutMs = Math.max(0, r.seconds) * 1000; })
    .catch(() => { statusTimeoutMs = 0; });

// Post/Put/Patch items to server with a body
async function send<T>(url: string, content: string): Promise<T> {
    const response = await fetch(url, {
        method: 'POST', // or 'PUT', 'PATCH'
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(content) // Convert the JS object to a JSON string
    });

    if (!response.ok) throw new Error((await response.text()) || response.statusText);
    return response.json() as Promise<T>;
}

// Get items from the server
async function api<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    return res.json() as Promise<T>;
}

// Format the output
function fmtSize(n: number | null): string {
    if (n == null) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(1) : String(n)) + " " + units[i];
}

function makeLink(text: string, onClick: () => void): HTMLAnchorElement {
    const a = document.createElement("a");
    a.textContent = text;
    a.onclick = onClick;
    return a;
}

function renderCrumbs(path: string): void {
    const c = $("crumbs");
    c.replaceChildren();
    const add = (label: string, p: string): void => {
        c.append(makeLink(label, () => load(p)));
    };
    add("Home", "");
    let acc = "";
    for (const part of path.split("/").filter(Boolean)) {
        acc = acc ? acc + "/" + part : part;
        c.append(" / ");
        add(part, acc);
    }
}

function parentOf(p: string): string {
    const i = p.lastIndexOf("/");
    return i < 0 ? "" : p.slice(0, i);
}

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

function renderRows(entries: FileEntry[], showLocation: boolean, parent: string | null): void {
    const body = $<HTMLTableSectionElement>("rows");
    body.replaceChildren();
    selected.clear();
    updateDownloadUi();
    if (parent != null) {
        const tr = body.insertRow();
        tr.insertCell().append(makeLink("📁 ..", () => load(parent)));
        tr.insertCell(); tr.insertCell(); tr.insertCell();
    }
    for (const e of entries) {
        const tr = body.insertRow();
        const cell = tr.insertCell();
        if (e.isDirectory) {
            cell.append(makeLink("📁 " + e.name, () => { $<HTMLInputElement>("query").value = ""; load(e.path); }));
        } else {
            cell.append(makeSelectable(e, tr));
        }
        tr.insertCell().textContent = showLocation ? "/" + parentOf(e.path) : "";
        const size = tr.insertCell(); size.className = "num"; size.textContent = fmtSize(e.size);
        const mod = tr.insertCell(); mod.className = "num"; mod.textContent = new Date(e.modified).toLocaleString();
    }
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function showHomePath(homePath: string): void {
    $<HTMLSpanElement>("currentHome").textContent = homePath;
}

function urlFor(path: string): string {
    return path ? "?path=" + encodeURIComponent(path) : location.pathname;
}

// Pushes history only after a successful fetch, using the server's normalized data.path.
async function load(path: string, push: boolean = true): Promise<void> {
    const seq = ++requestSeq;
    try {
        setStatus("Loading…", false, false);
        const data = await api<DirectoryListing>("/api/search?path=" + encodeURIComponent(path));
        if (seq !== requestSeq) return;

        const previous = currentPath;
        currentPath = data.path;
        showHomePath(data.homePath);

        renderCrumbs(currentPath);
        renderRows(data.entries, false, data.parent);
        setStatus(data.entries.length + " item(s)");

        if (push && data.path !== previous)
            history.pushState({ path: currentPath }, "", urlFor(currentPath));

    } catch (err) {
        if (seq !== requestSeq) return;
        // The URL already points at this path (initial load or Back/Forward), so make the page match it:
        // show the requested location in the breadcrumbs, empty the table, and report the error.
        if (!push) {
            currentPath = path;
            renderCrumbs(path);
            renderRows([], false, null);
        }
        setStatus(errorMessage(err), true);
    }
}

async function search(query: string): Promise<void> {
    const seq = ++requestSeq;
    try {
        setStatus("Searching…", false, false);
        const data = await api<SearchResult>("/api/search/search?query=" + encodeURIComponent(query) + "&path=" + encodeURIComponent(currentPath));
        if (seq !== requestSeq) return;
        renderRows(data.entries, true, null);
        setStatus(data.entries.length + " result(s)" + (data.truncated ? " (truncated)" : "") + ` for "${query}"`);
    } catch (err) {
        if (seq !== requestSeq) return;
        setStatus(errorMessage(err), true);
    }
}

async function setNewHome(path: string): Promise<void> {
    const seq = ++requestSeq;
    try {
        setStatus("Setting new Home...", false, false);
        // The server redirects to the directory listing of the new home, which fetch follows.
        const data = await send<DirectoryListing>("/api/settings/sethome", path);
        if (seq !== requestSeq) return;
        currentPath = data.path;

        $<HTMLInputElement>("query").value = "";
        $<HTMLInputElement>("rootPath").value = ""; //Clear out the path after is has been set
        showHomePath(data.homePath);

        renderCrumbs(currentPath);
        renderRows(data.entries, false, data.parent);
        history.replaceState({ path: currentPath }, "", urlFor(currentPath));
        setStatus(data.entries.length + " item(s) in new home");
        
    }
    catch (err) {
        if (seq !== requestSeq) return;
        setStatus(errorMessage(err), true);
    }
}

$<HTMLFormElement>("searchForm").onsubmit = (e: SubmitEvent): void => {
    e.preventDefault();
    const query = $<HTMLInputElement>("query").value.trim();
    if (query)
        search(query);
    else
        load(currentPath);
};
$("clear").onclick = (): void => { $<HTMLInputElement>("query").value = ""; load(currentPath); };

$<HTMLFormElement>("settingsForm").onsubmit = (e: SubmitEvent): void => {
    e.preventDefault();
    const path = $<HTMLInputElement>("rootPath").value.trim();
    if (path)
        setNewHome(path);
    else
        load(currentPath);
};

window.onpopstate = (): void => {
    load(new URLSearchParams(location.search).get("path") ?? "", false);
};

// Initial load should not push to history, otherwise you get duplicate entries
load(new URLSearchParams(location.search).get("path") ?? "", false);

// ---- File upload dialog - Claude generated ----

interface UploadResult {
    count: number;
    uploadSize: number;
}

function setUploadStatus(msg: string, isError: boolean = false): void {
    setTimedStatus("uploadstatus", msg, isError, true);
}

function renderUploadList(files: FileList | null): void {
    const list = $("uploadList");
    list.replaceChildren();
    for (const f of Array.from(files ?? [])) {
        const li = document.createElement("li");
        li.textContent = `${f.name} (${fmtSize(f.size)})`;
        list.append(li);
    }
    $<HTMLButtonElement>("uploadSubmit").disabled = !files || files.length === 0;
}

async function uploadFiles(files: FileList): Promise<void> {
    const form = new FormData();
    for (const f of Array.from(files))
        form.append("files", f, f.name);   // "files" matches the controller's parameter name

    // No Content-Type header: the browser sets the multipart boundary itself.
    const res = await fetch("/api/file/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);

    const result = await res.json() as UploadResult;
    setUploadStatus(`Uploaded ${result.count} file(s), ${fmtSize(result.uploadSize)}`, false);
}

const uploadDialog = $<HTMLDialogElement>("uploadDialog");
const uploadInput = $<HTMLInputElement>("uploadFiles");

$("uploadBtn").onclick = (): void => {
    $<HTMLFormElement>("uploadForm").reset();
    renderUploadList(null);
    setUploadMessage("");
    uploadDialog.showModal();
};

$("uploadCancel").onclick = (): void => uploadDialog.close();

uploadInput.onchange = (): void => renderUploadList(uploadInput.files);

$<HTMLFormElement>("uploadForm").onsubmit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();
    if (!uploadInput.files || uploadInput.files.length === 0) return;

    const submit = $<HTMLButtonElement>("uploadSubmit");
    submit.disabled = true;
    setUploadMessage("");
    try {
        await uploadFiles(uploadInput.files);        
        uploadDialog.close();
    } catch (err) {
        setUploadMessage(errorMessage(err));
        submit.disabled = false;
    }
};

// ---- END of File upload ----

// ---- File download ----

// autoClear is false for the in-progress message so it isn't cleared while a long download is still running.
function setDownloadStatus(msg: string, isError: boolean = false, autoClear: boolean = true): void {
    setTimedStatus("downloadstatus", msg, isError, autoClear);
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

    const btn = $<HTMLButtonElement>("downloadBtn");
    btn.disabled = true;
    try {
        setDownloadStatus("Downloading…", false, false);
        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.text()) || res.statusText);
        saveBlob(await res.blob(), filenameFrom(res, fallback));
        setDownloadStatus(paths.length === 1 ? "Downloaded 1 file" : `Downloaded ${paths.length} files`);
        clearSelection();   // Only after success; on failure the selection stays so the user can retry
    } catch (err) {
        setDownloadStatus(errorMessage(err), true);
    } finally {
        btn.disabled = selected.size === 0;
    }
}

$("downloadBtn").onclick = (): void => { void downloadSelected(); };
$("clearSelection").onclick = clearSelection;

// ---- END of File download ----
