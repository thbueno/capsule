import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// On native there is no localStorage, so sessions must be persisted in
// AsyncStorage explicitly — without this the user is logged out on every
// app restart. On web the SDK's default (localStorage) is fine.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth:
    Platform.OS === "web"
      ? undefined
      : {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
});
