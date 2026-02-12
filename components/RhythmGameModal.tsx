import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import * as storage from "../utils/storage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number) => void;
}

interface Note {
  id: number;
  targetTime: number; // ms from game start when note should be hit
  hit: boolean;
  result: "perfect" | "good" | "miss" | null;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const GAME_DURATION = 25000; // 25 seconds
const NOTE_FALL_TIME = 2000; // ms to fall from top to target
const TARGET_Y = SCREEN_HEIGHT * 0.65;
const PERFECT_WINDOW = 80; // ms
const GOOD_WINDOW = 160; // ms

function generateNotes(): Note[] {
  const notes: Note[] = [];
  let time = 1500;
  let id = 0;
  while (time < GAME_DURATION - 1000) {
    notes.push({ id: id++, targetTime: time, hit: false, result: null });
    time += 500 + Math.floor(Math.random() * 400); // 500-900ms intervals
  }
  return notes;
}

export default function RhythmGameModal({ visible, onClose, onReward }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const [played, setPlayed] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [goods, setGoods] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lastResult, setLastResult] = useState<string>("");
  const [reward, setReward] = useState(0);

  const notesRef = useRef<Note[]>([]);
  const startTimeRef = useRef(0);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [notePositions, setNotePositions] = useState<{ id: number; y: number; opacity: number; result: string | null }[]>([]);

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const done = await storage.getMinigamePlayed("rhythm");
      setPlayed(done);
      setPhase("ready");
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setPerfects(0);
      setGoods(0);
      setMisses(0);
      setLastResult("");
    })();
  }, [visible]);

  useEffect(() => {
    // Pulse animation for target zone
    if (phase === "playing") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  const startGame = useCallback(async () => {
    if (played) return;
    await storage.setMinigamePlayed("rhythm");
    setPlayed(true);

    const notes = generateNotes();
    notesRef.current = notes;
    startTimeRef.current = Date.now();
    setPhase("playing");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfects(0);
    setGoods(0);
    setMisses(0);

    gameLoopRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;

      if (elapsed >= GAME_DURATION) {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;

        // Count remaining unhit notes as misses
        let finalMisses = 0;
        notesRef.current.forEach((n) => {
          if (!n.hit && !n.result) {
            n.result = "miss";
            finalMisses++;
          }
        });
        setMisses((prev) => prev + finalMisses);

        // Calculate reward
        const finalScore = notesRef.current.reduce((acc, n) => {
          if (n.result === "perfect") return acc + 100;
          if (n.result === "good") return acc + 50;
          return acc;
        }, 0);
        const rewardCoins = Math.floor(finalScore / 20) + 10;
        setReward(rewardCoins);
        setScore(finalScore);
        setPhase("result");
        onReward(rewardCoins);
        return;
      }

      // Update note positions
      const positions = notesRef.current
        .filter((n) => {
          const noteAppearTime = n.targetTime - NOTE_FALL_TIME;
          return elapsed >= noteAppearTime && elapsed < n.targetTime + 500;
        })
        .map((n) => {
          const progress = (elapsed - (n.targetTime - NOTE_FALL_TIME)) / NOTE_FALL_TIME;
          const y = progress * TARGET_Y;
          const pastTarget = elapsed > n.targetTime + GOOD_WINDOW;

          // Auto-miss notes that passed
          if (pastTarget && !n.hit && !n.result) {
            n.result = "miss";
            setMisses((prev) => prev + 1);
            setCombo(0);
            setLastResult("MISS");
          }

          return {
            id: n.id,
            y: Math.min(y, TARGET_Y + 50),
            opacity: n.result ? 0.3 : 1,
            result: n.result,
          };
        });

      setNotePositions(positions);
    }, 16);
  }, [played, onReward]);

  const handleTap = useCallback(() => {
    if (phase !== "playing") return;
    const elapsed = Date.now() - startTimeRef.current;

    // Find the closest unhit note
    let closestNote: Note | null = null;
    let closestDiff = Infinity;

    for (const note of notesRef.current) {
      if (note.hit || note.result) continue;
      const diff = Math.abs(elapsed - note.targetTime);
      if (diff < closestDiff && diff < GOOD_WINDOW + 50) {
        closestDiff = diff;
        closestNote = note;
      }
    }

    if (!closestNote) return;

    closestNote.hit = true;

    if (closestDiff <= PERFECT_WINDOW) {
      closestNote.result = "perfect";
      setScore((prev) => prev + 100);
      setPerfects((prev) => prev + 1);
      setCombo((prev) => {
        const newCombo = prev + 1;
        setMaxCombo((max) => Math.max(max, newCombo));
        return newCombo;
      });
      setLastResult("PERFECT!");
    } else if (closestDiff <= GOOD_WINDOW) {
      closestNote.result = "good";
      setScore((prev) => prev + 50);
      setGoods((prev) => prev + 1);
      setCombo((prev) => {
        const newCombo = prev + 1;
        setMaxCombo((max) => Math.max(max, newCombo));
        return newCombo;
      });
      setLastResult("GOOD!");
    } else {
      closestNote.result = "miss";
      setMisses((prev) => prev + 1);
      setCombo(0);
      setLastResult("MISS");
    }

    // Show result animation
    resultOpacity.setValue(1);
    resultScale.setValue(0.5);
    Animated.parallel([
      Animated.spring(resultScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  const getResultColor = (result: string) => {
    if (result === "PERFECT!") return "#FFD700";
    if (result === "GOOD!") return "#4CFF4C";
    return "#FF4444";
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        {phase === "ready" && (
          <View style={s.readyContainer}>
            <Text style={s.title}>🎵 리듬 탭</Text>
            <View style={s.divider} />
            <Text style={s.desc}>
              음표가 내려오면 타이밍에 맞춰 탭하세요!{"\n"}
              타이밍이 정확할수록 높은 점수!
            </Text>
            <View style={s.ruleBox}>
              <Text style={s.ruleText}>🟡 PERFECT = 100점</Text>
              <Text style={s.ruleText}>🟢 GOOD = 50점</Text>
              <Text style={s.ruleText}>🔴 MISS = 0점</Text>
            </View>
            {played ? (
              <Text style={s.playedText}>오늘 이미 플레이했습니다</Text>
            ) : (
              <Pressable onPress={startGame} style={s.startBtn}>
                <Text style={s.startBtnText}>시작!</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>닫기</Text>
            </Pressable>
          </View>
        )}

        {phase === "playing" && (
          <Pressable style={s.gameArea} onPress={handleTap}>
            {/* Score and combo */}
            <View style={s.gameHud}>
              <Text style={s.gameScore}>{score}</Text>
              {combo > 0 && (
                <Text style={s.gameCombo}>{combo} COMBO</Text>
              )}
            </View>

            {/* Falling notes */}
            {notePositions.map((np) => (
              <View
                key={np.id}
                style={[
                  s.note,
                  {
                    top: np.y,
                    opacity: np.opacity,
                    backgroundColor: np.result === "perfect" ? "#FFD700" : np.result === "good" ? "#4CFF4C" : np.result === "miss" ? "#FF4444" : "#7B68EE",
                  },
                ]}
              >
                <Text style={s.noteEmoji}>🎵</Text>
              </View>
            ))}

            {/* Target zone */}
            <Animated.View style={[s.targetZone, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={s.targetText}>TAP!</Text>
            </Animated.View>

            {/* Result text */}
            {lastResult !== "" && (
              <Animated.Text
                style={[
                  s.resultText,
                  {
                    color: getResultColor(lastResult),
                    opacity: resultOpacity,
                    transform: [{ scale: resultScale }],
                  },
                ]}
              >
                {lastResult}
              </Animated.Text>
            )}
          </Pressable>
        )}

        {phase === "result" && (
          <View style={s.readyContainer}>
            <Text style={s.resultEmoji}>🎶</Text>
            <Text style={s.resultTitle}>결과</Text>
            <Text style={s.finalScore}>{score} 점</Text>

            <View style={s.statsBox}>
              <View style={s.statRow}>
                <Text style={[s.statLabel, { color: "#FFD700" }]}>PERFECT</Text>
                <Text style={s.statValue}>{perfects}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={[s.statLabel, { color: "#4CFF4C" }]}>GOOD</Text>
                <Text style={s.statValue}>{goods}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={[s.statLabel, { color: "#FF4444" }]}>MISS</Text>
                <Text style={s.statValue}>{misses}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>MAX COMBO</Text>
                <Text style={s.statValue}>{maxCombo}</Text>
              </View>
            </View>

            <View style={s.rewardBox}>
              <Text style={s.rewardText}>💰 {reward} 코인 획득!</Text>
            </View>

            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>확인</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  readyContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 22,
    padding: 24,
    width: "88%",
    maxWidth: 380,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.2)",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  divider: {
    width: "60%",
    height: 1,
    backgroundColor: "rgba(100,120,255,0.2)",
    marginBottom: 12,
    marginTop: 4,
  },
  desc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  ruleBox: {
    backgroundColor: "rgba(35,35,70,0.8)",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 16,
  },
  ruleText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  playedText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    marginBottom: 12,
  },
  startBtn: {
    backgroundColor: "rgba(120,80,255,0.8)",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(150,120,255,0.4)",
  },
  startBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  closeBtnText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Game area
  gameArea: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  gameHud: {
    position: "absolute",
    top: 50,
    width: "100%",
    alignItems: "center",
    zIndex: 10,
  },
  gameScore: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  gameCombo: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  note: {
    position: "absolute",
    left: "50%",
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B68EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  noteEmoji: {
    fontSize: 22,
  },
  targetZone: {
    position: "absolute",
    top: TARGET_Y - 32,
    left: "50%",
    marginLeft: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  targetText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "bold",
  },
  resultText: {
    position: "absolute",
    top: TARGET_Y - 80,
    width: "100%",
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
  },
  // Result phase
  resultEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  resultTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  finalScore: {
    color: "#FFD700",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 14,
  },
  statsBox: {
    width: "100%",
    backgroundColor: "rgba(35,35,70,0.8)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "bold",
  },
  statValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  rewardBox: {
    backgroundColor: "rgba(50,200,50,0.15)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(50,200,50,0.3)",
  },
  rewardText: {
    color: "#4CFF4C",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
