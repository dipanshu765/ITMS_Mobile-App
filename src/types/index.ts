export type RoleId = 1 | 2 | 3 | 4;

export interface Branch {
  id: number;
  name: string;
}

/** Full branch row from `get-branches/` (web Branch Management). */
export interface BranchDetail extends Branch {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_main?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface Department {
  id: number;
  name: string;
}

/** Department row from `get-departments/` including linked branches. */
export interface DepartmentDetail extends Department {
  is_active?: boolean;
  branch_id?: number;
  branch_name?: string;
  branches?: Branch[];
  organization_name?: string;
  created_at?: string;
}

export interface ActivityItem {
  id: number;
  module_name: string;
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface RecentActivityPagination {
  current_page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export type RecentActivitiesApiResponse = ApiResponse<ActivityItem[]> & {
  pagination?: RecentActivityPagination;
};

export interface Role {
  id: number;
  name: string;
}

export interface AuthUser {
  user_id: string;
  name: string;
  email?: string;
  mobile?: string;
  role_id: RoleId;
  role?: string;
  branches?: Branch[];
  departments?: Department[];
  access_token?: string;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface DashboardData {
  organization_count?: number;
  branch_count?: number;
  user_count?: number;
  start_date?: string;
  end_date?: string;
  start_date_display?: string;
  end_date_display?: string;
  recent_activities?: Array<{
    module_name: string;
    created_by?: string | null;
    created_at?: string;
  }>;
  user_counts?: {
    total_users?: number;
    total_departments?: number;
  };
  day_wise_stats?: Array<Record<string, unknown>>;
  branch_wise_stats?: Array<Record<string, unknown>>;
  department_wise_stats?: Array<Record<string, unknown>>;
  task_stats?: {
    total?: number;
    total_tasks?: number;
    tasks_created_by_user?: number;
    tasks_assigned_to_user?: number;
    status_breakdown?: Record<string, number>;
    priority_breakdown?: Record<string, number>;
  };
}

export interface UserItem {
  user_id: string;
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  designation?: string;
  role_id?: number;
  role_name?: string;
  is_active?: boolean;
  branches?: Branch[];
  departments?: Department[];
}

/** Matches web `UserList` API payload (`summary`, `pagination` alongside `data`). */
export interface UserListSummaryByRole {
  role_name: string;
  count: number;
}

export interface UserListSummary {
  total_users: number;
  by_role: UserListSummaryByRole[];
}

export interface UserListPagination {
  total_count: number;
  total_pages: number;
}

export type UserListApiResponse = ApiResponse<UserItem[]> & {
  summary?: UserListSummary;
  pagination?: UserListPagination;
  download_url?: string;
};

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  branch?: Branch | null;
  department?: Department | null;
  task_type?: { id: number; name: string } | null;
  created_by?: { user_id: string; name: string } | null;
  assigned_to_user?: { user_id: string; name: string } | null;
  assigned_to_department?: Department | null;
  task_sub_type?: { id: number; name: string } | null;
  created_at?: string;
  remarks?: string;
  time_taken?: string;
  attachments?: Array<{
    id?: number | string;
    file_name?: string;
    file_path?: string;
    url?: string;
    file_type?: string;
    file_size?: number;
    uploaded_at?: string;
  }>;
  responses?: Array<{
    id: number | string;
    message?: string;
    response_type?: string;
    created_at?: string;
    created_by?: { user_id?: string; name?: string } | null;
    old_status?: string;
    new_status?: string;
    new_assigned_user?: { user_id?: string; name?: string } | null;
    new_assigned_department?: { id?: number; name?: string } | null;
    attachments?: Array<{
      id?: number | string;
      file_name?: string;
      file_path?: string;
      file_type?: string;
      file_size?: number;
      uploaded_at?: string;
    }>;
  }>;
  status_history?: Array<{
    id: number | string;
    old_status?: string;
    new_status?: string;
    changed_at?: string;
    time_in_status?: string;
    remarks?: string;
    changed_by?: { user_id?: string; name?: string } | null;
  }>;
  assignment_history?: Array<{
    id: number | string;
    changed_at?: string;
    remarks?: string;
    changed_by?: { user_id?: string; name?: string } | null;
    old_assigned_user?: { user_id?: string; name?: string } | null;
    new_assigned_user?: { user_id?: string; name?: string } | null;
    old_assigned_department?: { id?: number; name?: string } | null;
    new_assigned_department?: { id?: number; name?: string } | null;
  }>;
}

/** Task list API returns counts at root when not downloading. */
export type TasksListApiResponse = ApiResponse<TaskItem[]> & {
  total?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
  download_url?: string;
};
