import fs from 'fs';
import nbt from 'prismarine-nbt';
import zlib from 'zlib';
import { PNG } from 'pngjs';
import { colorMap, isValidColor } from './constant';
import { Block, DataVersion, Entities, Palette, Pos } from './util';

// import yargs from 'yargs';

// const { argv } = yargs(process.argv.slice(2))
//     .options({
//         'file': {
//             alias: 'f',
//             array: true,
//             demandOption: true,
//             describe: 'Loads PNG file',
//             type: 'string',
//         },
//     })
//     .usage('Usage: $0 -f first.png,second.png')
//     .help();

(async function () {
    // const nbtTestData = {
    //     size: [3, 1, 1],
    //     entities: [],
    //     blocks: [
    //         {
    //             pos: [0, 0, 0],
    //             state: 0,
    //         },
    //         {
    //             pos: [1, 0, 0],
    //             state: 1,
    //         },
    //         {
    //             pos: [2, 0, 0],
    //             state: 2,
    //         },
    //     ],
    //     palette: [
    //         {
    //             Name: 'minecraft:red_wool',
    //         },
    //         {
    //             Name: 'minecraft:white_wool',
    //         },
    //         {
    //             Name: 'minecraft:blue_wool',
    //         },
    //     ],
    //     DataVersion: 2586,
    // };
    // const nbtTestData: any = {
    //     type: 'compound',
    //     name: '',
    //     value: {
    //         size: {
    //             type: 'list',
    //             value: {
    //                 type: 'int',
    //                 value: [3, 1, 1],
    //             },
    //         },
    //         entities: {
    //             type: 'list',
    //             value: {
    //                 type: 'end',
    //                 value: [],
    //             },
    //         },
    //         blocks: {
    //             type: 'list',
    //             value: {
    //                 type: 'compound',
    //                 value: [
    //                     {
    //                         pos: {
    //                             type: 'list',
    //                             value: {
    //                                 type: 'int',
    //                                 value: [0, 0, 0],
    //                             }
    //                         },
    //                         state: {
    //                             type: 'int',
    //                             value: 0,
    //                         },
    //                     },
    //                     {
    //                         pos: {
    //                             type: 'list',
    //                             value: {
    //                                 type: 'int',
    //                                 value: [1, 0, 0],
    //                             }
    //                         },
    //                         state: {
    //                             type: 'int',
    //                             value: 1,
    //                         },
    //                     },
    //                     {
    //                         pos: {
    //                             type: 'list',
    //                             value: {
    //                                 type: 'int',
    //                                 value: [2, 0, 0],
    //                             }
    //                         },
    //                         state: {
    //                             type: 'int',
    //                             value: 2,
    //                         },
    //                     },
    //                 ],
    //             },
    //         },
    //         palette: {
    //             type: 'list',
    //             value: {
    //                 type: 'compound',
    //                 value: [
    //                     {
    //                         Name: {
    //                             type: 'string',
    //                             value: 'minecraft:red_wool',
    //                         },
    //                     },
    //                     {
    //                         Name: {
    //                             type: 'string',
    //                             value: 'minecraft:white_wool',
    //                         },
    //                     },
    //                     {
    //                         Name: {
    //                             type: 'string',
    //                             value: 'minecraft:blue_wool',
    //                         },
    //                     },
    //                 ],
    //             },
    //         },
    //         DataVersion: {
    //             type: 'int',
    //             value: 2586,
    //         },
    //     },
    // };

    // const nbtBuffer = await fs.readFile('tockstest.nbt');
    // const { parsed, type } = await nbt.parse(nbtBuffer);
    // console.log(`Type: ${type}`);
    // console.log(JSON.stringify(parsed, null, 2));

    // const read = await fs.readFile('test.json', { encoding: 'utf-8' });
    // const nbtTestData = JSON.parse(read);

    // const handle = await fs.open('output.nbt', 'w');
    // const nbtBuffer = nbt.writeUncompressed(nbtTestData, 'big');

    // await handle.write(nbtBuffer);
    // await handle.close();

    const states: string[] = ['minecraft:air'];

    fs.createReadStream('sprite_0.png')
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

            fs.writeFileSync('output.nbt', zip);
        });
})();
