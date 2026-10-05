// يقرأ أبعاد صورة PNG مباشرة من رأس الملف (IHDR) بدون أي مكتبات خارجية.
export function imageSize(buffer) {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}
