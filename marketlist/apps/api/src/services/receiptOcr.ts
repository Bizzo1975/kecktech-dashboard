const NOISE =
  /^(total|subtotal|tax|visa|mastercard|amex|change|cash|debit|credit|thank|tel|phone|store|receipt|invoice|date|time|card|auth|approved|balance|savings|member|#|\*+)/i;

const PRICE_TAIL = /\s+\$?(\d+[.,]\d{2})\s*[A-Z]?$/i;
const ALL_CAPS_HEADER = /^[A-Z0-9][A-Z0-9\s&.'-]{2,}$/;

export type ReceiptLine = {
  name: string;
  price: number | null;
};

export const parseReceiptText = (rawText: string): ReceiptLine[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const items: ReceiptLine[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.length < 3 || line.length > 80) continue;
    if (NOISE.test(line)) continue;
    if (/^\d+[\/.\-]\d+/.test(line)) continue;
    if (/^[\d\s.$€£¥%,.-]+$/.test(line)) continue;
    if (!/[a-zA-Z]{2,}/.test(line)) continue;
    if (ALL_CAPS_HEADER.test(line) && !PRICE_TAIL.test(line) && !/\d/.test(line)) continue;

    const priceMatch = line.match(PRICE_TAIL);
    const price = priceMatch
      ? Number(priceMatch[1].replace(',', '.'))
      : null;

    let name = line.replace(PRICE_TAIL, '').trim();
    name = name.replace(/^\d+\s*[xX]\s*/, '').trim();
    name = name.replace(/\s{2,}/g, ' ');
    if (name.length < 2 || NOISE.test(name)) continue;
    if (ALL_CAPS_HEADER.test(name) && !/\d/.test(name) && name.split(' ').length <= 4) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      name,
      price: price !== null && Number.isFinite(price) && price > 0 ? price : null,
    });
    if (items.length >= 40) break;
  }

  return items;
};
