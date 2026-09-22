// src/logic/exportDrawing.js
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

/** Vraagt de <Svg> via zijn ref om zichzelf als base64 PNG te renderen. */
function captureSvgAsBase64(svgRef, { width, height } = {}) {
  return new Promise((resolve, reject) => {
    const node = svgRef?.current;
    if (!node?.toDataURL) {
      reject(new Error("Canvas is niet klaar om te exporteren."));
      return;
    }
    try {
      const options = width && height ? { width, height } : undefined;
      node.toDataURL((base64) => {
        if (!base64) reject(new Error("Leeg resultaat bij het renderen van de tekening."));
        else resolve(base64);
      }, options);
    } catch (error) {
      reject(error);
    }
  });
}

/** Schrijft base64 PNG-data naar een nieuw bestand in de cache-map. */
function writePngFile(base64) {
  const file = new File(Paths.cache, `tiltionary-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: EncodingType.Base64 });
  return file;
}

/**
 * Rendert het canvas naar PNG en slaat het op in de fotobibliotheek.
 * Vraagt (indien nodig) alleen "toevoegen"-toestemming, geen leestoegang.
 */
export async function saveDrawingToLibrary(svgRef, canvasSize) {
  const permission = await requestPermissionsAsync(/* writeOnly */ true);
  if (!permission.granted) {
    return { ok: false, reason: "permission" };
  }

  const base64 = await captureSvgAsBase64(svgRef, canvasSize);
  const file = writePngFile(base64);
  await Asset.create(file.uri);

  return { ok: true };
}

/** Rendert het canvas naar PNG en opent het systeem-deelvenster. */
export async function shareDrawing(svgRef, canvasSize) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return { ok: false, reason: "unavailable" };
  }

  const base64 = await captureSvgAsBase64(svgRef, canvasSize);
  const file = writePngFile(base64);
  await Sharing.shareAsync(file.uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Deel je tekening",
  });

  return { ok: true };
}
