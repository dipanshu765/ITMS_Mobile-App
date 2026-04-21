import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppSelect from "../components/AppSelect";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { BranchDetail, DepartmentDetail } from "../types";
import { colors } from "../theme/colors";

function formatShortDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function depCode(id: number) {
  return `DEP${String(id).padStart(3, "0")}`;
}

function branchNames(d: DepartmentDetail): string {
  const fromArr = d.branches?.map((b) => b.name).filter(Boolean);
  if (fromArr?.length) return fromArr.join(", ");
  if (d.branch_name) return d.branch_name;
  return "—";
}

export default function DepartmentsScreen() {
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const userRoleId = user?.role_id ?? null;

  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [departments, setDepartments] = useState<DepartmentDetail[]>([]);
  const [filterBranchId, setFilterBranchId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", branch_ids: [] as number[], is_active: true });

  const canManage = userRoleId === 1 || userRoleId === 2;

  const loadBranches = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.getBranches(token);
      if (res.status === 200) setBranches(res.data || []);
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadDepartments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getDepartments(token, filterBranchId);
      if (res.status !== 200) throw new Error(res.message || "Failed to load departments");
      setDepartments(res.data || []);
    } catch (e) {
      Alert.alert("Departments", e instanceof Error ? e.message : "Failed");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterBranchId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (!isFocused) return;
    void loadDepartments();
  }, [isFocused, loadDepartments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => {
      const bn = branchNames(d).toLowerCase();
      return (
        (d.name || "").toLowerCase().includes(q) ||
        bn.includes(q) ||
        (d.organization_name || "").toLowerCase().includes(q)
      );
    });
  }, [departments, search]);

  const total = departments.length;
  const activeCount = departments.filter((d) => d.is_active !== false).length;
  const withBranch = departments.filter((d) => (d.branches?.length ?? 0) > 0 || Boolean(d.branch_name)).length;
  const inactiveCount = departments.filter((d) => d.is_active === false).length;

  const branchFilterOptions = useMemo(
    () => [{ label: "All branches", value: -1 }, ...branches.map((b) => ({ label: b.name, value: b.id }))],
    [branches],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", branch_ids: [], is_active: true });
    setModalOpen(true);
  };

  const openEdit = (d: DepartmentDetail) => {
    setEditing(d);
    const ids = d.branches?.map((b) => b.id) ?? (d.branch_id ? [d.branch_id] : []);
    setForm({ name: d.name || "", branch_ids: ids, is_active: d.is_active !== false });
    setModalOpen(true);
  };

  const toggleBranchInForm = (id: number) => {
    setForm((f) => {
      const has = f.branch_ids.includes(id);
      return { ...f, branch_ids: has ? f.branch_ids.filter((x) => x !== id) : [...f.branch_ids, id] };
    });
  };

  const submit = async () => {
    if (!token) return;
    if (!form.name.trim()) {
      Alert.alert("Validation", "Department name is required.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        branch_ids: form.branch_ids,
        is_active: form.is_active,
      };
      if (editing) {
        const res = await api.updateDepartment(token, editing.id, body);
        if (res.status !== 200) throw new Error(res.message || "Update failed");
      } else {
        const res = await api.addDepartment(token, body);
        if (res.status !== 200 && res.status !== 201) throw new Error(res.message || "Create failed");
      }
      setModalOpen(false);
      await loadDepartments();
    } catch (e) {
      Alert.alert("Department", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (d: DepartmentDetail) => {
    Alert.alert("Delete department", `Remove "${d.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void doDelete(d) },
    ]);
  };

  const doDelete = async (d: DepartmentDetail) => {
    if (!token) return;
    try {
      const res = await api.deleteDepartment(token, d.id);
      if (res.status !== 200) throw new Error(res.message || "Delete failed");
      await loadDepartments();
    } catch (e) {
      Alert.alert("Delete", e instanceof Error ? e.message : "Failed");
    }
  };

  const headerRight = canManage ? (
    <TouchableOpacity style={styles.hdrIconPrimary} onPress={openAdd} accessibilityLabel="Add department">
      <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  ) : null;

  if (!canManage) {
    return (
      <AppShell title="Department Management">
        <EmptyState title="Departments are available to Admin and Department head roles." />
      </AppShell>
    );
  }

  const branchSummary =
    form.branch_ids.length === 0
      ? "Tap to select branches (optional)"
      : form.branch_ids
          .map((id) => branches.find((b) => b.id === id)?.name)
          .filter(Boolean)
          .join(", ");

  return (
    <AppShell title="Department Management" headerRight={headerRight} hideUserAvatar>
      <View style={styles.summaryCardWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScroll}>
          <View style={[styles.sumBox, { backgroundColor: "#818CF8" }]}>
            <Text style={styles.sumLabel}>Total</Text>
            <Text style={styles.sumVal}>{total}</Text>
            <MaterialCommunityIcons name="folder-multiple-outline" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#16A34A" }]}>
            <Text style={styles.sumLabel}>Active</Text>
            <Text style={styles.sumVal}>{activeCount}</Text>
            <MaterialCommunityIcons name="check-decagram" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#2563EB" }]}>
            <Text style={styles.sumLabel}>With branch</Text>
            <Text style={styles.sumVal}>{withBranch}</Text>
            <MaterialCommunityIcons name="office-building" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#7C3AED" }]}>
            <Text style={styles.sumLabel}>Inactive</Text>
            <Text style={styles.sumVal}>{inactiveCount}</Text>
            <MaterialCommunityIcons name="close-circle-outline" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search departments..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <View style={styles.filterSlot}>
            <AppSelect
              dense
              label="Branch"
              options={branchFilterOptions}
              value={filterBranchId === null ? -1 : filterBranchId}
              onChange={(v) =>
                setFilterBranchId(v === -1 || v === null || v === undefined || v === "" ? null : Number(v))
              }
              placeholder="All"
            />
          </View>
        </ScrollView>
        <Text style={styles.resultMeta}>
          {filtered.length} of {total} departments
        </Text>
      </View>

      {loading ? <Text style={styles.muted}>Loading...</Text> : null}

      {!filtered.length && !loading ? (
        <EmptyState title="No departments for this filter." />
      ) : (
        <View style={styles.listCard}>
          {filtered.map((d) => (
            <View key={d.id} style={styles.row}>
              <View style={styles.rowTop}>
                <View style={styles.folderIco}>
                  <MaterialCommunityIcons name="folder" size={18} color="#4F46E5" />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.deptName} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.deptCode}>{depCode(d.id)}</Text>
                  </View>
                  <View style={styles.branchLine}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />
                    <Text style={styles.branchTxt} numberOfLines={2}>
                      {branchNames(d)}
                    </Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.dateSmall}>
                      <MaterialCommunityIcons name="calendar" size={12} color="#64748B" /> {formatShortDate(d.created_at)}
                    </Text>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEdit(d)}>
                        <MaterialCommunityIcons name="pencil" size={20} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(d)}>
                        <MaterialCommunityIcons name="delete-outline" size={22} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{editing ? "Edit department" : "Add department"}</Text>
            <TextInput
              style={styles.inp}
              placeholder="Name *"
              placeholderTextColor="#64748B"
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
            />
            <Text style={styles.fieldLab}>Branches</Text>
            <TouchableOpacity style={styles.branchPickBtn} onPress={() => setBranchPickerOpen(true)}>
              <Text style={styles.branchPickTxt} numberOfLines={2}>
                {branchSummary}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={22} color="#64748B" />
            </TouchableOpacity>
            <View style={styles.switchRow}>
              <Text style={styles.switchLab}>Active</Text>
              <Switch value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            </View>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setModalOpen(false)}>
                <Text style={styles.btnGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => void submit()} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryTxt}>Save</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={branchPickerOpen} transparent animationType="slide" onRequestClose={() => setBranchPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBranchPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.sheetTitle}>Select branches</Text>
            <FlatList
              data={branches}
              keyExtractor={(b) => String(b.id)}
              renderItem={({ item }) => {
                const on = form.branch_ids.includes(item.id);
                return (
                  <Pressable style={styles.pickRow} onPress={() => toggleBranchInForm(item.id)}>
                    <MaterialCommunityIcons name={on ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color="#2563EB" />
                    <Text style={styles.pickTxt}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.btnPrimary, styles.btnPrimaryFull]}
              onPress={() => setBranchPickerOpen(false)}
            >
              <Text style={styles.btnPrimaryTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hdrIconPrimary: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardWrap: { marginBottom: 10 },
  summaryScroll: { flexDirection: "row", gap: 8, paddingRight: 4 },
  sumBox: {
    width: 112,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 72,
  },
  sumLabel: { color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: "600" },
  sumVal: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 2 },
  sumIco: { position: "absolute", right: 6, bottom: 6 },
  filterCard: {
    backgroundColor: "#FFFFFF",
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
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.text },
  filterScroll: { flexDirection: "row", gap: 10 },
  filterSlot: { width: 200 },
  resultMeta: { marginTop: 6, fontSize: 12, color: colors.mutedText, fontWeight: "600" },
  muted: { color: colors.mutedText, marginBottom: 8 },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowTop: { flexDirection: "row", gap: 10 },
  folderIco: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  deptName: { fontSize: 15, fontWeight: "800", color: colors.text },
  deptCode: { fontSize: 12, color: colors.mutedText, fontWeight: "600" },
  branchLine: { flexDirection: "row", gap: 4, marginTop: 6, alignItems: "flex-start" },
  branchTxt: { flex: 1, fontSize: 13, color: colors.mutedText },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  dateSmall: { fontSize: 11, color: "#64748B" },
  actions: { flexDirection: "row", gap: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    paddingBottom: 28,
    maxHeight: "88%",
  },
  pickerSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    paddingBottom: 28,
    maxHeight: "70%",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12, color: colors.text },
  inp: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
    color: colors.text,
  },
  fieldLab: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 4 },
  branchPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  branchPickTxt: { flex: 1, fontSize: 14, color: colors.text },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  switchLab: { fontSize: 15, color: colors.text, fontWeight: "600" },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  btnGhostTxt: { fontWeight: "700", color: "#475569" },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryFull: { flex: 0, alignSelf: "stretch", marginTop: 8 },
  btnPrimaryTxt: { fontWeight: "800", color: "#FFF" },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  pickTxt: { fontSize: 15, color: colors.text },
});
