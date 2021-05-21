interface Block {
    pos: {
        type: 'list';
        value: {
            type: 'int';
            value: [number, number, number];
        };
    };
    state: {
        type: 'int';
        value: number;
    };
}

interface Position {
    type: 'list';
    value: {
        type: 'int';
        value: [number, number, number];
    };
}

export const Block = (x: number, y: number, z: number, state: number): Block => ({
    pos: Pos(x, y, z),
    state: {
        type: 'int',
        value: state,
    },
});

export const Entities = () => ({
    type: 'list',
    value: {
        type: 'int',
        value: [],
    },
});

export const Pos = (x: number, y: number, z: number): Position => ({
    type: 'list',
    value: {
        type: 'int',
        value: [x, y, z],
    },
});

export const Palette = (block: string) => ({
    Name: {
        type: 'string',
        value: block,
    },
});

export const DataVersion = {
    type: 'int',
    value: 2586,
};
