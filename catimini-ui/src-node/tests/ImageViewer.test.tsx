import {act} from 'react';
import ReactDOMClient from 'react-dom/client';
import { describe, expect, test, vi } from 'vitest';
import { mockIPC } from "@tauri-apps/api/mocks";
import { encode as encodePNG } from "fast-png";
import userEvent from '@testing-library/user-event';

import ImageViewer from '../ImageViewer';

declare const window: any;

describe("ImageViewer", () => {
globalThis.URL.createObjectURL = vi.fn((blob: any) => `blob:${blob.size}#t=${Date.now()}`)

function generateRectPNG(width: number, height: number, color: {r: number, g: number, b: number, a: number}) {
    if (color.r < 0 || color.r > 255 || color.g < 0 || color.g > 255
        || color.b < 0 || color.b > 255 ||color.a < 0 || color.a > 255) {
        throw Error("Color values out of range");
    }

    const imgBuffer = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; ++i) {
        imgBuffer[i * 4] = color.r;
        imgBuffer[i * 4 + 1] = color.g;
        imgBuffer[i * 4 + 2] = color.b;
        imgBuffer[i * 4 + 3] = color.a;
    }
    try {
        const pngImage = encodePNG({
            width: width,
            height: height,
            data: imgBuffer
        });
        return pngImage.buffer.slice(pngImage.byteOffset,  pngImage.byteOffset + pngImage.byteLength)
    } catch (e) {
        console.log ("Failed to create png: ", e)
    }
    return null;
}

const bluePng = generateRectPNG(64, 64, {r: 0, g: 0, b: 255, a: 255});
const greenPng = generateRectPNG(64, 64, {r: 0, g: 255, b: 0, a: 255});
const redPng = generateRectPNG(64, 64, {r: 255, g: 0, b: 0, a: 255});
const whitePng = generateRectPNG(64, 64, {r: 255, g: 255, b: 255, a: 255});

mockIPC(async (cmd, args) => {
    if (cmd === "fetch_image") {
        if (args && typeof args === typeof {path: String}) {
            const path = (args as {path: String}).path;
            if (path == "blue.png") {
                return bluePng;
            } else if (path == "green.png") {
                return greenPng;
            } else if (path == "red.png") {
                return redPng;
            } else if (path == "white.png") {
                return whitePng;
            }
        }
    }
    return null;
});

test('should display missing image text for empty image lists', async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
        ReactDOMClient.createRoot(container).render(<ImageViewer imagePaths={[]}/>);
    });

    const buttons = container.getElementsByClassName("viewerbtn");
    expect(buttons.length).toBe(2);
    const noimage = container.getElementsByClassName("viewernoimage");
    expect(noimage.length).toBe(1);
    expect(noimage[0].textContent).toMatch("No Images Found");
});

test('should display single image in image lists', async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    const spy = vi.spyOn(window.__TAURI_INTERNALS__, "invoke");
    await act(async () => {
        ReactDOMClient.createRoot(container).render(<ImageViewer imagePaths={["blue.png"]}/>);
    });

    const buttons = container.getElementsByClassName("viewerbtn");
    expect(buttons.length).toBe(2);
    const image = container.querySelector(".imageview > img");
    expect(image).not.toBeNull();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("fetch_image", {path: "blue.png"}, undefined);
});

test('should not refetch image when clicking previous/next buttons if not switching image', async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    const user = userEvent.setup();

    const spy = vi.spyOn(window.__TAURI_INTERNALS__, "invoke");
    await act(async () => {
        ReactDOMClient.createRoot(container).render(<ImageViewer imagePaths={["blue.png"]}/>);
    });

    const buttons = container.getElementsByClassName("viewerbtn");
    expect(buttons.length).toBe(2);
    const image = container.querySelector(".imageview > img");
    expect(image).not.toBeNull();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("fetch_image", {path: "blue.png"}, undefined);

    await user.click(buttons[0]);
    await user.click(buttons[1]);

    // Ensure no more calls were made
    expect(spy).toHaveBeenCalledOnce();
});


test('should switch image when requested', async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    const user = userEvent.setup();

    const spy = vi.spyOn(window.__TAURI_INTERNALS__, "invoke");
    await act(async () => {
        ReactDOMClient.createRoot(container).render(<ImageViewer imagePaths={["blue.png", "green.png"]}/>);
    });

    const buttons = container.getElementsByClassName("viewerbtn");
    expect(buttons.length).toBe(2);
    const image = container.querySelector(".imageview > img");
    expect(image).not.toBeNull();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("fetch_image", {path: "blue.png"}, undefined);

    await user.click(buttons[0]);
    // Ensure no more calls were made
    expect(spy).toHaveBeenCalledOnce();

    await user.click(buttons[1]);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(2, "fetch_image", {path: "green.png"}, undefined);

    await user.click(buttons[1]);
    // Ensure no more calls were made
    expect(spy).toHaveBeenCalledTimes(2);

    await user.click(buttons[0]);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenNthCalledWith(3, "fetch_image", {path: "blue.png"}, undefined);

    await user.click(buttons[0]);
    // Ensure no more calls were made
    expect(spy).toHaveBeenCalledTimes(3);
});

test('should switch image when requested, 4 items', async () => {
    let container = document.createElement('div');
    document.body.appendChild(container);

    const user = userEvent.setup();

    const spy = vi.spyOn(window.__TAURI_INTERNALS__, "invoke");
    await act(async () => {
        ReactDOMClient.createRoot(container).render(<ImageViewer imagePaths={["white.png", "blue.png", "green.png", "red.png"]}/>);
    });

    const buttons = container.getElementsByClassName("viewerbtn");
    expect(buttons.length).toBe(2);
    const image = container.querySelector(".imageview > img");
    expect(image).not.toBeNull();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("fetch_image", {path: "white.png"}, undefined);

    await user.click(buttons[1]);
    await user.click(buttons[1]);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenNthCalledWith(2, "fetch_image", {path: "blue.png"}, undefined);
    expect(spy).toHaveBeenNthCalledWith(3, "fetch_image", {path: "green.png"}, undefined);

    await user.click(buttons[1]);
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy).toHaveBeenNthCalledWith(4, "fetch_image", {path: "red.png"}, undefined);

    await user.click(buttons[0]);
    await user.click(buttons[0]);
    await user.click(buttons[0]);
    expect(spy).toHaveBeenCalledTimes(7);
    expect(spy).toHaveBeenNthCalledWith(5, "fetch_image", {path: "green.png"}, undefined);
    expect(spy).toHaveBeenNthCalledWith(6, "fetch_image", {path: "blue.png"}, undefined);
    expect(spy).toHaveBeenNthCalledWith(7, "fetch_image", {path: "white.png"}, undefined);
});

});
