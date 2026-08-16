const KEY = 'ml_activation_v1';

export type ActivationState = {
  firstTripDone: boolean;
  visitedPantry: boolean;
  usedRecipe: boolean;
  recordedPrice: boolean;
  defaultListId: string | null;
};

export const defaultActivation = (): ActivationState => ({
  firstTripDone: false,
  visitedPantry: false,
  usedRecipe: false,
  recordedPrice: false,
  defaultListId: null,
});

export const readActivation = (): ActivationState => {
  if (typeof window === 'undefined') return defaultActivation();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultActivation();
    const parsed = JSON.parse(raw) as Partial<ActivationState>;
    return { ...defaultActivation(), ...parsed };
  } catch {
    return defaultActivation();
  }
};

export const writeActivation = (patch: Partial<ActivationState>): ActivationState => {
  if (typeof window === 'undefined') return defaultActivation();
  const next = { ...readActivation(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const markFirstTrip = (): ActivationState => writeActivation({ firstTripDone: true });
