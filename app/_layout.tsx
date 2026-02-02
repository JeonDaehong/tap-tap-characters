import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, View, Text, StyleSheet } from "react-native";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1a1a2e" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="collection"
          options={{
            title: "컬렉션",
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  );
}

const hStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 8,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
