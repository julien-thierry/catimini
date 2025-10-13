import { Window } from '@tauri-apps/api/window';

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

export async function setMainWindowTitle(newTitle: string) {
    const mainWindow = new Window("catimini-main");
    await mainWindow.setTitle(newTitle);
    document.title = newTitle;
}

export class Lock {
    acquire(): Promise<void> {
        const oldPromise = this.promise;
        this.promise = new Promise((resolve, reject) => {
            // Once this is resolved, allow resolution of pending aquire when calling release
            oldPromise.then(() => this.doRelease = resolve)
        });
        return oldPromise;
    }

    release() {
        this.doRelease();
    }

    private promise: Promise<void> = Promise.resolve();
    private doRelease: () => void = () => {};
}

export function findIndexInRange<T>(arr: Array<T>, predicate: (value: T, index?: number, obj?: T[]) => boolean, from: number = 0, to: number = arr.length) : number {
    for (let i = from; i < to; ++i) {
        if (predicate(arr[i], i, arr)) {
            return i;
        }
    }

    return -1;
}

export function mergeSorted<T>(l1: Array<T>, l2: Array<T>, cmpFn: (a: T, b: T) => number) : Array<T> {
    let res : Array<T> = [];
    let l1Start = 0;
    let l2Start = 0;

    while (l1Start < l1.length && l2Start < l2.length) {
        let l1End = findIndexInRange(l1, (v) => cmpFn(v, l2[l2Start]) > 0, l1Start);
        if (l1End < 0) {
            l1End = l1.length;
        }
        res = res.concat(l1.slice(l1Start, l1End));
        l1Start = l1End;
        if (l1Start >= l1.length) {
            break;
        }

        let l2End = findIndexInRange(l2, (v) => cmpFn(v, l1[l1Start]) > 0, l2Start);
        if (l2End < 0) {
            l2End = l2.length;
        }
        res = res.concat(l2.slice(l2Start, l2End));
        l2Start = l2End;
    }

    if (l1Start < l1.length) {
        res = res.concat(l1.slice(l1Start));
    }

    if (l2Start < l2.length) {
        res = res.concat(l2.slice(l2Start));
    }

    return res
}

}

export default Utils;
