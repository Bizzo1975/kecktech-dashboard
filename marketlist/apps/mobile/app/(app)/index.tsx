import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Network from 'expo-network';
import { Button, EmptyState, Skeleton } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';
import { readActivation, type ActivationState } from '../../src/lib/activation';
import { RootState } from '../../src/store';
import {
  getMeta,
  getMirroredListItems,
  getMirroredPantry,
  mirrorListItems,
  mirrorPantry,
  setMeta,
} from '../../src/lib/offline';
import { writeActiveListWidgetSnapshot } from '../../src/lib/widgetBridge';
import { scheduleExpiringPantryNudge } from '../../src/lib/notifications';

type ListItem = {
  id: string;
  name: string;
  checked: boolean;
  aisleSection?: string | null;
};

type ListSummary = {
  id: string;
  name: string;
  items?: ListItem[];
};

type PantryItem = {
  id: string;
  name: string;
  expiryDate: string | null;
  quantity: number;
};

type Member = { id: string; name: string; email: string; role: string };

export default function HomeScreen() {
  const router = useRouter();
  const { accessToken, householdId, user } = useSelector((s: RootState) => s.auth);
  const [online, setOnline] = useState(true);
  const [expiring, setExpiring] = useState<PantryItem[]>([]);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [activation, setActivation] = useState<ActivationState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const act = await readActivation();
    setActivation(act);
    const net = await Network.getNetworkStateAsync();
    const isOnline = Boolean(net.isConnected);
    setOnline(isOnline);

    if (!accessToken || !householdId) {
      setLists([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    if (!isOnline) {
      const pantry = await getMirroredPantry<PantryItem>(householdId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const soon = new Date(today);
      soon.setDate(soon.getDate() + 5);
      setExpiring(
        pantry.filter((p) => {
          if (!p.expiryDate) return false;
          const d = new Date(p.expiryDate);
          d.setHours(0, 0, 0, 0);
          return d <= soon;
        }),
      );

      const metaLists = await getMeta(`lists:${householdId}`);
      if (metaLists) {
        try {
          const cached = JSON.parse(metaLists) as Array<{ id: string; name: string }>;
          const withItems: ListSummary[] = [];
          for (const list of cached) {
            const items = await getMirroredListItems<ListItem>(list.id);
            withItems.push({ ...list, items });
          }
          setLists(withItems);
          const preferred =
            act.defaultListId && withItems.find((l) => l.id === act.defaultListId)
              ? withItems.find((l) => l.id === act.defaultListId)!
              : withItems.find((l) => l.name === 'Weekly run') || withItems[0];
          let uncheckedTotal = 0;
          for (const list of withItems) {
            uncheckedTotal += (list.items || []).filter((i) => !i.checked).length;
          }
          await writeActiveListWidgetSnapshot({
            updatedAt: new Date().toISOString(),
            activeListCount: withItems.length,
            uncheckedItemCount: uncheckedTotal,
            primaryListName: preferred?.name || null,
            primaryListId: preferred?.id || null,
          });
        } catch {
          setLists([]);
        }
      }
      setLastSynced(await getMeta('lastSynced'));
      setLoading(false);
      return;
    }

    const pantry = await apiFetch<{ items: PantryItem[] }>(
      `/pantry?householdId=${householdId}&expiringWithinDays=5`,
      { token: accessToken },
    );
    if (pantry.success) {
      setExpiring(pantry.data.items);
      if (user?.notificationPrefs?.notifyExpiring) {
        await scheduleExpiringPantryNudge({
          enabled: true,
          count: pantry.data.items.length,
        });
      }
      const fullPantry = await apiFetch<{ items: PantryItem[] }>(
        `/pantry?householdId=${householdId}`,
        { token: accessToken },
      );
      if (fullPantry.success) await mirrorPantry(householdId, fullPantry.data.items);
    }

    const listRes = await apiFetch<{ lists: ListSummary[] }>(`/lists?householdId=${householdId}`, {
      token: accessToken,
    });
    if (listRes.success) {
      const nextLists = listRes.data.lists;
      setLists(nextLists);
      await setMeta(
        `lists:${householdId}`,
        JSON.stringify(nextLists.map((l) => ({ id: l.id, name: l.name }))),
      );
      for (const list of nextLists) {
        if (list.items) await mirrorListItems(list.id, list.items);
      }
      const preferred =
        act.defaultListId && nextLists.find((l) => l.id === act.defaultListId)
          ? nextLists.find((l) => l.id === act.defaultListId)!
          : nextLists.find((l) => l.name === 'Weekly run') || nextLists[0];
      const uncheckedTotal = nextLists.reduce(
        (sum, list) => sum + (list.items || []).filter((i) => !i.checked).length,
        0,
      );
      await writeActiveListWidgetSnapshot({
        updatedAt: new Date().toISOString(),
        activeListCount: nextLists.length,
        uncheckedItemCount: uncheckedTotal,
        primaryListName: preferred?.name || null,
        primaryListId: preferred?.id || null,
      });
      await setMeta('lastSynced', new Date().toISOString());
    }

    const membersRes = await apiFetch<{ members: Member[] }>(
      `/households/${householdId}/members`,
      { token: accessToken },
    );
    if (membersRes.success) setMembers(membersRes.data.members);

    setLastSynced(await getMeta('lastSynced'));
    setLoading(false);
  }, [accessToken, householdId, user?.notificationPrefs?.notifyExpiring]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const hasHousehold = Boolean(householdId);
  const tripList =
    lists.find((l) => l.id === activation?.defaultListId) ||
    lists.find((l) => l.name === 'Weekly run') ||
    lists[0] ||
    null;
  const unchecked = (tripList?.items || []).filter((i) => !i.checked);
  const preview = unchecked.slice(0, 5);
  const firstName = user?.name.split(' ')[0] || 'there';

  return (
    <ScrollView
      className="flex-1 bg-surface dark:bg-surface-dark"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {!online ? (
        <View className="bg-citrus px-4 py-2">
          <Text className="font-ui-medium text-ink">Offline — showing saved lists and pantry</Text>
        </View>
      ) : null}

      <View className="gap-5 px-4 py-6">
        <View>
          <Text className="font-display text-3xl text-ink dark:text-ink-on-dark">
            Hi, {firstName}
          </Text>
          <Text className="mt-1 font-ui text-sm text-ink-muted dark:text-ink-on-dark/80">
            {loading
              ? 'Loading your trip…'
              : tripList
                ? unchecked.length > 0
                  ? `${unchecked.length} left on ${tripList.name}`
                  : `${tripList.name} is clear — add what you need`
                : hasHousehold
                  ? 'Start this week’s shop with a list'
                  : 'Create a household to start shopping together'}
          </Text>
          {lastSynced ? (
            <Text className="mt-1 font-ui text-xs text-ink-muted dark:text-ink-on-dark/70">
              Last synced {new Date(lastSynced).toLocaleString()}
            </Text>
          ) : null}
        </View>

        {!hasHousehold ? (
          <EmptyState
            title="Start with your household"
            description="Create a home, or join with an invite code."
            actionLabel="Create or join household"
            onAction={() => router.push('/(app)/settings')}
          />
        ) : null}

        <View className="gap-2">
          <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Today&apos;s trip</Text>
          {loading ? <Skeleton /> : null}
          {!loading && hasHousehold && !tripList ? (
            <EmptyState
              title="No list yet"
              description="Create Weekly run, then add what you need."
              actionLabel="Create a list"
              onAction={() => router.push('/(app)/lists')}
            />
          ) : null}
          {!loading && tripList ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Continue shopping ${tripList.name}, ${unchecked.length} remaining`}
              onPress={() => router.push(`/(app)/lists/${tripList.id}`)}
              className="gap-3 rounded-2xl border border-border bg-white px-4 py-4 dark:border-border-dark dark:bg-surface-dark-elevated"
            >
              <View className="flex-row items-baseline justify-between">
                <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">
                  {tripList.name}
                </Text>
                <Text className="font-ui-bold text-citrus">{unchecked.length} left</Text>
              </View>
              {preview.length > 0 ? (
                <View className="gap-2">
                  {preview.map((item) => (
                    <View key={item.id} className="flex-row justify-between gap-2">
                      <Text className="flex-1 font-ui text-ink dark:text-ink-on-dark">{item.name}</Text>
                      <Text className="font-ui text-sm text-ink-muted dark:text-ink-on-dark/70">
                        {item.aisleSection || 'Other'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="font-ui text-sm text-ink-muted dark:text-ink-on-dark/80">
                  List is clear — open to add items for the next run.
                </Text>
              )}
              <Button
                label="Continue shopping"
                onPress={() => router.push(`/(app)/lists/${tripList.id}`)}
              />
            </Pressable>
          ) : null}
        </View>

        {hasHousehold ? (
          <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-4 dark:border-border-dark dark:bg-surface-dark-elevated">
            <View className="flex-1">
              <Text className="font-ui-bold text-ink dark:text-ink-on-dark">
                {members.length || 1} household member{members.length === 1 ? '' : 's'}
              </Text>
              <Text className="mt-1 font-ui text-sm text-ink-muted dark:text-ink-on-dark/80">
                {members.length > 0
                  ? members.map((m) => m.name.split(' ')[0]).join(', ')
                  : 'Invite a partner when you are ready'}
              </Text>
            </View>
            <Button
              label="Invite"
              variant="ghost"
              onPress={() => router.push('/(app)/settings')}
              accessibilityLabel="Invite or join household"
            />
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="font-ui-bold text-lg text-ink dark:text-ink-on-dark">Expiring soon</Text>
          {expiring.length === 0 ? (
            <Text className="font-ui text-ink-muted dark:text-ink-on-dark/80">
              Nothing urgent. Complete a trip — pantry items show up here.
            </Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {expiring.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}, open pantry`}
                      onPress={() => router.push('/(app)/pantry')}
                      className="min-w-[140px] rounded-xl bg-white px-3 py-3 dark:bg-ink/80"
                    >
                      <Text className="font-ui-medium text-ink dark:text-ink-on-dark">{item.name}</Text>
                      <Text className="font-ui text-xs text-ink-muted dark:text-ink-on-dark/70">
                        {item.expiryDate ? `Exp ${item.expiryDate}` : 'No date'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Button
                label="Cook tonight"
                variant="secondary"
                onPress={() => router.push('/(app)/recipes' as Href)}
              />
            </>
          )}
        </View>

        <View className="flex-row flex-wrap gap-4 pb-4">
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Recipes"
            onPress={() => router.push('/(app)/recipes' as Href)}
          >
            <Text className="font-ui-medium text-ink-muted dark:text-ink-on-dark/80">Recipes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Garden"
            onPress={() => router.push('/(app)/garden' as Href)}
          >
            <Text className="font-ui-medium text-ink-muted dark:text-ink-on-dark/80">Garden</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Capture"
            onPress={() => router.push('/(app)/capture' as Href)}
          >
            <Text className="font-ui-medium text-ink-muted dark:text-ink-on-dark/80">Capture</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Prices"
            onPress={() => router.push('/(app)/prices' as Href)}
          >
            <Text className="font-ui-medium text-ink-muted dark:text-ink-on-dark/80">Prices</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
