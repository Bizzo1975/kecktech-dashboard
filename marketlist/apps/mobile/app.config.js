import Constants from 'expo-constants';

const apiFromEnv = process.env.EXPO_PUBLIC_API_URL;

export default ({ config }: { config: Record<string, unknown> }) => ({
  ...config,
  extra: {
    ...(typeof config.extra === 'object' && config.extra ? config.extra : {}),
    apiUrl: apiFromEnv || (config.extra as { apiUrl?: string })?.apiUrl || 'http://localhost:3000/api',
    eas: {
      projectId: 'marketlist-local',
    },
  },
});
