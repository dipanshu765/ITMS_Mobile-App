import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

interface Props extends PropsWithChildren {
  padded?: boolean;
  scroll?: boolean;
  style?: ViewStyle;
}

export default function ScreenContainer({ children, padded = true, scroll = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const content = (
    <SafeAreaView style={[styles.safe, style]} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            padded && styles.padded,
            { paddingBottom: (padded ? 16 : 0) + Math.max(insets.bottom, 8) },
          ]}
        >
          {children}
        </ScrollView>
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
