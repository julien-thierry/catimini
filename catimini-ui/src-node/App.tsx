import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretRight, FaCaretDown } from "react-icons/fa";
import { invoke } from "@tauri-apps/api/core";

import "./App.css";
import ImageViewer from "./ImageViewer";
import ResizablePanel from "./ResizablePanel";

function App() {
    const [sidePanelOpen, setSidePanelOpen] = useState(false);

    const [imageList, setImageList] = useState<Array<String>>([]);
    async function listImages() {
        const images : Array<String> = await invoke("list_images");
        console.debug("Updated working image list, found ", images.length, " items.");
        return images;
    }
    useEffect(() => {
        listImages()
            .then((value) => setImageList(value))
            .catch(e => console.warn("Failed to retrieve images"));
    }, []);

    return (
        <main>
            <Button className="sidepanelbtn" onClick={() => setSidePanelOpen(!sidePanelOpen)}>
                {sidePanelOpen? <FaCaretDown/> : <FaCaretRight/>}
            </Button>
            <div className="panelcontainer">
                <ResizablePanel wresize={true} className="sidepanel" style={{display : sidePanelOpen ? "block" : "none"}} />
                <div className="imagepanel">
                    <h1>Welcome to Catimini</h1>
                    <div className="imgviewercontainer">
                        <ImageViewer imagePaths={imageList}/>
                    </div>
                </div>
            </div>
        </main>
  );
}

export default App;
