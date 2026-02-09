import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
} from "react-native";
import * as storage from "../utils/storage";

interface FortuneModalProps {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number) => void;
}

const FORTUNE_REWARD = 100;

const FORTUNES: string[] = [
  // luck
  "오늘은 뜻밖의 행운이 찾아올 거예요!",
  "사소한 일에도 감사하는 하루가 될 거예요.",
  "오랫동안 기다리던 좋은 소식이 올 수 있어요!",
  "행운의 숫자 7이 당신을 따라다니는 날이에요.",
  "우연한 만남이 큰 기회로 이어질 수 있어요.",
  "오늘 하늘을 올려다보면 좋은 징조가 보일 거예요.",
  "작은 행운이 연달아 찾아오는 하루예요!",
  "오늘은 평소보다 운이 좋은 날이에요.",
  "예상치 못한 곳에서 기쁜 일이 생길 거예요.",
  "길을 걷다가 행운을 주울 수도 있는 날이에요!",
  // love
  "오늘은 새로운 만남이 기다리고 있어요.",
  "소중한 사람에게 먼저 연락해 보세요. 좋은 일이 생겨요!",
  "사랑하는 사람과 따뜻한 대화를 나눌 수 있는 날이에요.",
  "오늘 눈이 마주치는 사람에게 주목하세요!",
  "진심을 담은 한마디가 관계를 더 깊게 만들어줄 거예요.",
  "오래된 친구에게서 반가운 소식이 올 수 있어요.",
  "당신의 미소가 누군가의 하루를 밝혀줄 거예요.",
  "오늘은 고백의 타이밍이 좋은 날이에요!",
  "인연의 실이 당신을 특별한 사람에게 이끌고 있어요.",
  "가까운 사람에게 감사의 마음을 전해보세요.",
  // money
  "작은 투자가 큰 결실을 맺을 징조예요.",
  "뜻밖의 수입이 생길 수 있는 날이에요!",
  "오늘은 절약하면 나중에 큰 보상이 올 거예요.",
  "금전적으로 좋은 흐름이 시작되는 날이에요.",
  "현명한 소비가 행복을 가져다줄 거예요.",
  "오래된 저금통을 확인해 보세요. 깜짝 놀랄 수도 있어요!",
  "재물운이 상승하는 시기예요. 기회를 놓치지 마세요!",
  "오늘 받는 작은 선물이 큰 의미를 가져요.",
  "돈보다 소중한 가치를 발견하게 될 거예요.",
  "알뜰한 하루를 보내면 주말에 좋은 일이 생겨요!",
  // health
  "오늘은 가벼운 산책이 큰 활력을 줄 거예요.",
  "충분한 수분 섭취가 오늘의 행운을 불러와요!",
  "스트레칭 한 번이 하루를 완전히 바꿔놓을 거예요.",
  "오늘은 몸과 마음이 모두 가벼운 날이에요!",
  "맛있는 음식이 오늘의 에너지원이 될 거예요.",
  "일찍 잠자리에 들면 내일이 더 빛날 거예요.",
  "깊은 호흡 세 번이 마법 같은 효과를 줄 거예요.",
  "오늘은 건강에 좋은 습관을 시작하기 딱 좋은 날이에요!",
  "따뜻한 차 한 잔이 마음의 평화를 가져다줄 거예요.",
  "웃음이 최고의 보약이에요. 오늘은 많이 웃어보세요!",
  // work / study
  "집중력이 최고조에 달하는 날이에요. 중요한 일을 하세요!",
  "오늘 시작한 프로젝트는 좋은 결과를 가져올 거예요.",
  "동료의 조언에 귀를 기울이면 큰 도움이 될 거예요.",
  "창의적인 아이디어가 샘솟는 날이에요!",
  "꾸준한 노력이 곧 빛을 발할 거예요. 조금만 더 힘내세요!",
  "오늘 배운 것이 미래에 큰 자산이 될 거예요.",
  "새로운 도전을 두려워하지 마세요. 성공이 가까이 있어요!",
  "팀워크가 빛나는 하루가 될 거예요.",
  "시험운이 좋은 날이에요. 자신감을 가지세요!",
  "오늘의 작은 성취가 내일의 큰 성공으로 이어져요!",
];

const LUCK_CATEGORIES = [
  { name: "연애운", emoji: "💕" },
  { name: "금전운", emoji: "💰" },
  { name: "건강운", emoji: "💪" },
  { name: "사업운", emoji: "📈" },
  { name: "시험운", emoji: "📝" },
];

