import { useRef } from "react";

import Utils from "./utils";
import "./ResizablePanel.css";

function ResizablePanel({wresize = false, hresize = false, className, style, children, 'aria-label' : ariaLabel} :
                        {
                            wresize? : boolean;
                            hresize? : boolean;
                            className? : string;
                            style? : React.CSSProperties;
                            children?: React.ReactNode;
                            'aria-label'?: string;
                        }) {

    if (!wresize && !hresize) {
        console.warn("ResizePanel is not allowed to be resized")
    }

    const panelRef = useRef<HTMLDivElement | null>(null);

    const resizeDirections = useRef({w: false, h: false});
    const resizeStartSizeRef = useRef({w: 0, h: 0});
    const resizeStartPosRef = useRef({x: 0, y: 0});

    function mouseTrackMoveCb(e) {
        if (panelRef.current != null) {
            if (resizeDirections.current.w) {
                const newWidth = resizeStartSizeRef.current.w + (e.screenX - resizeStartPosRef.current.x);
                panelRef.current.style.width = newWidth + "px";
            }
            if (resizeDirections.current.h) {
                const newHeight = resizeStartSizeRef.current.h + (e.screenY - resizeStartPosRef.current.y);
                panelRef.current.style.height = newHeight + "px";
            }
        }
    };

    function mouseTrackUpCb(e) {
        if (e.buttons & 1) {
            return
        }

        mouseTracker.current.stop()
    }

    function mouseTrackEnterCb(e) {
        // Mouse left window with left button down,
        // Check if left button is still down upon re-entering window
        if (!(e.buttons & 1)) {
            mouseTracker.current.stop()
        }
    }

    const mouseTracker = useRef(new Utils.GlobalMouseTracker({onMouseMove : mouseTrackMoveCb,
                                                              onMouseUp : mouseTrackUpCb,
                                                              onMouseEnter : mouseTrackEnterCb}));
    function handleBarMouseDown(e) {
        if (e.button != 0) {
            return
        }

        /* Start resizing */
        resizeStartPosRef.current = { x: e.screenX, y: e.screenY };
        if (panelRef.current) {
            resizeStartSizeRef.current = { w: panelRef.current.offsetWidth, h: panelRef.current.offsetHeight };
        }
        mouseTracker.current.start();
    };

    // if no bar on the right, take full width
    const widthAdaptStyle = wresize ? {} : {width: "100%"};
    // if no bar on the botton, take full height
    const heightAdaptStyle = hresize ? {} : {height: "100%"};

    return (
        <div className={className + " resizablepanel-vars"} ref={panelRef} style={style} aria-label={ariaLabel}>
            <div className="resizablepanel-content" style={{...widthAdaptStyle, ...heightAdaptStyle}}>
                {children}
            </div>
            {wresize ?
            <div className="resizablepanel-vbar"
                 onMouseDown={(e) => {resizeDirections.current = {w: true, h: false}; handleBarMouseDown(e)}}
                 aria-label="Width Resize Bar" />
            : <></>}
            {hresize ?
            <div className="resizablepanel-hbar"
                 onMouseDown={(e) => {resizeDirections.current = {w: false, h: true}; handleBarMouseDown(e)}}
                 aria-label="Height Resize Bar" />
            : <></>}
        </div>
    );
}

export default ResizablePanel;
