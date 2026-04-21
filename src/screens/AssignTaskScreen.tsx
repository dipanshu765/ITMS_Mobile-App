import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import AppInput from "../components/AppInput";
import AppSelect from "../components/AppSelect";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import { ENV } from "../config/env";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { DepartmentDetail, TaskItem, UserItem } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "AssignTask">;

function fmtDate(value?: string) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-GB");
  } catch {
    return value;
  }
}

function showStatus(value?: string) {
  if (value === "assigned") return "pending";
  return value || "pending";
}

export default function AssignTaskScreen({ route, navigation }: Props) {
  const { token, user } = useAuth();
  const { taskId, taskTitle } = route.params;
  const userRoleId = user?.role_id ?? null;

  const [task, setTask] = useState<TaskItem | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [userId, setUserId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("resolved");
  const [remarks, setRemarks] = useState("");
  const [statusDepartmentId, setStatusDepartmentId] = useState("");
  const [statusUserId, setStatusUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [departments, setDepartments] = useState<DepartmentDetail[]>([]);
  const [employees, setEmployees] = useState<UserItem[]>([]);
  const isReopen = status === "reopen";

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setMetaLoading(true);
      try {
        const [departmentRes, taskRes] = await Promise.all([
          api.getOrganizationDepartments(token),
          api.getTaskDetails(token, taskId),
        ]);
        setDepartments(departmentRes.data || []);
        const currentTask = taskRes.data || null;
        setTask(currentTask);
        const initialDepartment = currentTask?.assigned_to_department?.id ? String(currentTask.assigned_to_department.id) : "";
        const initialUser = currentTask?.assigned_to_user?.user_id ?? "";
        setDepartmentId(initialDepartment);
        setUserId(currentTask?.assigned_to_user?.user_id ?? "");
        setStatusDepartmentId(initialDepartment);
        setStatusUserId(initialUser);
        setPriority(currentTask?.priority || "medium");

        const currentStatus = currentTask?.status || "";
        const assignedToCurrentUser = currentTask?.assigned_to_user?.user_id === user?.user_id;
        if (userRoleId === 4 && assignedToCurrentUser) {
          if (currentStatus === "resolved") setStatus("reopen");
          else if (currentStatus === "reopen") setStatus("resolved");
          else setStatus("resolved");
        } else if (currentStatus === "resolved") {
          setStatus("closed");
        } else {
          setStatus("resolved");
        }
      } catch {
        setDepartments([]);
      } finally {
        setMetaLoading(false);
      }
    };
    void load();
  }, [token, taskId, user?.user_id, userRoleId]);

  useEffect(() => {
    const loadEmployees = async () => {
      const targetDepartmentId = isReopen && userRoleId !== 4 ? statusDepartmentId : departmentId;
      if (!token || !targetDepartmentId) {
        setEmployees([]);
        if (!isReopen) setUserId("");
        return;
      }
      try {
        const response = await api.getEmployeesByDepartment(token, targetDepartmentId);
        const list = response.data || [];
        setEmployees(list);
        if (!isReopen && userId && !list.some((x) => x.user_id === userId)) {
          setUserId("");
        }
      } catch {
        setEmployees([]);
      }
    };
    void loadEmployees();
  }, [token, departmentId, statusDepartmentId, isReopen, userRoleId, userId]);

  const isAssignedUser = task?.assigned_to_user?.user_id === user?.user_id;
  const isCreatedBy = task?.created_by?.user_id === user?.user_id;
  const taskStatus = task?.status || "";
  const canAssign =
    !!task &&
    (userRoleId === 1 || userRoleId === 2 || userRoleId === 3) &&
    taskStatus !== "resolved" &&
    taskStatus !== "closed";
  const canUpdateStatus =
    !!task &&
    taskStatus !== "closed" &&
    (isAssignedUser || isCreatedBy || userRoleId === 1 || userRoleId === 2 || (userRoleId === 3 && taskStatus === "resolved"));

  const statusOptions = useMemo(() => {
    const current = task?.status || "";
    if (userRoleId === 4) {
      if (!isAssignedUser) return [];
      if (current === "resolved") return [{ label: "Reopen", value: "reopen" }];
      if (current === "reopen") {
        return [
          { label: "Resolved", value: "resolved" },
          { label: "Reopen", value: "reopen" },
        ];
      }
      return [{ label: "Resolved", value: "resolved" }];
    }
    if (current === "resolved") {
      return [
        { label: "Reopen", value: "reopen" },
        { label: "Closed", value: "closed" },
      ];
    }
    return [
      { label: "Pending", value: "pending" },
      { label: "Resolved", value: "resolved" },
      { label: "Reopen", value: "reopen" },
      { label: "Closed", value: "closed" },
    ];
  }, [task?.status, userRoleId, isAssignedUser]);

  const priorityOptions = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Urgent", value: "urgent" },
  ];

  const onAssign = async () => {
    if (!token) return;
    if (!canAssign) return;
    if (!departmentId && !userId.trim()) {
      Alert.alert("Validation", "Provide department or user for assignment.");
      return;
    }

    setLoading(true);
    try {
      await api.assignTask(token, taskId, {
        assigned_to_department_id: departmentId || undefined,
        assigned_to_user_id: userId.trim() || undefined,
        priority: priority.trim() || undefined,
      });
      Alert.alert("Success", "Task assigned.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Assign Task", e instanceof Error ? e.message : "Failed to assign task.");
    } finally {
      setLoading(false);
    }
  };

  const onUpdateStatus = async () => {
    if (!token) return;
    if (!canUpdateStatus) {
      Alert.alert("Status", "You are not allowed to update this task status.");
      return;
    }
    if (!status) {
      Alert.alert("Validation", "Select a status.");
      return;
    }
    if (isReopen && userRoleId !== 4 && !statusDepartmentId) {
      Alert.alert("Validation", "Select a department when reopening.");
      return;
    }

    setStatusLoading(true);
    try {
      const body: Record<string, unknown> = {
        status,
        remarks: remarks.trim() || undefined,
      };
      if (isReopen && userRoleId !== 4) {
        body.assigned_to_department_id = statusDepartmentId;
        body.assigned_to_user_id = statusUserId || undefined;
      }
      await api.updateTaskStatus(token, taskId, {
        ...body,
      });
      Alert.alert("Success", "Task status updated.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Status", e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Task #{taskId}</Text>
      <Text style={styles.subtitle}>{taskTitle}</Text>
      {metaLoading ? <Text style={styles.muted}>Loading task details...</Text> : null}
      {task ? (
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Task ID</Text>
              <Text style={styles.v}>TK{String(task.id).padStart(6, "0")}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Status</Text>
              <Text style={[styles.v, styles.statusText]}>{showStatus(task.status)}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Priority</Text>
              <Text style={styles.v}>{task.priority || "medium"}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Created By</Text>
              <Text style={styles.v}>{task.created_by?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Created Date</Text>
              <Text style={styles.v}>{fmtDate(task.created_at)}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Time Taken</Text>
              <Text style={styles.v}>{task.time_taken || "N/A"}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Branch</Text>
              <Text style={styles.v}>{task.branch?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Department</Text>
              <Text style={styles.v}>{task.department?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Assigned Department</Text>
              <Text style={styles.v}>{task.assigned_to_department?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoTile}>
              <Text style={styles.k}>Support Staff</Text>
              <Text style={styles.v}>{task.assigned_to_user?.name || "N/A"}</Text>
            </View>
          </View>

          {task.description ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionSubTitle}>Description</Text>
              <Text style={styles.descText}>{task.description}</Text>
            </View>
          ) : null}

          {task.attachments?.length ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionSubTitle}>Attachments</Text>
              {task.attachments.map((att, idx) => (
                <Pressable
                  key={String(att?.id ?? idx)}
                  style={styles.fileRow}
                  onPress={() => {
                    const p = att?.file_path || att?.url;
                    if (!p) return;
                    const base = ENV.API_BASE_URL.replace(/\/api\/?$/, "");
                    const url = String(p).startsWith("http")
                      ? String(p)
                      : `${base}${String(p).startsWith("/") ? "" : "/"}${String(p)}`;
                    void Linking.openURL(url);
                  }}
                >
                  <Text style={styles.fileName} numberOfLines={1}>
                    {att?.file_name || `Attachment ${idx + 1}`}
                  </Text>
                  <Text style={styles.fileAction}>Open</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionSubTitle}>Responses & Comments</Text>
            {task.responses?.length ? (
              task.responses.map((resp) => (
                <View key={String(resp.id)} style={styles.timelineCard}>
                  <Text style={styles.timelineTitle}>
                    {resp.created_by?.name || "Unknown"} · {fmtDate(resp.created_at)}
                    {resp.response_type ? ` · ${resp.response_type.replace("_", " ")}` : ""}
                  </Text>
                  <Text style={styles.timelineText}>{resp.message || "No message"}</Text>
                  {resp.old_status && resp.new_status ? (
                    <Text style={styles.timelineMeta}>Status: {showStatus(resp.old_status)} to {showStatus(resp.new_status)}</Text>
                  ) : null}
                  {resp.new_assigned_user?.name ? (
                    <Text style={styles.timelineMeta}>Assigned to: {resp.new_assigned_user.name}</Text>
                  ) : null}
                  {resp.new_assigned_department?.name ? (
                    <Text style={styles.timelineMeta}>Assigned department: {resp.new_assigned_department.name}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No comments yet.</Text>
            )}
          </View>

          {task.status_history?.length ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionSubTitle}>Status History</Text>
              {task.status_history.map((history) => (
                <View key={String(history.id)} style={styles.timelineCard}>
                  <Text style={styles.timelineTitle}>
                    {history.old_status
                      ? `${showStatus(history.old_status)} to ${showStatus(history.new_status)}`
                      : `Status set to ${showStatus(history.new_status)}`}
                  </Text>
                  <Text style={styles.timelineMeta}>On: {fmtDate(history.changed_at)}</Text>
                  {history.changed_by?.name ? <Text style={styles.timelineMeta}>Changed by: {history.changed_by.name}</Text> : null}
                  {history.time_in_status ? <Text style={styles.timelineMeta}>Time in status: {history.time_in_status}</Text> : null}
                  {history.remarks ? <Text style={styles.timelineText}>{history.remarks}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {task.assignment_history?.length ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionSubTitle}>Assignment History</Text>
              {task.assignment_history.map((history) => (
                <View key={String(history.id)} style={styles.timelineCard}>
                  <Text style={styles.timelineTitle}>Assignment changed · {fmtDate(history.changed_at)}</Text>
                  {history.old_assigned_user?.name || history.old_assigned_department?.name ? (
                    <Text style={styles.timelineMeta}>
                      From: {history.old_assigned_user?.name || `${history.old_assigned_department?.name} (Department)`}
                    </Text>
                  ) : null}
                  {history.new_assigned_user?.name || history.new_assigned_department?.name ? (
                    <Text style={styles.timelineMeta}>
                      To: {history.new_assigned_user?.name || `${history.new_assigned_department?.name} (Department)`}
                    </Text>
                  ) : null}
                  {history.changed_by?.name ? <Text style={styles.timelineMeta}>Changed by: {history.changed_by.name}</Text> : null}
                  {history.remarks ? <Text style={styles.timelineText}>{history.remarks}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {canAssign ? (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Assignment</Text>
          <AppSelect
            label="Department"
            options={departments.map((x) => ({ label: x.name, value: x.id }))}
            value={departmentId || null}
            onChange={(v) => setDepartmentId(v ? String(v) : "")}
            placeholder="Select department"
          />
          <AppSelect
            label="User"
            options={employees.map((x) => ({ label: x.name, value: x.user_id }))}
            value={userId || null}
            onChange={(v) => setUserId(v ? String(v) : "")}
            placeholder={departmentId ? "Select user (optional)" : "Select department first"}
          />
          <AppSelect
            label="Priority"
            options={priorityOptions}
            value={priority}
            onChange={(v) => setPriority(v ? String(v) : "medium")}
            placeholder="Select priority"
          />
          <PrimaryButton label="Save Assignment" onPress={onAssign} loading={loading} />
        </View>
      ) : null}

      <View style={[styles.block, canAssign ? styles.blockTopSpacing : null]}>
        <Text style={styles.sectionTitle}>Status Update</Text>
        {!canUpdateStatus ? (
          <Text style={styles.muted}>Status updates are available only to assigned employee or higher roles.</Text>
        ) : (
          <>
            <AppSelect
              label="New Status"
              options={statusOptions}
              value={status}
              onChange={(v) => setStatus(v ? String(v) : "")}
              placeholder="Select status"
            />
            {isReopen && userRoleId !== 4 ? (
              <>
                <AppSelect
                  label="Assign Department for Reopen"
                  options={departments.map((x) => ({ label: x.name, value: x.id }))}
                  value={statusDepartmentId || null}
                  onChange={(v) => {
                    setStatusDepartmentId(v ? String(v) : "");
                    setStatusUserId("");
                  }}
                  placeholder="Select department"
                />
                <AppSelect
                  label="Support Staff (optional)"
                  options={employees.map((x) => ({ label: x.name, value: x.user_id }))}
                  value={statusUserId || null}
                  onChange={(v) => setStatusUserId(v ? String(v) : "")}
                  placeholder={statusDepartmentId ? "Select user" : "Select department first"}
                />
              </>
            ) : null}
            <AppInput label="Remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="Add remarks..." />
            <PrimaryButton label="Update Status" onPress={onUpdateStatus} loading={statusLoading} />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: colors.primaryDark },
  subtitle: { color: colors.mutedText, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 8 },
  muted: { color: colors.mutedText, marginBottom: 10 },
  detailsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: "#FFF",
    padding: 12,
    marginBottom: 12,
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoTile: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    padding: 8,
  },
  k: { fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 2 },
  v: { fontSize: 13, fontWeight: "700", color: colors.text },
  statusText: { textTransform: "lowercase" },
  sectionBlock: { marginTop: 10 },
  sectionSubTitle: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 6 },
  descText: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    padding: 8,
    color: colors.text,
  },
  fileRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  fileName: { flex: 1, fontSize: 12, fontWeight: "700", color: "#334155", marginRight: 8 },
  fileAction: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  timelineCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    padding: 8,
    marginTop: 6,
  },
  timelineTitle: { fontSize: 12, fontWeight: "800", color: "#0F172A", marginBottom: 3 },
  timelineMeta: { fontSize: 11, color: "#64748B", marginTop: 1 },
  timelineText: { fontSize: 12, color: "#334155", marginTop: 4 },
  block: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
  },
  blockTopSpacing: { marginTop: 14 },
});
