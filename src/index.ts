import fs from 'fs';
import nbt from 'prismarine-nbt';
import yargs from 'yargs';
import zlib from 'zlib';
import { promisify } from 'util';
import { colorMap } from './constant';
import { readPNG } from './png';
import { Block, Blocks, DataVersion, Entities, Palette, Palettes, Position, Structure } from './class';

const gzip = promisify(zlib.gzip);

const { argv } = yargs(process.argv.slice(2))
    .options({
        'files': {
            alias: 'f',
            array: true,
            demandOption: true,
            describe: 'Loads an NBS file',
            type: 'string',
        },
    })
    .usage('Usage: $0 -f [fileName.nbs] -m [mappings.json]')
    .help();

(async function () {
    const tasks: Promise<void>[] = [];

    for (const file of argv.files) {
        tasks.push(
            readPNG(fs.createReadStream(file))
                .then((png) => {
                    const nbtStructure = new Structure(
                        new Position(png.width, png.height, 1),
                        new Entities(),
                        new Blocks(),
                        new Palettes(),
                        new DataVersion(),
                    );

                    for (let y = 0; y < png.height; y++) {
                        for (let x = 0; x < png.width; x++) {
                            const index = (png.width * y + x) << 2;

                            const r = png.data[index];
                            const g = png.data[index + 1];
                            const b = png.data[index + 2];
                            const rgbKey = `${r},${g},${b}`;
                            const opacity = png.data[index + 3];

                            let minecraftBlock = colorMap.get(rgbKey);

                            // If 100% transparent, it's air.
                            if (opacity === 0) {
                                minecraftBlock = 'minecraft:air';
                            }

                            // If still no block identified, something didn't map.
                            if (minecraftBlock == null) {
                                throw new Error(`Invalid color: ${rgbKey}`);
                            }

                            const states = nbtStructure.palettes.toArray();
                            let stateIndex = states.indexOf(minecraftBlock);
                            if (stateIndex === -1) {
                                stateIndex = states.length;
                                nbtStructure.palettes.add(new Palette(minecraftBlock));
                            }

                            nbtStructure.blocks.add(
                                new Block(
                                    new Position(png.width - x, png.height - y, 0),
                                    stateIndex,
                                ),
                            );
                        }
                    }

                    // Types for prismarine-nbt are messed up, but the library is still functional.
                    // Cast to 'any' for now.
                    const nbtBuffer = nbt.writeUncompressed(nbtStructure.toNBT() as any, 'big');
                    return gzip(nbtBuffer);
                })
                .then((gz) => fs.promises.writeFile(`${file}.nbt`, gz)),
        );
    }

    await Promise.all(tasks);
})();
