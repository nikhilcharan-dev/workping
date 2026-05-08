/**
 * Generates simple WAV tone files for WorkPing in-app sounds.
 * Run once: node scripts/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS = 16;

/**
 * segments: Array of { freq (Hz, 0 = silence), duration (s), amplitude (0–1) }
 * Writes a mono 16-bit PCM WAV to `outPath`.
 */
function writeWav(segments, outPath) {
  const totalSamples = segments.reduce(
    (acc, s) => acc + Math.round(s.duration * SAMPLE_RATE), 0
  );
  const dataBytes = totalSamples * CHANNELS * (BITS / 8);
  const buf = Buffer.alloc(44 + dataBytes, 0);

  // RIFF / WAVE header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);            // chunk size
  buf.writeUInt16LE(1, 20);             // PCM
  buf.writeUInt16LE(CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * CHANNELS * BITS / 8, 28); // byteRate
  buf.writeUInt16LE(CHANNELS * BITS / 8, 32);               // blockAlign
  buf.writeUInt16LE(BITS, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let offset = 44;
  let phase = 0;

  for (const seg of segments) {
    const samples = Math.round(seg.duration * SAMPLE_RATE);
    const amp = (seg.amplitude ?? 0.5) * 32767;
    const fadeIn  = Math.round(Math.min(0.015, seg.duration * 0.15) * SAMPLE_RATE);
    const fadeOut = Math.round(Math.min(0.040, seg.duration * 0.25) * SAMPLE_RATE);

    for (let i = 0; i < samples; i++) {
      let env = 1;
      if (i < fadeIn)              env = i / fadeIn;
      else if (i > samples - fadeOut) env = (samples - i) / fadeOut;

      let sample = 0;
      if (seg.freq > 0) {
        phase += (2 * Math.PI * seg.freq) / SAMPLE_RATE;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
        sample = Math.sin(phase) * env * amp;
      } else {
        phase = 0; // reset phase on silence gap
      }

      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), offset);
      offset += 2;
    }
  }

  fs.writeFileSync(outPath, buf);
  console.log('  wrote', path.basename(outPath), `(${(buf.length / 1024).toFixed(1)} KB)`);
}

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating WorkPing sounds...');

// ── success.wav ── ascending two-note chime: C5 → E5
writeWav([
  { freq: 523, duration: 0.13, amplitude: 0.55 },  // C5
  { freq: 0,   duration: 0.04 },                    // gap
  { freq: 659, duration: 0.28, amplitude: 0.60 },  // E5
], path.join(outDir, 'success.wav'));

// ── retry.wav ── soft downward pair: A4 → F4 (try-again feel)
writeWav([
  { freq: 440, duration: 0.11, amplitude: 0.45 },  // A4
  { freq: 0,   duration: 0.04 },
  { freq: 349, duration: 0.18, amplitude: 0.38 },  // F4
], path.join(outDir, 'retry.wav'));

// ── error.wav ── low double beep: A3 × 2
writeWav([
  { freq: 220, duration: 0.10, amplitude: 0.50 },  // A3
  { freq: 0,   duration: 0.06 },
  { freq: 196, duration: 0.14, amplitude: 0.45 },  // G3
], path.join(outDir, 'error.wav'));

// ── login.wav ── warm ascending triad: C4 → E4 → G4
writeWav([
  { freq: 262, duration: 0.10, amplitude: 0.48 },  // C4
  { freq: 0,   duration: 0.03 },
  { freq: 330, duration: 0.10, amplitude: 0.48 },  // E4
  { freq: 0,   duration: 0.03 },
  { freq: 392, duration: 0.22, amplitude: 0.52 },  // G4
], path.join(outDir, 'login.wav'));

console.log('Done. Files written to assets/sounds/');
