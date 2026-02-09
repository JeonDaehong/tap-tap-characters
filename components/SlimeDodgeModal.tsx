import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import * as storage from "../utils/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GAME_AREA_WIDTH = Math.min(350, SCREEN_WIDTH - 40);
const GAME_AREA_HEIGHT = 500;

const PLAYER_SIZE = 40;
const SLIME_SIZE = 30;
const PLAYER_SPEED = 5;
const COLLISION_DISTANCE = 35;
const MAX_TIME = 180;

interface Slime {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface DifficultyConfig {
  interval: number; // ms between slime spawns
  speed: number;
}

function getDifficulty(elapsedSeconds: number): DifficultyConfig {
  if (elapsedSeconds < 20) return { interval: 1200, speed: 5 };
  if (elapsedSeconds < 40) return { interval: 900, speed: 6 };
  if (elapsedSeconds < 60) return { interval: 700, speed: 7 };
  if (elapsedSeconds < 90) return { interval: 550, speed: 8 };
  if (elapsedSeconds < 120) return { interval: 400, speed: 9 };
  if (elapsedSeconds < 150) return { interval: 300, speed: 10 };
  return { interval: 250, speed: 12 };
}

interface SlimeDodgeModalProps {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number) => void;
}

type GamePhase =
  | "loading"
  | "already_played"
  | "ready"
  | "countdown"
  | "playing"
  | "gameover"
  | "clear";

