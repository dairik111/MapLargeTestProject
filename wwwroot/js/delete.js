"use strict";
// ---- File delete ----
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
//# sourceMappingURL=delete.js.map