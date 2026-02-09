import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import * as storage from "../utils/storage";
import { ALL_CATS, ImageSource } from "../data/cats";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface MemoryGameModalProps {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number) => void;
}

interface Card {
  id: number;
  imageIndex: number; // index into the shuffled image pool
  flipped: boolean;
  matched: boolean;
}

// Collect all listImage sources from characters (excludes *_100.png thumbnails)
const CAT_IMAGES: ImageSource[] = ALL_CATS
  .map(c => c.listImage)
  .filter((img): img is ImageSource => !!img);

interface LevelConfig {
  pairs: number;
  cols: number;
  rows: number;
  timeLimit: number; // seconds
  reward: number;    // coins
}

const LEVELS: LevelConfig[] = [
  { pairs: 3,  cols: 3, rows: 2, timeLimit: 30, reward: 20  },
  { pairs: 4,  cols: 4, rows: 2, timeLimit: 25, reward: 40  },
  { pairs: 6,  cols: 4, rows: 3, timeLimit: 30, reward: 80  },
  { pairs: 8,  cols: 4, rows: 4, timeLimit: 35, reward: 160 },
  { pairs: 10, cols: 5, rows: 4, timeLimit: 40, reward: 320 },
];

const CARD_MARGIN = 4;

// ---------------------------------------------------------------------------
// Flip-card sub-component
// ---------------------------------------------------------------------------

interface FlipCardProps {
  card: Card;
  size: number;
  imageSource: ImageSource;
  onPress: () => void;
  disabled: boolean;
}

function FlipCard({ card, size, imageSource, onPress, disabled }: FlipCardProps) {
  const animValue = useRef(new Animated.Value(card.flipped ? 1 : 0)).current;
  const prevFlipped = useRef(card.flipped);

  useEffect(() => {
    if (card.flipped !== prevFlipped.current) {
      prevFlipped.current = card.flipped;
      Animated.timing(animValue, {
        toValue: card.flipped ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [card.flipped]);

  const frontInterpolate = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["180deg", "90deg", "0deg"],
  });
  const backInterpolate = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "180deg"],
  });

  const frontOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  const backOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const imgSize = size * 0.75;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || card.flipped || card.matched}
      style={{ width: size, height: size, margin: CARD_MARGIN }}
    >
      {/* Front face (character image) */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFront,
          {
            width: size,
            height: size,
            transform: [{ rotateY: frontInterpolate }],
            opacity: frontOpacity,
          },
          card.matched && styles.cardMatched,
        ]}
      >
        <Image
          source={imageSource}
          style={{ width: imgSize, height: imgSize }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Back face (?) */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          {
            width: size,
            height: size,
            transform: [{ rotateY: backInterpolate }],
            opacity: backOpacity,
          },
        ]}
      >
        <Text style={[styles.cardQuestion, { fontSize: size * 0.45 }]}>?</Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Shuffle utility
// ---------------------------------------------------------------------------

function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type GamePhase =
  | "loading"
  | "already_played"
  | "memorize"
  | "playing"
  | "level_complete"
  | "game_over";

