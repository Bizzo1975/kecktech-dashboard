'use client';

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

const pct = (value: number, goal: number | null | undefined) => {
  if (!goal || goal <= 0) return null;
  return Math.min(100, Math.round((value / goal) * 100));
};

const fmt = (n: number, digits = 0) =>
  Number.isFinite(n) ? (digits > 0 ? n.toFixed(digits) : String(Math.round(n))) : '0';

type MacroRowProps = {
  label: string;
  value: number;
  goal: number | null | undefined;
  unit?: string;
};

const MacroRow = ({ label, value, goal, unit = '' }: MacroRowProps) => {
  const width = pct(value, goal);
  return (
    <div className="stack" style={{ gap: '0.25rem' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span className="muted">
          {fmt(value, label === 'Protein' || label === 'Carbs' || label === 'Fat' ? 0 : 0)}
          {unit}
          {goal ? ` / ${fmt(goal)}${unit}` : ''}
        </span>
      </div>
      {width !== null ? (
        <div className="bar-track" aria-hidden="true">
          <div className="bar-fill" style={{ width: `${width}%` }} />
        </div>
      ) : null}
    </div>
  );
};

type DayNutritionStripProps = {
  date: string;
  totals: MacroSet;
  goals: NutritionGoals;
  logCount?: number;
};

export const DayNutritionStrip = ({ date, totals, goals, logCount }: DayNutritionStripProps) => (
  <section className="card stack" aria-label={`Nutrition for ${date}`}>
    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
      <strong>Today&apos;s nutrition</strong>
      <span className="muted">{date}</span>
    </div>
    {logCount === 0 ? (
      <p className="muted" style={{ margin: 0 }}>
        No meals logged yet — cook a planned meal or log from Recipes.
      </p>
    ) : null}
    <MacroRow label="Calories" value={totals.kcal} goal={goals.dailyCalorieGoal} unit=" kcal" />
    <MacroRow label="Protein" value={totals.proteinG} goal={goals.proteinGoalG} unit="g" />
    <MacroRow label="Carbs" value={totals.carbG} goal={goals.carbGoalG} unit="g" />
    <MacroRow label="Fat" value={totals.fatG} goal={goals.fatGoalG} unit="g" />
    {!goals.dailyCalorieGoal ? (
      <p className="muted" style={{ margin: 0 }}>
        Set nutrition goals in Settings to compare macros here.
      </p>
    ) : null}
  </section>
);

type WeekDayNutrition = { date: string; totals: MacroSet };

type WeekNutritionStripProps = {
  from: string;
  to: string;
  days: WeekDayNutrition[];
  weekTotals: MacroSet;
  goals: NutritionGoals;
  orderedWeekDays?: Array<{ iso: string; label: string }>;
};

export const WeekNutritionStrip = ({
  from,
  to,
  days,
  weekTotals,
  goals,
  orderedWeekDays = [],
}: WeekNutritionStripProps) => {
  const dayMap = new Map(days.map((d) => [d.date, d.totals]));
  const maxKcal = Math.max(...days.map((d) => d.totals.kcal), goals.dailyCalorieGoal || 1, 1);
  const slots =
    orderedWeekDays.length > 0
      ? orderedWeekDays
      : days.map((d) => ({ iso: d.date, label: d.date.slice(5) }));

  return (
    <section className="card stack" aria-label={`Week nutrition ${from} to ${to}`}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <strong>Week at a glance</strong>
        <span className="muted">
          {fmt(weekTotals.kcal)} kcal logged · {days.length} day{days.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="week-strip" role="list" aria-label="Daily calories this week">
        {slots.map(({ iso, label }) => {
          const totals = dayMap.get(iso);
          const kcal = totals?.kcal ?? 0;
          const height = Math.max(4, Math.round((kcal / maxKcal) * 100));
          return (
            <div key={iso} className="stack" style={{ gap: '0.2rem', alignItems: 'center' }} role="listitem">
              <div
                className="bar-track"
                style={{ width: '100%', height: 36, display: 'flex', alignItems: 'flex-end' }}
                aria-hidden="true"
              >
                <div
                  className="bar-fill"
                  style={{ width: '100%', height: `${height}%`, minHeight: kcal > 0 ? 4 : 0 }}
                />
              </div>
              <span className="muted" style={{ fontSize: '0.7rem', textAlign: 'center' }}>
                {label}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{kcal > 0 ? fmt(kcal) : '·'}</span>
            </div>
          );
        })}
      </div>
      {goals.dailyCalorieGoal ? (
        <p className="muted" style={{ margin: 0 }}>
          Daily goal: {goals.dailyCalorieGoal} kcal — bars show logged meals only.
        </p>
      ) : null}
    </section>
  );
};

export const LifestyleDisclaimer = ({ text }: { text?: string }) => (
  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }} role="note">
    {text ||
      'Lifestyle nutrition tracking only — not medical advice. Values come from meal logs and known ingredient profiles; they may be incomplete.'}
  </p>
);

type PerServingMacrosProps = {
  perServing: MacroSet;
  servings: number;
  disclaimer?: string;
};

export const PerServingMacros = ({ perServing, servings, disclaimer }: PerServingMacrosProps) => (
  <div className="stack" style={{ gap: '0.35rem' }} aria-label="Per-serving nutrition estimate">
    <strong style={{ fontSize: '0.95rem' }}>Per serving ({servings} total)</strong>
    <div className="muted">
      {fmt(perServing.kcal)} kcal · P {fmt(perServing.proteinG)}g · C {fmt(perServing.carbG)}g · F{' '}
      {fmt(perServing.fatG)}g
    </div>
    {disclaimer ? (
      <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
        {disclaimer}
      </p>
    ) : null}
  </div>
);
