import { useCallback, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";

import "./ImageViewer.css";

import Commands from "./commands";

function ImageViewer({imagePaths} : {imagePaths : Array<string>}) {
    const [imageIdx, setImageIdx] = useState(imagePaths.length > 0 ? 0 : -1);
    const currImagePathRef = useRef<string | null>(imageIdx >= 0 ? imagePaths[imageIdx] : null);

    const updateImageIdx = useCallback((newIdx: number) => {
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

    const [prevImagePath, setPrevImagePath] = useState<string | null>(null);
    if (prevImagePath != currImagePathRef.current) {
        setPrevImagePath(currImagePathRef.current);
        if (currImagePathRef.current != null) {
            Commands.fetchImage(currImagePathRef.current)
                .then((value) => setImageData(value.byteLength > 0 ? value : null))
                .catch((e) => setImageData(null));
        } else {
            setImageData(null);
        }
    }

    const imgBlob = imageData != null ? new Blob([imageData]) : null;
    const imgURL = imgBlob != null ? URL.createObjectURL(imgBlob) : null;

    const handleLeftBtnClick = () => updateImageIdx(imageIdx <= 0 ? imageIdx : imageIdx - 1);
    const handleRightBtnClick =
        () => updateImageIdx(imageIdx < 0 || imageIdx >= imagePaths.length - 1 ? imageIdx : imageIdx + 1);

    const imageViewDivRef = useRef<HTMLDivElement | null>(null);
    function handleKeyboardEvent(ev: React.KeyboardEvent) {
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
            <Button onClick={handleLeftBtnClick} className="viewerbtn" aria-label="Image Viewer Previous">
                <FaCaretLeft/>
            </Button>
            {imgURL != null ?
                <img src={imgURL} alt="viewerimage"/> :
                <p className="viewernoimage">No Images Found</p>}
            <Button onClick={handleRightBtnClick} className="viewerbtn" aria-label="Image Viewer Next">
                <FaCaretRight/>
            </Button>
        </div>
    );
}

export default ImageViewer;
