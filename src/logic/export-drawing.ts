// src/logic/export-drawing.ts
// Zet de getekende SVG om in een PNG-bestand, en slaat 'm op / deelt 'm.
//
// react-native-svg's <Svg> heeft zelf een toDataURL(callback, options) methode
// (via ref) die een base64 PNG teruggeeft — dat bespaart ons een extra
// screenshot-library. Die base64 data schrijven we met expo-file-system naar
// een tijdelijk bestand, en dat bestand geven we door aan expo-media-library
// (opslaan in de fotobibliotheek) of expo-sharing (delen).

import { File, Paths, EncodingType } from "expo-file-system";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";

/** Grootte van het canvas; bepaalt de resolutie van de PNG. */
export type CanvasSize = { width: number; height: number } | null;

/**
 * Minimale vorm van react-native-svg's <Svg>: alleen wat wij nodig hebben.
 * De library typeert toDataURL niet in zijn publieke ref-type.
 */
type SvgCapture = { toDataURL?: (cb: (base64: string) => void, options?: object) => void };
type SvgRef = RefObject<SvgCapture | null>;

/** Wat opslaan/delen teruggeeft aan het scherm. */
export type ExportResult = { ok: boolean; reason?: "permission" | "unavailable" };

/** Vraagt de <Svg> via zijn ref om zichzelf als base64 PNG te renderen. */
function captureSvgAsBase64(
  svgRef: SvgRef,
  { width, height }: { width?: number; height?: number } = {},
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const node = svgRef?.current;
    if (!node?.toDataURL) {
      reject(new Error("Canvas is niet klaar om te exporteren."));
      return;
    }
    try {
      const options = width && height ? { width, height } : undefined;
      node.toDataURL((base64: string) => {
        if (!base64) reject(new Error("Leeg resultaat bij het renderen van de tekening."));
        else resolve(base64);
      }, options);
    } catch (error) {
      reject(error);
    }
  });
}

/** Schrijft base64 PNG-data naar een nieuw bestand in de cache-map. */
function writePngFile(base64: string) {
  const file = new File(Paths.cache, `tiltionary-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: EncodingType.Base64 });
  return file;
}

/**
 * Rendert het canvas naar PNG en slaat het op in de fotobibliotheek.
 * Vraagt (indien nodig) alleen "toevoegen"-toestemming, geen leestoegang.
 */
export async function saveDrawingToLibrary(
  svgRef: SvgRef,
  canvasSize: CanvasSize,
): Promise<ExportResult> {
  const permission = await requestPermissionsAsync(/* writeOnly */ true);
  if (!permission.granted) {
    return { ok: false, reason: "permission" };
  }

  const base64 = await captureSvgAsBase64(svgRef, canvasSize ?? {});
  const file = writePngFile(base64);
  await Asset.create(file.uri);

  return { ok: true };
}

/** Rendert het canvas naar PNG en opent het systeem-deelvenster. */
export async function shareDrawing(
  svgRef: SvgRef,
  canvasSize: CanvasSize,
): Promise<ExportResult> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return { ok: false, reason: "unavailable" };
  }

  const base64 = await captureSvgAsBase64(svgRef, canvasSize ?? {});
  const file = writePngFile(base64);
  await Sharing.shareAsync(file.uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Deel je tekening",
  });

  return { ok: true };
}
