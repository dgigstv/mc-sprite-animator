import fs from 'fs';
import nbt from 'prismarine-nbt';
import path from 'path';
import yargs from 'yargs';
import zlib from 'zlib';
import { promisify } from 'util';
import { COLOR_MAP, MAX_FRAMES_PER_SECOND } from './constant';
import { readPNG } from './png';
import { Block, Blocks, DataVersion, Entities, Palette, Palettes, Position, Structure } from './class';
import { readPosition } from './util';

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
        'output': {
            alias: 'o',
            demandOption: true,
            describe: 'Output folder to store files',
            type: 'string',
        },
        'sourceOffset': {
            alias: 'so',
            default: 2,
            demandOption: false,
            describe: 'The space that should be between animation frames',
            type: 'number',
        },
        'sourcePosition': {
            alias: 'sp',
            demandOption: true,
            describe: 'The position to put the animation frames',
            type: 'string',
        },
        'animationPosition': {
            alias: 'ap',
            demandOption: true,
            describe: 'The position to show the animation',
            type: 'string',
        },
        'animationSpeed': {
            alias: 's',
            default: 10,
            demandOption: false,
            describe: 'The speed that the animation should play at (in frames per second)',
            type: 'number',
        },
    })
    .usage('Usage: $0 -f [fileName.nbs] -m [mappings.json]')
    .help();

(async function () {
    const { animationPosition, animationSpeed, output: outputFolder, sourceOffset } = argv;
    const sourcePosition = readPosition(argv.sourcePosition);
    const functionsFolder = path.join(outputFolder, 'functions');
    const structuresFolder = path.join(outputFolder, 'structures');
    const ticksFolder = path.join(functionsFolder, 'ticks');
    const tasks: Promise<void>[] = [];

    if (animationSpeed > MAX_FRAMES_PER_SECOND || MAX_FRAMES_PER_SECOND % animationSpeed !== 0) {
        process.stderr.write(`Animation speed must be less than ${MAX_FRAMES_PER_SECOND} and must ` +
            `divide evently into ${MAX_FRAMES_PER_SECOND}.\n`);
        process.exit(1);
    }

    const tickOffset = MAX_FRAMES_PER_SECOND / animationSpeed;

    // Create output directory
    await fs.promises.mkdir(functionsFolder, { recursive: true });
    await fs.promises.mkdir(ticksFolder, { recursive: true });
    await fs.promises.mkdir(structuresFolder, { recursive: true });

    const animationHandle = await fs.promises.open(path.join(functionsFolder, 'animate.mcfunction'), 'w');
    const createStructureHandle = await fs.promises.open(path.join(functionsFolder, 'create_structure.mcfunction'), 'w');

    try {
        for (let i = 0; i < argv.files.length; i++) {
            const file = argv.files[i];
            const tickFileName = path.join(ticksFolder, `tick_${i}.mcfunction`);
            const structureName = `frame_${i}`;
            const structureFilePath = path.join(structuresFolder, `${structureName}.nbt`);
            const z = sourcePosition.z - (i * sourceOffset);

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

                                let minecraftBlock = COLOR_MAP.get(rgbKey);

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

                        // Write the animation file contents.
                        const tickFileContents = `clone ${sourcePosition.x + 1} ${sourcePosition.y} ${z} ${sourcePosition.x + png.width} ${sourcePosition.y + png.height} ${z} ${animationPosition} replace force\n`;

                        return Promise.all([
                            fs.promises.writeFile(tickFileName, tickFileContents),
                            gzip(nbtBuffer),
                        ]);
                    })
                    .then(([,gz]) => fs.promises.writeFile(structureFilePath, gz)),
            );

            const createStructureBuffer = Buffer.from(`setblock ${sourcePosition.x} ${sourcePosition.y} ${z} minecraft:structure_block[mode=load]{mode:"LOAD", name:"animation:${structureName}"} keep\n`
                    + `setblock ${sourcePosition.x - 1} ${sourcePosition.y} ${sourcePosition.z - (i * sourceOffset)} minecraft:redstone_block destroy\n`);
            await createStructureHandle.write(createStructureBuffer, 0, createStructureBuffer.length);

            let animationBuffer: Buffer;

            if (i === 0) {
                animationBuffer = Buffer.from(`function animation:ticks/tick_${i}\n`);
            } else {
                animationBuffer = Buffer.from(`schedule function animation:ticks/tick_${i} ${i * argv.sourceOffset}t append\n`);
            }

            await animationHandle.write(animationBuffer, 0, animationBuffer.length);
        }

        const animationLoop = Buffer.from(`schedule function animation:animate ${argv.files.length * tickOffset}t append`);

        await Promise.all(tasks);
        await animationHandle.write(animationLoop, 0, animationLoop.length);
    } finally {
        await animationHandle.close();
        await createStructureHandle.close();
    }
})();
