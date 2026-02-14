import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import * as storage from "../utils/storage";
import type { MazeTile, MazeData } from "../utils/storage";

const TILE_COUNT = 20;
const TILES_PER_ROW = 4;
const TILE_SIZE = 60;
const TILE_GAP = 8;
const BUFF_DURATION_MS = 10 * 60 * 1000; // 10 minutes

interface Props {
  visible: boolean;
  onClose: () => void;
  onRewardCoins: (amount: number) => void;
  onRewardXp: (amount: number) => void;
  onBuff: (multiplier: number, durationMs: number) => void;
  onHpPenalty: (hpLoss: number) => void;
  greedDice: number;
  onUseDice: () => void;
}

// ---- Tile icon/label helpers ----

function getTileIcon(subType: string): string {
  switch (subType) {
    case "start": return "\u{1F3C1}";    // flag
    case "goal": return "\u{1F3C1}";     // flag
    case "coin": return "\u{1F4B0}";     // money bag
    case "treasure": return "\u{1F48E}"; // gem
    case "xp": return "\u2B50";          // star
    case "tapBuff": return "\u{1F525}";  // fire
    case "hpDown": return "\u{1F494}";   // broken heart
    case "tapDebuff": return "\u{1F40C}";// snail
    case "jackpot": return "\u{1F381}";  // gift
    default: return "?";
  }
}

function getTileLabel(subType: string): string {
  switch (subType) {
    case "start": return "START";
    case "goal": return "GOAL";
    case "coin": return "\uCF54\uC778";
    case "treasure": return "\uBCF4\uBB3C";
    case "xp": return "\uACBD\uD5D8\uCE58";
    case "tapBuff": return "2\uBC30";
    case "hpDown": return "HP\u2193";
    case "tapDebuff": return "0.5\uBC30";
    case "jackpot": return "\uB300\uBC15";
    default: return "";
  }
}

function getTileResultText(tile: MazeTile): string {
  switch (tile.subType) {
    case "start": return "\uCD9C\uBC1C!";
    case "goal": return "\u{1F38A} \uBBF8\uB85C \uC644\uC8FC! +500 \uCF54\uC778";
    case "coin": return `\u{1F4B0} +${tile.value} \uCF54\uC778`;
    case "treasure": return `\u{1F48E} +${tile.value} \uCF54\uC778`;
    case "xp": return `\u2B50 +${tile.value} XP`;
    case "tapBuff": return `\u{1F525} 10\uBD84\uAC04 \uD0ED \uC810\uC218 2\uBC30!`;
    case "hpDown": return `\u{1F494} \uBAA8\uB4E0 \uACE0\uC591\uC774 HP -${tile.value}`;
    case "tapDebuff": return `\u{1F40C} 10\uBD84\uAC04 \uD0ED \uC810\uC218 0.5\uBC30...`;
    case "jackpot": return `\u{1F381} \uB300\uBC15! +${tile.value} \uCF54\uC778!`;
    default: return "";
  }
}

// ---- Maze generation ----

function generateMaze(): MazeTile[] {
  const tiles: MazeTile[] = [];
  tiles.push({ type: "reward", subType: "start", value: 0 });
  for (let i = 1; i < 19; i++) {
    const rand = Math.random();
    if (rand < 0.15) {
      tiles.push({ type: "reward", subType: "coin", value: 50 + Math.floor(Math.random() * 151) });
    } else if (rand < 0.25) {
      tiles.push({ type: "reward", subType: "treasure", value: 300 + Math.floor(Math.random() * 201) });
    } else if (rand < 0.40) {
      tiles.push({ type: "reward", subType: "xp", value: 50 + Math.floor(Math.random() * 51) });
    } else if (rand < 0.55) {
      tiles.push({ type: "reward", subType: "tapBuff", value: 2 });
    } else if (rand < 0.75) {
      tiles.push({ type: "penalty", subType: "hpDown", value: 30 });
    } else if (rand < 0.95) {
      tiles.push({ type: "penalty", subType: "tapDebuff", value: 0.5 });
    } else {
      tiles.push({ type: "reward", subType: "jackpot", value: 1000 });
    }
  }
  tiles.push({ type: "reward", subType: "goal", value: 500 });
  return tiles;
}

// ---- Snake layout: compute row-based ordering ----
// Rows alternate direction: row0 L->R, row1 R->L, row2 L->R, etc.

