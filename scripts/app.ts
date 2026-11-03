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
    entries: FileEntry[];
}

interface SearchResult {
    query: string;
    truncated: boolean;
    entries: FileEntry[];
}

let currentPath: string = "";

function $<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el as T;
}

function setStatus(msg: string, isError: boolean = false): void {
    $("status").textContent = msg;
    $("status").className = isError ? "error" : "";
}

async function send<T>(url: string, content: string): Promise<T> {
    const response = await fetch(url, {
        method: 'POST', // or 'PUT', 'PATCH'
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(content) // Convert the JS object to a JSON string
    });

    return response.json() as Promise<T>;
}

async function api<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    return res.json() as Promise<T>;
}

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

function renderRows(entries: FileEntry[], showLocation: boolean, parent: string | null): void {
    const body = $<HTMLTableSectionElement>("rows");
    body.replaceChildren();
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
            cell.textContent = "📄 " + e.name;
        }
        tr.insertCell().textContent = showLocation ? "/" + parentOf(e.path) : "";
        const size = tr.insertCell(); size.className = "num"; size.textContent = fmtSize(e.size);
        const mod = tr.insertCell(); mod.className = "num"; mod.textContent = new Date(e.modified).toLocaleString();
    }
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

async function load(path: string): Promise<void> {
    try {
        setStatus("Loading…");
        const data = await api<DirectoryListing>("/api/search?path=" + encodeURIComponent(path));
        currentPath = data.path;
        renderCrumbs(currentPath);
        renderRows(data.entries, false, data.parent);
        setStatus(data.entries.length + " item(s)");
    } catch (err) {
        setStatus(errorMessage(err), true);
    }
}

async function search(query: string): Promise<void> {
    try {
        setStatus("Searching…");
        const data = await api<SearchResult>("/api/search/search?query=" + encodeURIComponent(query) + "&path=" + encodeURIComponent(currentPath));
        renderRows(data.entries, true, null);
        setStatus(data.entries.length + " result(s)" + (data.truncated ? " (truncated)" : "") + ` for "${query}"`);
    } catch (err) {
        setStatus(errorMessage(err), true);
    }
}

async function setNewHome(path: string): Promise<void> {
    try {
        setStatus("Setting new Home...");
        const data = await send<SearchResult>("/api/filemanager/sethome", path);
        renderRows(data.entries, true, null);
        setStatus(data.entries.length + " result(s)" + (data.truncated ? " (truncated)" : "") + ` for "${path}"`);
    }
    catch (err) {
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

load("");