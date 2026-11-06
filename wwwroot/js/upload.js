"use strict";
// File upload. Plain script (not a module): shares globals with app.ts, so load it after js/app.js in index.html.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function setUploadMessage(msg) {
    setTimedStatus("uploadMessage", msg, false, true);
}
function setUploadStatus(msg, isError = false) {
    setTimedStatus("uploadstatus", msg, isError, true);
}
function renderUploadList(files) {
    const list = $("uploadList");
    list.replaceChildren();
    for (const f of Array.from(files !== null && files !== void 0 ? files : [])) {
        const li = document.createElement("li");
        li.textContent = `${f.name} (${fmtSize(f.size)})`;
        list.append(li);
    }
    $("uploadSubmit").disabled = !files || files.length === 0;
}
function uploadFiles(files) {
    return __awaiter(this, void 0, void 0, function* () {
        const form = new FormData();
        for (const f of Array.from(files))
            form.append("files", f, f.name); // "files" matches the controller's parameter name
        // No Content-Type header: the browser sets the multipart boundary itself.
        const res = yield fetch("/api/file/upload", { method: "POST", body: form });
        if (!res.ok)
            throw new Error((yield res.text()) || res.statusText);
        const result = yield res.json();
        setUploadStatus(`Uploaded ${result.count} file(s), ${fmtSize(result.uploadSize)}`, false);
    });
}
const uploadDialog = $("uploadDialog");
const uploadInput = $("uploadFiles");
$("uploadBtn").onclick = () => {
    $("uploadForm").reset();
    renderUploadList(null);
    setUploadMessage("");
    uploadDialog.showModal();
};
$("uploadCancel").onclick = () => uploadDialog.close();
uploadInput.onchange = () => renderUploadList(uploadInput.files);
$("uploadForm").onsubmit = (e) => __awaiter(void 0, void 0, void 0, function* () {
    e.preventDefault();
    if (!uploadInput.files || uploadInput.files.length === 0)
        return;
    const submit = $("uploadSubmit");
    submit.disabled = true;
    setUploadMessage("");
    try {
        yield uploadFiles(uploadInput.files);
        uploadDialog.close();
    }
    catch (err) {
        setUploadMessage(errorMessage(err));
        submit.disabled = false;
    }
});
// ---- END of File upload ----
//# sourceMappingURL=upload.js.map