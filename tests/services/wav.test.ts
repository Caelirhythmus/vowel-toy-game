import { describe, expect, it } from 'vitest';
import { encodeWav16 } from '@/services/wav';

function readHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer);
  const s = (o: number, n: number) =>
    String.fromCharCode(...Array.from(bytes.slice(o, o + n)));
  return {
    riff: s(0, 4),
    size: view.getUint32(4, true),
    wave: s(8, 4),
    fmt: s(12, 4),
    audioFormat: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bits: view.getUint16(34, true),
    data: s(36, 4),
    dataSize: view.getUint32(40, true)
  };
}

describe('encodeWav16', () => {
  it('头部与长度正确（RIFF/WAVE/fmt/data，单声道 16bit）', () => {
    const pcm = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const wav = encodeWav16(pcm, 22050);
    const h = readHeader(wav);
    expect(h.riff).toBe('RIFF');
    expect(h.wave).toBe('WAVE');
    expect(h.fmt).toBe('fmt ');
    expect(h.audioFormat).toBe(1);
    expect(h.channels).toBe(1);
    expect(h.sampleRate).toBe(22050);
    expect(h.bits).toBe(16);
    expect(h.data).toBe('data');
    expect(h.dataSize).toBe(pcm.length * 2);
    expect(wav.length).toBe(44 + pcm.length * 2);
  });

  it('采样值量化与钳制', () => {
    const pcm = new Float32Array([1, -1, 0, 0.5, -0.5, 2, -2]);
    const wav = encodeWav16(pcm, 22050);
    const view = new DataView(wav.buffer);
    const samples = Array.from({ length: pcm.length }, (_, i) => view.getInt16(44 + i * 2, true));
    expect(samples[0]).toBe(32767); // 1 → 满幅
    expect(samples[1]).toBe(-32767); // -1 → 负满幅
    expect(samples[2]).toBe(0);
    expect(samples[3]).toBe(Math.round(0.5 * 32767));
    expect(samples[4]).toBe(Math.round(-0.5 * 32767));
    expect(samples[5]).toBe(32767); // 2 → 钳制
    expect(samples[6]).toBe(-32767); // -2 → 钳制
  });
});
