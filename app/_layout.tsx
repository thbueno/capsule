import { ThemeProvider, useTheme } from "@/context/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { router, Stack, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const PUBLIC_ROUTES = ["/login", "/signup"];

function AuthGate() {
  const { colors } = useTheme();
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let mounted = true;

    const routeForSession = async (session: Session | null) => {
      const isPublic = PUBLIC_ROUTES.includes(pathnameRef.current);

      if (!session) {
        if (!isPublic) router.replace("/login");
        if (mounted) setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!mounted) return;

      if (!profile) {
        if (pathnameRef.current !== "/create-profile") router.replace("/create-profile");
      } else if (isPublic || pathnameRef.current === "/create-profile") {
        router.replace("/");
      }
      setChecking(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) routeForSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      } else if (event === "SIGNED_IN") {
        routeForSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthGate />
    </ThemeProvider>
  );
}
