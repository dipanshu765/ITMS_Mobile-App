import { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface Props extends PropsWithChildren {
  padded?: boolean;
  scroll?: boolean;
  style?: ViewStyle;
}

export default function ScreenContainer({ children, padded = true, scroll = true, style }: Props) {
  const content = (
    <SafeAreaView style={[styles.safe, style]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, padded && styles.padded]}>{children}</ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );

  return content;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
  padded: {
    padding: 16,
  },
});
