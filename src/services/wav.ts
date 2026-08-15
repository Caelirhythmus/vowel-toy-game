/* ============================================================
 * services：WAV 编码（纯函数，Node 可测）
 * Float32 PCM（[-1,1]）→ 16-bit PCM WAV 字节
 * ============================================================ */

function writeString(view: DataView, offset: number, s: string): number {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  return offset + s.length;
}

/**
 * Float32 PCM → 16-bit 单声道 WAV（RIFF）。
 * @param pcm   采样值，范围建议 [-1,1]（超出会被钳制）
 * @param sampleRate 采样率（Piper joe 为 22050）
 */
export function encodeWav16(pcm: Float32Array, sampleRate: number): Uint8Array {
  const n = pcm.length;
  const bytes = new Uint8Array(44 + n * 2);
  const view = new DataView(bytes.buffer);
  let o = 0;
  o = writeString(view, o, 'RIFF');
  view.setUint32(o, 36 + n * 2, true); o += 4;
  o = writeString(view, o, 'WAVE');
  o = writeString(view, o, 'fmt ');
  view.setUint32(o, 16, true); o += 4; // fmt chunk 长度
  view.setUint16(o, 1, true); o += 2; // PCM
  view.setUint16(o, 1, true); o += 2; // 单声道
  view.setUint32(o, sampleRate, true); o += 4;
  view.setUint32(o, sampleRate * 2, true); o += 4; // 字节率
  view.setUint16(o, 2, true); o += 2; // 块对齐
  view.setUint16(o, 16, true); o += 2; // 位深
  o = writeString(view, o, 'data');
  view.setUint32(o, n * 2, true); o += 4;
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(o, Math.round(v * 32767), true);
    o += 2;
  }
  return bytes;
}
