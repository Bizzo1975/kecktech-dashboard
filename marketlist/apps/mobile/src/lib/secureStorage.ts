import * as SecureStore from 'expo-secure-store';

const ACCESS = 'ml_access';
const REFRESH = 'ml_refresh';
const HOUSEHOLD = 'ml_household';

export const saveTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync(ACCESS, accessToken);
  await SecureStore.setItemAsync(REFRESH, refreshToken);
};

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH);

export const saveHouseholdId = async (householdId: string) => {
  await SecureStore.setItemAsync(HOUSEHOLD, householdId);
};

export const getHouseholdId = () => SecureStore.getItemAsync(HOUSEHOLD);

export const clearHouseholdId = async () => {
  await SecureStore.deleteItemAsync(HOUSEHOLD);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await SecureStore.deleteItemAsync(HOUSEHOLD);
};
