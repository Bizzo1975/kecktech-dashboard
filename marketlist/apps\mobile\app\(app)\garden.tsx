import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, ListRow, Sheet, TextField } from '../../../src/components/ui';
import { apiFetch } from '../../../src/lib/api';
import { RootState } from '../../../src/store';

type GardenSource = {
  id: string;
  type: 'manual' | 'farmbot' | 'indoor_tray';
  name: string;
  lastSyncedAt: string | null;
  hasFarmbotToken: boolean;
};

type GardenYield = {
  id: string;
  gardenSourceId: string;
  plantName: string;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
  estimatedYieldQty: number | null;
  estimatedYieldUnit: string | null;
  status: 'planted' | 'growing' | 'ready' | 'harvested';
};

const SOURCE_LABEL: Record<GardenSource['type'], string> = {
  manual: 'Outdoor bed',
  indoor_tray: 'Indoor tray',
  farmbot: 'FarmBot',
};

const STATUS_OPTIONS: GardenYield['status'][] = ['planted', 'growing', 'ready', 'harvested'];

export default function GardenScreen() {
  const router = useRouter();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [sources, setSources] = useState<GardenSource[]>([]);
  const [yields, setYields] = useState<GardenYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<GardenSource['type']>('manual');
  const [farmbotToken, setFarmbotToken] = useState('');
  const [savingSource, setSavingSource] = useState(false);

  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [plantName, setPlantName] = useState('');
  const [plantSourceId, setPlantSourceId] = useState('');
  const [plantStatus, setPlantStatus] = useState<GardenYield['status']>('planted');
  const [savingPlant, setSavingPlant] = useState(false);

  const [tokenSourceId, setTokenSourceId] = useState<string | null>(null);
  const [tokenDraft, setTokenDraft] = useState('');
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken || !householdId) {
      setLoading(false);
      setError('Join a household to track gardens.');
      return;
    }
    setLoading(true);
    setError(null);
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);
    if (!isOnline) {
      setLoading(false);
      setError('Offline — Garden needs a connection to load and sync.');
      return;
    }
    const [srcRes, yieldRes] = await Promise.all([
      apiFetch<{ sources: GardenSource[] }>(`/garden-sources?householdId=${householdId}`, {
        token: accessToken,
      }),
      apiFetch<{ yields: GardenYield[] }>(`/garden-yields?householdId=${householdId}`, {
        token: accessToken,
      }),
    ]);
    if (srcRes.success) {
      setSources(srcRes.data.sources);
      setPlantSourceId((prev) => prev || srcRes.data.sources[0]?.id || '');
    } else {
      setError(srcRes.error?.message || 'Could not load garden');
    }
    if (yieldRes.success) setYields(yieldRes.data.yields);
    setLoading(false);
  }, [accessToken, householdId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleCreateSource = async () => {
    if (!online) {
      Alert.alert('Offline', 'Connect to add a garden source.');
      return;
    }
    if (!accessToken || !householdId || !sourceName.trim()) return;
    setSavingSource(true);
    const body: Record<string, unknown> = {
      householdId,
      type: sourceType,
      name: sourceName.trim(),
    };
    if (sourceType === 'farmbot' && farmbotToken.trim()) {
      body.farmbotApiToken = farmbotToken.trim();
    }
    const res = await apiFetch('/garden-sources', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify(body),
    });
    setSavingSource(false);
    if (!res.success) {
      Alert.alert('Garden', res.error?.message || 'Could not add source');
      return;
    }
    setSourceName('');
    setFarmbotToken('');
    setAddSourceOpen(false);
    await load();
  };

  const handleCreatePlant = async () => {
    if (!accessToken || !householdId || !plantName.trim() || !plantSourceId) return;
    setSavingPlant(true);
    const res = await apiFetch('/garden-yields', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        householdId,
        gardenSourceId: plantSourceId,
        plantName: plantName.trim(),
        status: plantStatus,
      }),
    });
    setSavingPlant(false);
    if (!res.success) {
      Alert.alert('Garden', res.error?.message || 'Could not add plant');
      return;
    }
    setPlantName('');
    setAddPlantOpen(false);
    await load();
  };

  const handleSync = async (sourceId: string) => {
    if (!online) {
      Alert.alert('Offline', 'Connect to sync FarmBot.');
      return;
    }
    if (!accessToken) return;
    const res = await apiFetch(`/garden-sources/${sourceId}/sync`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({}),
    });
    if (!res.success) {
      Alert.alert('FarmBot sync', res.error?.message || 'Sync failed');
      return;
    }
    Alert.alert('FarmBot', 'Sync complete');
    await load();
  };

  const handleSaveToken = async () => {
    if (!accessToken || !tokenSourceId || !tokenDraft.trim()) return;
    const res = await apiFetch(`/garden-sources/${tokenSourceId}`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ farmbotApiToken: tokenDraft.trim() }),
    });
    if (!res.success) {
      Alert.alert('FarmBot', res.error?.message || 'Could not save token');
      return;
    }
    setTokenSourceId(null);
    setTokenDraft('');
    await load();
  };

  const handleHarvest = async (yieldId: string, name: string) => {
    if (!online) {
      Alert.alert('Offline', 'Connect to harvest into pantry.');
      return;
    }
    if (!accessToken) return;
    const res = await apiFetch(`/garden-yields/${yieldId}/harvest`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({}),
    });
    if (!res.success) {
      Alert.alert('Harvest', res.error?.message || 'Harvest failed');
      return;
    }
    Alert.alert('Harvested', `${name} added to pantry`);
    await load();
  };

  const handleStatus = async (yieldId: string, status: GardenYield['status']) => {
    if (!accessToken) return;
    const res = await apiFetch(`/garden-yields/${yieldId}`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ status }),
    });
    if (!res.success) {
      Alert.alert('Garden', res.error?.message || 'Update failed');
      return;
    }
    await load();
  };

  const handleDeleteSource = (sourceId: string, name: string) => {
    Alert.alert('Delete source', `Delete ${name} and its plants?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!accessToken) return;
            const res = await apiFetch(`/garden-sources/${sourceId}`, {
              method: 'DELETE',
              token: accessToken,
            });
            if (!res.success) {
              Alert.alert('Garden', res.error?.message || 'Delete failed');
              return;
            }
            await load();
          })();
        },
      },
    ]);
  };

  if (!householdId) {
    return (
      <View className="flex-1 bg-cream dark:bg-ink p-4">
        <EmptyState
          title="Garden needs a household"
          description="Create or join a household in Settings to track beds and FarmBot."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream dark:bg-ink">
      <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
        <Text className="font-display text-3xl text-ink dark:text-ink-on-dark">Garden</Text>
        <Text className="text-sm text-muted dark:text-muted-on-dark">
          Outdoor beds, indoor trays, and FarmBot. Harvest goes to pantry; recipes prefer what’s
          ready soon.
        </Text>

        {!online ? (
          <View className="rounded-xl bg-sage/30 px-3 py-2">
            <Text className="text-sm text-ink dark:text-ink-on-dark">
              Offline — Garden needs a connection to load, sync, or harvest.
            </Text>
          </View>
        ) : null}

        <Button
          label="Open robot controls"
          variant="secondary"
          onPress={() => router.push('/(app)/garden-farmbot')}
        />

        {error ? (
          <Text className="text-danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View className="flex-row gap-2">
          <Button label="Add source" onPress={() => setAddSourceOpen(true)} className="flex-1" />
          <Button
            label="Add plant"
            variant="secondary"
            onPress={() => setAddPlantOpen(true)}
            disabled={sources.length === 0}
            className="flex-1"
          />
        </View>

        {loading ? <Text className="text-muted">Loading…</Text> : null}

        {!loading && sources.length === 0 ? (
          <EmptyState
            title="No garden sources"
            description="Add an outdoor bed, indoor tray (manual), or connect FarmBot."
          />
        ) : null}

        {sources.map((source) => {
          const rows = yields.filter((y) => y.gardenSourceId === source.id);
          return (
            <View
              key={source.id}
              className="gap-2 rounded-2xl border border-sage/40 bg-white p-3 dark:border-sage-deep dark:bg-surface-dark"
            >
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">
                {source.name}
              </Text>
              <Text className="text-sm text-muted dark:text-muted-on-dark">
                {SOURCE_LABEL[source.type]}
                {source.type === 'farmbot'
                  ? source.hasFarmbotToken
                    ? ' · connected'
                    : ' · token needed'
                  : ''}
                {source.lastSyncedAt
                  ? ` · synced ${new Date(source.lastSyncedAt).toLocaleString()}`
                  : ''}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {source.type === 'farmbot' ? (
                  <>
                    <Button
                      label="Robot"
                      variant="secondary"
                      disabled={!source.hasFarmbotToken}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/garden-farmbot',
                          params: { sourceId: source.id },
                        })
                      }
                    />
                    <Button
                      label="Sync"
                      variant="secondary"
                      disabled={!source.hasFarmbotToken}
                      onPress={() => void handleSync(source.id)}
                    />
                    {!source.hasFarmbotToken ? (
                      <Button
                        label="Connect token"
                        variant="ghost"
                        onPress={() => {
                          setTokenSourceId(source.id);
                          setTokenDraft('');
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
                <Button
                  label="Delete"
                  variant="ghost"
                  onPress={() => handleDeleteSource(source.id, source.name)}
                />
              </View>

              {rows.length === 0 ? (
                <Text className="text-sm text-muted">No plants yet.</Text>
              ) : (
                rows.map((row) => (
                  <View key={row.id} className="gap-1 border-t border-sage/30 pt-2">
                    <ListRow
                      title={row.plantName}
                      subtitle={`${row.status}${
                        row.expectedHarvestStart
                          ? ` · harvest from ${row.expectedHarvestStart}`
                          : ''
                      }`}
                    />
                    <View className="flex-row flex-wrap gap-2">
                      {STATUS_OPTIONS.filter((s) => s !== 'harvested').map((status) => (
                        <Pressable
                          key={status}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${row.plantName} ${status}`}
                          disabled={row.status === 'harvested'}
                          onPress={() => void handleStatus(row.id, status)}
                          className={`rounded-lg px-2 py-1 ${
                            row.status === status ? 'bg-citrus' : 'bg-sage/30'
                          }`}
                        >
                          <Text className="text-xs text-ink">{status}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {row.status !== 'harvested' ? (
                      <Button
                        label="Harvest → pantry"
                        onPress={() => void handleHarvest(row.id, row.plantName)}
                      />
                    ) : (
                      <Text className="text-sm text-muted">In pantry</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <Sheet visible={addSourceOpen} onClose={() => setAddSourceOpen(false)} title="Add source">
        <View className="gap-3 p-4">
          <TextField
            label="Name"
            value={sourceName}
            onChangeText={setSourceName}
            placeholder="Backyard bed"
          />
          <Text className="text-sm text-muted">Type</Text>
          {(['manual', 'indoor_tray', 'farmbot'] as const).map((type) => (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={SOURCE_LABEL[type]}
              onPress={() => setSourceType(type)}
              className={`rounded-xl px-3 py-2 ${sourceType === type ? 'bg-citrus' : 'bg-sage/30'}`}
            >
              <Text className="text-ink">{SOURCE_LABEL[type]}</Text>
            </Pressable>
          ))}
          {sourceType === 'farmbot' ? (
            <TextField
              label="FarmBot token"
              value={farmbotToken}
              onChangeText={setFarmbotToken}
              placeholder="Paste FarmBot API token"
              multiline
            />
          ) : (
            <Text className="text-xs text-muted">
              Indoor brands without a public API are logged manually here.
            </Text>
          )}
          <Button label="Save source" loading={savingSource} onPress={() => void handleCreateSource()} />
        </View>
      </Sheet>

      <Sheet visible={addPlantOpen} onClose={() => setAddPlantOpen(false)} title="Add plant">
        <View className="gap-3 p-4">
          <TextField
            label="Plant name"
            value={plantName}
            onChangeText={setPlantName}
            placeholder="Basil"
          />
          <Text className="text-sm text-muted">Source</Text>
          {sources.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={s.name}
              onPress={() => setPlantSourceId(s.id)}
              className={`rounded-xl px-3 py-2 ${
                plantSourceId === s.id ? 'bg-citrus' : 'bg-sage/30'
              }`}
            >
              <Text className="text-ink">
                {s.name} ({SOURCE_LABEL[s.type]})
              </Text>
            </Pressable>
          ))}
          <Text className="text-sm text-muted">Status</Text>
          {STATUS_OPTIONS.filter((s) => s !== 'harvested').map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityLabel={status}
              onPress={() => setPlantStatus(status)}
              className={`rounded-xl px-3 py-2 ${
                plantStatus === status ? 'bg-citrus' : 'bg-sage/30'
              }`}
            >
              <Text className="text-ink">{status}</Text>
            </Pressable>
          ))}
          <Button label="Save plant" loading={savingPlant} onPress={() => void handleCreatePlant()} />
        </View>
      </Sheet>

      <Sheet
        visible={Boolean(tokenSourceId)}
        onClose={() => setTokenSourceId(null)}
        title="FarmBot token"
      >
        <View className="gap-3 p-4">
          <TextField
            label="API token"
            value={tokenDraft}
            onChangeText={setTokenDraft}
            placeholder="Paste FarmBot API token"
            multiline
          />
          <Text className="text-xs text-muted">Encrypted at rest. Never shown again after save.</Text>
          <Button label="Save token" onPress={() => void handleSaveToken()} />
        </View>
      </Sheet>
    </View>
  );
}
