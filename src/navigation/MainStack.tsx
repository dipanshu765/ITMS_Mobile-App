import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BranchesScreen from "../screens/BranchesScreen";
import DashboardScreen from "../screens/DashboardScreen";
import DepartmentsScreen from "../screens/DepartmentsScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import RecentActivityScreen from "../screens/RecentActivityScreen";
import TaskListScreen from "../screens/TaskListScreen";
import UpdateProfileScreen from "../screens/UpdateProfileScreen";
import UserListScreen from "../screens/UserListScreen";
import { MainStackParamList } from "./types";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Users" component={UserListScreen} />
      <Stack.Screen name="Tasks" component={TaskListScreen} />
      <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} />
      <Stack.Screen name="Branches" component={BranchesScreen} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="RecentActivity" component={RecentActivityScreen} />
      <Stack.Screen
        name="PrivacyPolicy"
        children={() => (
          <PlaceholderScreen
            title="Privacy Policy"
            description="Privacy policy content screen placeholder aligned with the web menu flow."
          />
        )}
      />
    </Stack.Navigator>
  );
}
