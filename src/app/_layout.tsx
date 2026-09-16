import { Stack } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function RootLayout() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      {showBanner && (
        <View
          style={{
            backgroundColor: "#1e293b",
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: "#334155",
            zIndex: 99999,
          }}
        >
          <Text style={{ color: "#f8fafc", fontSize: 13, flex: 1 }}>
            💡 <Text style={{ fontWeight: "bold" }}>Pro Tip:</Text> Para sa
            smooth at ad-free streaming, iminumungkahi naming gamitin ang{" "}
            <Text style={{ fontWeight: "bold", color: "#ff7a00" }}>
              Brave Browser
            </Text>
            .
          </Text>
          <TouchableOpacity
            onPress={() => setShowBanner(false)}
            style={{ paddingLeft: 10 }}
          >
            <Text
              style={{ color: "#94a3b8", fontWeight: "bold", fontSize: 16 }}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
