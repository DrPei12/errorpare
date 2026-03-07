export function doThing(): never {
  const value = undefined as unknown as { x: string };
  throw new TypeError(`Cannot read property 'x' of ${value}`);
}
