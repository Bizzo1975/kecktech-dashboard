import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../src/components/ui';

const ONBOARDING_KEY = 'ml_onboarding_done';

const SLIDES = [
  {
    title: 'One shared list',
    body: 'You or your household — add from anywhere, stay in sync.',
  },
  {
    title: 'Shop by aisle',
    body: 'Items auto-group so you stop zigzagging the supermarket.',
  },
  {
    title: 'Finish the trip',
    body: 'Complete trip moves checked food into Pantry so stock stays honest.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const handleNext = async () => {
    if (index < SLIDES.length - 1) {
      setIndex((v) => v + 1);
      return;
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/login');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 justify-end bg-sage px-6 pb-12 pt-16">
      <Text className="font-display text-5xl text-ink" accessibilityRole="header">
        Marketlist
      </Text>
      <Text className="mt-8 font-display text-3xl text-ink">{slide.title}</Text>
      <Text className="mt-3 font-ui text-lg text-ink-muted">{slide.body}</Text>
      <View className="mt-10 flex-row gap-2">
        {SLIDES.map((_, i) => (
          <View
            key={SLIDES[i].title}
            className={`h-2 flex-1 rounded-full ${i <= index ? 'bg-citrus' : 'bg-sage-deep'}`}
          />
        ))}
      </View>
      <View className="mt-8 gap-3">
        <Button label={index === SLIDES.length - 1 ? 'Get started' : 'Next'} onPress={handleNext} />
        <Button label="Skip" variant="ghost" onPress={handleSkip} />
      </View>
    </View>
  );
}

export const hasCompletedOnboarding = async () => {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === '1';
};
