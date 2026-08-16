import { createWorker } from 'tesseract.js';
import { parseReceiptText, type ReceiptLine } from './receiptOcr';

let workerPromise: ReturnType<typeof createWorker> | null = null;

const getWorker = async () => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return workerPromise;
};

export const recognizeReceiptImage = async (imageBase64: string, mimeType = 'image/jpeg') => {
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleaned, 'base64');
  if (buffer.byteLength < 64) {
    throw new Error('Image too small');
  }
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error('Image too large (max 8MB)');
  }

  const worker = await getWorker();
  const dataUrl = `data:${mimeType};base64,${cleaned}`;
  const result = await worker.recognize(dataUrl);
  const rawText = result.data.text || '';
  const lines: ReceiptLine[] = parseReceiptText(rawText);

  return {
    rawText,
    lines,
    confidence: result.data.confidence ?? null,
  };
};
