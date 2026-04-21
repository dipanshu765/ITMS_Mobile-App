import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppInput from "../components/AppInput";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { BranchDetail, DepartmentDetail } from "../types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTask">;
type PickedFile = { uri: string; name: string; mimeType?: string };
type Option = { label: string; value: string };
type PickerKind = "priority" | "branch" | "department" | "assignDepartment" | "supportStaff" | null;

const NONE = "";

function toId(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function userIdOf(u: any): string {
  return String(u?.user_id ?? u?.id ?? u?.employee_id ?? "");
}

function userNameOf(u: any): string {
  return String(u?.name ?? u?.full_name ?? u?.username ?? u?.email ?? "").trim();
}

export default function CreateTaskScreen({ navigation }: Props) {
  const { token, user } = useAuth();
  const userRoleId = user?.role_id ?? null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [branchId, setBranchId] = useState<string>(NONE);
  const [departmentId, setDepartmentId] = useState<string>(NONE);
  const [assignDepartmentId, setAssignDepartmentId] = useState<string>(NONE);
  const [supportStaffId, setSupportStaffId] = useState<string>(NONE);
  const [attachments, setAttachments] = useState<PickedFile[]>([]);

  const [taskTypeId, setTaskTypeId] = useState<number | null>(null); // hidden; required by backend
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [globalDepartments, setGlobalDepartments] = useState<DepartmentDetail[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<DepartmentDetail[]>([]);
  const [branchDepartments, setBranchDepartments] = useState<DepartmentDetail[]>([]);
  const [employees, setEmployees] = useState<{ user_id: string; name: string }[]>([]);

  const [pickerKind, setPickerKind] = useState<PickerKind>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) return;
      try {
        const [typesRes, bRes, dRes, orgRes] = await Promise.all([
          api.getTaskTypes(token),
          api.getBranches(token),
          api.getDepartments(token),
          api.getOrganizationDepartments(token),
        ]);
        const firstType = (typesRes.data || []).find((t: any) => t.is_active !== false) ?? (typesRes.data || [])[0];
        setTaskTypeId(firstType?.id ?? null);
        setBranches((bRes.data || []) as BranchDetail[]);
        setGlobalDepartments((dRes.data || []) as DepartmentDetail[]);
        setOrgDepartments((orgRes.data || []) as DepartmentDetail[]);
      } catch {
        setBranches([]);
      }
    };
    void bootstrap();
  }, [token]);

  // Role 1/3: fetch departments by selected branch (same backend path web uses)
  useEffect(() => {
    const loadByBranch = async () => {
      if (!token || !(userRoleId === 1 || userRoleId === 3) || !branchId) {
        setBranchDepartments([]);
        setDepartmentId(NONE);
        return;
      }
      try {
        const res = await api.getDepartments(token, branchId);
        setBranchDepartments((res.data || []) as DepartmentDetail[]);
      } catch {
        setBranchDepartments([]);
      }
    };
    void loadByBranch();
  }, [token, userRoleId, branchId]);

  const effectiveDepartmentId = userRoleId === 1 || userRoleId === 3 ? departmentId : assignDepartmentId;
  useEffect(() => {
    const loadEmployees = async () => {
      if (!token || !effectiveDepartmentId) {
        setEmployees([]);
        setSupportStaffId(NONE);
        return;
      }
      try {
        const res = await api.getEmployeesByDepartment(token, effectiveDepartmentId);
        const mapped = (res.data || [])
          .map((u: any) => ({ user_id: userIdOf(u), name: userNameOf(u) }))
          .filter((u) => u.user_id && u.name);
        setEmployees(mapped);
      } catch {
        setEmployees([]);
      }
    };
    void loadEmployees();
  }, [token, effectiveDepartmentId]);

  const departmentChoices = useMemo(
    () => (userRoleId === 1 || userRoleId === 3 ? branchDepartments : globalDepartments),
    [userRoleId, branchDepartments, globalDepartments],
  );

  const priorityOptions: Option[] = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Urgent", value: "urgent" },
  ];

  const branchOptions: Option[] = branches.map((b) => ({ label: b.name, value: toId((b as any).id) }));
  const deptOptions: Option[] = departmentChoices.map((d) => ({ label: d.name, value: toId((d as any).id) }));
  const assignDeptOptions: Option[] = orgDepartments.map((d) => ({ label: d.name, value: toId((d as any).id) }));
  const staffOptions: Option[] = employees.map((e) => ({ label: e.name, value: e.user_id }));

  const openPicker = (kind: PickerKind) => {
    setPickerKind(kind);
    setPickerVisible(true);
  };

  const pickerOptions = useMemo(() => {
    if (pickerKind === "priority") return priorityOptions;
    if (pickerKind === "branch") return branchOptions;
    if (pickerKind === "department") return deptOptions;
    if (pickerKind === "assignDepartment") return assignDeptOptions;
    if (pickerKind === "supportStaff") return staffOptions;
    return [];
  }, [pickerKind, priorityOptions, branchOptions, deptOptions, assignDeptOptions, staffOptions]);

  const onPickValue = (value: string) => {
    if (pickerKind === "priority") {
      setPriority(value);
    } else if (pickerKind === "branch") {
      setBranchId(value);
      setDepartmentId(NONE);
      setSupportStaffId(NONE);
      setEmployees([]);
    } else if (pickerKind === "department") {
      setDepartmentId(value);
      setSupportStaffId(NONE);
    } else if (pickerKind === "assignDepartment") {
      setAssignDepartmentId(value);
      setSupportStaffId(NONE);
    } else if (pickerKind === "supportStaff") {
      setSupportStaffId(value);
    }
    setPickerVisible(false);
  };

  const labelOf = (options: Option[], id: string, fallback: string) =>
    options.find((o) => o.value === id)?.label || fallback;

  const pickAttachments = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const files = result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? undefined }));
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (idx: number) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!token) return;
    if (!title.trim()) return Alert.alert("Validation", "Title is required.");
    if (!taskTypeId) return Alert.alert("Validation", "Task type configuration missing.");

    if (userRoleId === 1 || userRoleId === 3) {
      if (!branchId) return Alert.alert("Validation", "Branch is required.");
      if (!departmentId) return Alert.alert("Validation", "Department is required.");
    }
    if ((userRoleId === 2 || userRoleId === 4) && !assignDepartmentId) {
      return Alert.alert("Validation", "Assign Department is required.");
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      task_type_id: taskTypeId,
    };

    if (userRoleId === 4) {
      body.assigned_to_department_id = assignDepartmentId || undefined;
      body.assigned_to_user_id = null;
    } else if (userRoleId === 1 || userRoleId === 3) {
      body.priority = priority;
      body.branch_id = branchId || undefined;
      body.department_id = departmentId || undefined;
      body.assigned_to_department_id = departmentId || undefined;
      body.assigned_to_user_id = supportStaffId || undefined;
    } else {
      body.priority = priority;
      body.assigned_to_department_id = assignDepartmentId || undefined;
      body.assigned_to_user_id = supportStaffId || undefined;
    }

    setLoading(true);
    try {
      await api.createTask(token, body, attachments);
      Alert.alert("Success", "Task created successfully.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Create Task", e instanceof Error ? e.message : "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  const Selector = ({
    label,
    valueLabel,
    onPress,
    disabled = false,
  }: {
    label: string;
    valueLabel: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={[styles.selector, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
        <Text style={[styles.selectorText, !valueLabel || valueLabel.startsWith("Select") ? styles.placeholder : null]} numberOfLines={1}>
          {valueLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer>
      <Text style={styles.title}>Add New Task</Text>

      <AppInput label="Title *" value={title} onChangeText={setTitle} placeholder="Enter task title" />

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter task description"
          placeholderTextColor={colors.mutedText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {userRoleId !== 4 ? (
        <Selector
          label="Priority"
          valueLabel={labelOf(priorityOptions, priority, "Select Priority")}
          onPress={() => openPicker("priority")}
        />
      ) : null}

      {(userRoleId === 1 || userRoleId === 3) ? (
        <>
          <Selector
            label="Branch *"
            valueLabel={labelOf(branchOptions, branchId, "Select Branch")}
            onPress={() => openPicker("branch")}
          />
          <Selector
            label="Department *"
            valueLabel={labelOf(deptOptions, departmentId, branchId ? "Select Department" : "Select Branch first")}
            onPress={() => openPicker("department")}
            disabled={!branchId}
          />
          <Selector
            label="Support Staff (Optional)"
            valueLabel={labelOf(staffOptions, supportStaffId, departmentId ? "Select Support Staff" : "Select Department first")}
            onPress={() => openPicker("supportStaff")}
            disabled={!departmentId || !staffOptions.length}
          />
        </>
      ) : (
        <>
          <Selector
            label="Assign Department *"
            valueLabel={labelOf(assignDeptOptions, assignDepartmentId, "Select Department")}
            onPress={() => openPicker("assignDepartment")}
          />
          {userRoleId !== 4 ? (
            <Selector
              label="Support Staff (Optional)"
              valueLabel={labelOf(staffOptions, supportStaffId, assignDepartmentId ? "Select Support Staff" : "Select Department first")}
              onPress={() => openPicker("supportStaff")}
              disabled={!assignDepartmentId || !staffOptions.length}
            />
          ) : null}
        </>
      )}

      <View style={styles.attachWrap}>
        <Text style={styles.attachLabel}>Attachments (Optional)</Text>
        <TouchableOpacity style={styles.attachBtn} onPress={() => void pickAttachments()}>
          <MaterialCommunityIcons name="paperclip" size={16} color="#1E293B" />
          <Text style={styles.attachBtnTxt}>Select Files</Text>
        </TouchableOpacity>
        {attachments.map((f, idx) => (
          <View key={`${f.uri}_${idx}`} style={styles.fileRow}>
            <MaterialCommunityIcons name="file-outline" size={16} color="#64748B" />
            <Text style={styles.fileName} numberOfLines={1}>
              {f.name}
            </Text>
            <TouchableOpacity onPress={() => removeAttachment(idx)}>
              <MaterialCommunityIcons name="close" size={18} color="#B91C1C" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <PrimaryButton label="Create" onPress={submit} loading={loading} />

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {pickerKind === "branch"
                ? "Select Branch"
                : pickerKind === "department"
                  ? "Select Department"
                  : pickerKind === "assignDepartment"
                    ? "Select Department"
                    : pickerKind === "supportStaff"
                      ? "Select Support Staff"
                      : "Select Priority"}
            </Text>

            {!pickerOptions.length ? (
              <Text style={styles.emptyText}>
                {pickerKind === "department"
                  ? "Select branch first."
                  : pickerKind === "supportStaff"
                    ? "No support staff found."
                    : "No options available."}
              </Text>
            ) : (
              <FlatList
                data={pickerOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.optionRow} onPress={() => onPickValue(item.value)}>
                    <Text style={styles.optionText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12, color: colors.primaryDark },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  descInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disabled: { opacity: 0.6 },
  selectorText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600", marginRight: 8 },
  placeholder: { color: colors.mutedText, fontWeight: "500" },
  attachWrap: { marginBottom: 12 },
  attachLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 6 },
  attachBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  attachBtnTxt: { color: "#1E293B", fontWeight: "700" },
  fileRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  fileName: { flex: 1, color: "#334155", fontSize: 12, fontWeight: "600" },
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
  optionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  optionText: { color: colors.text, fontWeight: "600" },
  emptyText: { color: colors.mutedText, paddingVertical: 8 },
});
