import * as fs from 'fs';
import * as path from 'path';

export function setupTestFileTree(directories : Array<string> = [], images : Array<string> = []) {
    for (let dir of [...directories, ...images.map((e) => path.dirname(e))]) {
        let fullPath = path.join(globalThis.sessionWorkDir, dir);
        if (!fs.existsSync(fullPath)){
            const res =  fs.mkdirSync(fullPath, { recursive: true });
            console.log("Created dir: ", res);
        }
    }

    // TODO: Generate images
}
