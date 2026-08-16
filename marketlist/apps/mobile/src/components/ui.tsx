import React from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedView, MotiView } from '../lib/motion';

const useReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
};

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  className?: string;
};

export const Button = ({
  label,
  variant = 'primary',
  loading,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const base =
    variant === 'primary'
      ? 'bg-citrus'
      : variant === 'secondary'
        ? 'bg-sage-deep dark:bg-surface-dark-elevated'
        : variant === 'danger'
          ? 'bg-danger'
          : 'bg-transparent';
  const text =
    variant === 'ghost'
      ? 'text-ink dark:text-ink-on-dark'
      : variant === 'secondary'
        ? 'text-ink dark:text-ink-on-dark'
        : 'text-ink';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      className={`min-h-[44px] items-center justify-center rounded-xl px-4 ${base} ${disabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#1A1F1C" />
      ) : (
        <Text className={`font-ui-bold text-base ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
};

export const TextField = React.forwardRef<
  TextInput,
  TextInputProps & { label: string; className?: string }
>(({ label, className = '', ...props }, ref) => (
  <View className="gap-2">
    <Text className="font-ui-medium text-sm text-ink-muted dark:text-ink-muted-dark">{label}</Text>
    <TextInput
      ref={ref}
      accessibilityLabel={label}
      placeholderTextColor="#9AAB9F"
      className={`min-h-[44px] rounded-xl border border-border bg-white px-3 font-ui text-base text-ink dark:border-border-dark dark:bg-surface-dark-elevated dark:text-ink-on-dark ${className}`}
      {...props}
    />
  </View>
));
TextField.displayName = 'TextField';

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) => (
  <View className={`items-center gap-3 px-6 py-12 ${className}`}>
    <Text className="font-display text-2xl text-ink dark:text-ink-on-dark">{title}</Text>
    <Text className="text-center font-ui text-base text-ink-muted dark:text-ink-muted-dark">
      {description}
    </Text>
    {actionLabel && onAction ? (
      <Button label={actionLabel} onPress={onAction} className="mt-2 min-w-[160px]" />
    ) : null}
  </View>
);

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <View className={`h-12 animate-pulse rounded-xl bg-sage-deep/60 dark:bg-surface-dark-elevated ${className}`} />
);

export const ListRow = ({
  title,
  subtitle,
  onPress,
  onLongPress,
  right,
  className = '',
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: React.ReactNode;
  className?: string;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={onPress}
    onLongPress={onLongPress}
    className={`min-h-[56px] flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border-dark ${className}`}
  >
    <View className="flex-1 pr-3">
      <Text className="font-ui-medium text-base text-ink dark:text-ink-on-dark">{title}</Text>
      {subtitle ? (
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">{subtitle}</Text>
      ) : null}
    </View>
    {right}
  </Pressable>
);

export const CheckAffordance = ({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) => {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(checked ? 1 : 0);
  React.useEffect(() => {
    if (reduceMotion) {
      progress.value = checked ? 1 : 0;
      return;
    }
    progress.value = withTiming(checked ? 1 : 0, { duration: 220 });
  }, [checked, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + progress.value * 0.15 }],
    opacity: 0.5 + progress.value * 0.5,
  }));

  const markClass = `h-7 w-7 items-center justify-center rounded-full border-2 ${
    checked
      ? 'border-success bg-success'
      : 'border-ink-muted bg-transparent dark:border-ink-muted-dark'
  }`;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`Mark ${label} ${checked ? 'unchecked' : 'checked'}`}
      onPress={onToggle}
      className="h-11 w-11 items-center justify-center"
    >
      {reduceMotion ? (
        <View className={markClass} style={{ opacity: checked ? 1 : 0.5 }}>
          {checked ? <Text className="text-white">✓</Text> : null}
        </View>
      ) : (
        <AnimatedView style={style} className={markClass}>
          {checked ? <Text className="text-white">✓</Text> : null}
        </AnimatedView>
      )}
    </Pressable>
  );
};

export const Toast = ({
  message,
  actionLabel,
  onAction,
}: {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      className="absolute bottom-8 left-4 right-4 z-50 flex-row items-center gap-3 rounded-xl bg-ink px-4 py-3 dark:bg-surface-dark-elevated"
    >
      <Text className="flex-1 text-center font-ui-medium text-surface dark:text-ink-on-dark">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          className="min-h-[44px] justify-center px-2"
        >
          <Text className="font-ui-bold text-citrus">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export const SyncPulse = ({
  active,
  className = '',
  children,
}: {
  active: boolean;
  className?: string;
  children?: React.ReactNode;
}) => {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (!active || reduceMotion) {
      pulse.value = withTiming(0, { duration: reduceMotion ? 0 : 200 });
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [active, pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: active && !reduceMotion ? interpolate(pulse.value, [0, 1], [0.45, 1]) : 1,
  }));

  return (
    <AnimatedView
      style={style}
      accessibilityLabel={active ? 'Syncing' : undefined}
      className={className}
    >
      {children ?? (
        <View className="h-2 w-2 rounded-full bg-citrus" accessibilityLabel="Sync indicator" />
      )}
    </AnimatedView>
  );
};

export const AddFlash = ({
  flashKey,
  children,
  className = '',
}: {
  flashKey: string | number;
  children: React.ReactNode;
  className?: string;
}) => {
  const reduceMotion = useReduceMotion();
  const flash = useSharedValue(0);

  React.useEffect(() => {
    if (reduceMotion) {
      flash.value = 0;
      return;
    }
    flash.value = 0;
    flash.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(0, { duration: 420 }),
    );
  }, [flashKey, flash, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    borderWidth: 2,
    borderColor: `rgba(232, 163, 23, ${flash.value})`,
  }));

  return (
    <AnimatedView style={style} className={`rounded-xl ${className}`}>
      {children}
    </AnimatedView>
  );
};

export const Sheet = ({
  visible,
  title,
  children,
  onClose,
  className = '',
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) => {
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
          onPress={onClose}
          className="absolute inset-0"
        >
          {reduceMotion ? (
            <View className="flex-1 bg-black/40" />
          ) : (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 200 }}
              className="flex-1 bg-black/40"
            />
          )}
        </Pressable>

        {reduceMotion ? (
          <View
            accessibilityRole="summary"
            accessibilityLabel={title}
            className={`max-h-[85%] rounded-t-3xl border-t border-border bg-white px-4 pb-8 pt-4 dark:border-border-dark dark:bg-surface-dark ${className}`}
          >
            <Text className="mb-3 font-display text-2xl text-ink dark:text-ink-on-dark">{title}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
            >
              {children}
              <Button label="Close" variant="ghost" onPress={onClose} />
            </ScrollView>
          </View>
        ) : (
          <MotiView
            from={{ translateY: 48, opacity: 0.96 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'timing', duration: 240 }}
            accessibilityRole="summary"
            accessibilityLabel={title}
            className={`max-h-[85%] rounded-t-3xl border-t border-border bg-white px-4 pb-8 pt-4 dark:border-border-dark dark:bg-surface-dark ${className}`}
          >
            <Text className="mb-3 font-display text-2xl text-ink dark:text-ink-on-dark">{title}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
            >
              {children}
              <Button label="Close" variant="ghost" onPress={onClose} />
            </ScrollView>
          </MotiView>
        )}
      </View>
    </Modal>
  );
};
