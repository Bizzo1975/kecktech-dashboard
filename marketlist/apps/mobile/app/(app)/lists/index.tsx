import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Button, EmptyState, ListRow, Sheet, TextField } from '../../../src/components/ui';
import { apiFetch } from '../../../src/lib/api';
import { RootState } from '../../../src/store';

type List = { id: string; name: string; sortMode: string; type?: string };

export default function ListsScreen() {
  const router = useRouter();
  const { accessToken, householdId } = useSelector((s: RootState) => s.auth);
  const [lists, setLists] = useState<List[]>([]);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState<List | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSortMode, setRenameSortMode] = useState<'aisle' | 'category' | 'custom'>('aisle');
  const [renamingBusy, setRenamingBusy] = useState(false);
  const [fromTemplateBusy, setFromTemplateBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !householdId) return;
    const result = await apiFetch<{ lists: List[] }>(`/lists?householdId=${householdId}`, {
      token: accessToken,
    });
    if (result.success) setLists(result.data.lists);
  }, [accessToken, householdId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = async () => {
    if (!accessToken || !householdId) return;
    if (!name.trim()) {
      setCreateError('Enter a list name');
      return;
    }
    setCreateError(null);
    setLoading(true);
    const result = await apiFetch<{ list: List }>('/lists', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ householdId, name: name.trim(), sortMode: 'aisle' }),
    });
    setLoading(false);
    if (!result.success) {
      setCreateError(result.error.message);
      Alert.alert('Could not create list', result.error.message);
      return;
    }
    setName('');
    await load();
    router.push(`/(app)/lists/${result.data.list.id}`);
  };

  const handleOpenRename = (list: List) => {
    setRenaming(list);
    setRenameValue(list.name);
    setRenameSortMode(
      list.sortMode === 'category' || list.sortMode === 'custom' ? list.sortMode : 'aisle',
    );
  };

  const handleSaveRename = async () => {
    if (!accessToken || !renaming) return;
    const next = renameValue.trim();
    if (!next) {
      Alert.alert('Enter a name');
      return;
    }
    setRenamingBusy(true);
    const result = await apiFetch<{ list: List }>(`/lists/${renaming.id}`, {
      method: 'PUT',
      token: accessToken,
      body: JSON.stringify({ name: next, sortMode: renameSortMode }),
    });
    setRenamingBusy(false);
    if (!result.success) {
      Alert.alert('Could not rename', result.error.message);
      return;
    }
    setRenaming(null);
    setRenameValue('');
    await load();
  };

  const handleDelete = (list: List) => {
    if (!accessToken) return;
    Alert.alert('Delete list', `Delete “${list.name}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await apiFetch(`/lists/${list.id}`, {
              method: 'DELETE',
              token: accessToken,
            });
            if (!result.success) {
              Alert.alert('Could not delete', result.error.message);
              return;
            }
            if (renaming?.id === list.id) {
              setRenaming(null);
              setRenameValue('');
            }
            await load();
          })();
        },
      },
    ]);
  };

  const handleListActions = (list: List) => {
    const isTemplate = list.type === 'template';
    Alert.alert(list.name, undefined, [
      { text: 'Open', onPress: () => router.push(`/(app)/lists/${list.id}`) },
      ...(isTemplate
        ? [
            {
              text: 'New from template',
              onPress: () => {
                void handleNewFromTemplate(list);
              },
            },
          ]
        : []),
      { text: 'Rename', onPress: () => handleOpenRename(list) },
      { text: 'Delete', style: 'destructive' as const, onPress: () => handleDelete(list) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleNewFromTemplate = async (template: List) => {
    if (!accessToken) return;
    setFromTemplateBusy(true);
    const result = await apiFetch<{ list: List }>(`/lists/${template.id}/copy`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        name: `${template.name.replace(/\s*template$/i, '').trim() || template.name} run`,
        type: 'shopping',
      }),
    });
    setFromTemplateBusy(false);
    if (!result.success) {
      Alert.alert('Could not create from template', result.error.message);
      return;
    }
    router.push(`/(app)/lists/${result.data.list.id}`);
  };

  const shoppingLists = lists.filter((l) => (l.type || 'shopping') !== 'template');
  const templates = lists.filter((l) => l.type === 'template');

  if (!householdId) {
    return (
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <EmptyState
          title="Join a household"
          description="Create or join a household in Settings to start shared lists."
          actionLabel="Open settings"
          onAction={() => router.push('/(app)/settings')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="gap-3 border-b border-border px-4 py-4 dark:border-border-dark">
        <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">Lists</Text>
        <TextField
          label="New list name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (createError) setCreateError(null);
          }}
          accessibilityLabel="New list name"
        />
        {createError ? (
          <Text
            accessibilityLiveRegion="polite"
            className="font-ui text-sm text-danger"
          >
            {createError}
          </Text>
        ) : null}
        <Button label="Create list" onPress={handleCreate} loading={loading} />
        {templates.length > 0 ? (
          <View className="gap-2">
            <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
              New from template
            </Text>
            {templates.map((template) => (
              <Button
                key={template.id}
                label={template.name}
                variant="secondary"
                loading={fromTemplateBusy}
                onPress={() => void handleNewFromTemplate(template)}
                accessibilityLabel={`Create shopping list from template ${template.name}`}
              />
            ))}
          </View>
        ) : null}
      </View>
      <FlatList
        data={shoppingLists}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="No lists"
            description="Create your first shopping list above, then open it to shop."
            actionLabel="Create list"
            onAction={handleCreate}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={`Sort: ${item.sortMode}`}
            onPress={() => router.push(`/(app)/lists/${item.id}`)}
            onLongPress={() => handleListActions(item)}
            right={
              <View className="flex-row gap-1">
                <Button
                  label="Rename"
                  variant="ghost"
                  onPress={() => handleOpenRename(item)}
                  accessibilityLabel={`Rename list ${item.name}`}
                  className="min-w-0 px-2"
                />
                <Button
                  label="Delete"
                  variant="ghost"
                  onPress={() => handleDelete(item)}
                  accessibilityLabel={`Delete list ${item.name}`}
                  className="min-w-0 px-2"
                />
              </View>
            }
          />
        )}
      />

      <Sheet
        visible={Boolean(renaming)}
        title="Rename list"
        onClose={() => {
          setRenaming(null);
          setRenameValue('');
          setRenameSortMode('aisle');
        }}
      >
        <TextField
          label="List name"
          value={renameValue}
          onChangeText={setRenameValue}
          autoFocus
        />
        <Text className="mb-1 mt-2 font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">
          Sort mode
        </Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {(['aisle', 'category', 'custom'] as const).map((mode) => (
            <Button
              key={mode}
              label={mode}
              variant={renameSortMode === mode ? 'primary' : 'secondary'}
              onPress={() => setRenameSortMode(mode)}
              accessibilityLabel={`Sort mode ${mode}`}
            />
          ))}
        </View>
        <Button
          label="Save"
          onPress={handleSaveRename}
          loading={renamingBusy}
          accessibilityLabel="Save list name"
        />
      </Sheet>
    </View>
  );
}
