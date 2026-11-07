// Search. Plain script (not a module): shares globals with app.ts, so load it after js/app.js in index.html.

interface SearchResult {
    query: string;
    truncated: boolean;
    entries: FileEntry[];
}

async function search(query: string): Promise<void> {
    const seq = ++requestSeq;
    try {
        setStatus("Searching…", false, true);
        const data = await api<SearchResult>("/api/search/search?query=" + encodeURIComponent(query) + "&path=" + encodeURIComponent(currentPath));
        if (seq !== requestSeq) return;
        renderRows(data.entries, true, null);
        // Report "Not Found" (in red, like other failures) when nothing matched; otherwise clear the "Searching…" message.
        setStatus(data.entries.length === 0 ? `Not Found: "${query}"` : "", data.entries.length === 0);
    } catch (err) {
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
