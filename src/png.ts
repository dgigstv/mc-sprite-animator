import fs from 'fs';
import { PNG } from 'pngjs';

export async function readPNG (stream: fs.ReadStream) {
    return new Promise<PNG>((resolve, reject) => {
        const png = new PNG();

        png.on('parsed', () => {
            resolve(png);
        });

        png.on('error', (err) => {
            reject(err);
        });

        stream.pipe(png);
    })
}
