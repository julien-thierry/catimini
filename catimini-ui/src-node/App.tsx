import { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";

import "./App.css";

import Commands from "./commands";
import FSEvents from "./fsevents";
import ImageViewer from "./ImageViewer";
import ResizablePanel from "./ResizablePanel";
import SelectableFileTree from "./SelectableFileTree";
import Utils from "./utils";

function AppContext({children} : {children?: React.ReactNode}) {
    const [fsListeningContext] = useState(() => new FSEvents.FSListeningContext());

    return (
        <main>
            <FSEvents.FSEventsListeningContext.Provider value={fsListeningContext}>
                {children}
            </FSEvents.FSEventsListeningContext.Provider>
        </main>
    );
}

function App() {
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [rootFoldersList, setRootFoldersList] = useState<Array<string>>([]);
    const [imageList, setImageList] = useState<Array<string>>([]);

    useEffect(() => {
        Commands.getRootFolders()
            .then((roots) => {
                setRootFoldersList(roots);
                // Try to display images in first root folder on initialization
                if (roots.length >= 1) {
                    Commands.getFolderContent(roots[0]).then((firstFolder) => setImageList(firstFolder.images))
                }
            })
            .catch((e) => console.warn("Failed to retrieve root folders. ", e));
    }, []);

    function handleSelectFoldersUpdate(folderInfoList : Array<Utils.FolderInfo>) {
        setImageList(folderInfoList.flatMap((fileInfo) => fileInfo.content.images));
    }

    async function onViewedImageChange(info: {path: string | null}) {
        const title = info.path ? Utils.fileBasename(info.path) : null;
        await Utils.setMainWindowTitle(title ? title :  "catimini");
    }

    return (
        <AppContext>
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
                        <ImageViewer imagePaths={imageList} imageUpdateCb={onViewedImageChange}/>
                    </div>
                </div>
            </div>
        </AppContext>
  );
}

export default App;
