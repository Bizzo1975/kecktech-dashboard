import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Home, ListChecks, Package, BookOpen, Settings } from 'lucide-react-native';

export default function AppLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8A317',
        tabBarInactiveTintColor: isDark ? '#9AAB9F' : '#5C6B63',
        tabBarStyle: {
          backgroundColor: isDark ? '#121512' : '#FFFFFF',
          borderTopColor: isDark ? '#2A322C' : '#D5E0D8',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lists/index"
        options={{
          title: 'Lists',
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pantry/index"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="recipes/index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="lists/[id]" options={{ href: null, title: 'List' }} />
      <Tabs.Screen name="meals" options={{ href: null, title: 'Meals' }} />
      <Tabs.Screen name="garden" options={{ href: null, title: 'Garden' }} />
      <Tabs.Screen name="garden-farmbot" options={{ href: null, title: 'FarmBot' }} />
      <Tabs.Screen name="catalog" options={{ href: null, title: 'Catalog' }} />
      <Tabs.Screen name="prices" options={{ href: null, title: 'Prices' }} />
      <Tabs.Screen name="insights" options={{ href: null, title: 'Insights' }} />
      <Tabs.Screen name="capture" options={{ href: null, title: 'Capture' }} />
    </Tabs>
  );
}
