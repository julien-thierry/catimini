import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./ImageViewer.css";


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

    const [imageData, setImageData] = useState<ArrayBuffer | null>(null);

    async function fetchImage(imgPath) : Promise<ArrayBuffer> {
        console.debug("Fetching image: ", imgPath);
        return await invoke("fetch_image", { path : imgPath});
    }
    useEffect(() => {
        if (imageList.length > 0) {
            fetchImage(imageList[0])
                .then((value) => setImageData(value.byteLength > 0 ? value : null))
                .catch((e) => setImageData(null));
        } else {
            setImageData(null);
        }
    }, [imageList]);

    const imgBlob =  imageData != null ? new Blob([imageData]) : null;
    const imgURL = imgBlob != null ? URL.createObjectURL(imgBlob) : null;

    return (
        <div className="imageview">
            {imgURL != null ? (<img src={imgURL} alt="my image"/>) : (<></>)}
        </div>
    );
}

export default ImageViewer;
