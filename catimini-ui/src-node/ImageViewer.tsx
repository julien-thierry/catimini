import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";
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
    const [imageIdx, setImageIdx] = useState(-1);
    const currImagePathRef = useRef<String | null>(null);

    const updateImageIdx = useCallback((newIdx) => {
        setImageIdx(newIdx);
        currImagePathRef.current = newIdx >= 0 ? imageList[newIdx] : null;
    }, [imageList]);

    useEffect(() => {
        let newIdx = -1;
        if (currImagePathRef.current != null) {
            // lookup old path
            newIdx = imageList.indexOf(currImagePathRef.current);
        } else if (imageList.length > 0) {
            // TODO: If workspace changed completely we want to go back to the begining
            // if the current item was deleted, we want to go to the next one.
            // For now, go back to first element in the list.
            newIdx = 0;
        }
        updateImageIdx(newIdx);
    }, [imageList]);

    async function fetchImage(imgPath) : Promise<ArrayBuffer> {
        console.debug("Fetching image: ", imgPath);
        return await invoke("fetch_image", { path : imgPath});
    }
    useEffect(() => {
        if (currImagePathRef.current != null) {
            fetchImage(currImagePathRef.current)
                .then((value) => setImageData(value.byteLength > 0 ? value : null))
                .catch((e) => setImageData(null));
        } else {
            setImageData(null);
        }
    }, [imageIdx]);

    const imgBlob =  imageData != null ? new Blob([imageData]) : null;
    const imgURL = imgBlob != null ? URL.createObjectURL(imgBlob) : null;

    const handleLeftBtnClick = () => updateImageIdx(imageIdx <= 0 ? imageIdx : imageIdx - 1);
    const handleRightBtnClick =
        () => updateImageIdx(imageIdx < 0 || imageIdx >= imageList.length - 1 ? imageIdx : imageIdx + 1);

    return (
        <div className="imageview">
            <Button onClick={handleLeftBtnClick} className="viewerbtn">
                <FaCaretLeft/>
            </Button>
            {imgURL != null ? (<img src={imgURL} alt="my image"/>) : (<></>)}
            <Button onClick={handleRightBtnClick} className="viewerbtn">
                <FaCaretRight/>
            </Button>
        </div>
    );
}

export default ImageViewer;
