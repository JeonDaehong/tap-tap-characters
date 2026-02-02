import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Dimensions, Pressable } from "react-native";
import { Achievement } from "../data/achievements";

const { width: SCREEN_W } = Dimensions.get("window");

interface Props {
  achievement: Achievement | null;
  onDone: () => void;
}

const EMOJIS = ["🎉", "🎊", "✨", "💫", "🌟", "⭐", "🏆", "🥳"];

export default function AchievementCelebration({ achievement, onDone }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    EMOJIS.map(() => ({
      y: new Animated.Value(-60),
      x: new Animated.Value(0),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!achievement) return;

    bgOpacity.setValue(0);
    opacity.setValue(1);
    scale.setValue(0);
    confettiAnims.forEach((a) => {
      a.y.setValue(-60);
      a.opacity.setValue(1);
      a.rotate.setValue(0);
    });

    // Background fade in
    Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    // Card spring in
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();

    // Confetti fall
    confettiAnims.forEach((a, i) => {
      a.x.setValue(Math.random() * SCREEN_W - SCREEN_W / 2);
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.parallel([
          Animated.timing(a.y, { toValue: 500, duration: 1800, useNativeDriver: true }),
          Animated.timing(a.rotate, { toValue: 3, duration: 1800, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(1200),
            Animated.timing(a.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

  }, [achievement]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone());
  };

  if (!achievement) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: bgOpacity }]} pointerEvents="auto">
      {/* Confetti */}
      {confettiAnims.map((a, i) => (
        <Animated.Text
          key={i}
          style={[
            s.confetti,
            {
              opacity: a.opacity,
              transform: [
                { translateX: a.x },
                { translateY: a.y },
                {
                  rotate: a.rotate.interpolate({
                    inputRange: [0, 3],
                    outputRange: ["0deg", "720deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {EMOJIS[i]}
        </Animated.Text>
      ))}

      {/* Card */}
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        <Text style={s.badge}>업적 달성!</Text>
        <Text style={s.icon}>{achievement.icon}</Text>
        <Text style={s.title}>{achievement.title}</Text>
        <Text style={s.desc}>{achievement.description}</Text>
        <Pressable style={s.closeBtn} onPress={handleClose}>
          <Text style={s.closeBtnText}>확인</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  confetti: {
    position: "absolute",
    fontSize: 28,
    top: 40,
    alignSelf: "center",
  },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
    width: 280,
  },
  badge: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  icon: {
    fontSize: 52,
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  desc: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: "#FFD700",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeBtnText: {
    color: "#1a1a2e",
    fontSize: 15,
    fontWeight: "bold",
  },
});
