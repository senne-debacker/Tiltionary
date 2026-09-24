// Type declarations for gifenc, which ships without its own types.
// Only the parts this app uses are declared.

declare module "gifenc" {
  export type RGB = [number, number, number];

  export type FrameOptions = {
    palette?: RGB[];
    /** Time this frame stays visible, in milliseconds. */
    delay?: number;
    /** -1 plays once, 0 loops forever, a positive number loops that often. */
    repeat?: number;
  };

  export type Encoder = {
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  };

  export function GIFEncoder(): Encoder;
}
