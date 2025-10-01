var POINTS = [
    { name: "ROSANA", lat: -22.5780, lng: -53.0605, info: "Rosana", "businesses": []},
    { "name": "ILHA SOLTEIRA", "lat": -20.4326, "lng": -51.3426, "info": "Ilha Solteira", "businesses": [] },
    { "name": "DRACENA", "lat": -21.4843, "lng": -51.5346, "info": "Dracena", "businesses": [] },
    { "name": "PRESIDENTE PRUDENTE", "lat": -22.1207, "lng": -51.3925, "info": "Pres. Prudente", "businesses": [] },
    { "name": "TUPÃ", "lat": -21.9345, "lng": -50.5149, "info": "Tupã", "businesses": [] },
    { "name": "ARAÇATUBA", "lat": -21.2076, "lng": -50.4401, "info": "Araçatuba", "businesses": [] },
    { "name": "SÃO JOSÉ DO RIO PRETO", "lat": -20.8113, "lng": -49.3758, "info": "São José do Rio Preto", "businesses": [] },
    { "name": "MARÍLIA", "lat": -22.2171, "lng": -49.9501, "info": "Marília", "businesses": [] },
    { "name": "ASSIS", "lat": -22.6604, "lng": -50.4180, "info": "Assis", "businesses": [] },
    { "name": "OURINHOS", "lat": -22.9797, "lng": -49.8690, "info": "Ourinhos", "businesses": [] },
    { "name": "BAURU", "lat": -22.3145, "lng": -49.0600, "info": "Bauru", "businesses": [] },
    { "name": "BOTUCATU", "lat": -22.8837, "lng": -48.4450, "info": "Botucatu", "businesses": [] },
    { "name": "ARARAQUARA", "lat": -21.7845, "lng": -48.1780, "info": "Araraquara", "businesses": [] },
    { "name": "JABOTICABAL", "lat": -21.2550, "lng": -48.3252, "info": "Jaboticabal", "businesses": [] },
    { "name": "FRANCA", "lat": -20.5393, "lng": -47.4011, "info": "Franca", "businesses": [] },
    { "name": "RIO CLARO", "lat": -22.4100, "lng": -47.5600, "info": "Rio Claro", "businesses": [] },
    { "name": "SÃO JOÃO DA BOA VISTA", "lat": -22.1501, "lng": -46.9934, "info": "São João da Boa Vista", "businesses": [] },
    { "name": "SOROCABA", "lat": -23.5015, "lng": -47.4526, "info": "Sorocaba", "businesses": [] },
    { "name": "SÃO PAULO", "lat": -23.5505, "lng": -46.6333, "info": "São Paulo", "businesses": [] },
    { "name": "SÃO JOSÉ DOS CAMPOS", "lat": -23.1896, "lng": -45.8841, "info": "São José dos Campos", "businesses": [] },
    { "name": "GUARATINGUETÁ", "lat": -22.8167, "lng": -45.1939, "info": "Guaratinguetá", "businesses": [] },
    { "name": "ITAPEVA", "lat": -23.9825, "lng": -48.8759, "info": "Itapeva", "businesses": [] },
    { "name": "REGISTRO", "lat": -24.4933, "lng": -47.8449, "info": "Registro", "businesses": [] },
    { "name": "SÃO VICENTE", "lat": -23.9640, "lng": -46.3910, "info": "São Vicente", "businesses": [] },
]




const API_KEY = "AIzaSyBmqHxP_fVxuedJZr2QUj5UQ_C135-VbVk";
const ROOT_FOLDER_ID = "1Dd_grfTxzjSYIZx0ingkdfFfaLCr6sHf";

// Direct download link for files
function directLink(fileId) {
    return `https://drive.google.com/uc?id=${fileId}`;
}

// Normalize name (uppercase, remove extension)
function normalizeName(filename) {
    return filename.replace(/\.[^/.]+$/, "").toUpperCase();
}

