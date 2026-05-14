import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export const SERVER_URL_KEY = "@sms-forwarder/server-url";
export const API_KEY_KEY = "@sms-forwarder/api-key";
export const DEFAULT_SERVER = "https://heartsync.in";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [url, key] = await Promise.all([
        AsyncStorage.getItem(SERVER_URL_KEY),
        AsyncStorage.getItem(API_KEY_KEY),
      ]);
      if (url) setServerUrl(url);
      if (key) setApiKey(key);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    await Promise.all([
      AsyncStorage.setItem(SERVER_URL_KEY, serverUrl.trim()),
      AsyncStorage.setItem(API_KEY_KEY, apiKey.trim()),
    ]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [serverUrl, apiKey]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const url = (serverUrl.trim() || DEFAULT_SERVER).replace(/\/$/, "");
      const res = await fetch(`${url}/api/healthz`);
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Connected ✓", "Server is reachable.");
      } else {
        Alert.alert("Error", `Server returned ${res.status}`);
      }
    } catch {
      Alert.alert("Failed", "Could not reach the server. Check the URL.");
    } finally {
      setTesting(false);
    }
  }, [serverUrl]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 16, paddingBottom: (isWeb ? 34 : insets.bottom) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.label}>HeartSync Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder={DEFAULT_SERVER}
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>Default: {DEFAULT_SERVER}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Admin API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Paste your admin secret key"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>Found in your server environment as ADMIN_SECRET</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Feather name={saved ? "check" : "save"} size={18} color="#000" />
          <Text style={styles.btnPrimaryText}>{saved ? "Saved!" : "Save Settings"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={handleTest}
          disabled={testing}
          activeOpacity={0.8}
        >
          {testing ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
          ) : (
            <Feather name="wifi" size={18} color="rgba(255,255,255,0.7)" />
          )}
          <Text style={styles.btnSecondaryText}>
            {testing ? "Testing…" : "Test Connection"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0f0f1a" },
  container: { paddingHorizontal: 20 },
  heading: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#fff",
    marginBottom: 28,
  },
  section: { marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(255,215,0,0.8)",
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
  },
  hint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 6,
  },
  btn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: "#FFD700",
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#000",
  },
  btnSecondary: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.7)",
  },
});
