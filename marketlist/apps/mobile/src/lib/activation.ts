import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const readActivation = async (): Promise<ActivationState> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultActivation();
    const parsed = JSON.parse(raw) as Partial<ActivationState>;
    return { ...defaultActivation(), ...parsed };
  } catch {
    return defaultActivation();
  }
};

export const writeActivation = async (
  patch: Partial<ActivationState>,
): Promise<ActivationState> => {
  const current = await readActivation();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const markFirstTrip = async (): Promise<ActivationState> =>
  writeActivation({ firstTripDone: true });
