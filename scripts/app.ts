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

function setStatus(msg: string, isError: boolean = false): void {
    $("status").textContent = msg;
    $("status").className = isError ? "error" : "";
}

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
        setStatus("Loading…");
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
        setStatus("Searching…");
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
        setStatus("Setting new Home...");
        // The server redirects to the directory listing of the new home, which fetch follows.
        const data = await send<DirectoryListing>("/api/filemanager/sethome", path);
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
    $("uploadstatus").textContent = msg;
    $("uploadstatus").className = isError ? "error" : "";
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
    const res = await fetch("/api/filemanager/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);

    const result = await res.json() as UploadResult;
    setUploadStatus(`Uploaded ${result.count} file(s), ${fmtSize(result.uploadSize)}`, false);
}

const uploadDialog = $<HTMLDialogElement>("uploadDialog");
const uploadInput = $<HTMLInputElement>("uploadFiles");

$("uploadBtn").onclick = (): void => {
    $<HTMLFormElement>("uploadForm").reset();
    renderUploadList(null);
    $("uploadMessage").textContent = "";
    uploadDialog.showModal();
};

$("uploadCancel").onclick = (): void => uploadDialog.close();

uploadInput.onchange = (): void => renderUploadList(uploadInput.files);

$<HTMLFormElement>("uploadForm").onsubmit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();
    if (!uploadInput.files || uploadInput.files.length === 0) return;

    const submit = $<HTMLButtonElement>("uploadSubmit");
    submit.disabled = true;
    $("uploadMessage").textContent = "";
    try {
        await uploadFiles(uploadInput.files);
        //$("uploadMessage").textContent = result.
        uploadDialog.close();
    } catch (err) {
        $("uploadMessage").textContent = errorMessage(err);
        submit.disabled = false;
    }
};

// ---- END of File upload ----
