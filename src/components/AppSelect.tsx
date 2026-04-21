import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export interface SelectOption {
  label: string;
  value: string | number;
}

interface Props {
  label: string;
  options: SelectOption[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  /** Tighter layout for filter grids. */
  dense?: boolean;
}

export default function AppSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select",
  dense = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = useMemo(() => {
    const hit = options.find((x) => String(x.value) === String(value));
    return hit?.label || placeholder;
  }, [options, value, placeholder]);
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <View style={[styles.container, dense && styles.containerDense]}>
      <Text style={[styles.label, dense && styles.labelDense]}>{label}</Text>
      <Pressable style={[styles.field, dense && styles.fieldDense]} onPress={() => setVisible(true)}>
        <Text style={[styles.fieldText, isEmpty ? styles.placeholder : null]} numberOfLines={1}>
          {selectedLabel}
        </Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable
              style={styles.option}
              onPress={() => {
                onChange(null);
                setVisible(false);
              }}
            >
              <Text style={[styles.optionText, styles.placeholder]}>{placeholder}</Text>
            </Pressable>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  containerDense: { marginBottom: 0, flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  labelDense: { fontSize: 11, marginBottom: 4 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldDense: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  fieldText: {
    color: colors.text,
    fontWeight: "600",
  },
  placeholder: { color: colors.mutedText, fontWeight: "500" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.45)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    maxHeight: "70%",
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: colors.primaryDark, marginBottom: 8 },
  option: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  optionText: { color: colors.text, fontWeight: "600" },
});
