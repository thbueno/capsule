import { useTheme } from "@/context/ThemeProvider";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FilterPillsProps<T extends string> {
  options: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}

/** The "all | capsules | moments" pill switcher from the designs. */
export function FilterPills<T extends string>({ options, active, onChange }: FilterPillsProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.pill,
              { borderColor: isActive ? colors.title : colors.border },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.title : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
});