// Fetch files in a folder
async function listItems(parentId, mimeFilter = "") {
    const q = `'${parentId}' in parents and trashed = false`
        + (mimeFilter ? ` and mimeType ${mimeFilter}` : "");
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${API_KEY}&fields=files(id,name,mimeType)`;
    console.log("starting Fetch")
    const res = await fetch(url);
    const data = await res.json();
    return data.files || [];
}

// Fetch TXT content
async function fetchTxtContent(fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
    console.log("starting fetch 2")
    const res = await fetch(url);
    console.log("fetch 2 ended")
    return await res.text();
}

// Build structure with pairing
async function buildStructure(folderId, folderName = "ROOT") {
    const filesObj = {};

    // Subfolders
    const folders = await listItems(folderId, "= 'application/vnd.google-apps.folder'");

    // Images + txt
    const images = await listItems(folderId, "contains 'image/'");
    const txtFiles = await listItems(folderId, "= 'text/plain'");

    // Map txt files by normalized name
    const txtMap = {};
    for (const txt of txtFiles) {
        const baseName = normalizeName(txt.name);
        txtMap[baseName] = txt.id;
    }

    // Pair images with txt
    filesObj["_files"] = [];
    for (const img of images) {
        const baseName = normalizeName(img.name);
        let txtContent = "";

        if (txtMap[baseName]) {
            try {
                txtContent = await fetchTxtContent(txtMap[baseName]);
            } catch (e) {
                console.warn("Could not fetch TXT content:", e);
            }
        }

        filesObj["_files"].push({
            name: baseName,
            image_file: directLink(img.id),
            txt_file: txtContent
        });
    }

    // Recursively build subfolder objects
    filesObj["subfolders"] = [];
    for (const folder of folders) {
        const subStruct = await buildStructure(folder.id, folder.name.toUpperCase());
        filesObj["subfolders"].push(subStruct);
    }

    return {
        city: folderName.toUpperCase(),
        files: filesObj
    };
}

async function main() {
    const struct = await buildStructure(ROOT_FOLDER_ID, "ROOT");
    console.log(struct)
    associateGoogleDriveStructToMapPoints(struct)
}


function associateGoogleDriveStructToMapPoints(struct){

    for(let i = 0; i < struct.files.subfolders.length; i++){ // for each city on Drive
        for(let j = 0; j < POINTS.length; j++){                // for each city on Map Struct POINTS
            if(struct.files.subfolders[i].city === POINTS[j].name){ // if they match
                for(let k = 0; k < struct.files.subfolders[i].files._files.length; k++){ // for each business inside the City Folder inside the Drive
                    POINTS[j].businesses.push(
                        {
                            name: struct.files.subfolders[i].files._files[k].name,
                            img: "https://drive.google.com/thumbnail?id="+split_image_src(struct.files.subfolders[i].files._files[k].image_file)+"&sz=w200",
                            description: split_description(struct.files.subfolders[i].files._files[k].txt_file),
                            category: parseInt(split_category(struct.files.subfolders[i].files._files[k].txt_file))
                        }
                    ) // on the city Map Struct POINT, PUSH the business
                }
            }
        }
    }

    console.log(POINTS)
    updateJSONBin("68cd783dae596e708ff40d01",POINTS)
}

function split_image_src(str){
    if (str.split("id="))
        return str.split("id=")[1]
    else return ""
}
function split_description(str){
    if (str.split("\nDescrição: ") && str.includes("Descrição: "))
        return str.split("Descrição: ")[1]
    else return ""
}

function split_category(str){
    if(str.split("Categoria: ") && str.split("\nDescrição: ") && str.includes("Categoria: ")){
        return str.split("Categoria: ")[1].split("\nDescrição: "[0])}
    else return "3"
}

main();










// Update an existing JSONBin with new object data
async function updateJSONBin(binId, obj) {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": "$2a$10$HPsuTzl4ySSZ3wTT7HfZQ.JJWRPr1QvxqUHHxxnzpivxsE./KJBs2" // required if bin is private
        },
        body: JSON.stringify(obj, null, 2)
    });

    if (!res.ok) {

        const maindiv = document.getElementById("MAIN")
        maindiv.classList.remove("spinner")
        maindiv.innerHTML = "Erro:<br>" + res.statusText

        throw new Error("Failed to update JSONBin: " + res.statusText);
    }



    const data = await res.json();
    console.log("Updated JSONBin:", data);

    const maindiv = document.getElementById("MAIN")
    maindiv.classList.remove("spinner")
    maindiv.innerHTML = "Sucesso! Feche a página."

    return data;
}


// Example usage:
async function testUpdate() {
    const BIN_ID = "68cd783dae596e708ff40d01";
    const myObj = {
        message: "Hello again",
        timestamp: new Date().toISOString()
    };

    const result = await updateJSONBin(BIN_ID, myObj);
    console.log("Updated bin:", result);
}
