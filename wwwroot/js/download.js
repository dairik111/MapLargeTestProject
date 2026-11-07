"use strict";
// File selection and download. Plain script (not a module): shares globals with app.ts, so load it after js/app.js in index.html.
// renderRows() in app.ts calls makeSelectable(), updateDownloadUi() and the selected set defined here.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Paths (home-relative) of the files currently selected for download. Cleared whenever the rows are rebuilt.
const selected = new Set();
function makeSelectable(e, tr) {
    const span = document.createElement("span");
    span.className = "fileName";
    span.tabIndex = 0;
    span.setAttribute("role", "button");
    span.setAttribute("aria-pressed", "false");
    span.textContent = "📄 " + e.name;
    const toggle = () => {
        const on = !selected.has(e.path);
        if (on)
            selected.add(e.path);
        else
            selected.delete(e.path);
        tr.classList.toggle("selected", on);
        span.setAttribute("aria-pressed", String(on));
        updateDownloadUi();
    };
    span.onclick = toggle;
    span.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggle();
        }
    };
    return span;
}
function updateDownloadUi() {
    const n = selected.size;
    const btn = $("downloadBtn");
    btn.disabled = n === 0;
    btn.textContent = n > 1 ? `Download ${n} files (.zip)` : "Download";
    $("deleteBtn").disabled = n === 0;
    $("clearSelection").disabled = n === 0;
}
function clearSelection() {
    var _a;
    selected.clear();
    for (const tr of Array.from($("rows").querySelectorAll("tr.selected"))) {
        tr.classList.remove("selected");
        (_a = tr.querySelector(".fileName")) === null || _a === void 0 ? void 0 : _a.setAttribute("aria-pressed", "false");
    }
    updateDownloadUi();
}
// ---- File download ----
// Shared status line for the Download and Delete buttons.
// autoClear is false for in-progress messages so they aren't cleared while a long operation is still running.
function setDownloadOrDeleteStatus(msg, isError = false, autoClear = true) {
    setTimedStatus("downloadOrDeleteStatus", msg, isError, autoClear);
}
// Uses the server's Content-Disposition filename (filename*= is RFC 5987 encoded), falling back to the given name.
function filenameFrom(res, fallback) {
    var _a;
    const cd = (_a = res.headers.get("Content-Disposition")) !== null && _a !== void 0 ? _a : "";
    const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (star) {
        try {
            return decodeURIComponent(star[1]);
        }
        catch (_b) { /* fall through */ }
    }
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    return plain ? plain[1] : fallback;
}
function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function downloadSelected() {
    return __awaiter(this, void 0, void 0, function* () {
        const paths = Array.from(selected);
        if (paths.length === 0)
            return;
        let url;
        let fallback;
        if (paths.length === 1) {
            url = "/api/file/download?path=" + encodeURIComponent(paths[0]);
            fallback = paths[0].slice(paths[0].lastIndexOf("/") + 1);
        }
        else {
            const qs = new URLSearchParams();
            for (const p of paths)
                qs.append("files", p);
            url = "/api/file/download-multi?" + qs.toString();
            fallback = "Downloads.zip";
        }
        $("downloadBtn").disabled = true;
        $("deleteBtn").disabled = true;
        try {
            setDownloadOrDeleteStatus("Downloading…", false, false);
            const res = yield fetch(url);
            if (!res.ok)
                throw new Error((yield res.text()) || res.statusText);
            saveBlob(yield res.blob(), filenameFrom(res, fallback));
            setDownloadOrDeleteStatus(paths.length === 1 ? "Downloaded 1 file" : `Downloaded ${paths.length} files`);
            clearSelection(); // Only after success; on failure the selection stays so the user can retry
        }
        catch (err) {
            setDownloadOrDeleteStatus(errorMessage(err), true);
        }
        finally {
            updateDownloadUi(); // Re-enables Download and Delete if anything is still selected
        }
    });
}
$("downloadBtn").onclick = () => { void downloadSelected(); };
$("clearSelection").onclick = clearSelection;
// ---- END of File download ----
// ---- File delete ----
// Sends the selected paths to DELETE /api/file?files=...&files=... and reports the count the server returns.
function deleteSelected() {
    return __awaiter(this, void 0, void 0, function* () {
        const paths = Array.from(selected);
        if (paths.length === 0)
            return;
        // Deleting can't be undone, so confirm first.
        const what = paths.length === 1 ? `"${paths[0].slice(paths[0].lastIndexOf("/") + 1)}"` : `${paths.length} files`;
        if (!confirm(`Delete ${what}? This cannot be undone.`))
            return;
        const qs = new URLSearchParams();
        for (const p of paths)
            qs.append("files", p);
        $("downloadBtn").disabled = true;
        $("deleteBtn").disabled = true;
        try {
            setDownloadOrDeleteStatus("Deleting…", false, false);
            const res = yield fetch("/api/file?" + qs.toString(), { method: "DELETE" });
            if (!res.ok)
                throw new Error((yield res.text()) || res.statusText);
            const deleted = yield res.json(); // The controller returns the number of files deleted
            setDownloadOrDeleteStatus(`Deleted ${deleted} file${deleted === 1 ? "" : "s"}`);
            // Clear the stale selection now, then refresh the table so the deleted files disappear.
            // Keep the user in search results if they were searching.
            clearSelection();
            const query = $("query").value.trim();
            void (query ? search(query) : load(currentPath));
        }
        catch (err) {
            setDownloadOrDeleteStatus(errorMessage(err), true);
        }
        finally {
            updateDownloadUi();
        }
    });
}
$("deleteBtn").onclick = () => { void deleteSelected(); };
// ---- END of File delete ----
//# sourceMappingURL=download.js.map