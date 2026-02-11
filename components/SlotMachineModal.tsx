import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { Audio } from "expo-av";

interface SlotMachineModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (medals: number) => void;
  coins: number;
}

const SLOT_COST = 100;

export default function SlotMachineModal({
  visible,
  onClose,
  onResult,
  coins,
}: SlotMachineModalProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [resultMedals, setResultMedals] = useState(0);
  const [displayNumbers, setDisplayNumbers] = useState([0, 0, 0]);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const reelGlow = useRef(new Animated.Value(0)).current;

  const drumrollRef = useRef<Audio.Sound | null>(null);
  const revealRef = useRef<Audio.Sound | null>(null);

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
        revealRef.current = rv;
      } catch {}
    })();
    return () => {
      drumrollRef.current?.unloadAsync();
      revealRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setPhase("idle");
      setResultMedals(0);
      setDisplayNumbers([0, 0, 0]);
      resultScale.setValue(0);
      resultOpacity.setValue(0);
      flashOpacity.setValue(0);
      reelGlow.setValue(0);
    }
  }, [visible]);

  const handleSpin = () => {
    if (coins < SLOT_COST || phase !== "idle") return;

    const medals = Math.floor(Math.random() * 100) + 1; // 1~100
    setResultMedals(medals);
    setPhase("spinning");

    // Play drumroll
    drumrollRef.current?.setPositionAsync(0).then(() => {
      drumrollRef.current?.playAsync();
    }).catch(() => {});

    // Reel glow pulse during spin
    Animated.loop(
      Animated.sequence([
        Animated.timing(reelGlow, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(reelGlow, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]),
      { iterations: 5 }
    ).start();

    // Simulate spinning numbers
    const digits = [
      Math.floor(medals / 100) % 10,
      Math.floor(medals / 10) % 10,
      medals % 10,
    ];

    let tick = 0;
    const maxTicks = 30;
    const interval = setInterval(() => {
      tick++;
      const speed = tick / maxTicks;

      if (tick < maxTicks * 0.6) {
        // All spinning fast
        setDisplayNumbers([
          Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 10),
        ]);
      } else if (tick < maxTicks * 0.75) {
        // First digit settled
        setDisplayNumbers([
          digits[0],
          Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 10),
        ]);
      } else if (tick < maxTicks * 0.9) {
        // Second digit settled
        setDisplayNumbers([
          digits[0],
          digits[1],
          Math.floor(Math.random() * 10),
        ]);
      } else {
        // All settled
        setDisplayNumbers(digits);
      }

      if (tick >= maxTicks) {
        clearInterval(interval);
        setDisplayNumbers(digits);

        // Stop drumroll, play reveal
        drumrollRef.current?.stopAsync().catch(() => {});
        revealRef.current?.setPositionAsync(0).then(() => {
          revealRef.current?.playAsync();
        }).catch(() => {});

        // Flash effect
        flashOpacity.setValue(1);
        Animated.timing(flashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();

        // Show result
        setPhase("result");
        Animated.parallel([
          Animated.spring(resultScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
          Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    }, 80 + tick * 3);
  };

  const handleCollect = () => {
    onResult(resultMedals);
    setPhase("idle");
  };

  const canSpin = coins >= SLOT_COST && phase === "idle";

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        {/* Flash */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#FFD700", opacity: flashOpacity, zIndex: 0 }]}
          pointerEvents="none"
        />

        <View style={styles.modal}>
          <Text style={styles.title}>👑 황금왕관 뽑기</Text>
          <Text style={styles.subtitle}>1000 코인으로 황금을 획득하세요!</Text>

          {/* Slot Reels */}
          <Animated.View style={[styles.reelContainer, {
            shadowOpacity: reelGlow,
          }]}>
            {displayNumbers.map((num, i) => (
              <View key={i} style={styles.reel}>
                <Text style={[
                  styles.reelNumber,
                  phase === "spinning" && styles.reelNumberSpinning,
                ]}>
                  {num}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Result */}
          {phase === "result" && (
            <Animated.View style={[styles.resultBox, {
              opacity: resultOpacity,
              transform: [{ scale: resultScale }],
            }]}>
              <Text style={styles.resultLabel}>획득!</Text>
              <Text style={styles.resultMedals}>👑 {resultMedals} 황금</Text>
              <Pressable style={styles.collectBtn} onPress={handleCollect}>
                <Text style={styles.collectBtnText}>받기</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Spin Button */}
          {phase === "idle" && (
            <Pressable
              style={[styles.spinBtn, !canSpin && styles.spinBtnDisabled]}
              onPress={handleSpin}
              disabled={!canSpin}
            >
              <Text style={styles.spinBtnText}>
                {coins < SLOT_COST ? "코인 부족" : "돌리기!"}
              </Text>
              <Text style={styles.spinCost}>💰 {SLOT_COST}</Text>
            </Pressable>
          )}

          {phase === "spinning" && (
            <Text style={styles.spinningText}>띠리리링~! 🎵</Text>
          )}

          {/* Medal count display */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>💰 보유 코인: {coins}</Text>
          </View>

          {/* Close */}
          {phase === "idle" && (
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
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
    padding: 28,
    width: 320,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 20,
  },
  reelContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    backgroundColor: "#0a0a1a",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#333",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  reel: {
    width: 60,
    height: 80,
    backgroundColor: "#111",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#444",
  },
  reelNumber: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFD700",
  },
  reelNumberSpinning: {
    color: "#fff",
  },
  resultBox: {
    alignItems: "center",
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  resultMedals: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginVertical: 8,
  },
  collectBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 12,
  },
  collectBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  spinBtn: {
    backgroundColor: "#e94560",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  spinBtnDisabled: {
    backgroundColor: "#444",
    shadowOpacity: 0,
    elevation: 0,
  },
  spinBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  spinCost: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  spinningText: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  infoText: {
    color: "#888",
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeBtnText: {
    color: "#888",
    fontSize: 14,
  },
});
