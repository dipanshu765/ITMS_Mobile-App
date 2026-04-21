import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { AuthStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    setSuccess("");
    if (!cleanEmail) return setError("Please enter your email address.");
    if (!emailRegex.test(cleanEmail)) return setError("Please enter a valid email address.");

    setLoading(true);
    try {
      await api.forgetPassword(cleanEmail);
      setSuccess("OTP has been sent to your email address.");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setError("");
    setSuccess("");
    setResendLoading(true);
    try {
      await api.forgetPassword(cleanEmail);
      setSuccess("OTP has been resent to your email address.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  const resetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    setSuccess("");
    if (!otp.trim()) return setError("Please enter the OTP.");
    if (!newPassword || !confirmPassword) return setError("Please enter both password fields.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters long.");

    setLoading(true);
    try {
      await api.forgetPassword(cleanEmail, otp.trim(), newPassword, confirmPassword);
      setSuccess("Password reset successful. Redirecting to login...");
      setTimeout(() => navigation.goBack(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password.");
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
        <View style={styles.card}>
          <Text style={styles.title}>{step === 1 ? "Reset Password" : step === 2 ? "Enter OTP" : "Set New Password"}</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "Enter your email to receive OTP."
              : step === 2
                ? "Enter the 4-digit code sent to your email."
                : "Create and confirm your new password."}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          {step === 1 ? (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#94A3B8" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void sendOtp()} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryTxt}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.label}>Verification Code</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="numeric" size={18} color="#94A3B8" />
                <TextInput
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Enter 4-digit OTP"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => void resendOtp()} disabled={resendLoading}>
                  <Text style={styles.secondaryTxt}>{resendLoading ? "Resending..." : "Resend OTP"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.flexBtn]}
                  onPress={() => setStep(3)}
                  disabled={!otp || otp.length !== 4}
                >
                  <Text style={styles.primaryTxt}>Verify OTP</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                  <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="lock-check-outline" size={18} color="#94A3B8" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((p) => !p)}>
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                  <Text style={styles.secondaryTxt}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, styles.flexBtn]} onPress={() => void resetPassword()} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.primaryTxt}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLinkWrap}>
            <Text style={styles.backLink}>Back to Login</Text>
          </TouchableOpacity>
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
  content: { flex: 1, justifyContent: "center", padding: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.primaryDark, marginBottom: 4 },
  subtitle: { color: colors.mutedText, marginBottom: 12 },
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
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: "#0C4DA2",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  flexBtn: { flex: 1 },
  primaryTxt: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTxt: { color: "#334155", fontWeight: "700", fontSize: 14 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  error: { color: "#B91C1C", marginBottom: 10, fontWeight: "600" },
  success: { color: "#166534", marginBottom: 10, fontWeight: "600" },
  backLinkWrap: { marginTop: 12, alignItems: "center" },
  backLink: { color: "#1D4ED8", fontWeight: "700" },
});
