import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { MainStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { DashboardData } from "../types";
import { colors } from "../theme/colors";

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatChip(ymd: string): string {
  try {
    return parseYmdLocal(ymd).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

export default function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { width: windowWidth } = useWindowDimensions();
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"start" | "end" | null>(null);

  const startRef = useRef(startDate);
  const endRef = useRef(endDate);
  useEffect(() => {
    startRef.current = startDate;
    endRef.current = endDate;
  }, [startDate, endDate]);

  const loadData = useCallback(async (sDate?: string, eDate?: string) => {
    if (!token) return;
    try {
      setError(null);
      let s = sDate ?? startRef.current;
      let e = eDate ?? endRef.current;
      if (parseYmdLocal(s) > parseYmdLocal(e)) {
        const t = s;
        s = e;
        e = t;
      }
      const result = await api.getDashboardData(token, s, e);
      setData(result.data);
      if (result.data?.start_date) setStartDate(result.data.start_date);
      if (result.data?.end_date) setEndDate(result.data.end_date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalTasks = data?.task_stats?.total_tasks ?? data?.task_stats?.total ?? 0;
  const statusBreakdown = data?.task_stats?.status_breakdown ?? {};
  const statusCards = useMemo(
    () => [
      {
        key: "total",
        label: "Total",
        value: totalTasks,
        icon: "clipboard-list-outline",
        color: "#6366F1",
      },
      {
        key: "pending",
        label: "Pending",
        value: statusBreakdown.pending ?? 0,
        icon: "clock-outline",
        color: "#D97706",
      },
      {
        key: "resolved",
        label: "Resolved",
        value: statusBreakdown.resolved ?? 0,
        icon: "check-circle-outline",
        color: "#16A34A",
      },
      {
        key: "reopen",
        label: "Reopen",
        value: statusBreakdown.reopen ?? 0,
        icon: "backup-restore",
        color: "#DC2626",
      },
      {
        key: "closed",
        label: "Closed",
        value: statusBreakdown.closed ?? 0,
        icon: "close-circle-outline",
        color: "#64748B",
      },
    ],
    [totalTasks, statusBreakdown],
  );

  const chipText = useMemo(() => `${formatChip(startDate)} – ${formatChip(endDate)}`, [startDate, endDate]);

  const metricCardWidth = useMemo(() => {
    const contentPad = 14 * 2;
    const gap = 8;
    const inner = Math.max(0, windowWidth - contentPad);
    return (inner - gap * 2) / 3;
  }, [windowWidth]);

  const openPicker = (mode: "start" | "end") => setPickerMode(mode);

  const onPickerChange = (event: { type?: string } | undefined, date?: Date) => {
    const mode = pickerMode;
    if (Platform.OS === "android") {
      setPickerMode(null);
      if (event?.type !== "set" || !date || !mode) return;
      const ymd = formatYmd(date);
      if (mode === "start") setStartDate(ymd);
      else setEndDate(ymd);
      return;
    }
    if (!date || !mode) return;
    const ymd = formatYmd(date);
    if (mode === "start") setStartDate(ymd);
    else setEndDate(ymd);
  };

  const applyRangeFromModal = () => {
    setDateModalOpen(false);
    setPickerMode(null);
    void loadData(startRef.current, endRef.current);
  };

  const onMetricPress = (key: string) => {
    const status = key === "total" ? null : key;
    navigation.navigate("Tasks", {
      source: "dashboard",
      status: (status as "pending" | "resolved" | "reopen" | "closed" | null) ?? null,
      startDate,
      endDate,
      nonce: Date.now(),
    });
  };

  const headerCenter = (
    <TouchableOpacity
      onPress={() => setDateModalOpen(true)}
      style={styles.headerDateChip}
      activeOpacity={0.7}
      accessibilityLabel="Change date range"
    >
      <MaterialCommunityIcons name="calendar-range" size={14} color="#334155" />
      <Text style={styles.headerDateText} numberOfLines={1}>
        {chipText}
      </Text>
    </TouchableOpacity>
  );

  return (
    <AppShell title="Dashboard" headerCenter={headerCenter}>
      <View style={styles.metricsGrid}>
        {statusCards.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.9}
            onPress={() => onMetricPress(item.key)}
            style={[styles.metricCard, { backgroundColor: item.color, width: metricCardWidth }]}
          >
            <MaterialCommunityIcons name={item.icon as any} size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Task Status Distribution</Text>
        {Object.keys(statusBreakdown).length ? (
          Object.entries(statusBreakdown).map(([k, v]) => {
            const pct = totalTasks ? Math.round((Number(v) / totalTasks) * 100) : 0;
            return (
              <View key={k} style={styles.distRow}>
                <View style={styles.distHeader}>
                  <Text style={styles.item}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                  <Text style={styles.statusValue}>{v}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(6, pct)}%` }]} />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState title="No status data available" />
        )}
      </View>

      {!!data?.recent_activities?.length && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activities</Text>
          {data.recent_activities.map((act, idx) => (
            <View key={`${act.module_name}_${idx}`} style={styles.activityRow}>
              <Text style={styles.activityModule} numberOfLines={1}>
                {act.module_name}
              </Text>
              <Text style={styles.activityMeta} numberOfLines={1}>
                {act.created_by || "—"} · {act.created_at || "—"}
              </Text>
            </View>
          ))}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.refreshBtn} onPress={() => void onRefresh()}>
        <Text style={styles.refresh}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
      </Pressable>

      <Modal visible={dateModalOpen} transparent animationType="fade" onRequestClose={() => setDateModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDateModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Date range</Text>
            <Text style={styles.modalHint}>Tap a row to open the calendar.</Text>

            <TouchableOpacity style={styles.dateRowBtn} onPress={() => openPicker("start")}>
              <Text style={styles.dateRowLabel}>From</Text>
              <Text style={styles.dateRowVal}>{startDate}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color="#2563EB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dateRowBtn} onPress={() => openPicker("end")}>
              <Text style={styles.dateRowLabel}>To</Text>
              <Text style={styles.dateRowVal}>{endDate}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color="#2563EB" />
            </TouchableOpacity>

            {pickerMode && Platform.OS === "web" ? (
              <TextInput
                style={styles.webDateInput}
                value={pickerMode === "start" ? startDate : endDate}
                onChangeText={(t) => (pickerMode === "start" ? setStartDate(t) : setEndDate(t))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />
            ) : null}
            {pickerMode && Platform.OS !== "web" ? (
              <DateTimePicker
                value={parseYmdLocal(pickerMode === "start" ? startDate : endDate)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onPickerChange}
              />
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGhost} onPress={() => { setDateModalOpen(false); setPickerMode(null); }}>
                <Text style={styles.modalGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={applyRangeFromModal}>
                <Text style={styles.modalPrimaryTxt}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  headerDateText: { fontSize: 11, fontWeight: "700", color: "#475569", flexShrink: 1 },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    justifyContent: "flex-start",
  },
  metricCard: {
    flexGrow: 0,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 72,
    overflow: "hidden",
  },
  metricValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 4 },
  metricLabel: { color: "rgba(255,255,255,0.92)", fontSize: 10, fontWeight: "700", marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8, color: colors.text },
  distRow: {
    marginBottom: 10,
  },
  distHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  track: { height: 10, borderRadius: 10, backgroundColor: "#E2E8F0", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 10, backgroundColor: "#22C55E" },
  item: { color: colors.text, fontWeight: "600" },
  statusValue: { color: colors.primaryDark, fontWeight: "800" },
  activityRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 8,
  },
  activityModule: { color: colors.text, fontWeight: "700", fontSize: 13 },
  activityMeta: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  error: { color: colors.danger, marginTop: 8 },
  refreshBtn: {
    marginTop: 4,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refresh: { color: colors.primaryDark, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 },
  modalHint: { fontSize: 12, color: colors.mutedText, marginBottom: 12 },
  dateRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  dateRowLabel: { width: 44, fontWeight: "800", color: "#64748B", fontSize: 13 },
  dateRowVal: { flex: 1, fontWeight: "700", color: colors.text, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  modalGhostTxt: { fontWeight: "700", color: "#475569" },
  modalPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  modalPrimaryTxt: { fontWeight: "800", color: "#FFF" },
  webDateInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 4,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#F8FAFC",
  },
});
