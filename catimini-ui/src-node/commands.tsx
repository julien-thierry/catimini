import { invoke } from "@tauri-apps/api/core";

namespace Commands {

export type FolderContent = {
    folders : Array<string>,
    images : Array<string>,
    others : Array<string>
}

export async function getFolderContent(path? : string) : Promise<FolderContent> {
    if (path) {
        console.debug("Fetching folder: ", path);
    }
    return await invoke("list_folder_files", {path: path});
}

export async function getRootFolders() : Promise<FolderContent> {
    console.debug("Fetching root folders");
    return getFolderContent();
}

export async function fetchImage(imgPath) : Promise<ArrayBuffer> {
    console.debug("Fetching image: ", imgPath);
    return await invoke("fetch_image", { path : imgPath});
}

}

export default Commands;
