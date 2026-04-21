import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppSelect from "../components/AppSelect";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { ENV } from "../config/env";
import { useAuth } from "../context/AuthContext";
import { MainStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { BranchDetail, DepartmentDetail, TaskItem, TasksListApiResponse } from "../types";
import { colors } from "../theme/colors";

function monthRange() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0);
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

type Props = NativeStackScreenProps<MainStackParamList, "Tasks">;

function displayStatus(status?: string) {
  if (status === "assigned") return "pending";
  return status || "";
}

function statusColors(status?: string) {
  const s = displayStatus(status);
  if (s === "pending" || s === "assigned") return { bg: "#FEF9C3", text: "#A16207", border: "#FDE047" };
  if (s === "resolved") return { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" };
  if (s === "reopen") return { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" };
  if (s === "closed") return { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
  return { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" };
}

export default function TaskListScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const userRoleId = user?.role_id ?? null;

  const initialRange = useMemo(() => monthRange(), []);
  const baselineDates = useRef(initialRange);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusSel, setStatusSel] = useState<number | string>(-1);
  const [prioritySel, setPrioritySel] = useState<string | null>(null);
  const [assignedBranchId, setAssignedBranchId] = useState<number | null>(null);
  const [assignedDeptId, setAssignedDeptId] = useState<number | null>(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"start" | "end" | null>(null);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [departments, setDepartments] = useState<DepartmentDetail[]>([]);

  const loadTasks = useCallback(
    async (overrides?: { startDate?: string; endDate?: string; statusSel?: number | string; search?: string }) => {
      if (!token) return;
      setLoading(true);
      try {
        const effectiveStartDate = overrides?.startDate ?? startDate;
        const effectiveEndDate = overrides?.endDate ?? endDate;
        const effectiveStatus = overrides?.statusSel ?? statusSel;
        const effectiveSearch = (overrides?.search ?? debouncedSearch).trim();

        const filters: Record<string, unknown> = {
          page: 1,
          limit: 50,
          start_date: effectiveStartDate,
          end_date: effectiveEndDate,
        };
        if (effectiveSearch) filters.search = effectiveSearch;
        const st = effectiveStatus === -1 ? undefined : String(effectiveStatus);
        if (st) filters.status = st;
        if (prioritySel) filters.priority = prioritySel;
        if (userRoleId === 1 && assignedBranchId) filters.assigned_branch_id = assignedBranchId;
        if ((userRoleId === 1 || userRoleId === 2) && assignedDeptId) filters.assigned_department_filter_id = assignedDeptId;

        const result = (await api.getTasks(token, filters)) as TasksListApiResponse;
        if (result.status !== 200) throw new Error(result.message || "Failed to load tasks");
        setTasks(result.data || []);
        setTotal(result.total ?? (result.data || []).length);
      } catch (e) {
        Alert.alert("Tasks", e instanceof Error ? e.message : "Failed to load tasks");
        setTasks([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [
      token,
      startDate,
      endDate,
      statusSel,
      debouncedSearch,
      prioritySel,
      assignedBranchId,
      assignedDeptId,
      userRoleId,
    ],
  );

  useEffect(() => {
    if (!isFocused) return;
    if (route.params?.source !== "dashboard") return;

    const incomingStatus = route.params.status ?? -1;
    const incomingStart = route.params.startDate ?? startDate;
    const incomingEnd = route.params.endDate ?? endDate;

    setStartDate(incomingStart);
    setEndDate(incomingEnd);
    setStatusSel(incomingStatus);
    setSearch("");
    setDebouncedSearch("");
    setPrioritySel(null);
    setAssignedBranchId(null);
    setAssignedDeptId(null);
    baselineDates.current = { start: incomingStart, end: incomingEnd };

    void loadTasks({
      startDate: incomingStart,
      endDate: incomingEnd,
      statusSel: incomingStatus,
      search: "",
    });
  }, [isFocused, route.params?.nonce, route.params?.source, route.params?.status, route.params?.startDate, route.params?.endDate, loadTasks]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const loadMeta = async () => {
      if (!token) return;
      try {
        const [b, d] = await Promise.all([api.getBranches(token), api.getDepartments(token)]);
        setBranches((b.data || []) as BranchDetail[]);
        setDepartments((d.data || []) as DepartmentDetail[]);
      } catch {
        /* ignore */
      }
    };
    void loadMeta();
  }, [token]);

  const deptFilterOptions = useMemo(() => {
    if (userRoleId !== 2 || !user?.branches?.length) return departments;
    const ids = new Set(user.branches.map((b) => b.id));
    return departments.filter((d) => {
      const bids = d.branches?.map((x) => x.id) ?? (d.branch_id ? [d.branch_id] : []);
      return bids.some((id) => ids.has(id));
    });
  }, [departments, user?.branches, userRoleId]);

  useEffect(() => {
    if (!isFocused) return;
    void loadTasks();
  }, [isFocused, loadTasks]);

  const pendingOnPage = tasks.filter((t) => t.status === "assigned").length;
  const resolvedOnPage = tasks.filter((t) => t.status === "resolved").length;
  const reopenOnPage = tasks.filter((t) => t.status === "reopen").length;
  const closedOnPage = tasks.filter((t) => t.status === "closed").length;

  const statusOptions = [
    { label: "All status", value: -1 },
    { label: "Pending", value: "pending" },
    { label: "Resolved", value: "resolved" },
    { label: "Reopen", value: "reopen" },
    { label: "Closed", value: "closed" },
  ];
  const priorityOptions = [
    { label: "All priority", value: -1 },
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Urgent", value: "urgent" },
  ];
  const branchFilterOptions = useMemo(
    () => [{ label: "All branches", value: -1 }, ...branches.map((b) => ({ label: b.name, value: b.id }))],
    [branches],
  );
  const deptSelectOptions = useMemo(
    () => [{ label: "All departments", value: -1 }, ...deptFilterOptions.map((d) => ({ label: d.name, value: d.id }))],
    [deptFilterOptions],
  );

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const filters: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate,
        download: "true",
      };
      if (debouncedSearch) filters.search = debouncedSearch;
      const st = statusSel === -1 ? undefined : String(statusSel);
      if (st) filters.status = st;
      if (prioritySel) filters.priority = prioritySel;
      if (userRoleId === 1 && assignedBranchId) filters.assigned_branch_id = assignedBranchId;
      if ((userRoleId === 1 || userRoleId === 2) && assignedDeptId) filters.assigned_department_filter_id = assignedDeptId;

      const result = (await api.getTasks(token, filters)) as TasksListApiResponse;
      if (result.status !== 200 || !result.download_url) throw new Error(result.message || "No download URL");

      const apiRoot = ENV.API_BASE_URL.replace(/\/api\/?$/, "");
      const fileUrl = result.download_url.startsWith("http")
        ? result.download_url
        : `${apiRoot}${result.download_url.startsWith("/") ? "" : "/"}${result.download_url}`;

      const baseDir = FileSystem.cacheDirectory;
      if (!baseDir) throw new Error("Cache directory unavailable");
      const dest = `${baseDir}tasks_export_${Date.now()}.xlsx`;
      const dl = await FileSystem.downloadAsync(fileUrl, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dl.status !== 200) throw new Error("Download failed");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Task export",
        });
      } else {
        Alert.alert("Saved", dl.uri);
      }
    } catch (e) {
      Alert.alert("Download", e instanceof Error ? e.message : "Failed");
    } finally {
      setDownloading(false);
    }
  };

  const headerRight = (
    <View style={styles.headerIcons}>
      <TouchableOpacity
        style={styles.hdrIconNeutral}
        onPress={() => void handleDownload()}
        disabled={downloading}
        accessibilityLabel="Download"
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#374151" />
        ) : (
          <MaterialCommunityIcons name="download" size={22} color="#1E3A8A" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.hdrIconDark}
        onPress={() => navigation.navigate("CreateTask")}
        accessibilityLabel="Add task"
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    const r = monthRange();
    setStartDate(r.start);
    setEndDate(r.end);
    baselineDates.current = r;
    setStatusSel(-1);
    setPrioritySel(null);
    setAssignedBranchId(null);
    setAssignedDeptId(null);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    statusSel !== -1 ||
    (prioritySel !== null && prioritySel !== "") ||
    assignedBranchId !== null ||
    assignedDeptId !== null ||
    startDate !== baselineDates.current.start ||
    endDate !== baselineDates.current.end;

  const dateChip = useMemo(() => `${startDate} - ${endDate}`, [startDate, endDate]);

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

  return (
    <AppShell title="Task List" headerRight={headerRight} hideUserAvatar>
      <View style={styles.summaryCardWrap}>
        <View style={styles.summaryGrid}>
          <View style={[styles.sumBox, { backgroundColor: "#6366F1" }]}>
            <Text style={styles.sumLabel}>Total</Text>
            <Text style={styles.sumVal}>{total}</Text>
            <MaterialCommunityIcons
              name="checkbox-marked-outline"
              size={16}
              color="rgba(255,255,255,0.9)"
              style={styles.sumIco}
            />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#D97706" }]}>
            <Text style={styles.sumLabel}>Pending</Text>
            <Text style={styles.sumVal}>{pendingOnPage}</Text>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color="rgba(255,255,255,0.9)"
              style={styles.sumIco}
            />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#16A34A" }]}>
            <Text style={styles.sumLabel}>Resolved</Text>
            <Text style={styles.sumVal}>{resolvedOnPage}</Text>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color="rgba(255,255,255,0.9)"
              style={styles.sumIco}
            />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#DC2626" }]}>
            <Text style={styles.sumLabel}>Reopen</Text>
            <Text style={styles.sumVal}>{reopenOnPage}</Text>
            <MaterialCommunityIcons
              name="backup-restore"
              size={16}
              color="rgba(255,255,255,0.9)"
              style={styles.sumIco}
            />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#64748B" }]}>
            <Text style={styles.sumLabel}>Closed</Text>
            <Text style={styles.sumVal}>{closedOnPage}</Text>
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={16}
              color="rgba(255,255,255,0.9)"
              style={styles.sumIco}
            />
          </View>
        </View>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, description, ID..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.dateChipBtn} onPress={() => setDateModalOpen(true)}>
          <MaterialCommunityIcons name="calendar-range" size={18} color="#64748B" />
          <Text style={styles.dateChipTxt} numberOfLines={1}>
            {dateChip}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterSlot}>
            <AppSelect
              dense
              label="Status"
              options={statusOptions}
              value={statusSel}
              onChange={(v) => setStatusSel(v === -1 || v === null || v === undefined || v === "" ? -1 : v)}
              placeholder="All"
            />
          </View>
          <View style={styles.filterSlot}>
            <AppSelect
              dense
              label="Priority"
              options={priorityOptions}
              value={prioritySel === null || prioritySel === "" ? -1 : prioritySel}
              onChange={(v) =>
                setPrioritySel(v === -1 || v === null || v === undefined || v === "" ? null : String(v))
              }
              placeholder="All"
            />
          </View>
          {userRoleId === 1 ? (
            <View style={styles.filterSlot}>
              <AppSelect
                dense
                label="Branch"
                options={branchFilterOptions}
                value={assignedBranchId === null ? -1 : assignedBranchId}
                onChange={(v) => {
                  const n = v === -1 || v === null || v === undefined || v === "" ? null : Number(v);
                  setAssignedBranchId(n);
                  setAssignedDeptId(null);
                }}
                placeholder="All"
              />
            </View>
          ) : null}
          {(userRoleId === 1 || userRoleId === 2) && (
            <View style={styles.filterSlot}>
              <AppSelect
                dense
                label="Department"
                options={deptSelectOptions}
                value={assignedDeptId === null ? -1 : assignedDeptId}
                onChange={(v) =>
                  setAssignedDeptId(v === -1 || v === null || v === undefined || v === "" ? null : Number(v))
                }
                placeholder="All"
              />
            </View>
          )}
        </ScrollView>
        {hasFilters ? (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color="#B91C1C" />
            <Text style={styles.clearTxt}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? <Text style={styles.muted}>Loading tasks...</Text> : null}

      {!tasks.length && !loading ? (
        <EmptyState title="No tasks found for selected filters." />
      ) : (
        <View style={styles.listCard}>
          {tasks.map((task) => {
            const sc = statusColors(task.status);
            const stLabel = displayStatus(task.status) || task.status || "—";
            return (
              <Pressable
                key={task.id}
                style={({ pressed }) => [styles.trow, pressed && { backgroundColor: "#F8FAFC" }]}
                onPress={() => navigation.navigate("AssignTask", { taskId: task.id, taskTitle: task.title })}
              >
                <View style={styles.trow1}>
                  <Text style={styles.tid}>#{task.id}</Text>
                  <Text style={styles.ttitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[styles.pillTxt, { color: sc.text }]}>{stLabel}</Text>
                  </View>
                </View>
                <View style={styles.trow2}>
                  <Text style={styles.tmeta} numberOfLines={1}>
                    {task.assigned_to_department?.name || "—"}
                  </Text>
                  {task.priority ? (
                    <View style={styles.priPill}>
                      <Text style={styles.priTxt}>{task.priority}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.tstaff} numberOfLines={1}>
                  Staff: {task.assigned_to_user?.name || "N/A"} · Created: {formatShortDate(task.created_at)}
                </Text>
                <Text style={styles.assignLink}>{userRoleId === 4 ? "Update status" : "Assign / update"}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={dateModalOpen} transparent animationType="fade" onRequestClose={() => setDateModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDateModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Date range</Text>
            <TouchableOpacity style={styles.dateRowBtn} onPress={() => setPickerMode("start")}>
              <Text style={styles.dateRowLabel}>From</Text>
              <Text style={styles.dateRowVal}>{startDate}</Text>
              <MaterialCommunityIcons name="calendar" size={18} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateRowBtn} onPress={() => setPickerMode("end")}>
              <Text style={styles.dateRowLabel}>To</Text>
              <Text style={styles.dateRowVal}>{endDate}</Text>
              <MaterialCommunityIcons name="calendar" size={18} color="#2563EB" />
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
              <TouchableOpacity
                style={styles.modalGhost}
                onPress={() => {
                  setDateModalOpen(false);
                  setPickerMode(null);
                }}
              >
                <Text style={styles.modalGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                onPress={() => {
                  setDateModalOpen(false);
                  setPickerMode(null);
                  void loadTasks();
                }}
              >
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
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  hdrIconNeutral: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  hdrIconDark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardWrap: { marginBottom: 10 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sumBox: {
    width: "31%",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 72,
    overflow: "hidden",
  },
  sumLabel: { fontSize: 10, color: "rgba(255,255,255,0.92)", fontWeight: "700" },
  sumVal: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 4 },
  sumIco: {
    position: "absolute",
    right: 8,
    bottom: 8,
  },
  filterCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    gap: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.text },
  dateChipBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dateChipTxt: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" },
  filterScroll: { flexDirection: "row", gap: 10 },
  filterSlot: { width: 168 },
  clearBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  clearTxt: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 10 },
  dateRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
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
  muted: { color: colors.mutedText, marginBottom: 8 },
  listCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  trow: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  trow1: { flexDirection: "row", alignItems: "center", gap: 8 },
  tid: { fontWeight: "800", color: colors.text, fontSize: 13 },
  ttitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillTxt: { fontSize: 11, fontWeight: "800", textTransform: "lowercase" },
  trow2: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  tmeta: { flex: 1, fontSize: 13, color: colors.mutedText, fontWeight: "600" },
  priPill: { backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priTxt: { fontSize: 11, fontWeight: "800", color: "#1D4ED8", textTransform: "lowercase" },
  tstaff: { fontSize: 12, color: colors.mutedText, marginTop: 4 },
  assignLink: { marginTop: 6, color: colors.primaryDark, fontWeight: "800", fontSize: 13 },
});
