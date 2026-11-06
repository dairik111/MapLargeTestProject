// File upload. Plain script (not a module): shares globals with app.ts, so load it after js/app.js in index.html.

function setUploadMessage(msg: string): void {
    setTimedStatus("uploadMessage", msg, false, true);
}

// ---- File upload dialog - Claude generated ----

interface UploadResult {
    count: number;
    uploadSize: number;
}

function setUploadStatus(msg: string, isError: boolean = false): void {
    setTimedStatus("uploadstatus", msg, isError, true);
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
    const res = await fetch("/api/file/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);

    const result = await res.json() as UploadResult;
    setUploadStatus(`Uploaded ${result.count} file(s), ${fmtSize(result.uploadSize)}`, false);
}

const uploadDialog = $<HTMLDialogElement>("uploadDialog");
const uploadInput = $<HTMLInputElement>("uploadFiles");

$("uploadBtn").onclick = (): void => {
    $<HTMLFormElement>("uploadForm").reset();
    renderUploadList(null);
    setUploadMessage("");
    uploadDialog.showModal();
};

$("uploadCancel").onclick = (): void => uploadDialog.close();

uploadInput.onchange = (): void => renderUploadList(uploadInput.files);

$<HTMLFormElement>("uploadForm").onsubmit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();
    if (!uploadInput.files || uploadInput.files.length === 0) return;

    const submit = $<HTMLButtonElement>("uploadSubmit");
    submit.disabled = true;
    setUploadMessage("");
    try {
        await uploadFiles(uploadInput.files);        
        uploadDialog.close();
    } catch (err) {
        setUploadMessage(errorMessage(err));
        submit.disabled = false;
    }
};

// ---- END of File upload ----
