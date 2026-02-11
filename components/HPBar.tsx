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
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  label: {
    fontSize: 14,
  },
  barOuter: {
    width: 120,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    padding: 2,
  },
  barBg: {
    flex: 1,
    borderRadius: 7,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  shine: {
    position: "absolute",
    top: 2,
    left: 6,
    right: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  text: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "bold",
    minWidth: 26,
    textAlign: "right",
  },
});
