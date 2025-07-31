import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";

import "./App.css";

import Commands from "./commands";
import ImageViewer from "./ImageViewer";
import ResizablePanel from "./ResizablePanel";

function App() {
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [rootFoldersList, setRootFoldersList] = useState<Array<String>>([]);
    const [imageList, setImageList] = useState<Array<String>>([]);

    useEffect(() => {
        Commands.getRootFolders()
            .then((value) => { setRootFoldersList(value.folders); setImageList(value.images)})
            .catch((e) => console.warn("Failed to retrieve root folders. ", e));
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
