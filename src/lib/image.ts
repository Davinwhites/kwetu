export async function compressImageFile(file: File, maxEdge = 640, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a photo or a scan of your ID.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("That file is larger than 8 MB.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (dataUrl.length > 350_000) {
    return canvas.toDataURL("image/jpeg", 0.7);
  }
  return dataUrl;
}
