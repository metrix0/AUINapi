// simplified main.js (only Drive scanning & JSON helpers)
// If you use the inline update.html above, you don't need this file.
// Kept here only if you prefer separate script.

const API_KEY = "AIzaSyBmqHxP_fVxuedJZr2QUj5UQ_C135-VbVk";
const ROOT_FOLDER_ID = "1Dd_grfTxzjSYIZx0ingkdfFfaLCr6sHf";
const JSON_BIN_ID = "68cd783dae596e708ff40d01";
const JSON_MASTER_KEY = "$2a$10$HPsuTzl4ySSZ3wTT7HfZQ.JJWRPr1QvxqUHHxxnzpivxsE./KJBs2";

function normalizeName(n){ return String(n||"").replace(/\.[^/.]+$/,"").toUpperCase().trim(); }
function directLink(fileId){ return `https://drive.google.com/uc?id=${fileId}`;}

async function listItems(parentId, mimeFilter = "") {
    const q = `'${parentId}' in parents and trashed = false` + (mimeFilter ? ` and mimeType ${mimeFilter}` : "");
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${API_KEY}&fields=files(id,name,mimeType)`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Drive list failed: " + res.statusText);
    const data = await res.json();
    return data.files || [];
}

async function buildStructure(folderId, folderName = "ROOT") {
    const filesObj = {};
    const folders = await listItems(folderId, "= 'application/vnd.google-apps.folder'");
    const images = await listItems(folderId, "contains 'image/'");
    filesObj["_files"] = images.map(img => ({ name: normalizeName(img.name), image_file: directLink(img.id), raw_name: img.name }));
    filesObj["subfolders"] = [];
    for (const f of folders) filesObj["subfolders"].push(await buildStructure(f.id, f.name.toUpperCase()));
    return { city: folderName.toUpperCase(), files: filesObj };
}

async function readJSONBin(binId){
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { "Content-Type":"application/json", "X-Master-Key": JSON_MASTER_KEY }});
    if(!res.ok) throw new Error("Failed to read JSONBin: "+res.statusText);
    const data = await res.json();
    return data.record;
}

async function updateJSONBin(binId, obj){
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, { method:'PUT', headers: { "Content-Type":"application/json", "X-Master-Key": JSON_MASTER_KEY }, body: JSON.stringify(obj, null, 2) });
    if(!res.ok) throw new Error("Failed to update JSONBin: "+res.statusText);
    return await res.json();
}

// export for console usage
window.driveHelpers = { buildStructure, readJSONBin, updateJSONBin };
