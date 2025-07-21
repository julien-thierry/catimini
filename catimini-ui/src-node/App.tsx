import { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCaretRight, FaCaretDown } from "react-icons/fa";

import "./App.css";
import ImageViewer from "./ImageViewer";

function App() {
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    return (
        <main>
            <Button className="sidepanelbtn" onClick={() => setSidePanelOpen(!sidePanelOpen)}>
                {sidePanelOpen? <FaCaretDown/> : <FaCaretRight/>}
            </Button>
            <div className="panelcontainer">
                { sidePanelOpen ? <div className="sidepanel"/> : <></> }
                <div className="imagepanel">
                    <h1>Welcome to Catimini</h1>
                    <div className="imgviewercontainer">
                        <ImageViewer/>
                    </div>
                </div>
            </div>
        </main>
  );
}

export default App;
