import { View, Text, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function Index() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login" as any);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome! You're logged in.</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
