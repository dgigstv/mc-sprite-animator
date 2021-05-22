interface NBT {
    toNBT(): { [key: string]: any };
}

export class Position implements NBT {
    private _x: number;
    private _y: number;
    private _z: number;

    constructor (x: number, y: number, z: number) {
        this._x = x;
        this._y = y;
        this._z = z;
    }

    toNBT () {
        return {
            type: 'list',
            value: {
                type: 'int',
                value: [this._x, this._y, this._z],
            },
        };
    }
}

export class Block implements NBT {
    private _pos: Position;
    private _state: number;

    constructor (pos: Position, state: number) {
        this._pos = pos;
        this._state = state;
    }

    toNBT () {
        return {
            pos: this._pos.toNBT(),
            state: {
                type: 'int',
                value: this._state,
            },
        };
    }
}

export class Palette implements NBT {
    private _name: string;

    public get name () {
        return this._name;
    }

    constructor (name: string) {
        this._name = name;
    }

    toNBT () {
        return {
            Name: {
                type: 'string',
                value: this._name,
            },
        };
    }
}

export class Blocks implements NBT {
    private _blocks: Block[];

    constructor () {
        this._blocks = [];
    }

    add (block: Block) {
        this._blocks.push(block);
    }

    toNBT () {
        return {
            type: 'list',
            value: {
                type: 'compound',
                value: this._blocks.map((block) => block.toNBT()),
            },
        };
    }
}

export class Palettes implements NBT {
    private _states: Palette[];

    constructor () {
        this._states = [new Palette('minecraft:air')];
    }

    add (palette: Palette) {
        this._states.push(palette);
    }

    toArray () {
        return this._states.map((palette) => palette.name);
    }

    toNBT () {
        return {
            type: 'list',
            value: {
                type: 'compound',
                value: this._states.map((state) => state.toNBT()),
            },
        };
    }
}

export class Entities implements NBT {
    toNBT () {
        return {
            type: 'list',
            value: {
                type: 'end',
                value: [],
            },
        };
    }
}

export class DataVersion implements NBT {
    toNBT () {
        return {
            type: 'int',
            value: 2586,
        };
    }
}

export class Structure implements NBT {
    private _size: Position;
    private _entities: Entities;
    private _blocks: Blocks;
    private _palettes: Palettes;
    private _dataVersion: DataVersion;

    public get size () {
        return this._size;
    }

    public get entities () {
        return this._entities;
    }

    public get blocks () {
        return this._blocks;
    }

    public get palettes () {
        return this._palettes;
    }

    constructor (size: Position, entities: Entities, blocks: Blocks, palettes: Palettes, dataVersion: DataVersion) {
        this._size = size;
        this._entities = entities;
        this._blocks = blocks;
        this._palettes = palettes;
        this._dataVersion = dataVersion;
    }

    toNBT () {
        return {
            type: 'compound',
            name: '',
            value: {
                size: this._size.toNBT(),
                entities: this._entities.toNBT(),
                blocks: this._blocks.toNBT(),
                palette: this._palettes.toNBT(),
                DataVersion: this._dataVersion.toNBT(),
            },
        };
    }
}
