import React from 'react';
import { Appearance, Pressable, Text, View, useColorScheme } from 'react-native';
import { captureException } from '../lib/sentry';

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[marketlist-mobile]', error.message, error.stack);
    captureException(error);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    const scheme = Appearance.getColorScheme();
    const dark = scheme === 'dark';
    if (this.state.error) {
      return (
        <View
          className={`flex-1 items-center justify-center px-6 ${dark ? 'bg-surface-dark' : 'bg-surface'}`}
          accessibilityRole="alert"
        >
          <Text className={`font-display text-2xl ${dark ? 'text-ink-on-dark' : 'text-ink'}`}>
            Something went wrong
          </Text>
          <Text className={`mt-2 text-center font-ui ${dark ? 'text-ink-muted-dark' : 'text-ink-muted'}`}>
            {this.state.error.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            className="mt-6 min-h-[44px] items-center justify-center rounded-xl bg-citrus px-4"
            onPress={this.handleReset}
          >
            <Text className="font-ui-bold text-ink">Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export const useIsDark = () => useColorScheme() === 'dark';
