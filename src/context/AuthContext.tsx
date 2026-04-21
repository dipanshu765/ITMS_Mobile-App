import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "mobile_token";
const USER_KEY = "mobile_user";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const login = async (username: string, password: string) => {
    const result = await api.login(username, password);
    // Support both direct and nested payload shapes from backend.
    const resultAny = result as unknown as {
      status?: number;
      message?: string;
      data?: { access_token?: string; role_id?: number } & Record<string, unknown>;
    };
    const payload = (resultAny.data?.access_token
      ? resultAny.data
      : (resultAny.data?.data as typeof resultAny.data | undefined)) as
      | ({ access_token?: string; role_id?: number } & Record<string, unknown>)
      | undefined;

    if (resultAny.status !== 200 || !payload?.access_token) {
      throw new Error(resultAny.message || "Login failed");
    }

    const accessToken = payload.access_token;
    const userPayload: AuthUser = {
      user_id: String(payload.user_id ?? ""),
      name: String(payload.name ?? ""),
      email: payload.email ? String(payload.email) : undefined,
      mobile: payload.mobile ? String(payload.mobile) : undefined,
      role: payload.role ? String(payload.role) : undefined,
      branches: Array.isArray(payload.branches) ? (payload.branches as AuthUser["branches"]) : [],
      departments: Array.isArray(payload.departments) ? (payload.departments as AuthUser["departments"]) : [],
      access_token: accessToken,
      role_id: Number(payload.role_id ?? 4) as AuthUser["role_id"],
    };

    setToken(accessToken);
    setUser(userPayload);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userPayload));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
