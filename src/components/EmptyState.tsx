import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  title: string;
}

export default function EmptyState({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  title: {
    color: colors.primaryDark,
    fontWeight: "600",
    textAlign: "center",
  },
});
