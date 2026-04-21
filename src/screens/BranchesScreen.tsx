import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { BranchDetail } from "../types";
import { colors } from "../theme/colors";

function formatShortDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function BranchesScreen() {
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const userRoleId = user?.role_id ?? null;

  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_main: false,
    is_active: true,
  });

  const loadBranches = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getBranches(token);
      if (res.status !== 200) throw new Error(res.message || "Failed to load branches");
      setBranches(res.data || []);
    } catch (e) {
      Alert.alert("Branches", e instanceof Error ? e.message : "Failed to load");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isFocused) return;
    void loadBranches();
  }, [isFocused, loadBranches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.city || "").toLowerCase().includes(q) ||
        (b.state || "").toLowerCase().includes(q) ||
        (b.address || "").toLowerCase().includes(q),
    );
  }, [branches, search]);

  const total = branches.length;
  const activeCount = branches.filter((b) => b.is_active !== false).length;
  const mainCount = branches.filter((b) => b.is_main).length;
  const inactiveCount = branches.filter((b) => b.is_active === false).length;

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      is_main: false,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (b: BranchDetail) => {
    setEditing(b);
    setForm({
      name: b.name || "",
      address: b.address || "",
      city: b.city || "",
      state: b.state || "",
      pincode: b.pincode || "",
      is_main: Boolean(b.is_main),
      is_active: b.is_active !== false,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!token) return;
    if (!form.name.trim()) {
      Alert.alert("Validation", "Branch name is required.");
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, name: form.name.trim() };
      if (editing) {
        const res = await api.updateBranch(token, editing.id, body);
        if (res.status !== 200) throw new Error(res.message || "Update failed");
      } else {
        const res = await api.addBranch(token, body);
        if (res.status !== 200 && res.status !== 201) throw new Error(res.message || "Create failed");
      }
      setModalOpen(false);
      await loadBranches();
    } catch (e) {
      Alert.alert("Branch", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (b: BranchDetail) => {
    Alert.alert("Delete branch", `Remove "${b.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void doDelete(b),
      },
    ]);
  };

  const doDelete = async (b: BranchDetail) => {
    if (!token) return;
    try {
      const res = await api.deleteBranch(token, b.id);
      if (res.status !== 200) throw new Error(res.message || "Delete failed");
      await loadBranches();
    } catch (e) {
      Alert.alert("Delete", e instanceof Error ? e.message : "Failed");
    }
  };

  const headerRight =
    userRoleId === 1 ? (
      <TouchableOpacity style={styles.hdrIconPrimary} onPress={openAdd} accessibilityLabel="Add branch">
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    ) : null;

  if (userRoleId !== 1) {
    return (
      <AppShell title="Branch Management">
        <EmptyState title="Branch management is only available for administrators." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Branch Management" headerRight={headerRight} hideUserAvatar>
      <View style={styles.summaryCardWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScroll}>
          <View style={[styles.sumBox, { backgroundColor: "#2563EB" }]}>
            <Text style={styles.sumLabel}>Total</Text>
            <Text style={styles.sumVal}>{total}</Text>
            <MaterialCommunityIcons name="office-building" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#16A34A" }]}>
            <Text style={styles.sumLabel}>Active</Text>
            <Text style={styles.sumVal}>{activeCount}</Text>
            <MaterialCommunityIcons name="check-decagram" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
          </View>
          <View style={[styles.sumBox, { backgroundColor: "#EA580C" }]}>
            <Text style={styles.sumLabel}>Main</Text>
            <Text style={styles.sumVal}>{mainCount}</Text>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color="rgba(255,255,255,0.85)" style={styles.sumIco} />
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
            placeholder="Search by name, city, state, address..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Text style={styles.resultMeta}>
          Results: {filtered.length} of {total} branches
        </Text>
      </View>

      {loading ? <Text style={styles.muted}>Loading branches...</Text> : null}

      {!filtered.length && !loading ? (
        <EmptyState title="No branches match your search." />
      ) : (
        <View style={styles.listCard}>
          {filtered.map((b) => (
            <View key={b.id} style={styles.row}>
              <View style={styles.rowTop}>
                <View style={styles.rowTopLeft}>
                  <MaterialCommunityIcons name="office-building-outline" size={18} color="#2563EB" />
                  <Text style={styles.branchName} numberOfLines={1}>
                    {b.name}
                  </Text>
                </View>
                <Text style={styles.cityState} numberOfLines={1}>
                  {[b.city, b.state].filter(Boolean).join(", ") || "—"}
                </Text>
              </View>
              <Text style={styles.address} numberOfLines={2}>
                {b.address || "—"}
                {b.pincode ? ` · ${b.pincode}` : ""}
              </Text>
              <View style={styles.rowMeta}>
                <Text style={styles.dateSmall}>
                  <MaterialCommunityIcons name="calendar" size={12} color="#64748B" /> {formatShortDate(b.created_at)}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(b)} accessibilityLabel="Edit">
                    <MaterialCommunityIcons name="pencil" size={20} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(b)} accessibilityLabel="Delete">
                    <MaterialCommunityIcons name="delete-outline" size={22} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{editing ? "Edit branch" : "Add branch"}</Text>
            <TextInput
              style={styles.inp}
              placeholder="Name *"
              placeholderTextColor="#64748B"
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
            />
            <TextInput
              style={styles.inp}
              placeholder="Address"
              placeholderTextColor="#64748B"
              value={form.address}
              onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
            />
            <View style={styles.inpRow}>
              <TextInput
                style={[styles.inp, styles.inpHalf]}
                placeholder="City"
                placeholderTextColor="#64748B"
                value={form.city}
                onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
              />
              <TextInput
                style={[styles.inp, styles.inpHalf]}
                placeholder="State"
                placeholderTextColor="#64748B"
                value={form.state}
                onChangeText={(t) => setForm((f) => ({ ...f, state: t }))}
              />
            </View>
            <TextInput
              style={styles.inp}
              placeholder="Pincode"
              placeholderTextColor="#64748B"
              value={form.pincode}
              onChangeText={(t) => setForm((f) => ({ ...f, pincode: t }))}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLab}>Main branch</Text>
              <Switch value={form.is_main} onValueChange={(v) => setForm((f) => ({ ...f, is_main: v }))} />
            </View>
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
    backgroundColor: "#F8FAFC",
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.text },
  resultMeta: { marginTop: 8, fontSize: 12, color: colors.mutedText, fontWeight: "600" },
  muted: { color: colors.mutedText, marginBottom: 8 },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTopLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  branchName: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  cityState: { fontSize: 12, fontWeight: "600", color: colors.mutedText, maxWidth: 140 },
  address: { fontSize: 13, color: colors.mutedText, marginTop: 4 },
  rowMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
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
  inpRow: { flexDirection: "row", gap: 8 },
  inpHalf: { flex: 1 },
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
  btnPrimaryTxt: { fontWeight: "800", color: "#FFF" },
});
