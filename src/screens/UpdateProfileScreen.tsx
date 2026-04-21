import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { colors } from "../theme/colors";

type FormState = {
  name: string;
  mobile: string;
  email: string;
  password: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const initialForm: FormState = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export default function UpdateProfileScreen() {
  const isFocused = useIsFocused();
  const { token, user } = useAuth();

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const setField = (key: keyof FormState, val: string) => {
    const nextVal =
      key === "mobile"
        ? val.replace(/\D/g, "").slice(0, 10)
        : key === "pincode"
          ? val.replace(/\D/g, "").slice(0, 10)
          : val;
    setForm((f) => ({ ...f, [key]: nextVal }));
    if (formErrors[key]) setFormErrors((e) => ({ ...e, [key]: "" }));
  };

  const loadProfile = useCallback(async () => {
    if (!token || !user?.user_id) return;
    setLoadingProfile(true);
    setError(null);
    try {
      const result = await api.getUser(token, user.user_id);
      if (result.status !== 200) throw new Error(result.message || "Failed to fetch profile");
      const d = result.data || ({} as any);
      setForm({
        name: d.name || "",
        mobile: d.mobile || "",
        email: d.email || "",
        password: d.password || "",
        address: d.address || "",
        city: d.city || "",
        state: d.state || "",
        pincode: d.pincode || "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch profile data");
    } finally {
      setLoadingProfile(false);
    }
  }, [token, user?.user_id]);

  useEffect(() => {
    if (!isFocused) return;
    void loadProfile();
  }, [isFocused, loadProfile]);

  const validate = () => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.mobile.trim()) errors.mobile = "Mobile is required";
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) errors.mobile = "Mobile must be exactly 10 digits";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email format";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async () => {
    if (!token || !user?.user_id) return;
    if (!validate()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
      };
      if (form.password.trim()) body.password = form.password;
      const result = await api.updateUser(token, user.user_id, body);
      if (result.status !== 200) throw new Error(result.message || "Failed to update profile");
      setSuccess(result.message || "Profile updated successfully");
      await loadProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Update Profile" hideUserAvatar>
      <View style={styles.card}>
        {success ? (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#166534" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#991B1B" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loadingProfile ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Field
          label="Name *"
          value={form.name}
          onChange={(v) => setField("name", v)}
          placeholder="Enter full name"
          error={formErrors.name}
        />
        <Field
          label="Mobile *"
          value={form.mobile}
          onChange={(v) => setField("mobile", v)}
          placeholder="Enter 10-digit mobile number"
          keyboardType="phone-pad"
          error={formErrors.mobile}
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(v) => setField("email", v)}
          placeholder="Enter email address"
          keyboardType="email-address"
          error={formErrors.email}
        />

        <Text style={styles.label}>Password (leave blank to keep current)</Text>
        <View style={[styles.inputWrap, formErrors.password ? styles.inputError : null]}>
          <TextInput
            value={form.password}
            onChangeText={(v) => setField("password", v)}
            placeholder="Enter new password (optional)"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setShowPassword((x) => !x)}>
            <MaterialCommunityIcons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Address Information</Text>
        <Field
          label="Address"
          value={form.address}
          onChange={(v) => setField("address", v)}
          placeholder="Enter address"
          multiline
        />
        <View style={styles.row2}>
          <View style={styles.rowCol}>
            <Field label="City" value={form.city} onChange={(v) => setField("city", v)} placeholder="Enter city" />
          </View>
          <View style={styles.rowCol}>
            <Field label="State" value={form.state} onChange={(v) => setField("state", v)} placeholder="Enter state" />
          </View>
        </View>
        <Field
          label="Pincode"
          value={form.pincode}
          onChange={(v) => setField("pincode", v)}
          placeholder="Enter pincode"
          keyboardType="phone-pad"
        />

        <TouchableOpacity style={styles.submitBtn} onPress={() => void onSubmit()} disabled={saving || loadingProfile}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="account-edit-outline" size={17} color="#FFFFFF" />
              <Text style={styles.submitTxt}>Update Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  error,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  error?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null, multiline ? styles.inputMultiWrap : null]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={[styles.input, multiline ? styles.inputMulti : null]}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
      {error ? <Text style={styles.errMsg}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  successText: { color: "#166534", flex: 1, fontSize: 13, fontWeight: "600" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: { color: "#991B1B", flex: 1, fontSize: 13, fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  loadingText: { color: colors.mutedText, fontSize: 13, fontWeight: "600" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  fieldWrap: { marginBottom: 10 },
  label: { fontSize: 12, color: "#334155", fontWeight: "700", marginBottom: 4 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    minHeight: 42,
  },
  inputError: { borderColor: "#FCA5A5" },
  input: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 9 },
  inputMultiWrap: { minHeight: 92, alignItems: "flex-start" },
  inputMulti: { minHeight: 80, paddingTop: 9 },
  errMsg: { color: "#B91C1C", fontSize: 12, marginTop: 3, fontWeight: "600" },
  row2: { flexDirection: "row", gap: 8 },
  rowCol: { flex: 1 },
  submitBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  submitTxt: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
