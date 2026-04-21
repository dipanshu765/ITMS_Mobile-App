import { StyleSheet, Text, View } from "react-native";
import AppShell from "../components/AppShell";
import { colors } from "../theme/colors";

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

export default function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <AppShell title={title}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 6 },
  description: { color: colors.mutedText, lineHeight: 20 },
});
