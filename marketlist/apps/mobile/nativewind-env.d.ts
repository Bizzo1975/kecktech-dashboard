import 'react-native';

/**
 * NativeWind className augments (inlined — nested css-interop types
 * do not always resolve via `/// <reference types=...>` in this monorepo).
 */
declare module 'react-native' {
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextInputProps {
    className?: string;
    placeholderClassName?: string;
    cssInterop?: boolean;
  }
  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }
  interface PressableProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TouchableOpacityProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
    columnWrapperClassName?: string;
  }
  interface KeyboardAvoidingViewProps {
    contentContainerClassName?: string;
  }
  interface ImageBackgroundProps {
    imageClassName?: string;
  }
}

export {};
