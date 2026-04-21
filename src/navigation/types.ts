export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type MainStackParamList = {
  Dashboard: undefined;
  Users: undefined;
  Tasks:
    | {
        status?: "pending" | "resolved" | "reopen" | "closed" | null;
        startDate?: string;
        endDate?: string;
        source?: "dashboard";
        nonce?: number;
      }
    | undefined;
  UpdateProfile: undefined;
  Branches: undefined;
  Departments: undefined;
  RecentActivity: undefined;
  PrivacyPolicy: undefined;
};

export type RootStackParamList = {
  MainStack: undefined;
  UserForm: { userId?: string };
  CreateTask: undefined;
  AssignTask: { taskId: number; taskTitle: string };
};
