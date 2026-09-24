// Turns a drawing into an animated GIF that replays how it was drawn.
//
// The lines are painted straight into a pixel buffer instead of taking a
// screenshot per frame. Every pixel stores an index into a fixed palette of
// the canvas background plus the ink colors, which is exactly what a GIF
// frame needs, so no color conversion is required.

import { GIFEncoder, type RGB } from "gifenc";
import { canvas, INK_COLORS } from "@/constants/theme";
import type { DrawPath, Point } from "@/types/game";

/** Longest side of the GIF in pixels. Bigger looks sharper but saves slower. */
const MAX_SIZE = 480;
/** Line width on the canvas, matching the strokeWidth in DrawingCanvas. */
const STROKE_WIDTH = 6;
/** Number of frames that show the drawing being made. */
const FRAME_COUNT = 45;
const FRAME_DELAY_MS = 70;
/** How long the finished drawing stays on screen before the GIF loops. */
const FINAL_DELAY_MS = 2500;

const PALETTE_HEX = [canvas.background, ...INK_COLORS];
const PALETTE: RGB[] = PALETTE_HEX.map(hexToRgb);

function hexToRgb(hex: string): RGB {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Palette index for a line color. Unknown colors use the first ink. */
function paletteIndex(color: string): number {
  const index = PALETTE_HEX.findIndex((hex) => hex.toLowerCase() === color?.toLowerCase());
  return index > 0 ? index : 1;
}

/** Lets the UI thread update, so a spinner keeps moving while encoding. */
const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Paints one round brush dot into the pixel buffer. */
function stamp(
  pixels: Uint8Array,
  width: number,
  height: number,
  center: Point,
  radius: number,
  color: number,
) {
  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(width - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(height - 1, Math.ceil(center.y + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - center.x;
      const dy = y + 0.5 - center.y;
      if (dx * dx + dy * dy <= radiusSquared) pixels[y * width + x] = color;
    }
  }
}

/** Paints a line segment by placing brush dots close together along it. */
function paintSegment(
  pixels: Uint8Array,
  width: number,
  height: number,
  from: Point,
  to: Point,
  radius: number,
  color: number,
) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / Math.max(0.5, radius / 2)));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    stamp(pixels, width, height, point, radius, color);
  }
}

/**
 * Encodes the drawing as an animated GIF, in the order it was drawn.
 * `canvasSize` is the size of the canvas the points were recorded on.
 */
export async function encodeDrawingGif(
  paths: DrawPath[],
  canvasSize: { width: number; height: number },
): Promise<Uint8Array> {
  const scale = MAX_SIZE / Math.max(canvasSize.width, canvasSize.height);
  const width = Math.round(canvasSize.width * scale);
  const height = Math.round(canvasSize.height * scale);
  const radius = Math.max(1, (STROKE_WIDTH / 2) * scale);

  // Index 0 is the canvas background, so a new buffer starts out empty.
  const pixels = new Uint8Array(width * height);
  const gif = GIFEncoder();
  let frameIndex = 0;

  const writeFrame = (delay: number) => {
    gif.writeFrame(pixels, width, height, {
      palette: frameIndex === 0 ? PALETTE : undefined,
      delay,
      repeat: 0,
    });
    frameIndex += 1;
  };

  const totalPoints = paths.reduce((sum, path) => sum + path.points.length, 0);
  const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / FRAME_COUNT));
  let pointsInFrame = 0;

  // Frames are cut by point count, so a long line takes longer in the replay,
  // just like it did while drawing.
  for (const path of paths) {
    const color = paletteIndex(path.color);
    let previous: Point | null = null;

    for (const raw of path.points) {
      const point = { x: raw.x * scale, y: raw.y * scale };
      paintSegment(pixels, width, height, previous ?? point, point, radius, color);
      previous = point;

      pointsInFrame += 1;
      if (pointsInFrame < pointsPerFrame) continue;
      pointsInFrame = 0;
      writeFrame(FRAME_DELAY_MS);
      await nextTick();
    }
  }

  writeFrame(FINAL_DELAY_MS);
  gif.finish();
  return gif.bytes();
}
