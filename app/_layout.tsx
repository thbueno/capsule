import { Stack, usePathname, router } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { View, Text } from "react-native";

export default function Layout() {
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const handleAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        const isPublicRoute = ["/login", "/signup"].includes(pathname);
        
        // Not logged in - redirect to login (unless already there)
        if (!session) {
          if (!isPublicRoute) {
            router.replace("/login");
          }
          setLoading(false);
          return;
        }

        // Logged in on public route - check profile and redirect
        if (isPublicRoute) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!mounted) return;

          if (profile) {
            router.replace("/");
          } else {
            router.replace("/create-profile");
          }
          return;
        }

        // Logged in on protected route - just stop loading
        setLoading(false);

      } catch (error) {
        console.error("Auth error:", error);
        if (mounted) setLoading(false);
      }
    };

    handleAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        router.replace("/login");
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profile) {
          router.replace("/");
        } else {
          router.replace("/create-profile");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <Stack />;
}