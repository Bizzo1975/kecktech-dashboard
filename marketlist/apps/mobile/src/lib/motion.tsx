import type { ComponentType } from 'react';
import { MotiView as MotiViewBase } from 'moti';
import Animated from 'react-native-reanimated';

/**
 * Moti / Reanimated class components trip TS2786 in this monorepo
 * (mixed @types/react 18 from Expo + 19 from web). Cast once here.
 */
export const MotiView = MotiViewBase as ComponentType<Record<string, unknown>>;
export const AnimatedView = Animated.View as ComponentType<Record<string, unknown>>;
