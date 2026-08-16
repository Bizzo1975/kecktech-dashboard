import React from 'react';
import { Text, View } from 'react-native';

export type MacroSet = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type NutritionGoals = {
  dailyCalorieGoal: number | null;
  proteinGoalG: number | null;
  carbGoalG: number | null;
  fatGoalG: number | null;
};

const DEFAULT_DISCLAIMER =
  'Lifestyle nutrition tracking only — not medical advice. Values may be incomplete.';

export const LifestyleDisclaimer = ({
  text = DEFAULT_DISCLAIMER,
  className = '',
}: {
  text?: string;
  className?: string;
}) => (
  <Text
    className={`font-ui text-xs text-ink-muted dark:text-ink-muted-dark ${className}`}
    accessibilityRole="text"
  >
    {text}
  </Text>
);

const MacroBar = ({
  label,
  value,
  goal,
  unit,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit: string;
}) => {
  const pct =
    goal != null && goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : null;
  return (
    <View className="gap-1" accessibilityLabel={`${label} ${Math.round(value)} ${unit}`}>
      <View className="flex-row justify-between">
        <Text className="font-ui text-sm text-ink dark:text-ink-on-dark">{label}</Text>
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          {Math.round(value)}
          {unit}
          {goal != null && goal > 0 ? ` / ${Math.round(goal)}${unit}` : ''}
        </Text>
      </View>
      <View className="h-2.5 w-full overflow-hidden rounded-full bg-sage-deep/50 dark:bg-surface-dark-elevated">
        <View
          className="h-2.5 rounded-full bg-citrus"
          style={{ width: `${pct ?? (value > 0 ? 12 : 0)}%` }}
        />
      </View>
      {pct != null ? (
        <Text className="font-ui text-xs text-ink-muted dark:text-ink-muted-dark">
          {pct}% of goal
        </Text>
      ) : null}
    </View>
  );
};

export const NutritionStrip = ({
  title,
  totals,
  goals,
  goalMultiplier = 1,
  disclaimer,
  compact = false,
}: {
  title: string;
  totals: MacroSet;
  goals: NutritionGoals;
  goalMultiplier?: number;
  disclaimer?: string;
  compact?: boolean;
}) => {
  const kcalGoal =
    goals.dailyCalorieGoal != null && goals.dailyCalorieGoal > 0
      ? goals.dailyCalorieGoal * goalMultiplier
      : null;
  const proteinGoal =
    goals.proteinGoalG != null && goals.proteinGoalG > 0
      ? goals.proteinGoalG * goalMultiplier
      : null;
  const carbGoal =
    goals.carbGoalG != null && goals.carbGoalG > 0 ? goals.carbGoalG * goalMultiplier : null;
  const fatGoal =
    goals.fatGoalG != null && goals.fatGoalG > 0 ? goals.fatGoalG * goalMultiplier : null;

  return (
    <View
      className={`gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-surface-dark-elevated ${
        compact ? 'p-3' : ''
      }`}
      accessibilityRole="summary"
      accessibilityLabel={`${title} nutrition summary`}
    >
      <Text className="font-ui-bold text-base text-ink dark:text-ink-on-dark">{title}</Text>
      <MacroBar label="Calories" value={totals.kcal} goal={kcalGoal} unit=" kcal" />
      {!compact ? (
        <>
          <MacroBar label="Protein" value={totals.proteinG} goal={proteinGoal} unit="g" />
          <MacroBar label="Carbs" value={totals.carbG} goal={carbGoal} unit="g" />
          <MacroBar label="Fat" value={totals.fatG} goal={fatGoal} unit="g" />
        </>
      ) : (
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          P {Math.round(totals.proteinG)}g · C {Math.round(totals.carbG)}g · F{' '}
          {Math.round(totals.fatG)}g
        </Text>
      )}
      {!kcalGoal && !proteinGoal ? (
        <Text className="font-ui text-sm text-ink-muted dark:text-ink-muted-dark">
          Set nutrition goals in Settings to track progress.
        </Text>
      ) : null}
      <LifestyleDisclaimer text={disclaimer} />
    </View>
  );
};

export const formatRecipeMacros = (macros: MacroSet) =>
  `${Math.round(macros.kcal)} kcal · P ${Math.round(macros.proteinG)}g · C ${Math.round(
    macros.carbG,
  )}g · F ${Math.round(macros.fatG)}g`;
