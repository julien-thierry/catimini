import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function ImageViewer() {
    const [imageList, setImageList] = useState<Array<String>>([]);
    async function listImages() {
        const images : Array<String> = await invoke("list_images");
        console.debug("Updated working image list, found ", images.length, " items.");
        return images;
    }

    // Initialize with files from default workspace
    useEffect(() => {
        listImages()
            .then((value) => setImageList(value))
            .catch(e => console.warn("Failed to retrieve images"));
    }, []);

    return (
        <div className="imageview">
        </div>
    );
}

export default ImageViewer;
