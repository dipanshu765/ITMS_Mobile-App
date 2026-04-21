import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { MainStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type MenuKey = keyof MainStackParamList;

type MenuItem = {
  route: MenuKey;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  visible: boolean;
};

interface AppShellProps extends PropsWithChildren {
  title: string;
  scroll?: boolean;
  /** Optional actions shown on the right of the top bar (e.g. icon buttons). */
  headerRight?: ReactNode;
  /** Optional content below the title (e.g. date range chip on Dashboard). */
  headerCenter?: ReactNode;
  /** When true, the user avatar initial circle is hidden to save space. */
  hideUserAvatar?: boolean;
}

export default function AppShell({
  title,
  children,
  scroll = true,
  headerRight,
  headerCenter,
  hideUserAvatar,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [menuVisible, setMenuVisible] = useState(false);
  const userRoleId = user?.role_id ?? null;

  const menuItems = useMemo<MenuItem[]>(
    () => {
      const allItems: MenuItem[] = [
        { route: "Dashboard", label: "Dashboard", icon: "view-dashboard-outline", visible: true },
        { route: "Users", label: "User List", icon: "account-group-outline", visible: userRoleId !== 4 },
        { route: "UpdateProfile", label: "Update Profile", icon: "account-circle-outline", visible: true },
        { route: "Branches", label: "Branches", icon: "source-branch", visible: userRoleId === 1 },
        { route: "Departments", label: "Departments", icon: "domain", visible: userRoleId === 1 || userRoleId === 2 },
        { route: "Tasks", label: "Task list", icon: "clipboard-list-outline", visible: true },
        { route: "RecentActivity", label: "Recent Activity", icon: "history", visible: true },
        { route: "PrivacyPolicy", label: "Privacy Policy", icon: "shield-check-outline", visible: true },
      ];
      return allItems.filter((item) => item.visible);
    },
    [userRoleId],
  );

  const initials = (user?.name || "U")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navigateTo = (targetRoute: MenuKey) => {
    setMenuVisible(false);
    if (route.name !== targetRoute) {
      navigation.navigate(targetRoute);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.topBar, headerCenter ? styles.topBarTall : null]}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <MaterialCommunityIcons name="menu" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title}
          </Text>
          {headerCenter ? <View style={styles.headerCenter}>{headerCenter}</View> : null}
        </View>
        <View style={styles.topTrailing}>
          {headerRight}
          {!hideUserAvatar ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {scroll ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={styles.content}>{children}</View>}

      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)} />
          <View style={styles.sidebar}>
            <View style={styles.brandBox}>
              <Text style={styles.brandTitle}>HTR | HTT Innovations</Text>
              <Text style={styles.brandSub}>Hitech Radiators Pvt. Ltd.</Text>
            </View>

            <ScrollView style={styles.menuList} contentContainerStyle={styles.menuListContent}>
              {menuItems.map((item) => {
                const isActive = route.name === item.route;
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => navigateTo(item.route)}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={isActive ? "#FFFFFF" : "#BFDBFE"}
                      style={styles.menuIcon}
                    />
                    <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.copy}>© 2026 HTR | HTT Innovations</Text>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                  setMenuVisible(false);
                  void logout();
                }}
              >
                <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F5F9" },
  topBar: {
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTall: { minHeight: 58, paddingVertical: 6 },
  menuBtn: { padding: 4, alignSelf: "center" },
  topTitleBlock: { flex: 1, marginLeft: 10, marginRight: 8, minWidth: 0, justifyContent: "center" },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  headerCenter: { marginTop: 2, minWidth: 0 },
  topTrailing: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "center" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  content: { flexGrow: 1, padding: 14 },
  modalRoot: { flex: 1, flexDirection: "row" },
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.45)" },
  sidebar: {
    width: 285,
    backgroundColor: "#1D4ED8",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(191,219,254,0.25)",
  },
  brandBox: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(191,219,254,0.25)",
  },
  brandTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  brandSub: { color: "#DBEAFE", marginTop: 4, fontSize: 12 },
  menuList: { flex: 1 },
  menuListContent: { paddingVertical: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  menuItemActive: {
    backgroundColor: "#1E3A8A",
    borderRightWidth: 4,
    borderRightColor: "#FFFFFF",
  },
  menuIcon: { marginRight: 10 },
  menuText: { color: "#DBEAFE", fontWeight: "500", fontSize: 15 },
  menuTextActive: { color: "#FFFFFF", fontWeight: "700" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(191,219,254,0.25)",
    padding: 14,
    gap: 10,
  },
  copy: { color: "#DBEAFE", fontSize: 11, textAlign: "center" },
  logoutBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { color: "#FFFFFF", fontWeight: "700" },
});
