import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import AssignTaskScreen from "../screens/AssignTaskScreen";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import StartupVideoScreen from "../screens/StartupVideoScreen";
import UserFormScreen from "../screens/UserFormScreen";
import AuthStack from "./AuthStack";
import MainStack from "./MainStack";
import { RootStackParamList } from "./types";

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const [videoDone, setVideoDone] = useState(false);

  if (!videoDone) {
    return <StartupVideoScreen onFinished={() => setVideoDone(true)} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Root.Navigator
          screenOptions={{
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Root.Screen name="MainStack" component={MainStack} options={{ headerShown: false }} />
          <Root.Screen
            name="UserForm"
            component={UserFormScreen}
            options={({ route }) => ({ title: route.params?.userId ? "Edit User" : "Add User" })}
          />
          <Root.Screen name="CreateTask" component={CreateTaskScreen} options={{ title: "Create Task" }} />
          <Root.Screen name="AssignTask" component={AssignTaskScreen} options={{ title: "Assign Task" }} />
        </Root.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
