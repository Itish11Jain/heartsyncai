import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_KEY_KEY, DEFAULT_SERVER, SERVER_URL_KEY } from "./settings";

const RECENT_KEY = "@sms-forwarder/recent";
const LAST_CLIPBOARD_KEY = "@sms-forwarder/last-clipboard";

interface ForwardedPayment {
  utr: string;
  amount: string;
  timestamp: number;
  status: "success" | "error";
}

function extractUtr(text: string): string | null {
  // HDFC format: "...from VPA xxx (UPI 606009209619)"
  const hdfcMatch = text.match(/\(UPI\s+(\d{12})\)/i);
  if (hdfcMatch?.[1]) return hdfcMatch[1];
  // Generic: after Ref/UTR keyword
  const refMatch = text.match(
    /(?:UPI\s*Ref\s*(?:No\.?\s*)?|UTR\s*(?:No\.?\s*)?|Ref\s*(?:No\.?\s*)?)(\d{12})/i,
  );
  if (refMatch?.[1]) return refMatch[1];
  // Fallback: first 12-digit sequence
  const numMatch = text.match(/\b(\d{12})\b/);
  return numMatch?.[1] ?? null;
}

function extractAmount(text: string): string | null {
  const match = text.match(/(?:Rs\.?|INR|₹)\s*(\d+(?:\.\d+)?)/i);
  return match ? `₹${match[1]}` : null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function MonitorScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [detectedUtr, setDetectedUtr] = useState<string | null>(null);
  const [detectedAmount, setDetectedAmount] = useState<string | null>(null);
  const [recent, setRecent] = useState<ForwardedPayment[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [manualUtr, setManualUtr] = useState("");
  const [showManual, setShowManual] = useState(false);
  const lastClipboardRef = useRef<string>("");

  // Load recent from storage
  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as ForwardedPayment[]);
      const last = await AsyncStorage.getItem(LAST_CLIPBOARD_KEY);
      if (last) lastClipboardRef.current = last;
    })();
  }, []);

  const checkClipboard = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text === lastClipboardRef.current) return;
      const utr = extractUtr(text);
      if (!utr) return;
      const amount = extractAmount(text) ?? "₹49";
      setDetectedUtr(utr);
      setDetectedAmount(amount);
      lastClipboardRef.current = text;
      await AsyncStorage.setItem(LAST_CLIPBOARD_KEY, text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Clipboard read can fail silently
    }
  }, []);

  // Check clipboard on focus
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkClipboard();
    });
    // Also check on mount
    void checkClipboard();
    return () => sub.remove();
  }, [checkClipboard]);

  const saveRecent = async (updated: ForwardedPayment[]) => {
    setRecent(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated.slice(0, 20)));
  };

  const forwardUtr = useCallback(
    async (utr: string, amount: string, rawSms?: string) => {
      setForwarding(true);
      try {
        const [serverUrl, apiKey] = await Promise.all([
          AsyncStorage.getItem(SERVER_URL_KEY),
          AsyncStorage.getItem(API_KEY_KEY),
        ]);
        const base = (serverUrl ?? DEFAULT_SERVER).replace(/\/$/, "");
        const key = apiKey ?? "";

        const res = await fetch(`${base}/api/internal/upi-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ utr, amount, raw_sms: rawSms }),
        });

        const ok = res.ok || res.status === 409; // 409 = already saved, still ok
        Haptics.notificationAsync(
          ok
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        );

        const entry: ForwardedPayment = {
          utr,
          amount,
          timestamp: Date.now(),
          status: ok ? "success" : "error",
        };
        await saveRecent([entry, ...recent]);

        if (ok) {
          setDetectedUtr(null);
          setDetectedAmount(null);
          setManualUtr("");
          setShowManual(false);
        } else {
          const body = await res.json().catch(() => ({})) as { message?: string };
          Alert.alert("Failed", body.message ?? `Server returned ${res.status}. Check your API key in Settings.`);
        }
      } catch {
        Alert.alert("Network Error", "Could not reach the server. Check your URL in Settings.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setForwarding(false);
      }
    },
    [recent],
  );

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payment Monitor</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ACTIVE — watching clipboard</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setShowManual((v) => !v)}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* How to use */}
      <View style={styles.instructionCard}>
        <Text style={styles.instructionTitle}>How it works</Text>
        <Text style={styles.instructionText}>
          1. Receive bank SMS for ₹49 payment{"\n"}
          2. Long-press → Copy the SMS{"\n"}
          3. Switch back to this app{"\n"}
          4. UTR auto-detected → tap Forward
        </Text>
      </View>

      {/* Detected UTR banner */}
      {detectedUtr && (
        <View style={styles.detectedCard}>
          <View style={styles.detectedInfo}>
            <Text style={styles.detectedLabel}>Payment detected</Text>
            <Text style={styles.detectedUtr}>{detectedUtr}</Text>
            <Text style={styles.detectedAmount}>{detectedAmount ?? "₹49"}</Text>
          </View>
          <View style={styles.detectedActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => void forwardUtr(detectedUtr, detectedAmount ?? "₹49")}
              disabled={forwarding}
              activeOpacity={0.8}
            >
              {forwarding ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.actionBtnPrimaryText}>Forward</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => {
                setDetectedUtr(null);
                setDetectedAmount(null);
              }}
              activeOpacity={0.8}
            >
              <Feather name="x" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Manual entry */}
      {showManual && (
        <View style={styles.manualCard}>
          <Text style={styles.manualLabel}>Enter UTR manually</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={manualUtr}
              onChangeText={(v) => setManualUtr(v.replace(/\D/g, "").slice(0, 12))}
              placeholder="12-digit UTR"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="numeric"
              maxLength={12}
            />
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnPrimary,
                manualUtr.length !== 12 && styles.actionBtnDisabled,
              ]}
              onPress={() =>
                manualUtr.length === 12 && void forwardUtr(manualUtr, "₹49")
              }
              disabled={manualUtr.length !== 12 || forwarding}
              activeOpacity={0.8}
            >
              {forwarding ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.actionBtnPrimaryText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent list */}
      <Text style={styles.recentHeading}>Recent</Text>
      <FlatList
        data={recent}
        keyExtractor={(item) => `${item.utr}-${item.timestamp}`}
        scrollEnabled={recent.length > 3}
        contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No payments forwarded yet.{"\n"}Copy a bank SMS to get started.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.recentItem}>
            <View
              style={[
                styles.recentDot,
                item.status === "error" && styles.recentDotError,
              ]}
            />
            <View style={styles.recentInfo}>
              <Text style={styles.recentUtr}>{item.utr}</Text>
              <Text style={styles.recentMeta}>
                {item.amount} · {timeAgo(item.timestamp)}
              </Text>
            </View>
            <Feather
              name={item.status === "success" ? "check-circle" : "alert-circle"}
              size={16}
              color={
                item.status === "success"
                  ? "rgba(74,222,128,0.8)"
                  : "rgba(248,113,113,0.8)"
              }
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", paddingHorizontal: 16 },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700" as const, color: "#fff" },
  statusRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ade80" },
  statusText: { fontSize: 11, color: "rgba(74,222,128,0.8)", fontWeight: "600" as const, letterSpacing: 0.5 },
  manualBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  instructionCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    marginBottom: 12,
  },
  instructionTitle: { fontSize: 12, color: "rgba(255,215,0,0.7)", fontWeight: "700" as const, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" as const },
  instructionText: { fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 22 },
  detectedCard: {
    backgroundColor: "rgba(255,215,0,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    padding: 16,
    marginBottom: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  detectedInfo: { flex: 1 },
  detectedLabel: { fontSize: 11, color: "rgba(255,215,0,0.6)", fontWeight: "700" as const, textTransform: "uppercase" as const, marginBottom: 4 },
  detectedUtr: { fontSize: 18, fontWeight: "700" as const, color: "#fff", letterSpacing: 1 },
  detectedAmount: { fontSize: 13, color: "rgba(255,215,0,0.7)", marginTop: 2 },
  detectedActions: { flexDirection: "row" as const, gap: 8 },
  actionBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: 10,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  actionBtnPrimary: { backgroundColor: "#FFD700" },
  actionBtnPrimaryText: { fontWeight: "700" as const, color: "#000", fontSize: 14 },
  actionBtnSecondary: { backgroundColor: "rgba(255,255,255,0.07)", width: 40, paddingHorizontal: 0 },
  actionBtnDisabled: { backgroundColor: "rgba(255,255,255,0.07)" },
  manualCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    marginBottom: 12,
  },
  manualLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 },
  manualRow: { flexDirection: "row" as const, gap: 8 },
  manualInput: {
    flex: 1, height: 40, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 16, fontWeight: "700" as const,
    paddingHorizontal: 14, letterSpacing: 1,
  },
  recentHeading: { fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 10 },
  recentItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  recentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(74,222,128,0.6)" },
  recentDotError: { backgroundColor: "rgba(248,113,113,0.6)" },
  recentInfo: { flex: 1 },
  recentUtr: { fontSize: 15, color: "#fff", fontWeight: "600" as const },
  recentMeta: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 },
  emptyText: { fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center" as const, lineHeight: 22, marginTop: 24 },
});
