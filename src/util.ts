export function readPosition (pos: string) {
    const [x, y, z] = pos.split(' ');

    if (x != null && y != null && z != null) {
        return { x: Number(x), y: Number(y), z: Number(z) };
    }

    throw new Error(`Not a valid position: ${pos}`);
}
