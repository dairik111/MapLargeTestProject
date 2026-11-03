"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let currentPath = "";
function $(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Missing element #${id}`);
    return el;
}
function setStatus(msg, isError = false) {
    $("status").textContent = msg;
    $("status").className = isError ? "error" : "";
}
function send(url, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(url, {
            method: 'POST', // or 'PUT', 'PATCH'
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content) // Convert the JS object to a JSON string
        });
        return response.json();
    });
}
function api(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(url);
        if (!res.ok)
            throw new Error((yield res.text()) || res.statusText);
        return res.json();
    });
}
function fmtSize(n) {
    if (n == null)
        return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    return (i ? n.toFixed(1) : String(n)) + " " + units[i];
}
function makeLink(text, onClick) {
    const a = document.createElement("a");
    a.textContent = text;
    a.onclick = onClick;
    return a;
}
function renderCrumbs(path) {
    const c = $("crumbs");
    c.replaceChildren();
    const add = (label, p) => {
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
function parentOf(p) {
    const i = p.lastIndexOf("/");
    return i < 0 ? "" : p.slice(0, i);
}
function renderRows(entries, showLocation, parent) {
    const body = $("rows");
    body.replaceChildren();
    if (parent != null) {
        const tr = body.insertRow();
        tr.insertCell().append(makeLink("📁 ..", () => load(parent)));
        tr.insertCell();
        tr.insertCell();
        tr.insertCell();
    }
    for (const e of entries) {
        const tr = body.insertRow();
        const cell = tr.insertCell();
        if (e.isDirectory) {
            cell.append(makeLink("📁 " + e.name, () => { $("query").value = ""; load(e.path); }));
        }
        else {
            cell.textContent = "📄 " + e.name;
        }
        tr.insertCell().textContent = showLocation ? "/" + parentOf(e.path) : "";
        const size = tr.insertCell();
        size.className = "num";
        size.textContent = fmtSize(e.size);
        const mod = tr.insertCell();
        mod.className = "num";
        mod.textContent = new Date(e.modified).toLocaleString();
    }
}
function errorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
function load(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            setStatus("Loading…");
            const data = yield api("/api/search?path=" + encodeURIComponent(path));
            currentPath = data.path;
            renderCrumbs(currentPath);
            renderRows(data.entries, false, data.parent);
            setStatus(data.entries.length + " item(s)");
        }
        catch (err) {
            setStatus(errorMessage(err), true);
        }
    });
}
function search(query) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            setStatus("Searching…");
            const data = yield api("/api/search/search?query=" + encodeURIComponent(query) + "&path=" + encodeURIComponent(currentPath));
            renderRows(data.entries, true, null);
            setStatus(data.entries.length + " result(s)" + (data.truncated ? " (truncated)" : "") + ` for "${query}"`);
        }
        catch (err) {
            setStatus(errorMessage(err), true);
        }
    });
}
function setNewHome(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            setStatus("Setting new Home...");
            const data = yield send("/api/filemanager/sethome", path);
            renderRows(data.entries, true, null);
            setStatus(data.entries.length + " result(s)" + (data.truncated ? " (truncated)" : "") + ` for "${path}"`);
        }
        catch (err) {
            setStatus(errorMessage(err), true);
        }
    });
}
$("searchForm").onsubmit = (e) => {
    e.preventDefault();
    const query = $("query").value.trim();
    if (query)
        search(query);
    else
        load(currentPath);
};
$("clear").onclick = () => { $("query").value = ""; load(currentPath); };
$("settingsForm").onsubmit = (e) => {
    e.preventDefault();
    const path = $("rootPath").value.trim();
    if (path)
        setNewHome(path);
    else
        load(currentPath);
};
load("");
//# sourceMappingURL=app.js.map