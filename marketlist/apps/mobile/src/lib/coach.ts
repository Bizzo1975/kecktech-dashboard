import { markFirstTrip, writeActivation } from './activation';

/** Writes factual activation flags only — no guide UI or “coach complete” state. */
export type CoachPatch = {
  completedTrip?: boolean;
  visitedPantry?: boolean;
  addedPantry?: boolean;
  usedRecipe?: boolean;
  recordedPrice?: boolean;
  openedList?: boolean;
  addedItem?: boolean;
  checkedItem?: boolean;
  plannedMeal?: boolean;
  usedCatalog?: boolean;
  usedCapture?: boolean;
  visitedInsights?: boolean;
};

export const writeCoach = async (patch: CoachPatch): Promise<void> => {
  if (patch.completedTrip) await markFirstTrip();
  if (patch.visitedPantry || patch.addedPantry) await writeActivation({ visitedPantry: true });
  if (patch.usedRecipe) await writeActivation({ usedRecipe: true });
  if (patch.recordedPrice) await writeActivation({ recordedPrice: true });
};
