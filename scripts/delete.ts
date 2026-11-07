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
