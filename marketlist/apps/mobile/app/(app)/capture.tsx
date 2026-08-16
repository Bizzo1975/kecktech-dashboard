import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Button, TextField, EmptyState, Sheet } from '../../src/components/ui';
import { LifestyleDisclaimer } from '../../src/components/nutrition';
import { apiFetch } from '../../src/lib/api';
import { writeCoach } from '../../src/lib/coach';
import { RootState } from '../../src/store';

type ReviewLine = {
  name: string;
  quantity: number;
  unit: string;
  price: string;
  addToList: boolean;
  addToPantry: boolean;
  recordPrice: boolean;
};

type StoreRow = { id: string; name: string };

type BarcodeNutrition = {
  kcalPer100g: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
};

const emptyLine = (overrides?: Partial<ReviewLine>): ReviewLine => ({
  name: '',
  quantity: 1,
  unit: '',
  price: '',
  addToList: true,
  addToPantry: false,
  recordPrice: false,
  ...overrides,
});

export default function CaptureScreen() {
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [barcode, setBarcode] = useState('');
  const [dictate, setDictate] = useState('');
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('Review items');
  const [sheetHint, setSheetHint] = useState<string | null>(null);
  const [reviewLines, setReviewLines] = useState<ReviewLine[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [barcodeNutrition, setBarcodeNutrition] = useState<{
    name: string;
    nutrition: BarcodeNutrition;
    disclaimer: string;
  } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [online, setOnline] = useState(true);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript?.trim();
    if (text) setDictate(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    Alert.alert('Speech recognition', event.message || event.error || 'Recognition failed');
  });

  const loadLists = useCallback(async () => {
    if (!accessToken || !householdId) return;
    const res = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
      `/lists?householdId=${householdId}`,
      { token: accessToken },
    );
    if (res.success) {
      setLists(res.data.lists);
      setSelectedListId((current) => current || res.data.lists[0]?.id || null);
    }
    const storeRes = await apiFetch<{ stores: StoreRow[] }>(
      `/prices/stores?householdId=${householdId}`,
      { token: accessToken },
    );
    if (storeRes.success) {
      setStores(storeRes.data.stores);
      setSelectedStoreId((current) => current || storeRes.data.stores[0]?.id || null);
    }
  }, [accessToken, householdId]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
      })();
      const netSub = Network.addNetworkStateListener((state) => {
        setOnline(Boolean(state.isConnected));
      });
      loadLists();
      return () => netSub.remove();
    }, [loadLists]),
  );

  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // module may be unavailable in Expo Go
      }
    };
  }, []);

  const openReview = (
    title: string,
    lines: Array<{ name: string; quantity?: number; price?: number | null }>,
    hint?: string,
  ) => {
    setSheetTitle(title);
    setSheetHint(hint || null);
    setReviewLines(
      lines.length
        ? lines.map((line) =>
            emptyLine({
              name: line.name,
              quantity: line.quantity || 1,
              price: line.price != null && line.price > 0 ? String(line.price) : '',
              recordPrice: line.price != null && line.price > 0,
            }),
          )
        : [emptyLine()],
    );
    setSheetOpen(true);
    void writeCoach({ usedCapture: true });
  };

  const handleLookup = async (code?: string) => {
    const value = (code || barcode).trim();
    if (!accessToken || !value) return;
    const res = await apiFetch<{
      found: boolean;
      name?: string;
      barcode: string;
      nutrition?: BarcodeNutrition;
      disclaimer?: string;
    }>('/capture/barcode', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ barcode: value }),
    });
    if (!res.success) {
      Alert.alert('Lookup failed', res.error.message);
      return;
    }
    if (!res.data.found || !res.data.name) {
      setBarcodeNutrition(null);
      setResult(`No product for ${res.data.barcode}`);
      openReview('Barcode item', [{ name: '', quantity: 1 }], 'No match found — enter a name manually.');
      return;
    }
    setResult(res.data.name);
    if (res.data.nutrition?.kcalPer100g != null) {
      setBarcodeNutrition({
        name: res.data.name,
        nutrition: res.data.nutrition,
        disclaimer:
          res.data.disclaimer ||
          'Nutrition from Open Food Facts when available — lifestyle information, not medical advice.',
      });
    } else {
      setBarcodeNutrition(null);
    }
    openReview('Barcode item', [{ name: res.data.name, quantity: 1 }]);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        Alert.alert('Camera permission needed to scan barcodes');
        return;
      }
    }
    setScanning(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    setBarcode(data);
    handleLookup(data);
  };

  const handlePickReceipt = async () => {
    if (!accessToken) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets[0]?.base64) {
      Alert.alert('No image', 'Pick a receipt photo to run OCR.');
      return;
    }
    const asset = picked.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    setOcrLoading(true);
    setResult('Reading receipt…');
    try {
      const res = await apiFetch<{
        lines: Array<{ name: string; price: number | null } | string>;
        lineCount: number;
        confidence: number | null;
      }>('/capture/ocr', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType,
        }),
      });
      if (!res.success) {
        Alert.alert('OCR failed', res.error.message);
        openReview('Receipt items', [], 'OCR failed — add lines manually.');
        return;
      }
      const parsedLines = res.data.lines.map((line) => {
        if (typeof line === 'string') {
          return { name: line, quantity: 1, price: null as number | null };
        }
        return { name: line.name, quantity: 1, price: line.price };
      });
      const pricedCount = parsedLines.filter((l) => l.price != null && l.price > 0).length;
      setResult(
        parsedLines.length
          ? `Found ${parsedLines.length} line${parsedLines.length === 1 ? '' : 's'}${
              pricedCount ? ` · ${pricedCount} with prices` : ''
            } (review before adding)`
          : 'No grocery lines detected — add manually',
      );
      openReview(
        'Receipt items',
        parsedLines,
        parsedLines.length
          ? 'Edit names and prices if needed. Toggle Pantry / Price per line before confirming.'
          : 'Could not detect line items — type them in.',
      );
    } finally {
      setOcrLoading(false);
    }
  };

  const handleStartListening = async () => {
    try {
      const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Microphone / speech permission needed for dictation');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      Alert.alert(
        'Needs a development build',
        'On-device speech recognition requires a custom development build (npx expo run:android / run:ios). Expo Go is not enough. You can still type items or use your keyboard mic.',
      );
    }
  };

  const handleStopListening = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
    }
  };

  const handleDictateReview = () => {
    if (!dictate.trim()) return;
    const parts = dictate
      .split(/,| and /i)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1 }));
    openReview('Dictated items', parts);
  };

  const handleAddLine = () => {
    setReviewLines((prev) => [...prev, emptyLine()]);
  };

  const handleUpdateLine = (index: number, patch: Partial<ReviewLine>) => {
    setReviewLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const handleToggleFlag = (
    index: number,
    key: 'addToList' | 'addToPantry' | 'recordPrice',
  ) => {
    setReviewLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [key]: !line[key] } : line)),
    );
  };

  const handleConfirm = async () => {
    if (!accessToken) return;
    const lines = reviewLines
      .map((l) => ({ ...l, name: l.name.trim() }))
      .filter((l) => l.name.length > 0);
    if (lines.length === 0) {
      Alert.alert('Add at least one line');
      return;
    }
    if (lines.some((l) => l.addToList) && !selectedListId) {
      Alert.alert('Choose a list', 'Select which shopping list to add items to.');
      setListPickerOpen(true);
      return;
    }
    const recordingPrice = lines.some((l) => l.recordPrice && Boolean(l.price));
    if (recordingPrice && !selectedStoreId) {
      Alert.alert('Choose a store', 'Select a store when recording prices.');
      setStorePickerOpen(true);
      return;
    }
    const res = await apiFetch('/capture/review', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        listId: selectedListId || undefined,
        storeId: recordingPrice ? selectedStoreId || undefined : undefined,
        householdId: householdId || undefined,
        lines: lines.map((l) => ({
          name: l.name,
          quantity: l.quantity || 1,
          unit: l.unit.trim() || null,
          price: l.price ? Number(l.price) : undefined,
          addToList: l.addToList,
          addToPantry: l.addToPantry,
          recordPrice: l.recordPrice && Boolean(l.price),
        })),
      }),
    });
    if (!res.success) {
      Alert.alert('Review failed', res.error.message);
      return;
    }
    await writeCoach({
      usedCapture: true,
      ...(lines.some((l) => l.addToPantry) ? { addedPantry: true } : {}),
      ...(recordingPrice ? { recordedPrice: true } : {}),
    });
    setSheetOpen(false);
    setDictate('');
    const listN = lines.filter((l) => l.addToList).length;
    const pantryN = lines.filter((l) => l.addToPantry).length;
    const priceN = lines.filter((l) => l.recordPrice && Boolean(l.price)).length;
    setResult(
      [
        listN ? `List +${listN}` : null,
        pantryN ? `Pantry +${pantryN}` : null,
        priceN ? `Prices +${priceN}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Review saved',
    );
  };

  const selectedListName = lists.find((l) => l.id === selectedListId)?.name;
  const selectedStoreName = stores.find((s) => s.id === selectedStoreId)?.name;

  if (scanning) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View className="absolute bottom-10 left-4 right-4">
          <Button label="Cancel scan" variant="secondary" onPress={() => setScanning(false)} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface px-4 py-4 dark:bg-surface-dark">
      {!online ? (
        <View className="-mx-4 mb-3 bg-danger px-4 py-3" accessibilityRole="alert">
          <Text className="font-ui-bold text-base text-white">
            Capture requires a connection
          </Text>
          <Text className="mt-1 font-ui text-sm text-white/90">
            Barcode, OCR, and review stay online-only — reconnect to scan or import.
          </Text>
        </View>
      ) : null}
      <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">Capture</Text>
      <Text className="mb-4 font-ui text-ink-muted dark:text-ink-muted-dark">
        Barcode and receipt OCR work here. Speech needs a development build — not Expo Go.
      </Text>

      <View className="mb-4 gap-2 rounded-xl border border-border bg-white px-3 py-3 dark:border-border-dark dark:bg-surface-dark-elevated">
        <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
          Destination list
        </Text>
        <Text className="font-ui-bold text-ink dark:text-ink-on-dark">
          {selectedListName || 'None selected'}
        </Text>
        <Button label="Choose list" variant="secondary" onPress={() => setListPickerOpen(true)} />
        {stores.length > 0 ? (
          <>
            <Text className="mt-2 font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
              Store for price memory
            </Text>
            <Text className="font-ui-bold text-ink dark:text-ink-on-dark">
              {selectedStoreName || 'None selected'}
            </Text>
            <Button
              label="Choose store"
              variant="secondary"
              onPress={() => setStorePickerOpen(true)}
            />
          </>
        ) : null}
      </View>

      <View className="gap-3">
        <Button label="Scan barcode" onPress={handleOpenScanner} />
        <TextField
          label="Or type barcode"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="number-pad"
        />
        <Button label="Look up barcode" variant="secondary" onPress={() => handleLookup()} />
        <Button
          label={ocrLoading ? 'Reading receipt…' : 'Import receipt (OCR)'}
          variant="secondary"
          loading={ocrLoading}
          onPress={handlePickReceipt}
        />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label={listening ? 'Listening… tap stop' : 'Speak items'}
              onPress={listening ? handleStopListening : handleStartListening}
            />
          </View>
        </View>
        <TextField
          label="Transcript (edit if needed)"
          value={dictate}
          onChangeText={setDictate}
          placeholder="milk, eggs, bread"
        />
        <Button label="Review dictated items" variant="secondary" onPress={handleDictateReview} />
      </View>

      {result ? (
        <View className="mt-4 gap-2">
          <Text className="font-ui text-ink dark:text-ink-on-dark">{result}</Text>
          {barcodeNutrition ? (
            <View className="rounded-xl border border-border px-3 py-3 dark:border-border-dark">
              <Text className="font-ui-bold text-sm text-ink dark:text-ink-on-dark">
                {barcodeNutrition.name} · per 100g
              </Text>
              <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">
                {barcodeNutrition.nutrition.kcalPer100g != null
                  ? `${Math.round(barcodeNutrition.nutrition.kcalPer100g)} kcal`
                  : 'Calories unknown'}
                {barcodeNutrition.nutrition.proteinG != null
                  ? ` · P ${Math.round(barcodeNutrition.nutrition.proteinG)}g`
                  : ''}
                {barcodeNutrition.nutrition.carbG != null
                  ? ` · C ${Math.round(barcodeNutrition.nutrition.carbG)}g`
                  : ''}
                {barcodeNutrition.nutrition.fatG != null
                  ? ` · F ${Math.round(barcodeNutrition.nutrition.fatG)}g`
                  : ''}
              </Text>
              <LifestyleDisclaimer text={barcodeNutrition.disclaimer} className="mt-1" />
            </View>
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="Capture without rushing"
          description="Scan, OCR, or type — everything lands in a review sheet before it hits your list."
          actionLabel="Scan barcode"
          onAction={handleOpenScanner}
        />
      )}

      <Sheet visible={sheetOpen} title={sheetTitle} onClose={() => setSheetOpen(false)}>
        {sheetHint ? (
          <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">{sheetHint}</Text>
        ) : null}
        <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
          List: {selectedListName || 'Pick a list'}
        </Text>
        <Button label="Change list" variant="ghost" onPress={() => setListPickerOpen(true)} />
        {stores.length > 0 ? (
          <>
            <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
              Store: {selectedStoreName || 'Pick a store'}
            </Text>
            <Button label="Change store" variant="ghost" onPress={() => setStorePickerOpen(true)} />
          </>
        ) : null}
        {reviewLines.map((line, idx) => (
          <View
            key={`line-${idx}`}
            className="gap-2 rounded-xl border border-border p-3 dark:border-border-dark"
          >
            <TextField
              label={`Line ${idx + 1}`}
              value={line.name}
              onChangeText={(value) => handleUpdateLine(idx, { name: value })}
            />
            <TextField
              label="Quantity"
              value={String(line.quantity)}
              onChangeText={(value) =>
                handleUpdateLine(idx, { quantity: Number(value) || 1 })
              }
              keyboardType="decimal-pad"
            />
            <TextField
              label="Unit"
              value={line.unit}
              onChangeText={(value) => handleUpdateLine(idx, { unit: value })}
            />
            <TextField
              label="Price (optional)"
              value={line.price}
              onChangeText={(value) =>
                handleUpdateLine(idx, {
                  price: value,
                  recordPrice: Boolean(value.trim()),
                })
              }
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  ['addToList', 'List', line.addToList],
                  ['addToPantry', 'Pantry', line.addToPantry],
                  ['recordPrice', 'Price', line.recordPrice],
                ] as const
              ).map(([key, label, on]) => (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${label} for line ${idx + 1}`}
                  onPress={() => handleToggleFlag(idx, key)}
                  className={`rounded-xl px-3 py-2 ${
                    on ? 'bg-citrus' : 'bg-sage-deep/40 dark:bg-surface-dark-elevated'
                  }`}
                >
                  <Text className="font-ui-medium text-sm text-ink dark:text-ink-on-dark">
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Button label="Add line" variant="secondary" onPress={handleAddLine} />
        <Button label="Confirm & save" onPress={handleConfirm} />
      </Sheet>

      <Sheet visible={listPickerOpen} title="Choose a list" onClose={() => setListPickerOpen(false)}>
        {lists.length === 0 ? (
          <Text className="font-ui text-ink-muted dark:text-ink-muted-dark">
            Create a shopping list first.
          </Text>
        ) : (
          lists.map((list) => (
            <Button
              key={list.id}
              label={list.name}
              variant={list.id === selectedListId ? 'primary' : 'secondary'}
              onPress={() => {
                setSelectedListId(list.id);
                setListPickerOpen(false);
              }}
            />
          ))
        )}
      </Sheet>

      <Sheet
        visible={storePickerOpen}
        title="Choose a store"
        onClose={() => setStorePickerOpen(false)}
      >
        {stores.length === 0 ? (
          <Text className="font-ui text-ink-muted dark:text-ink-muted-dark">
            No stores yet — add one under Prices.
          </Text>
        ) : (
          stores.map((store) => (
            <Button
              key={store.id}
              label={store.name}
              variant={store.id === selectedStoreId ? 'primary' : 'secondary'}
              onPress={() => {
                setSelectedStoreId(store.id);
                setStorePickerOpen(false);
              }}
            />
          ))
        )}
      </Sheet>
    </ScrollView>
  );
}
