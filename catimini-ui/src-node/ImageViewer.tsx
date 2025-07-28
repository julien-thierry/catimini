import { useCallback, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";
import { invoke } from "@tauri-apps/api/core";
import "./ImageViewer.css";

function ImageViewer({imagePaths} : {imagePaths : Array<String>}) {
    const [imageIdx, setImageIdx] = useState(imagePaths.length > 0 ? 0 : -1);
    const currImagePathRef = useRef<String | null>(imageIdx >= 0 ? imagePaths[imageIdx] : null);

    const updateImageIdx = useCallback((newIdx) => {
        setImageIdx(newIdx);
        currImagePathRef.current = newIdx >= 0 ? imagePaths[newIdx] : null;
    }, [imagePaths]);

    const [prevImagePaths, setPrevImagePaths] = useState(imagePaths);
    if (imagePaths != prevImagePaths) {
        setPrevImagePaths(imagePaths);
        if (imagePaths.length == 0) {
            updateImageIdx(-1);
        } else if (!currImagePathRef.current) {
            updateImageIdx(0);
        } else if (currImagePathRef.current != imagePaths[imageIdx]) {
            const newIdx = imagePaths.indexOf(currImagePathRef.current);
            updateImageIdx(newIdx >= 0 ? newIdx : 0);
        }
    }

    const [imageData, setImageData] = useState<ArrayBuffer | null>(null);
    async function fetchImage(imgPath) : Promise<ArrayBuffer> {
        console.debug("Fetching image: ", imgPath);
        return await invoke("fetch_image", { path : imgPath});
    }

    const [prevImagePath, setPrevImagePath] = useState<String | null>(null);
    if (prevImagePath != currImagePathRef.current) {
        setPrevImagePath(currImagePathRef.current);
        if (currImagePathRef.current != null) {
            fetchImage(currImagePathRef.current)
                .then((value) => setImageData(value.byteLength > 0 ? value : null))
                .catch((e) => setImageData(null));
        } else {
            setImageData(null);
        }
    }

    const imgBlob =  imageData != null ? new Blob([imageData]) : null;
    const imgURL = imgBlob != null ? URL.createObjectURL(imgBlob) : null;

    const handleLeftBtnClick = () => updateImageIdx(imageIdx <= 0 ? imageIdx : imageIdx - 1);
    const handleRightBtnClick =
        () => updateImageIdx(imageIdx < 0 || imageIdx >= imagePaths.length - 1 ? imageIdx : imageIdx + 1);

    const imageViewDivRef = useRef<HTMLDivElement | null>(null);
    function handleKeyboardEvent(ev) {
        switch (ev.code) {
        case "ArrowLeft":
            handleLeftBtnClick();
            break;
        case "ArrowRight":
            handleRightBtnClick();
            break;
        case "End":
            updateImageIdx(imagePaths.length - 1);
            break;
        case "Home":
            updateImageIdx(imagePaths.length > 0 ? 0 : -1);
            break;
        }
    }

    return (
        <div className="imageview" ref={imageViewDivRef}
             tabIndex={0} onKeyDown={handleKeyboardEvent}>
            <Button onClick={handleLeftBtnClick} className="viewerbtn">
                <FaCaretLeft/>
            </Button>
            {imgURL != null ?
                <img src={imgURL} alt="viewerimage"/> :
                <p className="viewernoimage">No Images Found</p>}
            <Button onClick={handleRightBtnClick} className="viewerbtn">
                <FaCaretRight/>
            </Button>
        </div>
    );
}

export default ImageViewer;
