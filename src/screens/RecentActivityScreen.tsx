import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ActivityItem, RecentActivitiesApiResponse, RecentActivityPagination } from "../types";
import { colors } from "../theme/colors";

const PAGE_SIZE = 25;

const emptyPagination: RecentActivityPagination = {
  current_page: 1,
  page_size: PAGE_SIZE,
  total_count: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

function moduleAccent(name: string) {
  const n = name.toLowerCase();
  if (n.includes("user")) return { bg: "#DBEAFE", icon: "#2563EB" };
  if (n.includes("task")) return { bg: "#DCFCE7", icon: "#16A34A" };
  if (n.includes("department")) return { bg: "#EDE9FE", icon: "#7C3AED" };
  if (n.includes("type")) return { bg: "#FFEDD5", icon: "#EA580C" };
  return { bg: "#F1F5F9", icon: "#64748B" };
}

export default function RecentActivityScreen() {
  const isFocused = useIsFocused();
  const { token } = useAuth();
  const searchRef = useRef<TextInput>(null);

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [pagination, setPagination] = useState<RecentActivityPagination>(emptyPagination);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const fetchPage = useCallback(
    async (page: number) => {
      if (!token) return;
      setLoading(true);
      try {
        const filters: Record<string, unknown> = {
          page,
          page_size: PAGE_SIZE,
        };
        const q = appliedSearch.trim();
        if (q) {
          filters.search_name = q;
          filters.search_module = q;
        }
        const res = (await api.getRecentActivities(token, filters)) as RecentActivitiesApiResponse;
        if (res.status !== 200) throw new Error(res.message || "Failed to load activities");
        setItems(res.data || []);
        setPagination(res.pagination ?? { ...emptyPagination, current_page: page });
      } catch (e) {
        Alert.alert("Recent activity", e instanceof Error ? e.message : "Failed");
        setItems([]);
        setPagination(emptyPagination);
      } finally {
        setLoading(false);
      }
    },
    [token, appliedSearch],
  );

  useEffect(() => {
    if (!isFocused || !token) return;
    void fetchPage(1);
  }, [isFocused, token, appliedSearch, fetchPage]);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
  };

  const headerRight = (
    <TouchableOpacity
      style={styles.hdrIconNeutral}
      onPress={() => searchRef.current?.focus()}
      accessibilityLabel="Focus search"
    >
      <MaterialCommunityIcons name="magnify" size={22} color="#1E3A8A" />
    </TouchableOpacity>
  );

  const pageLabel = useMemo(() => {
    const tp = pagination.total_pages || 1;
    const cp = pagination.current_page || 1;
    return `Page ${cp} of ${tp}`;
  }, [pagination.current_page, pagination.total_pages]);

  return (
    <AppShell title="Recent Activity" headerRight={headerRight} hideUserAvatar>
      <View style={styles.filterCard}>
        <View style={styles.totalStrip}>
          <View style={styles.totalIco}>
            <MaterialCommunityIcons name="pulse" size={20} color="#2563EB" />
          </View>
          <View style={styles.totalCol}>
            <Text style={styles.totalLab}>Total activities</Text>
            <Text style={styles.totalVal}>{pagination.total_count ?? 0}</Text>
            <Text style={styles.pageSub}>{pageLabel}</Text>
          </View>
        </View>
        <Text style={styles.searchLab}>Search (user name or module)</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search by user name or module name..."
              placeholderTextColor="#94A3B8"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={runSearch}>
            <MaterialCommunityIcons name="magnify" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {appliedSearch ? (
          <TouchableOpacity style={styles.clearInline} onPress={clearSearch}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color="#B91C1C" />
            <Text style={styles.clearInlineTxt}>Clear search</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.muted}> Loading...</Text>
        </View>
      ) : null}

      {!items.length && !loading ? (
        <EmptyState title="No activities found." />
      ) : (
        <View style={styles.listCard}>
          {items.map((a) => {
            const ac = moduleAccent(a.module_name || "");
            return (
              <View key={a.id} style={styles.actRow}>
                <View style={styles.r1}>
                  <View style={styles.modWrap}>
                    <View style={[styles.modDot, { backgroundColor: ac.bg }]}>
                      <MaterialCommunityIcons name="pulse" size={14} color={ac.icon} />
                    </View>
                    <Text style={styles.modName} numberOfLines={1}>
                      {a.module_name}
                    </Text>
                  </View>
                  <View style={styles.byWrap}>
                    <MaterialCommunityIcons name="account-outline" size={14} color="#64748B" />
                    <Text style={styles.byName} numberOfLines={1}>
                      {a.created_by || "—"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.desc}>{a.description}</Text>
                <View style={styles.timeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#64748B" />
                  <Text style={styles.timeTxt}>{a.created_at}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {pagination.total_pages > 1 ? (
        <View style={styles.pager}>
          <TouchableOpacity
            style={[styles.pageBtn, !pagination.has_previous && styles.pageBtnOff]}
            disabled={!pagination.has_previous}
            onPress={() => void fetchPage(pagination.current_page - 1)}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={pagination.has_previous ? "#1E3A8A" : "#CBD5E1"} />
            <Text style={[styles.pageBtnTxt, !pagination.has_previous && styles.pageBtnTxtOff]}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            {pagination.current_page} / {pagination.total_pages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, !pagination.has_next && styles.pageBtnOff]}
            disabled={!pagination.has_next}
            onPress={() => void fetchPage(pagination.current_page + 1)}
          >
            <Text style={[styles.pageBtnTxt, !pagination.has_next && styles.pageBtnTxtOff]}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={pagination.has_next ? "#1E3A8A" : "#CBD5E1"} />
          </TouchableOpacity>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
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
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
  },
  totalStrip: { flexDirection: "row", gap: 12, marginBottom: 12 },
  totalIco: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  totalCol: { flex: 1 },
  totalLab: { fontSize: 12, fontWeight: "600", color: colors.mutedText },
  totalVal: { fontSize: 26, fontWeight: "800", color: colors.text, marginTop: 2 },
  pageSub: { fontSize: 11, color: colors.mutedText, marginTop: 2, fontWeight: "600" },
  searchLab: { fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 6 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text },
  searchBtn: {
    width: 48,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  clearInline: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  clearInlineTxt: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },
  loadingRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  muted: { color: colors.mutedText },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  actRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  r1: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" },
  modWrap: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  modDot: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modName: { flex: 1, fontSize: 13, fontWeight: "800", color: colors.text },
  byWrap: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "42%" },
  byName: { fontSize: 12, fontWeight: "600", color: "#475569" },
  desc: { fontSize: 13, color: colors.mutedText, marginTop: 8, lineHeight: 19 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  timeTxt: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 10 },
  pageBtnOff: { opacity: 0.45 },
  pageBtnTxt: { fontWeight: "700", color: "#1E3A8A", fontSize: 14 },
  pageBtnTxtOff: { color: "#94A3B8" },
  pageInfo: { fontSize: 13, fontWeight: "800", color: colors.text },
});