function getStarRating(count: number): string {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

export default function FortuneModal({
  visible,
  onClose,
  onReward,
}: FortuneModalProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "revealed" | "already_played">("loading");
  const [fortune, setFortune] = useState("");
  const [luckyCategory, setLuckyCategory] = useState({ name: "", emoji: "", stars: 0 });

  const fortuneOpacity = useRef(new Animated.Value(0)).current;
  const fortuneScale = useRef(new Animated.Value(0.5)).current;
  const coinOpacity = useRef(new Animated.Value(0)).current;
  const coinTranslateY = useRef(new Animated.Value(20)).current;
  const crystalBallScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Pulsing glow animation for the crystal ball
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  // Check daily play status when modal opens
  useEffect(() => {
    if (!visible) return;
    // Reset animation values
    fortuneOpacity.setValue(0);
    fortuneScale.setValue(0.5);
    coinOpacity.setValue(0);
    coinTranslateY.setValue(20);
    crystalBallScale.setValue(1);

    (async () => {
      const played = await storage.getMinigamePlayed("fortune");
      if (played) {
        setPhase("already_played");
      } else {
        setPhase("ready");
      }
    })();
  }, [visible]);

  const handleReveal = useCallback(async () => {
    if (phase !== "ready") return;

    // Pick random fortune
    const randomFortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    setFortune(randomFortune);

    // Pick random lucky category with star rating
    const randomCat = LUCK_CATEGORIES[Math.floor(Math.random() * LUCK_CATEGORIES.length)];
    const stars = Math.floor(Math.random() * 5) + 1; // 1-5
    setLuckyCategory({ name: randomCat.name, emoji: randomCat.emoji, stars });

    // Crystal ball tap animation
    Animated.sequence([
      Animated.timing(crystalBallScale, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(crystalBallScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Delay fortune reveal slightly for dramatic effect
    setTimeout(() => {
      setPhase("revealed");

      // Fortune text fade in + scale
      Animated.parallel([
        Animated.timing(fortuneOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(fortuneScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Coin reward animation (delayed)
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(coinOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(coinTranslateY, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);

      // Mark as played and give reward
      storage.setMinigamePlayed("fortune");
      onReward(FORTUNE_REWARD);
    }, 500);
  }, [phase, onReward, fortuneOpacity, fortuneScale, coinOpacity, coinTranslateY, crystalBallScale]);

  const handleClose = useCallback(() => {
    setPhase("loading");
    setFortune("");
    setLuckyCategory({ name: "", emoji: "", stars: 0 });
    onClose();
  }, [onClose]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <Text style={styles.title}>오늘의 운세</Text>
          <Text style={styles.subtitle}>수정 구슬이 당신의 운세를 알려드려요</Text>

          {/* Crystal Ball */}
          <View style={styles.crystalBallContainer}>
            <Animated.View
              style={[
                styles.crystalBallGlow,
                { opacity: glowOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.crystalBall,
                { transform: [{ scale: crystalBallScale }] },
              ]}
            >
              <Text style={styles.crystalBallEmoji}>🔮</Text>
            </Animated.View>
          </View>

          {/* Already Played State */}
          {phase === "already_played" && (
            <View style={styles.alreadyPlayedContainer}>
              <Text style={styles.alreadyPlayedText}>
                오늘은 이미 운세를 확인했습니다!{"\n"}내일 다시 확인하세요!
              </Text>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </Pressable>
            </View>
          )}

          {/* Ready State - Button to reveal */}
          {phase === "ready" && (
            <Pressable style={styles.revealButton} onPress={handleReveal}>
              <Text style={styles.revealButtonText}>오늘의 운세 확인하기</Text>
            </Pressable>
          )}

          {/* Revealed State */}
          {phase === "revealed" && (
            <View style={styles.revealedContainer}>
              {/* Fortune Card */}
              <Animated.View
                style={[
                  styles.fortuneCard,
                  {
                    opacity: fortuneOpacity,
                    transform: [{ scale: fortuneScale }],
                  },
                ]}
              >
                <Text style={styles.fortuneQuoteLeft}>"</Text>
                <Text style={styles.fortuneText}>{fortune}</Text>
                <Text style={styles.fortuneQuoteRight}>"</Text>
              </Animated.View>

              {/* Lucky Category */}
              <Animated.View
                style={[
                  styles.luckyCategoryBox,
                  {
                    opacity: fortuneOpacity,
                    transform: [{ scale: fortuneScale }],
                  },
                ]}
              >
                <Text style={styles.luckyCategoryLabel}>오늘의 행운 카테고리</Text>
                <Text style={styles.luckyCategoryName}>
                  {luckyCategory.emoji} {luckyCategory.name}
                </Text>
                <Text style={styles.luckyCategoryStars}>
                  {getStarRating(luckyCategory.stars)}
                </Text>
              </Animated.View>

              {/* Coin Reward */}
              <Animated.View
                style={[
                  styles.coinReward,
                  {
                    opacity: coinOpacity,
                    transform: [{ translateY: coinTranslateY }],
                  },
                ]}
              >
                <Text style={styles.coinRewardText}>+{FORTUNE_REWARD} 코인 획득!</Text>
              </Animated.View>

              {/* Close Button */}
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </Pressable>
            </View>
          )}

          {/* Loading State */}
          {phase === "loading" && (
            <Text style={styles.loadingText}>불러오는 중...</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
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
  crystalBallContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  crystalBallGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#9B6BD1",
  },
  crystalBall: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(155, 107, 209, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(155, 107, 209, 0.5)",
  },
  crystalBallEmoji: {
    fontSize: 56,
  },
  alreadyPlayedContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  alreadyPlayedText: {
    fontSize: 15,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  revealButton: {
    backgroundColor: "#9B6BD1",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#9B6BD1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  revealButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  revealedContainer: {
    alignItems: "center",
    width: "100%",
  },
  fortuneCard: {
    backgroundColor: "rgba(155, 107, 209, 0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(155, 107, 209, 0.4)",
    padding: 20,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  fortuneQuoteLeft: {
    fontSize: 28,
    color: "#9B6BD1",
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: -8,
  },
  fortuneText: {
    fontSize: 16,
    color: "#e8d5f5",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  fortuneQuoteRight: {
    fontSize: 28,
    color: "#9B6BD1",
    fontWeight: "bold",
    alignSelf: "flex-end",
    marginTop: -8,
  },
  luckyCategoryBox: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    padding: 14,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  luckyCategoryLabel: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 6,
  },
  luckyCategoryName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  luckyCategoryStars: {
    fontSize: 20,
    color: "#FFD700",
    letterSpacing: 4,
  },
  coinReward: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  coinRewardText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  closeButtonText: {
    color: "#888",
    fontSize: 15,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
  },
});
