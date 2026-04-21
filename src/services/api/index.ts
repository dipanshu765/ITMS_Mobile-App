import {
  ApiResponse,
  BranchDetail,
  DashboardData,
  DepartmentDetail,
  RecentActivitiesApiResponse,
  Role,
  TaskItem,
  TasksListApiResponse,
  UserItem,
  UserListApiResponse,
} from "../../types";
import { ENV } from "../../config/env";
import { request } from "./client";

function toQueryString(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    params.append(key, String(value));
  });
  return params.toString();
}

export const api = {
  login: (username: string, password: string) =>
    request<ApiResponse<{ access_token: string } & UserItem>>("/auth/login/", {
      method: "POST",
      body: { username, password, source: "mobile_app" },
    }),

  forgetPassword: (
    email: string,
    otp?: string | null,
    newPassword?: string | null,
    confirmNewPassword?: string | null,
  ) =>
    request<ApiResponse<null>>("/auth/forget-password/", {
      method: "POST",
      body: {
        email,
        ...(otp && newPassword && confirmNewPassword
          ? { otp, new_password: newPassword, confirm_new_password: confirmNewPassword }
          : {}),
      },
    }),

  getDashboard: (token: string) => request<ApiResponse<DashboardData>>("/dashboard/", { token }),

  getDashboardData: (token: string, startDate?: string, endDate?: string) => {
    const query = toQueryString({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    return request<ApiResponse<DashboardData>>(`/dashboard/${query ? `?${query}` : ""}`, { token });
  },

  getRoles: (token: string) =>
    request<ApiResponse<Role[]>>("/get-roles/", { token }),

  getBranches: (token: string) => request<ApiResponse<BranchDetail[]>>("/get-branches/", { token }),

  addBranch: (token: string, body: Record<string, unknown>) =>
    request<ApiResponse<BranchDetail>>("/add-branch/", { method: "POST", token, body }),

  updateBranch: (token: string, branchId: number, body: Record<string, unknown>) =>
    request<ApiResponse<BranchDetail>>(`/update-branch/${branchId}/`, { method: "PUT", token, body }),

  deleteBranch: (token: string, branchId: number) =>
    request<ApiResponse<unknown>>(`/delete-branch/${branchId}/`, { method: "DELETE", token }),

  getDepartments: (token: string, branchId?: string | number | null, allOrg = false) => {
    const query = toQueryString({
      branch_id: branchId || undefined,
      all_org: allOrg ? "true" : undefined,
    });
    return request<ApiResponse<DepartmentDetail[]>>(`/get-departments/${query ? `?${query}` : ""}`, { token });
  },

  getOrganizationDepartments: (token: string) =>
    request<ApiResponse<DepartmentDetail[]>>("/get-organization-departments/", { token }),

  addDepartment: (token: string, body: Record<string, unknown>) =>
    request<ApiResponse<DepartmentDetail>>("/add-department/", { method: "POST", token, body }),

  updateDepartment: (token: string, departmentId: number, body: Record<string, unknown>) =>
    request<ApiResponse<DepartmentDetail>>(`/update-department/${departmentId}/`, { method: "PUT", token, body }),

  deleteDepartment: (token: string, departmentId: number) =>
    request<ApiResponse<unknown>>(`/delete-department/${departmentId}/`, { method: "DELETE", token }),

  getUsers: (token: string, filters: Record<string, unknown> = {}) =>
    request<UserListApiResponse>(`/get-users/${toQueryString(filters) ? `?${toQueryString(filters)}` : ""}`, { token }),

  getUser: (token: string, userId: string) =>
    request<ApiResponse<UserItem & { password?: string }>>(`/get-user/${userId}/`, { token }),

  addUser: (token: string, body: Record<string, unknown>) =>
    request<ApiResponse<UserItem>>("/add-user/", { method: "POST", token, body }),

  updateUser: (token: string, userId: string, body: Record<string, unknown>) =>
    request<ApiResponse<UserItem>>(`/update-user/${userId}/`, { method: "PUT", token, body }),

  getTasks: (token: string, filters: Record<string, unknown> = {}) =>
    request<TasksListApiResponse>(`/tasks/${toQueryString(filters) ? `?${toQueryString(filters)}` : ""}`, { token }),

  getRecentActivities: (token: string, filters: Record<string, unknown> = {}) =>
    request<RecentActivitiesApiResponse>(
      `/recent-activities/${toQueryString(filters) ? `?${toQueryString(filters)}` : ""}`,
      { token },
    ),

  getTaskTypes: (token: string) =>
    request<ApiResponse<{ id: number; name: string }[]>>("/task-types/", { token }),

  getTaskSubTypes: (token: string, taskTypeId: number) =>
    request<ApiResponse<{ id: number; name: string }[]>>(`/task-sub-types/?task_type_id=${taskTypeId}`, { token }),

  createTask: async (
    token: string,
    body: Record<string, unknown>,
    files?: Array<{ uri: string; name: string; mimeType?: string }>,
  ) => {
    if (!files?.length) {
      return request<ApiResponse<TaskItem>>("/tasks/add/", { method: "POST", token, body });
    }
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      form.append(key, String(value));
    });
    files.forEach((f, idx) => {
      form.append("files", {
        uri: f.uri,
        name: f.name || `attachment_${idx + 1}`,
        type: f.mimeType || "application/octet-stream",
      } as any);
    });

    const response = await fetch(`${ENV.API_BASE_URL}/tasks/add/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = (await response.json()) as ApiResponse<TaskItem>;
    if (!response.ok) throw new Error(data?.message || "Request failed");
    return data;
  },

  assignTask: (token: string, taskId: number, body: Record<string, unknown>) =>
    request<ApiResponse<TaskItem>>(`/tasks/${taskId}/assign/`, { method: "PUT", token, body }),

  getTaskDetails: (token: string, taskId: number) =>
    request<ApiResponse<TaskItem>>(`/tasks/${taskId}/`, { token }),

  updateTaskStatus: (token: string, taskId: number, body: Record<string, unknown>) =>
    request<ApiResponse<TaskItem>>(`/tasks/${taskId}/update-status/`, { method: "PUT", token, body }),

  getEmployeesByDepartment: (token: string, departmentId: string | number) =>
    request<ApiResponse<UserItem[]>>(`/get-employees-by-department/?department_id=${departmentId}`, { token }),
};
