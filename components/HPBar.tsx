import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

interface HPBarProps {
  current: number;
  max?: number;
}

export default function HPBar({ current, max = 100 }: HPBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const animWidth = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const color = pct > 50 ? "#4AE06A" : pct > 20 ? "#FFB830" : "#FF4757";
  const glowColor = pct > 50 ? "#2ecc71" : pct > 20 ? "#f39c12" : "#e74c3c";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>❤️</Text>
      <View style={styles.barOuter}>
        <View style={styles.barBg}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: color,
                width: animWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                shadowColor: glowColor,
              },
            ]}
          />
          {/* Shine effect */}
          <View style={styles.shine} />
        </View>
      </View>
      <Text style={styles.text}>{current}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontSize: 14,
  },
  barOuter: {
    width: 80,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#444",
    overflow: "hidden",
    padding: 1,
  },
  barBg: {
    flex: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  shine: {
    position: "absolute",
    top: 1,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  text: {
    color: "#ccc",
    fontSize: 11,
    fontWeight: "bold",
    minWidth: 22,
  },
});
