import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import AppInput from "../components/AppInput";
import AppSelect from "../components/AppSelect";
import EmptyState from "../components/EmptyState";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { Branch, Department, Role } from "../types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "UserForm">;

export default function UserFormScreen({ route, navigation }: Props) {
  const { token, user } = useAuth();
  const userId = route.params?.userId;
  const isEdit = Boolean(userId);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);

  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const allowedRoles = useMemo(() => {
    if (user?.role_id === 3) return roles.filter((r) => Number(r.id) === 4);
    return roles;
  }, [roles, user?.role_id]);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const [roleRes, branchRes, deptRes] = await Promise.all([
          api.getRoles(token),
          api.getBranches(token),
          api.getDepartments(token, null, true),
        ]);
        setRoles(roleRes.data || []);
        setBranches(branchRes.data || []);
        setDepartments(deptRes.data || []);

        if (user?.role_id === 3) {
          setRoleId(4);
        }

        if (isEdit && userId) {
          const detail = await api.getUser(token, userId);
          setName(detail.data.name || "");
          setMobile(detail.data.mobile || "");
          setEmail(detail.data.email || "");
          setPassword(detail.data.password || "");
          setRoleId(Number(detail.data.role_id) || null);
          setBranchId(detail.data.branches?.[0]?.id ?? null);
          setDepartmentIds((detail.data.departments || []).map((d) => d.id));
        }
      } catch (e) {
        Alert.alert("User Form", e instanceof Error ? e.message : "Failed to initialize form");
      }
    };

    void init();
  }, [token, isEdit, userId, user?.role_id]);

  const onSubmit = async () => {
    if (!token) return;
    if (!name.trim() || !mobile.trim() || !email.trim() || !roleId || !branchId || !departmentIds.length) {
      Alert.alert("Validation", "Please fill required fields.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        role_id: roleId,
        branch_ids: [branchId],
        department_ids: departmentIds,
      };

      if (isEdit && userId) {
        await api.updateUser(token, userId, payload);
      } else {
        await api.addUser(token, payload);
      }
      Alert.alert("Success", isEdit ? "User updated." : "User created.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Save Failed", e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role_id === 4) {
    return (
      <ScreenContainer>
        <EmptyState title="Employee role cannot add or edit users." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{isEdit ? "Edit User" : "Add User"}</Text>
      <AppInput label="Name" value={name} onChangeText={setName} placeholder="Enter name" />
      <AppInput label="Mobile" value={mobile} onChangeText={setMobile} placeholder="10-digit mobile" keyboardType="phone-pad" />
      <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" />
      <AppInput
        label={isEdit ? "Password (optional)" : "Password"}
        value={password}
        onChangeText={setPassword}
        placeholder="Enter password"
        secureTextEntry
      />
      <AppSelect
        label="Role"
        options={allowedRoles.map((r) => ({ label: r.name, value: r.id }))}
        value={roleId}
        onChange={(v) => setRoleId(v ? Number(v) : null)}
        placeholder="Select role"
      />
      <AppSelect
        label="Branch"
        options={branches.map((b) => ({ label: b.name, value: b.id }))}
        value={branchId}
        onChange={(v) => setBranchId(v ? Number(v) : null)}
        placeholder="Select branch"
      />
      <AppSelect
        label="Department (primary)"
        options={departments.map((d) => ({ label: d.name, value: d.id }))}
        value={departmentIds[0] ?? null}
        onChange={(v) => setDepartmentIds(v ? [Number(v)] : [])}
        placeholder="Select department"
      />
      <PrimaryButton label={isEdit ? "Update User" : "Create User"} onPress={onSubmit} loading={loading} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12, color: colors.primaryDark },
});
