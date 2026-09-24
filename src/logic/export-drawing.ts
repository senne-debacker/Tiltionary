// Saves a drawing to the photo library or opens the share sheet, as a still
// PNG or as an animated GIF of how it was drawn.
//
// The PNG comes from react-native-svg's own toDataURL(), which saves a
// screenshot library. The GIF is built in drawing-gif.ts. Both are written to
// a cache file first, because the library and share sheet expect a file.

import { File, Paths, EncodingType } from "expo-file-system";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";
import { encodeDrawingGif } from "@/logic/drawing-gif";
import type { RefObject } from "react";
import type { DrawPath } from "@/types/game";

export type ExportFormat = "png" | "gif";

/** Size of the canvas in points; sets the resolution of the export. */
export type CanvasSize = { width: number; height: number } | null;

/** What the sandbox needs to export the current drawing. */
export type ExportSource = {
  svgRef: SvgRef;
  paths: DrawPath[];
  canvasSize: CanvasSize;
};

/** Result of saving or sharing, so the screen can show the right message. */
export type ExportResult = { ok: boolean; reason?: "permission" | "unavailable" };

/**
 * The part of react-native-svg's Svg that is needed here. The library does
 * not include toDataURL in its public ref type.
 */
type SvgCapture = { toDataURL?: (cb: (base64: string) => void, options?: object) => void };
type SvgRef = RefObject<SvgCapture | null>;

const MIME_TYPES = { png: "image/png", gif: "image/gif" };
const UTIS = { png: "public.png", gif: "com.compuserve.gif" };

/** Asks the Svg to render itself as a base64 PNG. */
function captureSvgAsBase64(svgRef: SvgRef, canvasSize: CanvasSize): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const node = svgRef.current;
    if (!node?.toDataURL) {
      reject(new Error("The canvas is not ready to export."));
      return;
    }
    try {
      node.toDataURL((base64) => {
        if (base64) resolve(base64);
        else reject(new Error("Rendering the drawing returned nothing."));
      }, canvasSize ?? undefined);
    } catch (error) {
      reject(error);
    }
  });
}

/** Renders the drawing in the chosen format and writes it to the cache. */
async function writeExportFile(format: ExportFormat, source: ExportSource): Promise<File> {
  const file = new File(Paths.cache, `tiltionary-${Date.now()}.${format}`);
  file.create({ overwrite: true });

  if (format === "png") {
    const base64 = await captureSvgAsBase64(source.svgRef, source.canvasSize);
    file.write(base64, { encoding: EncodingType.Base64 });
  } else {
    if (!source.canvasSize) throw new Error("The canvas size is unknown.");
    file.write(await encodeDrawingGif(source.paths, source.canvasSize));
  }

  return file;
}

/** Saves the drawing to the photo library. Asks for add-only access. */
export async function saveDrawing(
  format: ExportFormat,
  source: ExportSource,
): Promise<ExportResult> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) return { ok: false, reason: "permission" };

  const file = await writeExportFile(format, source);
  await Asset.create(file.uri);
  return { ok: true };
}

/** Opens the system share sheet with the drawing. */
export async function shareDrawing(
  format: ExportFormat,
  source: ExportSource,
): Promise<ExportResult> {
  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: "unavailable" };

  const file = await writeExportFile(format, source);
  await Sharing.shareAsync(file.uri, {
    mimeType: MIME_TYPES[format],
    UTI: UTIS[format],
    dialogTitle: "Deel je tekening",
  });
  return { ok: true };
}
