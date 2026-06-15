import { pipeline, env } from '@huggingface/transformers';

// Cache the pipeline across calls within the same process.
// First call downloads the model (~23MB) and warms the ONNX runtime.
env.allowLocalModels = false;
let _pipe = null;

async function getPipeline() {
  if (!_pipe) {
    _pipe = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { dtype: 'fp32' }
    );
  }
  return _pipe;
}

/**
 * Encode one or more strings into L2-normalised 384-dim float vectors.
 * Returns Float32Array[] (one per input string).
 */
export async function encode(texts) {
  const pipe = await getPipeline();
  const arr = Array.isArray(texts) ? texts : [texts];
  const output = await pipe(arr, { pooling: 'mean', normalize: true });
  // output.tolist() → number[][]
  return output.tolist().map(v => new Float32Array(v));
}

/** Cosine similarity between two L2-normalised vectors (dot product suffices). */
export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Build the text that represents an aesthetic for embedding.
 * Concatenates the most semantically rich fields.
 */
export function aestheticToText(row) {
  const parts = [row.name];
  try { const t = JSON.parse(row.mood_tags || '[]'); if (t.length) parts.push(t.join(', ')); } catch {}
  try { const t = JSON.parse(row.motifs    || '[]'); if (t.length) parts.push(t.join(', ')); } catch {}
  try { const t = JSON.parse(row.color_names || '[]'); if (t.length) parts.push(t.join(', ')); } catch {}
  if (row.description) parts.push(row.description.slice(0, 300));
  return parts.join('. ');
}

/** Serialise a Float32Array to a Buffer for SQLite BLOB storage. */
export function vecToBlob(vec) {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

/** Deserialise a SQLite BLOB back to Float32Array. */
export function blobToVec(blob) {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}
