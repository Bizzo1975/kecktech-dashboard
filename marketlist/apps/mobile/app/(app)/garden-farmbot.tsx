import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, TextField } from '../../../src/components/ui';
import { apiFetch } from '../../../src/lib/api';
import { RootState } from '../../../src/store';

const FARMBOT_ADVANCED_URL =
  process.env.EXPO_PUBLIC_FARMBOT_PUBLIC_URL || 'https://farmbot.kecktech.net';

type GardenSource = {
  id: string;
  type: string;
  name: string;
  hasFarmbotToken: boolean;
};

type RobotStatus = {
  sourceId: string;
  mqttConnected: boolean;
  lastStatusAt: string | null;
  locked: boolean;
  busy: boolean;
  syncStatus: string | null;
  position: { x: unknown; y: unknown; z: unknown } | null;
};

type SequenceRow = { id: number; name: string };
type PeripheralRow = { id: number; label?: string; name?: string; pin: number };
type ImageRow = { id: number; attachment_url?: string };
type LogRow = { id?: number; message?: string; created_at?: string };

export default function GardenFarmBotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sourceId?: string }>();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);

  const [sources, setSources] = useState<GardenSource[]>([]);
  const [sourceId, setSourceId] = useState(params.sourceId || '');
  const [status, setStatus] = useState<RobotStatus | null>(null);
  const [deviceName, setDeviceName] = useState<string>('—');
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [regimens, setRegimens] = useState<Record<string, unknown>[]>([]);
  const [farmEvents, setFarmEvents] = useState<Record<string, unknown>[]>([]);
  const [peripherals, setPeripherals] = useState<PeripheralRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [moveX, setMoveX] = useState('0');
  const [moveY, setMoveY] = useState('0');
  const [moveZ, setMoveZ] = useState('0');
  const [plantName, setPlantName] = useState('');
  const [plantX, setPlantX] = useState('100');
  const [plantY, setPlantY] = useState('100');

  const farmbotSources = sources.filter((s) => s.type === 'farmbot' && s.hasFarmbotToken);

  const loadSources = useCallback(async () => {
    if (!accessToken || !householdId) return;
    const res = await apiFetch<{ sources: GardenSource[] }>(
      `/garden-sources?householdId=${householdId}`,
      { token: accessToken },
    );
    if (!res.success) {
      setError(res.error?.message || 'Could not load sources');
      return;
    }
    setSources(res.data.sources);
    const farmbots = res.data.sources.filter((s) => s.type === 'farmbot' && s.hasFarmbotToken);
    setSourceId((prev) => {
      if (prev && farmbots.some((s) => s.id === prev)) return prev;
      if (params.sourceId && farmbots.some((s) => s.id === params.sourceId)) return params.sourceId;
      return farmbots[0]?.id || '';
    });
  }, [accessToken, householdId, params.sourceId]);

  const loadRobot = useCallback(async () => {
    if (!accessToken || !sourceId) return;
    const t = accessToken;
    const [statusRes, deviceRes, seqRes, regRes, evRes, periRes, imgRes, logRes] =
      await Promise.all([
        apiFetch<RobotStatus>(`/garden-sources/${sourceId}/farmbot/status`, { token: t }),
        apiFetch<{ device: Record<string, unknown> }>(
          `/garden-sources/${sourceId}/farmbot/device`,
          { token: t },
        ),
        apiFetch<{ sequences: SequenceRow[] }>(
          `/garden-sources/${sourceId}/farmbot/sequences`,
          { token: t },
        ),
        apiFetch<{ regimens: Record<string, unknown>[] }>(
          `/garden-sources/${sourceId}/farmbot/regimens`,
          { token: t },
        ),
        apiFetch<{ farmEvents: Record<string, unknown>[] }>(
          `/garden-sources/${sourceId}/farmbot/farm-events`,
          { token: t },
        ),
        apiFetch<{ peripherals: PeripheralRow[] }>(
          `/garden-sources/${sourceId}/farmbot/peripherals`,
          { token: t },
        ),
        apiFetch<{ images: ImageRow[] }>(`/garden-sources/${sourceId}/farmbot/images`, {
          token: t,
        }),
        apiFetch<{ logs: LogRow[]; recentLogs: LogRow[] }>(
          `/garden-sources/${sourceId}/farmbot/logs`,
          { token: t },
        ),
      ]);

    if (statusRes.success) setStatus(statusRes.data);
    if (deviceRes.success) {
      setDeviceName(String(deviceRes.data.device.name || deviceRes.data.device.id || '—'));
    }
    if (seqRes.success) setSequences(seqRes.data.sequences);
    if (regRes.success) setRegimens(regRes.data.regimens);
    if (evRes.success) setFarmEvents(evRes.data.farmEvents);
    if (periRes.success) setPeripherals(periRes.data.peripherals);
    if (imgRes.success) setImages(imgRes.data.images.slice(0, 12));
    if (logRes.success) {
      setLogs([...(logRes.data.recentLogs || []), ...(logRes.data.logs || [])].slice(0, 30));
    }
  }, [accessToken, sourceId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let interval: ReturnType<typeof setInterval> | null = null;

      const boot = async () => {
        const net = await Network.getNetworkStateAsync();
        setOnline(Boolean(net.isConnected));
        if (!net.isConnected) return;
        await loadSources();
        if (cancelled) return;
        await loadRobot();
        interval = setInterval(() => {
          if (!sourceId || !accessToken) return;
          void apiFetch<RobotStatus>(`/garden-sources/${sourceId}/farmbot/status`, {
            token: accessToken,
          }).then((res) => {
            if (res.success) setStatus(res.data);
          });
        }, 2000);
      };
      void boot();

      return () => {
        cancelled = true;
        if (interval) clearInterval(interval);
      };
    }, [loadSources, loadRobot, sourceId, accessToken]),
  );

  const postConfirm = (path: string, body: Record<string, unknown>, label: string) => {
    if (!accessToken || !sourceId) return;
    Alert.alert('Confirm', `${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusyAction(label);
            setError(null);
            const res = await apiFetch(`/garden-sources/${sourceId}/farmbot/${path}`, {
              method: 'POST',
              token: accessToken,
              body: JSON.stringify({ confirm: true, ...body }),
            });
            setBusyAction(null);
            if (!res.success) {
              setError(res.error?.message || `${label} failed`);
              return;
            }
            await loadRobot();
          })();
        },
      },
    ]);
  };

  const handleCreatePlant = async () => {
    if (!accessToken || !sourceId || !plantName.trim()) return;
    setBusyAction('Create plant');
    const res = await apiFetch(`/garden-sources/${sourceId}/farmbot/points`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        name: plantName.trim(),
        x: Number(plantX),
        y: Number(plantY),
        z: 0,
      }),
    });
    setBusyAction(null);
    if (!res.success) {
      setError(res.error?.message || 'Could not create plant');
      return;
    }
    setPlantName('');
    await apiFetch(`/garden-sources/${sourceId}/sync`, {
      method: 'POST',
      token: accessToken,
    });
    Alert.alert('FarmBot', 'Plant created');
  };

  const handleAdvanced = () => {
    void Linking.openURL(FARMBOT_ADVANCED_URL);
  };

  return (
    <View className="flex-1 bg-cream dark:bg-ink" accessibilityLabel="Robot controls">
      <View className="flex-row items-center justify-between border-b border-sage/40 px-4 pb-3 pt-12 dark:border-sage-deep">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Garden"
          className="rounded-md px-2 py-2"
        >
          <Text className="text-base font-semibold text-amber-800 dark:text-amber-400">
            ← Garden
          </Text>
        </Pressable>
        <Text className="text-base font-semibold text-ink dark:text-ink-on-dark">Robot</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="gap-4 p-4 pb-24">
        {!online ? (
          <Text className="text-sm text-ink dark:text-ink-on-dark">
            Offline — robot controls need a connection.
          </Text>
        ) : null}

        {error ? (
          <Text className="text-danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {farmbotSources.length === 0 ? (
          <EmptyState
            title="No FarmBot connected"
            description="Add a FarmBot source with an API token on the Garden screen."
          />
        ) : (
          <View className="gap-2">
            <Text className="text-sm text-muted dark:text-muted-on-dark">Source</Text>
            {farmbotSources.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSourceId(s.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${s.name}`}
                className={`rounded-xl border px-3 py-2 ${
                  sourceId === s.id
                    ? 'border-amber-700 bg-amber-50 dark:bg-amber-950'
                    : 'border-sage/40 bg-white dark:border-sage-deep dark:bg-surface-dark'
                }`}
              >
                <Text className="text-ink dark:text-ink-on-dark">{s.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {sourceId ? (
          <>
            <View className="gap-2 rounded-2xl border border-sage/40 bg-white p-3 dark:border-sage-deep dark:bg-surface-dark">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">Status</Text>
              <Text className="text-sm text-muted dark:text-muted-on-dark">
                MQTT: {status?.mqttConnected ? 'Connected' : 'Disconnected'}
              </Text>
              <Text className="text-sm text-muted dark:text-muted-on-dark">
                E-stop: {status?.locked ? 'LOCKED' : 'Unlocked'} · Busy:{' '}
                {status?.busy ? 'Yes' : 'No'}
              </Text>
              <Text className="text-sm text-muted dark:text-muted-on-dark">
                Position:{' '}
                {status?.position
                  ? `X ${String(status.position.x)} Y ${String(status.position.y)} Z ${String(status.position.z)}`
                  : '—'}
              </Text>
              <Text className="text-sm text-muted dark:text-muted-on-dark">Device: {deviceName}</Text>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">Safety</Text>
              <Button
                label="E-stop"
                onPress={() => postConfirm('estop', {}, 'Emergency stop')}
                disabled={Boolean(busyAction)}
              />
              <Button
                label="Unlock"
                variant="secondary"
                onPress={() => postConfirm('unlock', {}, 'Unlock')}
                disabled={Boolean(busyAction)}
              />
              <Button
                label="Device sync"
                variant="secondary"
                onPress={() => postConfirm('sync', {}, 'Device sync')}
                disabled={Boolean(busyAction)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">Motion</Text>
              <Button
                label="Home"
                variant="secondary"
                onPress={() => postConfirm('home', { axis: 'all' }, 'Home')}
                disabled={Boolean(busyAction)}
              />
              <Button
                label="Find home"
                variant="secondary"
                onPress={() =>
                  postConfirm('home', { axis: 'all', findHome: true }, 'Find home')
                }
                disabled={Boolean(busyAction)}
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-xl border border-sage/40 bg-white px-3 py-2 dark:border-sage-deep dark:bg-surface-dark dark:text-ink-on-dark"
                  value={moveX}
                  onChangeText={setMoveX}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Move X"
                  placeholder="X"
                />
                <TextInput
                  className="flex-1 rounded-xl border border-sage/40 bg-white px-3 py-2 dark:border-sage-deep dark:bg-surface-dark dark:text-ink-on-dark"
                  value={moveY}
                  onChangeText={setMoveY}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Move Y"
                  placeholder="Y"
                />
                <TextInput
                  className="flex-1 rounded-xl border border-sage/40 bg-white px-3 py-2 dark:border-sage-deep dark:bg-surface-dark dark:text-ink-on-dark"
                  value={moveZ}
                  onChangeText={setMoveZ}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Move Z"
                  placeholder="Z"
                />
              </View>
              <Button
                label="Move absolute"
                onPress={() =>
                  postConfirm(
                    'move',
                    { x: Number(moveX), y: Number(moveY), z: Number(moveZ) },
                    'Move',
                  )
                }
                disabled={Boolean(busyAction)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">
                Sequences
              </Text>
              {sequences.length === 0 ? (
                <Text className="text-sm text-muted">No sequences.</Text>
              ) : (
                sequences.map((seq) => (
                  <Button
                    key={seq.id}
                    label={`Run: ${seq.name}`}
                    variant="secondary"
                    onPress={() =>
                      postConfirm(`sequences/${seq.id}/exec`, {}, `Run ${seq.name}`)
                    }
                    disabled={Boolean(busyAction)}
                  />
                ))
              )}
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">Schedule</Text>
              {regimens.map((r) => (
                <Text key={String(r.id)} className="text-sm text-muted dark:text-muted-on-dark">
                  Regimen: {String(r.name || r.id)}
                </Text>
              ))}
              {farmEvents.map((ev) => (
                <Text key={String(ev.id)} className="text-sm text-muted dark:text-muted-on-dark">
                  Event: {String(ev.executable_type || 'Event')} #{String(ev.executable_id || ev.id)}
                </Text>
              ))}
              {regimens.length === 0 && farmEvents.length === 0 ? (
                <Text className="text-sm text-muted">No scheduled regimens/events.</Text>
              ) : null}
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">
                Peripherals
              </Text>
              {peripherals.length === 0 ? (
                <Text className="text-sm text-muted">No peripherals.</Text>
              ) : (
                peripherals.map((p) => (
                  <Button
                    key={p.id}
                    label={`Toggle ${p.label || p.name || `pin ${p.pin}`}`}
                    variant="secondary"
                    onPress={() =>
                      postConfirm(
                        `peripherals/${p.id}/toggle`,
                        {},
                        `Toggle ${p.label || p.name || p.pin}`,
                      )
                    }
                    disabled={Boolean(busyAction)}
                  />
                ))
              )}
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">
                Add plant
              </Text>
              <TextField
                label="Name"
                value={plantName}
                onChangeText={setPlantName}
                placeholder="Lettuce"
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-xl border border-sage/40 bg-white px-3 py-2 dark:border-sage-deep dark:bg-surface-dark dark:text-ink-on-dark"
                  value={plantX}
                  onChangeText={setPlantX}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Plant X"
                  placeholder="X"
                />
                <TextInput
                  className="flex-1 rounded-xl border border-sage/40 bg-white px-3 py-2 dark:border-sage-deep dark:bg-surface-dark dark:text-ink-on-dark"
                  value={plantY}
                  onChangeText={setPlantY}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Plant Y"
                  placeholder="Y"
                />
              </View>
              <Button
                label="Create plant on FarmBot"
                onPress={() => void handleCreatePlant()}
                disabled={Boolean(busyAction)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">Photos</Text>
              <Button
                label="Take photo"
                variant="secondary"
                onPress={() => postConfirm('photos/take', {}, 'Take photo')}
                disabled={Boolean(busyAction)}
              />
              <View className="flex-row flex-wrap gap-2">
                {images.map((img) =>
                  img.attachment_url ? (
                    <Image
                      key={img.id}
                      source={{ uri: img.attachment_url }}
                      accessibilityLabel={`FarmBot photo ${img.id}`}
                      style={{ width: 96, height: 96, borderRadius: 8 }}
                    />
                  ) : null,
                )}
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-ink-on-dark">Logs</Text>
              {logs.length === 0 ? (
                <Text className="text-sm text-muted">No logs.</Text>
              ) : (
                logs.map((log, idx) => (
                  <Text
                    key={String(log.id ?? idx)}
                    className="text-xs text-muted dark:text-muted-on-dark"
                  >
                    {String(log.message || JSON.stringify(log))}
                  </Text>
                ))
              )}
            </View>

            <Pressable
              onPress={handleAdvanced}
              accessibilityRole="link"
              accessibilityLabel="Open FarmBot advanced authoring"
              className="py-2"
            >
              <Text className="text-sm text-amber-800 underline dark:text-amber-400">
                Advanced authoring (FarmBot designer) — break-glass only
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
