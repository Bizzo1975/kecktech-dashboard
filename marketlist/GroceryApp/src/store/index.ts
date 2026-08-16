import { configureStore } from '@reduxjs/toolkit';
import groceryReducer from './slices/grocerySlice';
import recipeReducer from './slices/recipeSlice';
import pantryReducer from './slices/pantrySlice';
import mealPlanReducer from './slices/mealPlanSlice';

export const store = configureStore({
  reducer: {
    grocery: groceryReducer,
    recipes: recipeReducer,
    pantry: pantryReducer,
    mealPlan: mealPlanReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 