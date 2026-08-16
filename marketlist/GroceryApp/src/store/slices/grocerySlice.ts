import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GroceryItem } from '../../types';

interface GroceryState {
  items: GroceryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: GroceryState = {
  items: [],
  loading: false,
  error: null,
};

const grocerySlice = createSlice({
  name: 'grocery',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<GroceryItem>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateItem: (state, action: PayloadAction<GroceryItem>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    toggleItemChecked: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item) {
        item.isChecked = !item.isChecked;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  addItem,
  removeItem,
  updateItem,
  toggleItemChecked,
  setLoading,
  setError,
} = grocerySlice.actions;

export default grocerySlice.reducer; 