function getSnakeOrder(): number[][] {
  const rows: number[][] = [];
  const totalRows = Math.ceil(TILE_COUNT / TILES_PER_ROW);
  let idx = 0;
  for (let r = 0; r < totalRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < TILES_PER_ROW && idx < TILE_COUNT; c++) {
      row.push(idx++);
    }
    if (r % 2 === 1) row.reverse();
    rows.push(row);
  }
  return rows;
}

// ---- Component ----

export default function GreedMazeModal({
  visible,
  onClose,
  onRewardCoins,
  onRewardXp,
  onBuff,
  onHpPenalty,
  greedDice,
  onUseDice,
}: Props) {
  const [mazeData, setMazeDataState] = useState<MazeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Dice rolling
  const [rolling, setRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(1);
  const [diceResult, setDiceResult] = useState<number | null>(null);

  // Movement animation
  const [animating, setAnimating] = useState(false);
  const [displayPosition, setDisplayPosition] = useState(0);

  // Tile effect popup
  const [effectPopup, setEffectPopup] = useState<string | null>(null);

  // Completion celebration
  const [showCelebration, setShowCelebration] = useState(false);

  // Pulsing glow for current tile
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView>(null);
  const snakeRows = useRef(getSnakeOrder()).current;

  // ---- Load maze on open ----
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setDiceResult(null);
    setEffectPopup(null);
    setShowCelebration(false);
    (async () => {
      let data = await storage.getMazeData();
      if (!data) {
        data = { currentPosition: 0, tiles: generateMaze(), completed: false };
        await storage.setMazeData(data);
      }
      setMazeDataState(data);
      setDisplayPosition(data.currentPosition);
      setLoading(false);
    })();
  }, [visible]);

  // ---- Pulse animation ----
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  // ---- Apply tile effect ----
  const applyTileEffect = useCallback(
    (tile: MazeTile) => {
      switch (tile.subType) {
        case "coin":
        case "treasure":
        case "jackpot":
          onRewardCoins(tile.value);
          break;
        case "xp":
          onRewardXp(tile.value);
          break;
        case "tapBuff":
          onBuff(2.0, BUFF_DURATION_MS);
          break;
        case "hpDown":
          onHpPenalty(tile.value);
          break;
        case "tapDebuff":
          onBuff(0.5, BUFF_DURATION_MS);
          break;
        case "goal":
          onRewardCoins(tile.value);
          break;
        default:
          break;
      }
    },
    [onRewardCoins, onRewardXp, onBuff, onHpPenalty]
  );

  // ---- Show effect popup ----
  const showEffectPopup = useCallback(
    (text: string, duration: number = 2000) => {
      setEffectPopup(text);
      popupOpacity.setValue(1);
      Animated.sequence([
        Animated.delay(duration - 400),
        Animated.timing(popupOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setEffectPopup(null);
      });
    },
    []
  );

  // ---- Handle maze completion ----
  const handleCompletion = useCallback(async () => {
    setShowCelebration(true);
    celebrationScale.setValue(0);
    Animated.spring(celebrationScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Wait, then reshuffle
    setTimeout(async () => {
      const newData: MazeData = {
        currentPosition: 0,
        tiles: generateMaze(),
        completed: false,
      };
      await storage.setMazeData(newData);
      setMazeDataState(newData);
      setDisplayPosition(0);
      setShowCelebration(false);
      setAnimating(false);
    }, 2500);
  }, []);

  // ---- Roll dice ----
  const handleRollDice = useCallback(async () => {
    if (rolling || animating || !mazeData || greedDice <= 0) return;

    onUseDice();
    setRolling(true);
    setDiceResult(null);

    // Dice cycling animation (~1 second)
    const cycleInterval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
    }, 80);

    setTimeout(() => {
      clearInterval(cycleInterval);
      const result = Math.floor(Math.random() * 6) + 1;
      setDiceDisplay(result);
      setDiceResult(result);
      setRolling(false);

      // Move player
      const currentPos = mazeData.currentPosition;
      const targetPos = Math.min(currentPos + result, 19);

      setAnimating(true);

      // Animate tile by tile
      let step = currentPos;
      const moveInterval = setInterval(() => {
        step++;
        if (step > targetPos) {
          clearInterval(moveInterval);

          // Update state
          const landed = mazeData.tiles[targetPos];
          const updatedData: MazeData = {
            ...mazeData,
            currentPosition: targetPos,
            completed: targetPos >= 19,
          };
          setMazeDataState(updatedData);
          storage.setMazeData(updatedData);

          // Apply effect and show popup
          if (landed.subType !== "start") {
            applyTileEffect(landed);
            showEffectPopup(getTileResultText(landed));
          }

          // Check completion
          if (targetPos >= 19) {
            setTimeout(() => handleCompletion(), 2200);
          } else {
            setAnimating(false);
          }

          return;
        }
        setDisplayPosition(step);
      }, 250);
    }, 1000);
  }, [rolling, animating, mazeData, greedDice, onUseDice, applyTileEffect, showEffectPopup, handleCompletion]);

  // ---- Dice emoji ----
  const diceEmojis = [
    "\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685",
  ];

  // ---- Render ----
  if (!visible) return null;

  const glowColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,215,0,0.3)", "rgba(255,215,0,0.9)"],
  });

  const glowShadow = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 8],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {"\u{1F30C}"} \uD0D0\uC695\uC758 \uBBF8\uB85C
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>{"\u2715"}</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>\uBBF8\uB85C \uBD88\uB7EC\uC624\uB294 \uC911...</Text>
            </View>
          ) : mazeData ? (
            <>
              {/* Board */}
              <ScrollView
                ref={scrollRef}
                style={styles.boardScroll}
                contentContainerStyle={styles.boardContent}
                showsVerticalScrollIndicator={false}
              >
                {snakeRows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.boardRow}>
                    {row.map((tileIdx) => {
                      const tile = mazeData.tiles[tileIdx];
                      if (!tile) return null;
                      const isCurrent = tileIdx === displayPosition;
                      const isVisited = tileIdx < mazeData.currentPosition;
                      const isPenalty = tile.type === "penalty";
                      const isGoal = tile.subType === "goal";
                      const isStart = tile.subType === "start";

                      return (
                        <Animated.View
                          key={tileIdx}
                          style={[
                            styles.tile,
                            isPenalty && styles.tilePenalty,
                            !isPenalty && styles.tileReward,
                            isStart && styles.tileStart,
                            isGoal && styles.tileGoal,
                            isVisited && styles.tileVisited,
                            isCurrent && {
                              borderColor: "#ffd700",
                              borderWidth: 3,
                              shadowColor: "#ffd700",
                              shadowOpacity: 0.8,
                              shadowRadius: glowShadow as any,
                              elevation: 8,
                            },
                          ]}
                        >
                          <Text style={styles.tileIcon}>
                            {isCurrent ? "\u{1F9D9}" : getTileIcon(tile.subType)}
                          </Text>
                          <Text
                            style={[
                              styles.tileLabel,
                              isVisited && styles.tileLabelVisited,
                            ]}
                          >
                            {getTileLabel(tile.subType)}
                          </Text>
                          <Text style={styles.tileIndex}>{tileIdx}</Text>
                        </Animated.View>
                      );
                    })}
                    {/* Fill empty slots in last row */}
                    {row.length < TILES_PER_ROW &&
                      Array.from({ length: TILES_PER_ROW - row.length }).map(
                        (_, i) => (
                          <View key={`empty-${i}`} style={styles.tileEmpty} />
                        )
                      )}
                  </View>
                ))}
              </ScrollView>

              {/* Effect Popup */}
              {effectPopup && (
                <Animated.View
                  style={[styles.effectPopup, { opacity: popupOpacity }]}
                >
                  <Text style={styles.effectPopupText}>{effectPopup}</Text>
                </Animated.View>
              )}

              {/* Celebration */}
              {showCelebration && (
                <Animated.View
                  style={[
                    styles.celebration,
                    { transform: [{ scale: celebrationScale }] },
                  ]}
                >
                  <Text style={styles.celebrationEmoji}>
                    {"\u{1F38A}"}
                  </Text>
                  <Text style={styles.celebrationText}>
                    \uBBF8\uB85C \uC644\uC8FC!
                  </Text>
                  <Text style={styles.celebrationSub}>
                    +500 \uCF54\uC778 \uBCF4\uB108\uC2A4!{"\n"}\uBBF8\uB85C\uAC00 \uC0C8\uB85C \uC0DD\uC131\uB429\uB2C8\uB2E4...
                  </Text>
                </Animated.View>
              )}

              {/* Dice Area */}
              <View style={styles.diceArea}>
                <Text style={styles.diceDisplay}>
                  {diceEmojis[diceDisplay - 1]}
                </Text>
                {diceResult !== null && !rolling && (
                  <Text style={styles.diceResultText}>
                    {diceResult}\uCE78 \uC804\uC9C4!
                  </Text>
                )}
                <Text style={styles.diceCount}>
                  \uD0D0\uC695\uC758 \uC8FC\uC0AC\uC704: {greedDice}\uAC1C
                </Text>

                {greedDice <= 0 && !rolling && !animating ? (
                  <View style={styles.noDiceWrap}>
                    <Text style={styles.noDiceText}>
                      \uC8FC\uC0AC\uC704\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4! \uC0C1\uC810\uC5D0\uC11C \uAD6C\uB9E4\uD558\uC138\uC694
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleRollDice}
                    disabled={rolling || animating || greedDice <= 0}
                    style={[
                      styles.rollBtn,
                      (rolling || animating) && styles.rollBtnDisabled,
                    ]}
                  >
                    <Text style={styles.rollBtnText}>
                      {rolling
                        ? "\uAD74\uB9AC\uB294 \uC911..."
                        : animating
                        ? "\uC774\uB3D9 \uC911..."
                        : "\u{1F3B2} \uC8FC\uC0AC\uC704 \uAD74\uB9AC\uAE30"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ---- Styles ----

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOARD_WIDTH = TILES_PER_ROW * (TILE_SIZE + TILE_GAP) + TILE_GAP;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: Math.min(SCREEN_WIDTH - 32, 360),
    maxHeight: "90%",
    backgroundColor: "#1a1a2e",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ffd700",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,215,0,0.3)",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffd700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Loading
  loadingWrap: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#aaa",
    fontSize: 14,
  },

  // Board
  boardScroll: {
    flexGrow: 0,
    maxHeight: 420,
  },
  boardContent: {
    alignItems: "center",
    paddingVertical: 12,
  },
  boardRow: {
    flexDirection: "row",
    marginBottom: TILE_GAP,
    justifyContent: "center",
  },

  // Tiles
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    marginHorizontal: TILE_GAP / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#333",
    position: "relative",
  },
  tileReward: {
    borderColor: "#2d6a4f",
    backgroundColor: "#1a2e1a",
  },
  tilePenalty: {
    borderColor: "#6a2d2d",
    backgroundColor: "#2e1a1a",
  },
  tileStart: {
    borderColor: "#4a90d9",
    backgroundColor: "#1a2a3e",
  },
  tileGoal: {
    borderColor: "#ffd700",
    backgroundColor: "#2e2a1a",
  },
  tileVisited: {
    opacity: 0.4,
  },
  tileIcon: {
    fontSize: 20,
  },
  tileLabel: {
    fontSize: 8,
    color: "#ccc",
    marginTop: 1,
    fontWeight: "600",
  },
  tileLabelVisited: {
    color: "#666",
  },
  tileIndex: {
    position: "absolute",
    top: 2,
    left: 4,
    fontSize: 7,
    color: "#555",
  },
  tileEmpty: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginHorizontal: TILE_GAP / 2,
  },

  // Effect Popup
  effectPopup: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffd700",
    paddingHorizontal: 24,
    paddingVertical: 16,
    zIndex: 100,
  },
  effectPopupText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Celebration
  celebration: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.95)",
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#ffd700",
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: "center",
    zIndex: 200,
  },
  celebrationEmoji: {
    fontSize: 48,
  },
  celebrationText: {
    color: "#ffd700",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
  },
  celebrationSub: {
    color: "#ccc",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

  // Dice Area
  diceArea: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,215,0,0.3)",
  },
  diceDisplay: {
    fontSize: 48,
    marginBottom: 4,
  },
  diceResultText: {
    color: "#ffd700",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  diceCount: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 10,
  },
  rollBtn: {
    backgroundColor: "#b8860b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: "center",
  },
  rollBtnDisabled: {
    backgroundColor: "#555",
    opacity: 0.6,
  },
  rollBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  noDiceWrap: {
    backgroundColor: "rgba(255,0,0,0.15)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  noDiceText: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
