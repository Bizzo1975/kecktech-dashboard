import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';

type User = {
  id: string;
  email: string;
  name: string;
  dietaryPrefs?: string[] | null;
  notificationPrefs?: {
    notifyExpiring?: boolean;
    notifyTripReminder?: boolean;
  } | null;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  householdId: string | null;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  householdId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.hydrated = true;
    },
    setHouseholdId: (state, action: PayloadAction<string | null>) => {
      state.householdId = action.payload;
    },
    setHydrated: (state) => {
      state.hydrated = true;
    },
    clearSession: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.householdId = null;
      state.hydrated = true;
    },
  },
});

export const { setSession, clearSession, setHydrated, setHouseholdId } = authSlice.actions;

export const store = configureStore({
  reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
