import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";

interface DialogueBubbleProps {
  text: string;
  onDone: () => void;
}

export default function DialogueBubble({ text, onDone }: DialogueBubbleProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDone());
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.bubble, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.text}>{text}</Text>
      <View style={styles.triangle} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    top: -50,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: { color: "#333", fontSize: 14, fontWeight: "bold" },
  triangle: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
});
