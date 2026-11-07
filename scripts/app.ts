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


function renderRows(entries: FileEntry[], showLocation: boolean, parent: string | null): void {
    const body = $<HTMLTableSectionElement>("rows");
    body.replaceChildren();
    selected.clear();
    updateDownloadUi();
    // Persistent count of the rows in the table (the ".." row isn't counted), separate from the timed #status line.
    $("itemCount").textContent = `${entries.length} item(s)`;
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
        setStatus(""); // Remove loading message

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
        setStatus("");
    }
    catch (err) {
        if (seq !== requestSeq) return;
        setStatus(errorMessage(err), true);
    }
}

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

// Initial load should not push to history, otherwise you get duplicate entries.
// upload.js and download.js load after this file; that's safe because load() only touches their
// functions (renderRows -> updateDownloadUi) after its first await, by which time all scripts have run.
load(new URLSearchParams(location.search).get("path") ?? "", false);

