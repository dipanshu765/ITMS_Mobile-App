import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { ENV } from "../config/env";
import { colors } from "../theme/colors";
import { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const checkApi = async () => {
      try {
        // Lightweight API reachability check for quick device/network diagnostics.
        const response = await fetch(`${ENV.API_BASE_URL}/get-roles/`, {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          setError("Server is not reachable right now.");
        }
      } catch {
        setError("Server is not reachable right now.");
      } finally {
        clearTimeout(timeout);
      }
    };

    void checkApi();

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  const onSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter both mobile/email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(username.trim(), password);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen} padded={false}>
      <View style={styles.topBar}>
        <View style={styles.logoWrap}>
          <Image source={require("../../assets/HTR_logo.png")} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.companyName}>Hitech Radiators Pvt. Ltd.</Text>
        <View style={styles.logoWrap}>
          <Image source={require("../../assets/HTT_logo.png")} style={styles.logo} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationCard}>
          <Image source={require("../../assets/bg.jpeg")} style={styles.illustration} resizeMode="contain" />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome To ITMS</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Mobile Number or Email</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="phone-outline" size={18} color="#94A3B8" />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your mobile number or email"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
              <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signBtn} onPress={() => void onSubmit()} disabled={loading}>
            <Text style={styles.signText}>{loading ? "Signing In..." : "Sign In"}</Text>
            {!loading && <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgot}>Forgot your password?</Text>
          </TouchableOpacity>
          <Text style={styles.footer}>© 2026 HTR | HTT Innovations. All rights reserved.</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#EFF6FF" },
  topBar: {
    backgroundColor: "#0C4DA2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  logoWrap: { backgroundColor: "#FFF", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
  logo: { width: 70, height: 38 },
  companyName: { flex: 1, color: "#FFF", fontWeight: "800", textAlign: "center", fontSize: 16 },
  content: { flex: 1, padding: 14, gap: 12 },
  illustrationCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 10,
    minHeight: 180,
    justifyContent: "center",
  },
  illustration: { width: "100%", height: 165 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.mutedText,
    marginBottom: 10,
  },
  error: { color: "#B91C1C", marginBottom: 10, fontWeight: "600" },
  label: { fontSize: 12, color: "#334155", fontWeight: "700", marginBottom: 4 },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14 },
  signBtn: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: "#0C4DA2",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  signText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  forgot: { marginTop: 10, textAlign: "center", color: "#1D4ED8", fontWeight: "700", fontSize: 12 },
  footer: { marginTop: 14, textAlign: "center", fontSize: 11, color: "#64748B" },
});
