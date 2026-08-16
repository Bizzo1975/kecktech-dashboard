'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, readSession } from '../../../lib/api';
import { writeCoach } from '../../../lib/coach';

type ReviewLine = {
  name: string;
  quantity: number;
  unit: string;
  price: string;
  gtin: string;
  addToList: boolean;
  addToPantry: boolean;
  recordPrice: boolean;
};

type BarcodeNutrition = {
  kcalPer100g: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export default function CapturePage() {
  const [barcode, setBarcode] = useState('');
  const [manualName, setManualName] = useState('');
  const [lines, setLines] = useState<ReviewLine[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [listId, setListId] = useState('');
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [storeId, setStoreId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [barcodeNutrition, setBarcodeNutrition] = useState<BarcodeNutrition | null>(null);
  const [barcodeDisclaimer, setBarcodeDisclaimer] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const loadLists = useCallback(async () => {
    const session = readSession();
    if (!session?.householdId) return;
    const listRes = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
      `/lists?householdId=${session.householdId}`,
      { token: session.accessToken },
    );
    if (listRes.success) {
      setLists(listRes.data.lists);
      setListId((prev) => prev || listRes.data.lists[0]?.id || '');
    }
    const storeRes = await apiFetch<{ stores: Array<{ id: string; name: string }> }>(
      `/prices/stores?householdId=${session.householdId}`,
      { token: session.accessToken },
    );
    if (storeRes.success) {
      setStores(storeRes.data.stores);
      setStoreId((prev) => prev || storeRes.data.stores[0]?.id || '');
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const needsStore = lines.some((line) => line.recordPrice);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const pushLine = (name: string, options?: { price?: number | null; gtin?: string }) => {
    if (!name.trim()) return;
    setLines((prev) => [
      ...prev,
      {
        name: name.trim(),
        quantity: 1,
        unit: '',
        price: options?.price != null && options.price > 0 ? String(options.price) : '',
        gtin: options?.gtin || '',
        addToList: true,
        addToPantry: false,
        recordPrice: options?.price != null && options.price > 0,
      },
    ]);
  };

  const pushSpokenItems = (transcript: string) => {
    const parts = transcript
      .split(/,| and /i)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const name of parts) pushLine(name);
    if (parts.length > 0) {
      writeCoach({ usedCapture: true });
      showToast(`Added ${parts.length} spoken item${parts.length === 1 ? '' : 's'} to review`);
    }
  };

  const handleStartSpeech = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      showToast('Speech dictation is not supported in this browser');
      return;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) pushSpokenItems(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      showToast(event.error || 'Speech recognition failed');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const handleStopSpeech = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      setListening(false);
    }
  };

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    const session = readSession();
    if (!session || !barcode.trim()) return;
    setBusy(true);
    const res = await apiFetch<{
      found: boolean;
      name?: string;
      barcode: string;
      gtin?: string;
      nutrition?: BarcodeNutrition;
      disclaimer?: string;
    }>('/capture/barcode', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ barcode: barcode.trim() }),
    });
    setBusy(false);
    if (!res.success) {
      showToast(res.error.message);
      return;
    }
    if (!res.data.found || !res.data.name) {
      showToast(`No product for ${res.data.barcode} — add a name in review`);
      pushLine(`Unknown (${res.data.barcode})`, { gtin: res.data.barcode });
      setBarcodeNutrition(null);
      setBarcodeDisclaimer(null);
      writeCoach({ usedCapture: true });
      return;
    }
    pushLine(res.data.name, { gtin: res.data.gtin || res.data.barcode });
    setBarcodeNutrition(res.data.nutrition || null);
    setBarcodeDisclaimer(res.data.disclaimer || null);
    setBarcode('');
    writeCoach({ usedCapture: true });
    showToast('Added to review');
  };

  const handleReceiptOcr = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const session = readSession();
    if (!file || !session) return;
    setBusy(true);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await apiFetch<{
        lines: Array<string | { name: string; price: number | null }>;
        lineCount: number;
      }>('/capture/ocr', {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({
          imageBase64,
          mimeType: file.type || 'image/jpeg',
        }),
      });
      if (!res.success) {
        showToast(res.error.message);
        return;
      }
      if (res.data.lines.length === 0) {
        showToast('No grocery lines detected — add manually');
        return;
      }
      for (const line of res.data.lines) {
        if (typeof line === 'string') {
          pushLine(line);
        } else {
          pushLine(line.name, { price: line.price });
        }
      }
      writeCoach({ usedCapture: true });
      showToast(`OCR found ${res.data.lineCount} lines — review prices before save`);
    } finally {
      setBusy(false);
    }
  };

  const handleAddManual = (event: FormEvent) => {
    event.preventDefault();
    if (!manualName.trim()) return;
    pushLine(manualName);
    setManualName('');
  };

  const handleUpdateLine = (index: number, patch: Partial<ReviewLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    const session = readSession();
    if (!session) return;
    if (lines.length === 0) {
      showToast('Add lines to review first');
      return;
    }
    if (!listId && lines.some((l) => l.addToList)) {
      showToast('Select a list for list-bound lines');
      return;
    }
    const recordingPrice = lines.some((l) => l.recordPrice && Boolean(l.price));
    if (recordingPrice && !storeId) {
      showToast('Select a store for recorded prices');
      return;
    }
    setBusy(true);
    const result = await apiFetch<{
      listItems: unknown[];
      pantryItems: unknown[];
      priceEntries: unknown[];
    }>('/capture/review', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        listId: listId || undefined,
        storeId: recordingPrice ? storeId || undefined : undefined,
        householdId: session.householdId || undefined,
        lines: lines.map((line) => ({
          name: line.name,
          quantity: line.quantity || 1,
          unit: line.unit || null,
          price: line.price ? Number(line.price) : undefined,
          gtin: line.gtin.trim() || undefined,
          addToList: line.addToList,
          addToPantry: line.addToPantry,
          recordPrice: line.recordPrice && Boolean(line.price),
        })),
      }),
    });
    setBusy(false);
    if (!result.success) {
      showToast(result.error.message);
      return;
    }
    setLines([]);
    setBarcodeNutrition(null);
    setBarcodeDisclaimer(null);
    writeCoach({ usedCapture: true });
    showToast('Capture saved');
  };

  return (
    <div className="stack">
      <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Capture</h1>
      <p className="muted">
        Barcode lookup, receipt OCR, and browser speech when supported — always review before save.
      </p>

      <div className="field">
        <label htmlFor="capture-list">Target list</label>
        <select
          id="capture-list"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          aria-label="Select list for capture review"
        >
          <option value="">Select a list...</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {needsStore ? (
        <div className="field">
          <label htmlFor="capture-store">Store for prices</label>
          <select
            id="capture-store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            aria-label="Select store for recorded prices"
            required
          >
            <option value="">Select a store...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          {stores.length === 0 ? (
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Add a store under Prices before recording capture prices.
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="card stack" onSubmit={handleLookup}>
        <div className="field">
          <label htmlFor="barcode">Barcode</label>
          <input
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Look up → review'}
        </button>
        {barcodeNutrition ? (
          <div className="stack" aria-label="Barcode nutrition per 100g">
            <strong style={{ fontSize: '0.95rem' }}>Nutrition (per 100g)</strong>
            <p className="muted" style={{ margin: 0 }}>
              {barcodeNutrition.kcalPer100g != null ? `${Math.round(barcodeNutrition.kcalPer100g)} kcal` : '—'}
              {barcodeNutrition.proteinG != null ? ` · P ${Math.round(barcodeNutrition.proteinG)}g` : ''}
              {barcodeNutrition.carbG != null ? ` · C ${Math.round(barcodeNutrition.carbG)}g` : ''}
              {barcodeNutrition.fatG != null ? ` · F ${Math.round(barcodeNutrition.fatG)}g` : ''}
            </p>
            {barcodeDisclaimer ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                {barcodeDisclaimer}
              </p>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className="card stack">
        <div className="field">
          <label htmlFor="receipt-ocr">Receipt photo (OCR)</label>
          <input
            id="receipt-ocr"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleReceiptOcr}
            disabled={busy}
            aria-label="Upload receipt photo for OCR"
          />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Runs server-side OCR. Detected line prices are preserved in review — edit before save.
        </p>
      </div>

      <div className="card stack">
        <strong>Speak items</strong>
        {speechSupported ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Uses the Web Speech API. Spoken phrases split on commas / &quot;and&quot; into review lines.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={listening ? handleStopSpeech : handleStartSpeech}
              aria-pressed={listening}
              aria-label={listening ? 'Stop listening' : 'Start speech dictation'}
            >
              {listening ? 'Listening… tap to stop' : 'Start dictation'}
            </button>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Speech dictation isn&apos;t available in this browser. Use barcode, OCR, or type a manual
            line below.
          </p>
        )}
      </div>

      <form className="card stack" onSubmit={handleAddManual}>
        <div className="field">
          <label htmlFor="manual-line">Manual line</label>
          <input
            id="manual-line"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Item name"
          />
        </div>
        <button className="btn btn-secondary" type="submit">
          Add to review
        </button>
      </form>

      <section className="stack" aria-label="Review lines">
        <h2 style={{ margin: 0 }}>Review</h2>
        {lines.length === 0 ? (
          <div className="empty card">
            <h2>Nothing to review</h2>
            <p>Look up a barcode, run OCR, dictate, or add a manual line — then confirm before posting.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => document.getElementById('manual-line')?.focus()}
            >
              Add a manual line
            </button>
          </div>
        ) : (
          lines.map((line, index) => (
            <div key={`${line.name}-${index}`} className="card stack">
              <div className="field">
                <label htmlFor={`line-name-${index}`}>Name</label>
                <input
                  id={`line-name-${index}`}
                  value={line.name}
                  onChange={(e) => handleUpdateLine(index, { name: e.target.value })}
                />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor={`line-qty-${index}`}>Qty</label>
                  <input
                    id={`line-qty-${index}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={line.quantity}
                    onChange={(e) =>
                      handleUpdateLine(index, { quantity: Number(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor={`line-unit-${index}`}>Unit</label>
                  <input
                    id={`line-unit-${index}`}
                    value={line.unit}
                    onChange={(e) => handleUpdateLine(index, { unit: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor={`line-price-${index}`}>Price</label>
                  <input
                    id={`line-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.price}
                    onChange={(e) => handleUpdateLine(index, { price: e.target.value })}
                    aria-label={`Price for ${line.name}`}
                  />
                </div>
              </div>
              {line.gtin ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                  GTIN: {line.gtin}
                </p>
              ) : null}
              <div className="row">
                <label className="row" style={{ gap: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={line.addToList}
                    onChange={(e) => handleUpdateLine(index, { addToList: e.target.checked })}
                  />
                  List
                </label>
                <label className="row" style={{ gap: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={line.addToPantry}
                    onChange={(e) => handleUpdateLine(index, { addToPantry: e.target.checked })}
                  />
                  Pantry
                </label>
                <label className="row" style={{ gap: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={line.recordPrice}
                    onChange={(e) => handleUpdateLine(index, { recordPrice: e.target.checked })}
                  />
                  Price
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => handleRemoveLine(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
        {lines.length > 0 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitReview}
            disabled={busy}
            aria-label="Submit capture review"
          >
            {busy ? 'Saving…' : 'Save review'}
          </button>
        ) : null}
      </section>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