export default function MemoryGameModal({
  visible,
  onClose,
  onReward,
}: MemoryGameModalProps) {
  // ---- state ----
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [level, setLevel] = useState(0); // 0-indexed internally, displayed as 1-5
  const [cards, setCards] = useState<Card[]>([]);
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [secondPick, setSecondPick] = useState<number | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [lockBoard, setLockBoard] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memorizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- helpers ----

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (memorizeTimerRef.current) {
      clearTimeout(memorizeTimerRef.current);
      memorizeTimerRef.current = null;
    }
    if (mismatchTimerRef.current) {
      clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = null;
    }
  }, []);

  // Shuffle character images once per game session
  const shuffledImages = useMemo(() => shuffle([...CAT_IMAGES]), [visible]);

  const buildDeck = useCallback((lvl: number): Card[] => {
    const config = LEVELS[lvl];
    const indices = Array.from({ length: config.pairs }, (_, i) => i % shuffledImages.length);
    const pairs = [...indices, ...indices];
    const shuffled = shuffle(pairs);
    return shuffled.map((imageIndex, i) => ({
      id: i,
      imageIndex,
      flipped: true, // start face-up for memorize phase
      matched: false,
    }));
  }, [shuffledImages]);

  const startLevel = useCallback(
    (lvl: number) => {
      clearAllTimers();

      const config = LEVELS[lvl];
      const deck = buildDeck(lvl);

      setLevel(lvl);
      setCards(deck);
      setFirstPick(null);
      setSecondPick(null);
      setMatchedCount(0);
      setTimeLeft(config.timeLimit);
      setLockBoard(true);
      setPhase("memorize");

      // After 2 seconds, flip all cards back and start the game
      memorizeTimerRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => ({ ...c, flipped: false }))
        );
        setLockBoard(false);
        setPhase("playing");

        // Start countdown
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              // Time's up
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, 2000);
    },
    [buildDeck, clearAllTimers]
  );

  // ---- Check daily limit on modal open ----

  useEffect(() => {
    if (!visible) {
      clearAllTimers();
      return;
    }

    let cancelled = false;

    (async () => {
      const played = await storage.getMinigamePlayed("memory");
      if (cancelled) return;

      if (played) {
        setPhase("already_played");
      } else {
        setEarnedCoins(0);
        startLevel(0);
      }
    })();

    return () => {
      cancelled = true;
      clearAllTimers();
    };
  }, [visible, clearAllTimers, startLevel]);

  // ---- Handle time running out ----

  useEffect(() => {
    if (phase === "playing" && timeLeft === 0) {
      clearAllTimers();
      setLockBoard(true);
      // Reward = last COMPLETED level's reward. Current level (incomplete) doesn't count.
      // earnedCoins already holds the accumulated reward from prior levels.
      setPhase("game_over");
    }
  }, [timeLeft, phase, clearAllTimers]);

  // ---- Handle card picking logic ----

  const handleCardPress = useCallback(
    (index: number) => {
      if (lockBoard) return;
      if (phase !== "playing") return;

      const card = cards[index];
      if (card.flipped || card.matched) return;

      if (firstPick === null) {
        // First card
        setFirstPick(index);
        setCards((prev) =>
          prev.map((c, i) => (i === index ? { ...c, flipped: true } : c))
        );
      } else if (secondPick === null && index !== firstPick) {
        // Second card
        setSecondPick(index);
        setCards((prev) =>
          prev.map((c, i) => (i === index ? { ...c, flipped: true } : c))
        );
        setLockBoard(true);
      }
    },
    [cards, firstPick, secondPick, lockBoard, phase]
  );

  // ---- Evaluate pair after second pick ----

  useEffect(() => {
    if (firstPick === null || secondPick === null) return;

    const c1 = cards[firstPick];
    const c2 = cards[secondPick];

    if (c1.imageIndex === c2.imageIndex) {
      // Match!
      setCards((prev) =>
        prev.map((c, i) =>
          i === firstPick || i === secondPick
            ? { ...c, matched: true, flipped: true }
            : c
        )
      );
      const newMatchedCount = matchedCount + 1;
      setMatchedCount(newMatchedCount);
      setFirstPick(null);
      setSecondPick(null);
      setLockBoard(false);

      // Check if level is complete
      if (newMatchedCount === LEVELS[level].pairs) {
        clearAllTimers();
        setLockBoard(true);

        const levelReward = LEVELS[level].reward;
        const totalSoFar = earnedCoins + levelReward;
        setEarnedCoins(totalSoFar);

        if (level < LEVELS.length - 1) {
          // Brief pause, then advance
          setPhase("level_complete");
        } else {
          // All levels done
          setPhase("game_over");
        }
      }
    } else {
      // Mismatch - flip back after 0.8s
      mismatchTimerRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            i === firstPick || i === secondPick
              ? { ...c, flipped: false }
              : c
          )
        );
        setFirstPick(null);
        setSecondPick(null);
        setLockBoard(false);
      }, 800);
    }
  }, [secondPick]);

  // ---- Advance to next level after "level_complete" ----

  const handleNextLevel = useCallback(() => {
    startLevel(level + 1);
  }, [level, startLevel]);

  // ---- Collect reward and close ----

  const handleCollect = useCallback(async () => {
    if (earnedCoins > 0) {
      onReward(earnedCoins);
    }
    await storage.setMinigamePlayed("memory");
    onClose();
  }, [earnedCoins, onReward, onClose]);

  // ---- Calculate card size ----

  const screenWidth = Dimensions.get("window").width;
  const modalWidth = Math.min(screenWidth - 40, 360);
  const gridPadding = 16;

  const config = LEVELS[level];
  const availableWidth = modalWidth - gridPadding * 2;
  const availableHeight = 320; // approximate max grid height
  const cardSizeByWidth =
    (availableWidth - CARD_MARGIN * 2 * config.cols) / config.cols;
  const cardSizeByHeight =
    (availableHeight - CARD_MARGIN * 2 * config.rows) / config.rows;
  const cardSize = Math.floor(Math.min(cardSizeByWidth, cardSizeByHeight, 72));

  // ---- Render ----

  // Already-played screen
  if (phase === "already_played") {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: modalWidth }]}>
            <Text style={styles.title}>{"🃏 기억력 게임"}</Text>
            <View style={styles.alreadyPlayedBox}>
              <Text style={styles.alreadyPlayedText}>
                {"오늘은 이미 플레이했습니다!\n내일 다시 도전하세요!"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // Loading state
  if (phase === "loading") {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: modalWidth }]}>
            <Text style={styles.title}>{"🃏 기억력 게임"}</Text>
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Level complete overlay
  if (phase === "level_complete") {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: modalWidth }]}>
            <Text style={styles.title}>{"🃏 기억력 게임"}</Text>
            <View style={styles.levelCompleteBox}>
              <Text style={styles.levelCompleteEmoji}>{"🎉"}</Text>
              <Text style={styles.levelCompleteTitle}>
                {"레벨 " + (level + 1) + " 클리어!"}
              </Text>
              <Text style={styles.levelCompleteReward}>
                {"💰 +" + LEVELS[level].reward + " 코인"}
              </Text>
              <Text style={styles.levelCompleteTotal}>
                {"누적: " + earnedCoins + " 코인"}
              </Text>
              <Pressable style={styles.nextLevelBtn} onPress={handleNextLevel}>
                <Text style={styles.nextLevelBtnText}>
                  {"다음 레벨 →"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Game over overlay
  if (phase === "game_over") {
    const allCleared = level === LEVELS.length - 1 && matchedCount === LEVELS[level].pairs;
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: modalWidth }]}>
            <Text style={styles.title}>{"🃏 기억력 게임"}</Text>
            <View style={styles.gameOverBox}>
              <Text style={styles.gameOverEmoji}>
                {allCleared ? "🏆" : "⏰"}
              </Text>
              <Text style={styles.gameOverTitle}>
                {allCleared ? "모든 레벨 클리어!" : "게임 오버!"}
              </Text>
              {!allCleared && (
                <Text style={styles.gameOverSub}>
                  {"레벨 " + (level + 1) + "에서 시간 초과"}
                </Text>
              )}
              <Text style={styles.gameOverReward}>
                {"💰 총 " + earnedCoins + " 코인 획득!"}
              </Text>
              <Pressable style={styles.collectBtn} onPress={handleCollect}>
                <Text style={styles.collectBtnText}>
                  {earnedCoins > 0 ? "코인 받기" : "닫기"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Main playing / memorize screen
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { width: modalWidth }]}>
          {/* Header */}
          <Text style={styles.title}>{"🃏 기억력 게임"}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>레벨</Text>
              <Text style={styles.statValue}>{level + 1}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>시간</Text>
              <Text
                style={[
                  styles.statValue,
                  timeLeft <= 5 && phase === "playing" && styles.statDanger,
                ]}
              >
                {timeLeft + "s"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>매칭</Text>
              <Text style={styles.statValue}>
                {matchedCount + "/" + config.pairs}
              </Text>
            </View>
          </View>

          {/* Memorize hint */}
          {phase === "memorize" && (
            <Text style={styles.memorizeHint}>카드를 기억하세요!</Text>
          )}

          {/* Card grid */}
          <View style={[styles.grid, { paddingHorizontal: gridPadding }]}>
            {Array.from({ length: config.rows }).map((_, row) => (
              <View key={row} style={styles.gridRow}>
                {Array.from({ length: config.cols }).map((_, col) => {
                  const idx = row * config.cols + col;
                  if (idx >= cards.length) return null;
                  const card = cards[idx];
                  return (
                    <FlipCard
                      key={card.id}
                      card={card}
                      size={cardSize}
                      imageSource={shuffledImages[card.imageIndex]}
                      onPress={() => handleCardPress(idx)}
                      disabled={lockBoard || phase !== "playing"}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {/* Earned so far */}
          {earnedCoins > 0 && (
            <Text style={styles.earnedSoFar}>
              {"누적 코인: 💰 " + earnedCoins}
            </Text>
          )}

          {/* Close (only when not mid-animation) */}
          {phase === "playing" && (
            <Pressable
              onPress={() => {
                clearAllTimers();
                // Treat as forfeit - still save daily play & give earned coins
                handleCollect();
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>포기하기</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 12,
  },

  // ---- Stats ----
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "#16213e",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 70,
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
  },
  statDanger: {
    color: "#e94560",
  },

  // ---- Memorize hint ----
  memorizeHint: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 6,
  },

  // ---- Grid ----
  grid: {
    alignItems: "center",
    marginVertical: 8,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
  },

  // ---- Card ----
  card: {
    position: "absolute",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
  },
  cardFront: {
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  cardBack: {
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#444",
  },
  cardMatched: {
    backgroundColor: "#1a3a2e",
    borderColor: "#4CAF50",
  },
  cardImage: {
    // reserved for card images
  },
  cardQuestion: {
    color: "#666",
    fontWeight: "bold",
    textAlign: "center",
  },

  // ---- Already played ----
  alreadyPlayedBox: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 24,
    marginVertical: 20,
    alignItems: "center",
  },
  alreadyPlayedText: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 24,
  },

  // ---- Loading ----
  loadingText: {
    fontSize: 16,
    color: "#888",
    marginVertical: 30,
  },

  // ---- Level complete ----
  levelCompleteBox: {
    alignItems: "center",
    marginVertical: 16,
  },
  levelCompleteEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  levelCompleteTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
  },
  levelCompleteReward: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  levelCompleteTotal: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 16,
  },
  nextLevelBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  nextLevelBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  // ---- Game over ----
  gameOverBox: {
    alignItems: "center",
    marginVertical: 16,
  },
  gameOverEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  gameOverSub: {
    fontSize: 14,
    color: "#e94560",
    marginBottom: 8,
  },
  gameOverReward: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    marginVertical: 12,
  },

  // ---- Buttons ----
  collectBtn: {
    backgroundColor: "#e94560",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  collectBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  closeBtnText: {
    color: "#888",
    fontSize: 14,
  },

  // ---- Earned so far ----
  earnedSoFar: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 4,
  },
});
