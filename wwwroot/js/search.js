"use strict";
// Search. Plain script (not a module): shares globals with app.ts, so load it after js/app.js in index.html.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function search(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const seq = ++requestSeq;
        try {
            setStatus("Searching…", false, true);
            const data = yield api("/api/search/search?query=" + encodeURIComponent(query) + "&path=" + encodeURIComponent(currentPath));
            if (seq !== requestSeq)
                return;
            renderRows(data.entries, true, null);
            // Report "Not Found" (in red, like other failures) when nothing matched; otherwise clear the "Searching…" message.
            setStatus(data.entries.length === 0 ? `Not Found: "${query}"` : "", data.entries.length === 0);
        }
        catch (err) {
            if (seq !== requestSeq)
                return;
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
//# sourceMappingURL=search.js.map