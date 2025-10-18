import * as fs from 'fs';
import * as path from 'path';
import { encode as encodePNG } from "fast-png";

export function generateRectPNG(width: number, height: number, color: {r: number, g: number, b: number, a: number}) {
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

export function setupTestFileTree(directories : Array<string> = [], images : Array<string> = []) {
    for (let dir of [...directories, ...images.map((e) => path.dirname(e))]) {
        let fullPath = path.join(globalThis.sessionWorkDir, dir);
        if (!fs.existsSync(fullPath)){
            const res =  fs.mkdirSync(fullPath, { recursive: true });
        }
    }

    for (let img of images) {
        let imgPath = path.join(globalThis.sessionWorkDir, img);
        let imgBuff = generateRectPNG(64, 64, {r: 255, g: 255, b: 255, a: 255});
        fs.writeFileSync(imgPath, Buffer.from(imgBuff));
    }
}

export async function expectTitle(title: string, timeout: number = 1000) {
    try {
        await browser.waitUntil(async function () {
            return (await this.getTitle()) === title
        }, {timeout: timeout});
    } catch (_) {}
    await expect(await browser.getTitle()).toBe(title);
}

export async function expectArrayOfSize(e: ChainablePromiseElement, selector: string,
                                        size: number, timeout: number = 1000) : Promise<ChainablePromiseArray> {
    let array : ChainablePromiseArray | null = null;
    try {
        await e.waitUntil(async function () {
            array = (await this.$$(selector));
            return await (array.length) == size
        }, {timeout: timeout});
    } catch (_) {}

    if (!array) {
        array = await e.$$(selector);
    }
    await expect(array).toBeElementsArrayOfSize(size);

    return array;
}
