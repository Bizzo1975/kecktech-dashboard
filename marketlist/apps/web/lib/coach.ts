import { markFirstTrip, writeActivation } from './activation';

/** Thin bridge from feature screens into activation flags — no guide UI. */
export type CoachProgress = {
  dismissed: boolean;
  openedList: boolean;
  addedItem: boolean;
  checkedItem: boolean;
  completedTrip: boolean;
  visitedPantry: boolean;
  addedPantry: boolean;
  usedRecipe: boolean;
  plannedMeal: boolean;
  usedCatalog: boolean;
  usedCapture: boolean;
  recordedPrice: boolean;
  visitedInsights: boolean;
};

export const defaultCoach = (): CoachProgress => ({
  dismissed: true,
  openedList: false,
  addedItem: false,
  checkedItem: false,
  completedTrip: false,
  visitedPantry: false,
  addedPantry: false,
  usedRecipe: false,
  plannedMeal: false,
  usedCatalog: false,
  usedCapture: false,
  recordedPrice: false,
  visitedInsights: false,
});

export const readCoach = (): CoachProgress => defaultCoach();

export const writeCoach = (patch: Partial<CoachProgress>) => {
  if (patch.completedTrip) markFirstTrip();
  if (patch.visitedPantry || patch.addedPantry) writeActivation({ visitedPantry: true });
  if (patch.usedRecipe) writeActivation({ usedRecipe: true });
  if (patch.recordedPrice) writeActivation({ recordedPrice: true });
  return { ...defaultCoach(), ...patch, dismissed: true };
};
