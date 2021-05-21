import fs from 'fs';
import nbt from 'prismarine-nbt';
import yargs from 'yargs';
import zlib from 'zlib';
import { PNG } from 'pngjs';
import { colorMap, isValidColor } from './constant';
import { Block, DataVersion, Entities, Palette, Pos } from './util';

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
    for (const file of argv.files) {
        const states: string[] = ['minecraft:air'];

        fs.createReadStream(file)
            .pipe(new PNG())
            .on('parsed', function () {
                const convert: any = {
                    type: 'compound',
                    name: '',
                    value: {
                        size: Pos(this.width, this.height, 1),
                        entities: Entities(),
                        blocks: {
                            type: 'list',
                            value: {
                                type: 'compound',
                                value: [] as any[],
                            },
                        },
                        palette: {
                            type: 'list',
                            value: {
                                type: 'compound',
                                value: [] as any[],
                            },
                        },
                        DataVersion,
                    },
                };

                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const index = (this.width * y + x) << 2;

                        const r = this.data[index];
                        const g = this.data[index + 1];
                        const b = this.data[index + 2];
                        const rgbKey = `${r},${g},${b}`;
                        const opacity = this.data[index + 3];

                        if (!isValidColor(rgbKey)) {
                            throw new Error(`Invalid color: ${rgbKey}`);
                        }

                        let blockType: string = '';
                        if (opacity === 0) {
                            blockType = 'minecraft:air';
                        } else {
                            blockType = colorMap[rgbKey];
                        }

                        let stateIndex = states.indexOf(blockType);
                        if (stateIndex === -1) {
                            stateIndex = states.length;
                            states.push(blockType);
                        }

                        convert.value.blocks.value.value.push(Block(this.width - x, this.height - y, 0, stateIndex));
                    }
                }

                for (const state of states) {
                    convert.value.palette.value.value.push(Palette(state));
                }

                const nbtBuffer = nbt.writeUncompressed(convert, 'big');
                const zip = zlib.gzipSync(nbtBuffer);

                fs.writeFileSync(`${file}.nbt`, zip);
            });
    }
})();
