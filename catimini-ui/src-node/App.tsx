import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";

import "./App.css";

import Commands from "./commands";
import ImageViewer from "./ImageViewer";
import ResizablePanel from "./ResizablePanel";
import SelectableFileTree from "./SelectableFileTree";
import Utils from "./utils";

function App() {
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [rootFoldersList, setRootFoldersList] = useState<Array<String>>([]);
    const [imageList, setImageList] = useState<Array<String>>([]);

    useEffect(() => {
        Commands.getRootFolders()
            .then((value) => {
                setRootFoldersList(value.folders);
                // Try to display images in first root folder on initialization
                if (value.folders.length >= 1) {
                    Commands.getFolderContent(value.folders[0]).then((firstFolder) => setImageList(firstFolder.images))
                }
            })
            .catch((e) => console.warn("Failed to retrieve root folders. ", e));
    }, []);

    function handleSelectFoldersUpdate(folderInfoList : Array<Utils.FolderInfo>) {
        setImageList(folderInfoList.flatMap((fileInfo) => fileInfo.content.images));
    }

    return (
        <main>
            <Button className="sidepanelbtn" onClick={() => setSidePanelOpen(!sidePanelOpen)} aria-label="Toggle Folder Panel">
                {sidePanelOpen? <FaCaretDown/> : <FaCaretRight/>}
            </Button>
            <div className="panelcontainer">
                <ResizablePanel wresize={true} className="sidepanel" style={{display : sidePanelOpen ? "block" : "none"}} aria-label="Folder Panel">
                    <SelectableFileTree rootPaths={rootFoldersList} onSelectListUpdate={handleSelectFoldersUpdate} className="sidepanelfolderlist"/>
                </ResizablePanel>
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