export default function SlimeDodgeModal({
  visible,
  onClose,
  onReward,
}: SlimeDodgeModalProps) {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [countdownValue, setCountdownValue] = useState(3);
  const [playerX, setPlayerX] = useState(GAME_AREA_WIDTH / 2 - PLAYER_SIZE / 2);
  const [slimes, setSlimes] = useState<Slime[]>([]);
  const [remainingTime, setRemainingTime] = useState(MAX_TIME);
  const [survivedSeconds, setSurvivedSeconds] = useState(0);
  const [pressingLeft, setPressingLeft] = useState(false);
  const [pressingRight, setPressingRight] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slimeIdRef = useRef(0);
  const playerXRef = useRef(GAME_AREA_WIDTH / 2 - PLAYER_SIZE / 2);
  const slimesRef = useRef<Slime[]>([]);
  const pressingLeftRef = useRef(false);
  const pressingRightRef = useRef(false);
  const gameActiveRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);

  // Sync refs with state for touch inputs
  useEffect(() => {
    pressingLeftRef.current = pressingLeft;
  }, [pressingLeft]);

  useEffect(() => {
    pressingRightRef.current = pressingRight;
  }, [pressingRight]);

  // Check daily play status when modal opens
  useEffect(() => {
    if (!visible) return;

    setPhase("loading");
    setCountdownValue(3);
    setPlayerX(GAME_AREA_WIDTH / 2 - PLAYER_SIZE / 2);
    playerXRef.current = GAME_AREA_WIDTH / 2 - PLAYER_SIZE / 2;
    setSlimes([]);
    slimesRef.current = [];
    setRemainingTime(MAX_TIME);
    setSurvivedSeconds(0);
    setPressingLeft(false);
    setPressingRight(false);
    pressingLeftRef.current = false;
    pressingRightRef.current = false;
    slimeIdRef.current = 0;

    (async () => {
      const played = await storage.getMinigamePlayed("slime");
      if (played) {
        setPhase("already_played");
      } else {
        setPhase("ready");
      }
    })();
  }, [visible]);

  // Cleanup everything on unmount or when modal closes
  useEffect(() => {
    return () => {
      cleanupGame();
    };
  }, []);

  const cleanupGame = useCallback(() => {
    gameActiveRef.current = false;
    if (gameLoopRef.current !== null) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (spawnTimerRef.current !== null) {
      clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const handleStartCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdownValue(3);

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        clearInterval(countdownInterval);
        startGame();
      }
    }, 1000);
  }, []);

  const endGame = useCallback(
    (cleared: boolean) => {
      cleanupGame();
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const survived = cleared ? MAX_TIME : Math.floor(elapsed);
      setSurvivedSeconds(survived);
      setPhase(cleared ? "clear" : "gameover");
    },
    [cleanupGame]
  );

  const spawnSlime = useCallback(() => {
    if (!gameActiveRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const difficulty = getDifficulty(elapsed);

    const newSlime: Slime = {
      id: slimeIdRef.current++,
      x: Math.random() * (GAME_AREA_WIDTH - SLIME_SIZE),
      y: -SLIME_SIZE,
      speed: difficulty.speed,
    };

    slimesRef.current = [...slimesRef.current, newSlime];

    // Schedule next spawn
    const nextDifficulty = getDifficulty(
      (Date.now() - startTimeRef.current) / 1000
    );
    spawnTimerRef.current = setTimeout(spawnSlime, nextDifficulty.interval);
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;

    // Move player
    let px = playerXRef.current;
    if (pressingLeftRef.current) {
      px = Math.max(0, px - PLAYER_SPEED);
    }
    if (pressingRightRef.current) {
      px = Math.min(GAME_AREA_WIDTH - PLAYER_SIZE, px + PLAYER_SPEED);
    }
    playerXRef.current = px;

    // Move slimes and check collisions
    const playerCenterX = px + PLAYER_SIZE / 2;
    const playerCenterY = GAME_AREA_HEIGHT - PLAYER_SIZE - 10 + PLAYER_SIZE / 2;
    let hit = false;

    const updatedSlimes: Slime[] = [];
    for (const slime of slimesRef.current) {
      const newY = slime.y + slime.speed;

      // Check collision
      const slimeCenterX = slime.x + SLIME_SIZE / 2;
      const slimeCenterY = newY + SLIME_SIZE / 2;
      const dx = playerCenterX - slimeCenterX;
      const dy = playerCenterY - slimeCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < COLLISION_DISTANCE) {
        hit = true;
        break;
      }

      // Keep slime if still on screen
      if (newY < GAME_AREA_HEIGHT + SLIME_SIZE) {
        updatedSlimes.push({ ...slime, y: newY });
      }
    }

    if (hit) {
      endGame(false);
      // Force a final state update
      setPlayerX(px);
      setSlimes([...slimesRef.current]);
      return;
    }

    slimesRef.current = updatedSlimes;

    // Sync to React state for rendering
    setPlayerX(px);
    setSlimes([...updatedSlimes]);

    // Continue loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]);

  const startGame = useCallback(() => {
    // Reset game state
    const startX = GAME_AREA_WIDTH / 2 - PLAYER_SIZE / 2;
    playerXRef.current = startX;
    slimesRef.current = [];
    slimeIdRef.current = 0;
    startTimeRef.current = Date.now();
    lastSpawnTimeRef.current = Date.now();
    gameActiveRef.current = true;

    setPlayerX(startX);
    setSlimes([]);
    setRemainingTime(MAX_TIME);
    setPhase("playing");

    // Start the countdown timer
    timerIntervalRef.current = setInterval(() => {
      if (!gameActiveRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, MAX_TIME - elapsed);
      setRemainingTime(Math.ceil(remaining));

      if (remaining <= 0) {
        endGame(true);
      }
    }, 100);

    // Start spawning slimes
    const difficulty = getDifficulty(0);
    spawnTimerRef.current = setTimeout(spawnSlime, difficulty.interval);

    // Start game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [endGame, spawnSlime, gameLoop]);

  const handleCollectReward = useCallback(async () => {
    const reward = Math.floor(survivedSeconds);
    await storage.setMinigamePlayed("slime");
    onReward(reward);
    onClose();
  }, [survivedSeconds, onReward, onClose]);

  const handleClose = useCallback(() => {
    cleanupGame();
    onClose();
  }, [cleanupGame, onClose]);

  const handleLeftPressIn = useCallback(() => {
    setPressingLeft(true);
  }, []);

  const handleLeftPressOut = useCallback(() => {
    setPressingLeft(false);
  }, []);

  const handleRightPressIn = useCallback(() => {
    setPressingRight(true);
  }, []);

  const handleRightPressOut = useCallback(() => {
    setPressingRight(false);
  }, []);

  // Already played screen
  if (phase === "already_played") {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Slime Dodge</Text>
            <Text style={styles.alreadyPlayedText}>
              {"오늘은 이미 플레이했습니다!\n내일 다시 도전하세요!"}
            </Text>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // Result screen (gameover or clear)
  if (phase === "gameover" || phase === "clear") {
    const reward = Math.floor(survivedSeconds);
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>
              {phase === "clear" ? "CLEAR!" : "GAME OVER"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {phase === "clear"
                ? "축하합니다! 모든 슬라임을 피했습니다!"
                : "슬라임에 맞았습니다!"}
            </Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>
                {"생존: " + survivedSeconds + "초"}
              </Text>
              <Text style={styles.resultCoins}>
                {"💰 " + reward + " 코인"}
              </Text>
            </View>
            <Pressable style={styles.collectBtn} onPress={handleCollectReward}>
              <Text style={styles.collectBtnText}>보상 받기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Slime Dodge</Text>

          {/* Timer */}
          {phase === "playing" && (
            <Text style={styles.timerText}>
              {"남은 시간: " + remainingTime + "초"}
            </Text>
          )}

          {/* Game Area */}
          <View style={styles.gameArea}>
            {/* Ready / Countdown overlay */}
            {phase === "ready" && (
              <View style={styles.gameOverlay}>
                <Text style={styles.instructionText}>
                  {"세라피를 조작하여\n슬라임을 피하세요!"}
                </Text>
                <Text style={styles.instructionSubText}>
                  {"화면 왼쪽/오른쪽을 터치하여 이동"}
                </Text>
                <Pressable
                  style={styles.startBtn}
                  onPress={handleStartCountdown}
                >
                  <Text style={styles.startBtnText}>시작</Text>
                </Pressable>
              </View>
            )}

            {phase === "countdown" && (
              <View style={styles.gameOverlay}>
                <Text style={styles.countdownText}>{countdownValue}</Text>
              </View>
            )}

            {phase === "loading" && (
              <View style={styles.gameOverlay}>
                <Text style={styles.loadingText}>로딩 중...</Text>
              </View>
            )}

            {/* Slimes */}
            {(phase === "playing" || phase === "countdown") &&
              slimes.map((slime) => (
                <Text
                  key={slime.id}
                  style={[
                    styles.slime,
                    {
                      left: slime.x,
                      top: slime.y,
                    },
                  ]}
                >
                  {"🟢"}
                </Text>
              ))}

            {/* Player */}
            {(phase === "playing" || phase === "countdown") && (
              <Text
                style={[
                  styles.player,
                  {
                    left: playerX,
                    top: GAME_AREA_HEIGHT - PLAYER_SIZE - 10,
                  },
                ]}
              >
                {"🧚"}
              </Text>
            )}

            {/* Touch zones (only during playing) */}
            {phase === "playing" && (
              <View style={styles.touchContainer}>
                <Pressable
                  style={styles.touchZoneLeft}
                  onPressIn={handleLeftPressIn}
                  onPressOut={handleLeftPressOut}
                >
                  <Text style={styles.touchZoneHint}>{"◀"}</Text>
                </Pressable>
                <Pressable
                  style={styles.touchZoneRight}
                  onPressIn={handleRightPressIn}
                  onPressOut={handleRightPressOut}
                >
                  <Text style={styles.touchZoneHint}>{"▶"}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Close button (only when not actively playing) */}
          {(phase === "ready" || phase === "loading") && (
            <Pressable style={styles.closeBtn} onPress={handleClose}>
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
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
    width: GAME_AREA_WIDTH + 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
  },
  timerText: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 8,
  },
  gameArea: {
    width: GAME_AREA_WIDTH,
    height: GAME_AREA_HEIGHT,
    backgroundColor: "#0a0a1e",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2a2a4e",
    overflow: "hidden",
    position: "relative",
  },
  gameOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10, 10, 30, 0.9)",
    zIndex: 10,
  },
  instructionText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 30,
  },
  instructionSubText: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 24,
  },
  startBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  countdownText: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "rgba(255, 215, 0, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#aaa",
  },
  player: {
    position: "absolute",
    fontSize: PLAYER_SIZE,
    lineHeight: PLAYER_SIZE + 4,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    textAlign: "center",
    zIndex: 5,
  },
  slime: {
    position: "absolute",
    fontSize: SLIME_SIZE,
    lineHeight: SLIME_SIZE + 4,
    width: SLIME_SIZE,
    height: SLIME_SIZE,
    textAlign: "center",
    zIndex: 4,
  },
  touchContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 8,
  },
  touchZoneLeft: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  touchZoneRight: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  touchZoneHint: {
    fontSize: 24,
    color: "rgba(255,255,255,0.15)",
  },
  alreadyPlayedText: {
    fontSize: 16,
    color: "#FFD700",
    textAlign: "center",
    marginVertical: 24,
    lineHeight: 26,
  },
  resultBox: {
    backgroundColor: "#0a0a1e",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#2a2a4e",
    width: "80%",
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 4,
    textAlign: "center",
  },
  resultText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultCoins: {
    fontSize: 28,
    color: "#FFD700",
    fontWeight: "bold",
  },
  collectBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: "#4CAF50",
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
    marginTop: 8,
  },
  closeBtnText: {
    color: "#888",
    fontSize: 14,
  },
});
