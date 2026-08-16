import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, CheckAffordance, EmptyState, Skeleton, TextField, Toast } from '../src/components/ui';

export default function GalleryScreen() {
  const [checked, setChecked] = useState(false);
  const [toast, setToast] = useState<string | null>('Signature toast');

  return (
    <ScrollView className="flex-1 bg-surface px-4 py-6">
      <Text className="font-display text-3xl text-ink">Design system</Text>
      <Text className="mb-6 font-ui text-ink-muted">Marketlist primitives</Text>
      <View className="gap-4">
        <Button label="Primary CTA" onPress={() => setToast('Added to list')} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
        <Button label="Ghost" variant="ghost" onPress={() => undefined} />
        <TextField label="Sample field" placeholder="Milk" />
        <CheckAffordance checked={checked} onToggle={() => setChecked((v) => !v)} label="Milk" />
        <Skeleton />
        <EmptyState title="Empty" description="Calm empty states, no card spam." />
      </View>
      <Toast message={toast} />
    </ScrollView>
  );
}
