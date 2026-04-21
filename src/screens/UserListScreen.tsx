import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api } from "../services/api";
import { UserItem, UserListApiResponse, UserListSummary } from "../types";
import { colors } from "../theme/colors";

function countForRoleName(byRole: { role_name: string; count: number }[], needle: string) {
  const n = needle.toLowerCase();
  const hit = byRole.find((x) => (x.role_name || "").toLowerCase() === n);
  return hit?.count ?? 0;
}

function userInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

export default function UserListScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const userRoleId = user?.role_id ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [summary, setSummary] = useState<UserListSummary>({ total_users: 0, by_role: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string; branch_name?: string }[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const filteredBranches = useMemo(() => {
    if (userRoleId === 2 && user?.branches?.length) {
      const ids = new Set(user.branches.map((b) => b.id));
      return branches.filter((b) => ids.has(b.id));
    }
    return branches;
  }, [branches, user?.branches, userRoleId]);

  const filteredDepartments = useMemo(() => {
    if (userRoleId === 3 && user?.departments?.length) {
      const ids = new Set(user.departments.map((d) => d.id));
      return departments.filter((d) => ids.has(d.id));
    }
    return departments;
  }, [departments, user?.departments, userRoleId]);

  const branchOptions = useMemo(
    () => filteredBranches.map((x) => ({ label: x.name, value: x.id })),
    [filteredBranches],
  );
  const departmentOptions = useMemo(
    () => filteredDepartments.map((x) => ({ label: x.name, value: x.id })),
    [filteredDepartments],
  );
  const roleOptions = useMemo(() => roles.map((x) => ({ label: x.name, value: x.id })), [roles]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = (await api.getUsers(token, {
        page: 1,
        limit: 50,
        search: debouncedSearch || undefined,
        branch_id: selectedBranchId || undefined,
        department_id: selectedDepartmentId || undefined,
        role_id: selectedRoleId || undefined,
      })) as UserListApiResponse;

      if (result.status !== 200) {
        throw new Error(result.message || "Failed to load users");
      }

      setUsers(result.data || []);
      setSummary(result.summary ?? { total_users: 0, by_role: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
      setSummary({ total_users: 0, by_role: [] });
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, selectedBranchId, selectedDepartmentId, selectedRoleId]);

  useEffect(() => {
    const loadFilters = async () => {
      if (!token) return;
      try {
        const [b, d, r] = await Promise.all([
          api.getBranches(token),
          api.getDepartments(token),
          api.getRoles(token),
        ]);
        setBranches(b.data || []);
        setDepartments((d.data || []) as { id: number; name: string; branch_name?: string }[]);
        setRoles((r.data || []).filter((x) => x.id !== 1));
      } catch {
        // keep page usable
      }
    };
    void loadFilters();
  }, [token]);

  useEffect(() => {
    if (!isFocused) return;
    void loadUsers();
  }, [isFocused, loadUsers]);

  const handleDownload = async () => {
    if (!token) return;
    setIsDownloading(true);
    try {
      const result = (await api.getUsers(token, {
        search: debouncedSearch || undefined,
        branch_id: selectedBranchId || undefined,
        department_id: selectedDepartmentId || undefined,
        role_id: selectedRoleId || undefined,
        download: "true",
      })) as UserListApiResponse;

      if (result.status !== 200 || !result.download_url) {
        throw new Error(result.message || "Download URL was not returned.");
      }

      const apiRoot = ENV.API_BASE_URL.replace(/\/api\/?$/, "");
      const fileUrl = result.download_url.startsWith("http")
        ? result.download_url
        : `${apiRoot}${result.download_url.startsWith("/") ? "" : "/"}${result.download_url}`;

      const filename = `user_list_${Date.now()}.xlsx`;
      const baseDir = FileSystem.cacheDirectory;
      if (!baseDir) {
        throw new Error("Cache directory is not available on this device.");
      }
      const dest = `${baseDir}${filename}`;

      const dl = await FileSystem.downloadAsync(fileUrl, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (dl.status !== 200) {
        throw new Error("Could not download the export file.");
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "User list export",
        });
      } else {
        Alert.alert("Export saved", `File is at: ${dl.uri}`);
      }
    } catch (e) {
      Alert.alert("Download Failed", e instanceof Error ? e.message : "Unable to download user list.");
    } finally {
      setIsDownloading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedBranchId(null);
    setSelectedDepartmentId(null);
    setSelectedRoleId(null);
  };

  const hasActiveFilters =
    Boolean(search.trim()) || selectedBranchId !== null || selectedDepartmentId !== null || selectedRoleId !== null;

  const employeeCount = countForRoleName(summary.by_role || [], "Employee");
  const deptHeadCount = countForRoleName(summary.by_role || [], "Department head");

  const headerActions = (
    <View style={styles.headerIconRow}>
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconBtnNeutral]}
        onPress={() => void handleDownload()}
        disabled={isDownloading}
        accessibilityLabel="Download Excel"
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#374151" />
        ) : (
          <MaterialCommunityIcons name="microsoft-excel" size={22} color="#1E3A8A" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconBtnPrimary]}
        onPress={() => navigation.navigate("UserForm")}
        accessibilityLabel="Add user"
      >
        <MaterialCommunityIcons name="account-plus-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  if (userRoleId === 4) {
    return (
      <AppShell title="User Management">
        <EmptyState title="User list is not available for Employee role." />
      </AppShell>
    );
  }

  return (
    <AppShell title="User Management" headerRight={headerActions} hideUserAvatar>
      {/* Summary — one row, three cards (web reference). */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryTotal]}>
          <Text style={styles.summaryLabel}>Total Users</Text>
          <Text style={styles.summaryValue}>{summary.total_users ?? 0}</Text>
          <MaterialCommunityIcons name="account-multiple" size={18} color="rgba(255,255,255,0.85)" style={styles.summaryIcon} />
        </View>
        <View style={[styles.summaryCard, styles.summaryRole]}>
          <Text style={styles.summaryLabel}>Employee</Text>
          <Text style={styles.summaryValue}>{employeeCount}</Text>
          <MaterialCommunityIcons name="account" size={18} color="rgba(255,255,255,0.85)" style={styles.summaryIcon} />
        </View>
        <View style={[styles.summaryCard, styles.summaryRole]}>
          <Text style={styles.summaryLabel}>Dept. head</Text>
          <Text style={styles.summaryValue}>{deptHeadCount}</Text>
          <MaterialCommunityIcons name="account-tie" size={18} color="rgba(255,255,255,0.85)" style={styles.summaryIcon} />
        </View>
      </View>

      {/* Compact filters */}
      <View style={styles.filterCard}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => void loadUsers()}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <View style={styles.filterSlot}>
            <AppSelect
              dense
              label="Branch"
              options={branchOptions}
              value={selectedBranchId}
              onChange={(v) =>
                setSelectedBranchId(v === null || v === undefined || v === "" ? null : Number(v))
              }
              placeholder="All"
            />
          </View>
          <View style={styles.filterSlot}>
            <AppSelect
              dense
              label="Department"
              options={departmentOptions}
              value={selectedDepartmentId}
              onChange={(v) =>
                setSelectedDepartmentId(v === null || v === undefined || v === "" ? null : Number(v))
              }
              placeholder="All"
            />
          </View>
          <View style={styles.filterSlot}>
            <AppSelect
              dense
              label="Role"
              options={roleOptions}
              value={selectedRoleId}
              onChange={(v) => setSelectedRoleId(v === null || v === undefined || v === "" ? null : Number(v))}
              placeholder="All"
            />
          </View>
        </ScrollView>

        {hasActiveFilters ? (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color="#B91C1C" />
            <Text style={styles.clearBtnText}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#991B1B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? <Text style={styles.muted}>Loading users...</Text> : null}

      {!users.length && !loading ? (
        <EmptyState title="No users found for selected filters." />
      ) : (
        <View style={styles.listCard}>
          {users.map((item) => (
            <Pressable
              key={item.user_id}
              style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
              onPress={() => navigation.navigate("UserForm", { userId: item.user_id })}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetters}>{userInitials(item.name || "?")}</Text>
              </View>
              <View style={styles.userBody}>
                <View style={styles.nameRoleRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText} numberOfLines={1}>
                      {item.role_name || `Role ${item.role_id ?? ""}`}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email?.trim() ? item.email : "—"}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerIconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnNeutral: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBtnPrimary: {
    backgroundColor: "#2563EB",
  },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minWidth: 0,
    overflow: "hidden",
  },
  summaryTotal: { backgroundColor: "#4F46E5" },
  summaryRole: { backgroundColor: "#2563EB" },
  summaryLabel: { color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: "600" },
  summaryValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 2 },
  summaryIcon: { position: "absolute", right: 6, bottom: 6 },
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
  searchIcon: { marginRight: 4 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.text },
  filterScroll: { flexDirection: "row", gap: 10, paddingBottom: 2 },
  filterSlot: { width: 168 },
  clearBtn: {
    marginTop: 6,
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
  clearBtnText: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  errorText: { flex: 1, color: "#991B1B", fontSize: 13 },
  muted: { color: colors.mutedText, marginBottom: 8 },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  userRowPressed: { backgroundColor: "#F8FAFC" },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetters: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  userBody: { flex: 1, minWidth: 0 },
  nameRoleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  rolePill: {
    maxWidth: 120,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rolePillText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  userEmail: { fontSize: 13, color: colors.mutedText, marginTop: 3 },
});
