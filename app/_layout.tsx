import { ThemeProvider } from "@/context/ThemeProvider"; // adjust path
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        // handle redirect logic (same as your code)...
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    handleAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack />
    </ThemeProvider>
  );
}
