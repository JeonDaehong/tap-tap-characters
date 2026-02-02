import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";
import CuteCat from "./CuteCat";
import { CatData, GRADE_CONFIG, CatGrade } from "../data/cats";

const { width: SCREEN_W } = Dimensions.get("window");

interface GachaModalProps {
  visible: boolean;
  cat: CatData | null;
  isNew: boolean;
  forced?: boolean;
  onClose: () => void;
  onTutorialStart?: (cat: CatData) => void;
}

const GRADE_BORDER: Record<CatGrade, string> = {
  C: "#888888",
  B: "#6B9BD1",
  A: "#9B6BD1",
  S: "#FFD700",
  SS: "#FF69B4",
  SSS: "#FF4444",
};

const SPARKLE_EMOJIS = ["✨", "⭐", "💫", "🌟", "✨", "⭐"];

export default function GachaModal({
  visible,
  cat,
  isNew,
  forced = false,
  onClose,
  onTutorialStart,
}: GachaModalProps) {
  const [phase, setPhase] = useState<"buildup" | "explode" | "reveal">("buildup");

  const boxScale = useRef(new Animated.Value(0)).current;
  const boxRotate = useRef(new Animated.Value(0)).current;
  const heartbeatScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const suspenseOpacity = useRef(new Animated.Value(0)).current;
  const explodeScale = useRef(new Animated.Value(0)).current;
  const explodeOpacity = useRef(new Animated.Value(0)).current;
  const revealScale = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const bgFlash = useRef(new Animated.Value(0)).current;
  const sparkleAnims = useRef(
    SPARKLE_EMOJIS.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    }))
  ).current;

  const drumrollRef = useRef<Audio.Sound | null>(null);
  const revealSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { sound: dr } = await Audio.Sound.createAsync(
          require("../assets/sfx/drumroll.wav"),
          { volume: 0.5 }
        );
        drumrollRef.current = dr;
        const { sound: rv } = await Audio.Sound.createAsync(
          require("../assets/sfx/reveal.wav"),
          { volume: 0.6 }
        );
        revealSoundRef.current = rv;
      } catch {}
    })();
    return () => {
      drumrollRef.current?.unloadAsync();
      revealSoundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (!visible || !cat) return;

    setPhase("buildup");
    boxScale.setValue(0);
    boxRotate.setValue(0);
    heartbeatScale.setValue(1);
    glowOpacity.setValue(0);
    suspenseOpacity.setValue(0);
    explodeScale.setValue(0);
    explodeOpacity.setValue(0);
    revealScale.setValue(0);
    revealOpacity.setValue(0);
    bgFlash.setValue(0);
    sparkleAnims.forEach(a => {
      a.scale.setValue(0);
      a.opacity.setValue(0);
    });

    // Play drumroll
    drumrollRef.current?.setPositionAsync(0).then(() => {
      drumrollRef.current?.playAsync();
    }).catch(() => {});

    // Phase 1: Box appears (0-300ms)
    Animated.spring(boxScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

    // Suspense text fades in
    Animated.timing(suspenseOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }).start();

    // Heartbeat: accelerating pulse (300ms - 2500ms)
    let beatCount = 0;
    const startHeartbeat = () => {
      const interval = Math.max(150, 500 - beatCount * 40);
      beatCount++;
      if (beatCount > 12) return;

      Animated.sequence([
        Animated.timing(heartbeatScale, { toValue: 1.15, duration: interval * 0.3, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(heartbeatScale, { toValue: 0.95, duration: interval * 0.2, useNativeDriver: true }),
        Animated.timing(heartbeatScale, { toValue: 1.08, duration: interval * 0.2, useNativeDriver: true }),
        Animated.timing(heartbeatScale, { toValue: 1, duration: interval * 0.3, useNativeDriver: true }),
      ]).start(() => startHeartbeat());
    };
    const hbTimer = setTimeout(startHeartbeat, 300);

    // Shake intensifies over time
    const shakeTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(boxRotate, { toValue: 1, duration: 40, useNativeDriver: true }),
          Animated.timing(boxRotate, { toValue: -1, duration: 40, useNativeDriver: true }),
          Animated.timing(boxRotate, { toValue: 0.5, duration: 30, useNativeDriver: true }),
          Animated.timing(boxRotate, { toValue: -0.5, duration: 30, useNativeDriver: true }),
          Animated.timing(boxRotate, { toValue: 0, duration: 20, useNativeDriver: true }),
        ]),
        { iterations: 8 }
      ).start();
    }, 800);

    // Glow builds up
    Animated.timing(glowOpacity, { toValue: 1, duration: 2000, delay: 500, useNativeDriver: true }).start();

    // Phase 2: Explosion (2500ms)
    const t1 = setTimeout(() => {
      setPhase("explode");
      drumrollRef.current?.stopAsync().catch(() => {});
      revealSoundRef.current?.setPositionAsync(0).then(() => {
        revealSoundRef.current?.playAsync();
      }).catch(() => {});

      // Background flash
      bgFlash.setValue(1);
      Animated.timing(bgFlash, { toValue: 0, duration: 500, useNativeDriver: true }).start();

      explodeOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(explodeScale, { toValue: 4, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(explodeOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 2500);

    // Phase 3: Reveal (3200ms)
    const t2 = setTimeout(() => {
      setPhase("reveal");

      Animated.parallel([
        Animated.spring(revealScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(revealOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Sparkles burst out
      sparkleAnims.forEach((a, i) => {
        const angle = (i / SPARKLE_EMOJIS.length) * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        a.x.setValue(0);
        a.y.setValue(0);
        a.opacity.setValue(1);
        Animated.parallel([
          Animated.timing(a.x, { toValue: Math.cos(angle) * dist, duration: 600, useNativeDriver: true }),
          Animated.timing(a.y, { toValue: Math.sin(angle) * dist, duration: 600, useNativeDriver: true }),
          Animated.spring(a.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(a.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }, 3200);

    return () => {
      clearTimeout(hbTimer);
      clearTimeout(shakeTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      drumrollRef.current?.stopAsync().catch(() => {});
    };
  }, [visible, cat]);

  if (!cat) return null;

  const gradeConfig = GRADE_CONFIG[cat.grade];
  const borderColor = GRADE_BORDER[cat.grade];
  const isHighGrade = ["S", "SS", "SSS"].includes(cat.grade);

  const rotate = boxRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-12deg", "0deg", "12deg"],
  });

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        {/* Background flash */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#fff", opacity: bgFlash, zIndex: 0 },
          ]}
          pointerEvents="none"
        />

        <View style={[styles.modal, { borderColor }]}>
          {/* Phase 1: Buildup */}
          {phase === "buildup" && (
            <Animated.View style={{
              transform: [{ scale: Animated.multiply(boxScale, heartbeatScale) }, { rotate }],
              alignItems: "center",
              paddingVertical: 40,
            }}>
              {/* Glow behind box */}
              <Animated.View style={[styles.glow, { opacity: glowOpacity, backgroundColor: borderColor }]} />
              <Text style={{ fontSize: 90 }}>🎁</Text>
              <Animated.Text style={[styles.suspenseText, { opacity: suspenseOpacity }]}>
                두근두근...
              </Animated.Text>
              <Animated.View style={[styles.dotContainer, { opacity: suspenseOpacity }]}>
                {[0, 1, 2].map(i => (
                  <Animated.Text
                    key={i}
                    style={[styles.dot, {
                      opacity: suspenseOpacity,
                    }]}
                  >
                    💓
                  </Animated.Text>
                ))}
              </Animated.View>
            </Animated.View>
          )}

          {/* Phase 2: Explosion */}
          {phase === "explode" && (
            <View style={{ alignItems: "center", paddingVertical: 50, justifyContent: "center" }}>
              <Animated.Text style={{
                fontSize: 80,
                opacity: explodeOpacity,
                transform: [{ scale: explodeScale }],
              }}>
                💥
              </Animated.Text>
            </View>
          )}

          {/* Phase 3: Reveal */}
          {phase === "reveal" && (
            <Animated.View style={[styles.result, { opacity: revealOpacity, transform: [{ scale: revealScale }] }]}>
              {/* Sparkles */}
              {sparkleAnims.map((a, i) => (
                <Animated.Text
                  key={i}
                  style={{
                    position: "absolute",
                    fontSize: 24,
                    opacity: a.opacity,
                    transform: [{ translateX: a.x }, { translateY: a.y }, { scale: a.scale }],
                  }}
                >
                  {SPARKLE_EMOJIS[i]}
                </Animated.Text>
              ))}

              <Text style={[styles.gradeBadge, { backgroundColor: gradeConfig.color }]}>
                {gradeConfig.label}
              </Text>
              <View style={styles.catContainer}>
                {cat.thumbnail ? (
                  <Image source={cat.thumbnail} style={{ width: 130, height: 130 }} resizeMode="contain" />
                ) : (
                  <CuteCat colors={cat.colors} size={130} />
                )}
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catDesc}>{cat.description}</Text>
              {isNew ? (
                <Text style={styles.newBadge}>✨ NEW!</Text>
              ) : (
                <Text style={styles.dupeBadge}>이미 보유 중</Text>
              )}

              {forced && onTutorialStart ? (
                <Pressable style={[styles.startButton, { backgroundColor: gradeConfig.color }]} onPress={() => onTutorialStart(cat)}>
                  <Text style={styles.startButtonText}>이 캐릭터로 시작!</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>확인</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 30,
    width: 310,
    alignItems: "center",
    borderWidth: 3,
    minHeight: 280,
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.3,
  },
  suspenseText: {
    fontSize: 18,
    color: "#ccc",
    marginTop: 14,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  dotContainer: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  dot: {
    fontSize: 18,
  },
  result: {
    alignItems: "center",
  },
  gradeBadge: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
  },
  catContainer: {
    marginVertical: 8,
  },
  catName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  catDesc: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  newBadge: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "bold",
    marginTop: 10,
  },
  dupeBadge: {
    fontSize: 14,
    color: "#888",
    marginTop: 10,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#333",
    paddingHorizontal: 44,
    paddingVertical: 13,
    borderRadius: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  startButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
