import Commands from "./commands";

namespace Utils {

export type FolderInfo = {
    path : string,
    content : Commands.FolderContent
}

export type MouseEventCb = (e : MouseEvent) => void

export class GlobalMouseTracker {

    constructor({ onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onMouseMove } :
        { onMouseEnter? : MouseEventCb;
          onMouseLeave? : MouseEventCb;
          onMouseDown? : MouseEventCb;
          onMouseUp? : MouseEventCb;
          onMouseMove? : MouseEventCb
           }) {
        if (onMouseEnter) {
            this.onMouseEnterCb = onMouseEnter;
        }

        if (onMouseLeave) {
          this.onMouseLeaveCb = onMouseLeave;
        }

        if (onMouseDown) {
          this.onMouseDownCb = onMouseDown;
        }

        if (onMouseUp) {
          this.onMouseUpCb = onMouseUp;
        }

        if (onMouseMove) {
          this.onMouseMoveCb = onMouseMove;
        }
    }

    start() {
        if (this.tracking) {
            return
        }
        document.body.addEventListener("mouseenter", this.onMouseEnterCb);
        document.body.addEventListener("mouseleave", this.onMouseLeaveCb);
        document.body.addEventListener("mousedown", this.onMouseDownCb);
        document.body.addEventListener("mouseup", this.onMouseUpCb);
        document.body.addEventListener("mousemove", this.onMouseMoveCb);

        this.tracking = true;
    }

    stop() {
        if (!this.tracking) {
            return
        }
        document.body.removeEventListener("mousemove", this.onMouseMoveCb);
        document.body.removeEventListener("mouseup", this.onMouseUpCb);
        document.body.removeEventListener("mousedown", this.onMouseDownCb);
        document.body.removeEventListener("mouseleave", this.onMouseLeaveCb);
        document.body.removeEventListener("mouseenter", this.onMouseEnterCb);
        this.tracking = false;
    }

    onMouseEnterCb: MouseEventCb = (_) => {};
    onMouseLeaveCb: MouseEventCb = (_) => {};
    onMouseDownCb: MouseEventCb = (_) => {};
    onMouseUpCb: MouseEventCb = (_) => {};
    onMouseMoveCb: MouseEventCb = (_) => {};

    tracking = false;
}

// node:path.basename is not always available on the client side
export function fileBasename(path: string) {
    return decodeURI(new URL(`file:///${path}`).toString()).split('/').pop();
}

}

export default Utils;
