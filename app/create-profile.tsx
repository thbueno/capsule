import { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function CreateProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    console.log("User:", user); // Make sure this is NOT null

    if (!user) {
      Alert.alert("Not logged in");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("profiles").insert([
      {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        username,
        handle,
        avatar_url: null,
      },
    ]);

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      router.replace("/" as any);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Profile</Text>

      <TextInput value={firstName} onChangeText={setFirstName} placeholder="First Name" style={styles.input} />
      <TextInput value={lastName} onChangeText={setLastName} placeholder="Last Name" style={styles.input} />
      <TextInput value={username} onChangeText={setUsername} placeholder="Username" style={styles.input} />
      <TextInput value={handle} onChangeText={setHandle} placeholder="Handle (e.g. @yourname)" style={styles.input} autoCapitalize="none" />

      <Button title={loading ? "Creating..." : "Create Profile"} onPress={handleCreateProfile} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
  },
});
