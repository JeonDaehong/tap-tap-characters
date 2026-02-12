import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import * as storage from "../utils/storage";
import { CatGrade } from "../data/cats";

interface Props {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number, medals: number) => void;
  selectedGrade: CatGrade | null;
  enhanceLevel: number;
}

interface BossStage {
  name: string;
  emoji: string;
  hp: number;
  timeLimit: number; // seconds
  rewardCoins: number;
  rewardMedals: number;
}

const BOSS_STAGES: BossStage[] = [
  { name: "고블린 대장", emoji: "👺", hp: 100, timeLimit: 30, rewardCoins: 100, rewardMedals: 0 },
  { name: "오우거 킹", emoji: "👹", hp: 250, timeLimit: 25, rewardCoins: 200, rewardMedals: 5 },
  { name: "드래곤 로드", emoji: "🐉", hp: 500, timeLimit: 20, rewardCoins: 400, rewardMedals: 15 },
];

const GRADE_DAMAGE: Record<CatGrade, number> = {
  C: 1, B: 2, A: 3, S: 5, SS: 8, SSS: 15,
};

const MAX_PLAYS_PER_DAY = 3;

export default function BossBattleModal({ visible, onClose, onReward, selectedGrade, enhanceLevel }: Props) {
  const [bossData, setBossData] = useState<storage.BossData | null>(null);
  const [phase, setPhase] = useState<"select" | "battle" | "result">("select");
  const [selectedStage, setSelectedStage] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [maxHp, setMaxHp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [damageDealt, setDamageDealt] = useState(0);
  const [victory, setVictory] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [showDmg, setShowDmg] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dmgOpacity = useRef(new Animated.Value(0)).current;
  const dmgTranslateY = useRef(new Animated.Value(0)).current;
  const bossScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const data = await storage.getBossData();
      setBossData(data);
      setPhase("select");
      setVictory(false);
      setDamageDealt(0);
    })();
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getDamage = useCallback(() => {
    if (!selectedGrade) return 1;
    const base = GRADE_DAMAGE[selectedGrade];
    return base + Math.floor(enhanceLevel * 0.5);
  }, [selectedGrade, enhanceLevel]);

  const startBattle = useCallback(async (stageIdx: number) => {
    if (!bossData || bossData.playsToday >= MAX_PLAYS_PER_DAY) return;
    const stage = BOSS_STAGES[stageIdx];
    setSelectedStage(stageIdx);
    setBossHp(stage.hp);
    setMaxHp(stage.hp);
    setTimeLeft(stage.timeLimit);
    setDamageDealt(0);
    setComboCount(0);
    setPhase("battle");

    const updated = { ...bossData, playsToday: bossData.playsToday + 1 };
    await storage.setBossData(updated);
    setBossData(updated);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setPhase("result");
          setVictory(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [bossData]);

  const handleBossTap = useCallback(() => {
    if (phase !== "battle") return;
    const dmg = getDamage();
    setComboCount((prev) => prev + 1);
    setDamageDealt((prev) => prev + dmg);

    // Shake animation
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();

    // Boss flinch
    bossScale.setValue(0.95);
    Animated.spring(bossScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

    // Damage popup
    setShowDmg(true);
    dmgOpacity.setValue(1);
    dmgTranslateY.setValue(0);
    Animated.parallel([
      Animated.timing(dmgOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(dmgTranslateY, { toValue: -30, duration: 600, useNativeDriver: true }),
    ]).start(() => setShowDmg(false));

    setBossHp((prev) => {
      const newHp = prev - dmg;
      if (newHp <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setVictory(true);
        setPhase("result");

        // Update highest stage
        (async () => {
          const data = await storage.getBossData();
          if (selectedStage + 1 > data.highestStage) {
            data.highestStage = selectedStage + 1;
            await storage.setBossData(data);
            setBossData(data);
          }
        })();

        const stage = BOSS_STAGES[selectedStage];
        onReward(stage.rewardCoins, stage.rewardMedals);
        return 0;
      }
      return newHp;
    });
  }, [phase, getDamage, selectedStage, onReward]);

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  }, [onClose]);

  const hpPercent = maxHp > 0 ? Math.max(0, bossHp / maxHp) * 100 : 0;
  const hpColor = hpPercent > 50 ? "#4CFF4C" : hpPercent > 20 ? "#FFA500" : "#FF4444";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={phase === "battle" ? undefined : handleClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          {phase === "select" && (
            <>
              <Text style={s.title}>⚔️ 보스 도전</Text>
              <View style={s.divider} />

              {bossData && (
                <Text style={s.playsLeft}>
                  남은 횟수: {Math.max(0, MAX_PLAYS_PER_DAY - bossData.playsToday)}/{MAX_PLAYS_PER_DAY}
                </Text>
              )}

              {BOSS_STAGES.map((stage, i) => {
                const unlocked = !bossData || i <= bossData.highestStage;
                const canPlay = bossData && bossData.playsToday < MAX_PLAYS_PER_DAY && unlocked;
                return (
                  <Pressable
                    key={i}
                    style={[s.stageBtn, !canPlay && s.stageBtnLocked]}
                    onPress={() => canPlay && startBattle(i)}
                    disabled={!canPlay}
                  >
                    <Text style={s.stageEmoji}>{unlocked ? stage.emoji : "🔒"}</Text>
                    <View style={s.stageInfo}>
                      <Text style={s.stageName}>{unlocked ? stage.name : "???"}</Text>
                      <Text style={s.stageDetail}>
                        {unlocked ? `HP ${stage.hp} | ${stage.timeLimit}초` : "이전 스테이지 클리어 필요"}
                      </Text>
                    </View>
                    <Text style={s.stageReward}>
                      {unlocked ? `💰${stage.rewardCoins}${stage.rewardMedals > 0 ? ` 👑${stage.rewardMedals}` : ""}` : ""}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable onPress={handleClose} style={s.closeBtn}>
                <Text style={s.closeBtnText}>닫기</Text>
              </Pressable>
            </>
          )}

          {phase === "battle" && (
            <>
              <Text style={s.timerText}>⏱ {timeLeft}초</Text>

              {/* Boss HP bar */}
              <View style={s.bossHpContainer}>
                <View style={[s.bossHpBar, { width: `${hpPercent}%`, backgroundColor: hpColor }]} />
              </View>
              <Text style={s.bossHpText}>{bossHp}/{maxHp}</Text>

              {/* Boss */}
              <Pressable onPress={handleBossTap} style={s.bossArea}>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: bossScale }] }}>
                  <Text style={s.bossEmoji}>{BOSS_STAGES[selectedStage].emoji}</Text>
                </Animated.View>
                <Text style={s.bossName}>{BOSS_STAGES[selectedStage].name}</Text>

                {showDmg && (
                  <Animated.Text
                    style={[s.dmgText, { opacity: dmgOpacity, transform: [{ translateY: dmgTranslateY }] }]}
                  >
                    -{getDamage()}
                  </Animated.Text>
                )}
              </Pressable>

              <Text style={s.comboText}>
                {comboCount > 0 ? `${comboCount} COMBO!` : "탭으로 공격!"}
              </Text>
              <Text style={s.totalDmg}>총 데미지: {damageDealt}</Text>
            </>
          )}

          {phase === "result" && (
            <>
              <Text style={s.resultEmoji}>{victory ? "🎉" : "💀"}</Text>
              <Text style={s.resultTitle}>{victory ? "승리!" : "패배..."}</Text>
              <Text style={s.resultDesc}>
                {victory
                  ? `${BOSS_STAGES[selectedStage].name}을(를) 처치했습니다!`
                  : `시간 초과! 남은 HP: ${bossHp}`}
              </Text>
              {victory && (
                <View style={s.rewardBox}>
                  <Text style={s.rewardText}>
                    💰 {BOSS_STAGES[selectedStage].rewardCoins} 코인
                    {BOSS_STAGES[selectedStage].rewardMedals > 0
                      ? ` + 👑 ${BOSS_STAGES[selectedStage].rewardMedals} 메달`
                      : ""}
                    {" 획득!"}
                  </Text>
                </View>
              )}
              <Text style={s.resultStats}>총 데미지: {damageDealt} | 콤보: {comboCount}</Text>

              <Pressable onPress={() => setPhase("select")} style={s.closeBtn}>
                <Text style={s.closeBtnText}>확인</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#1a1a2e",
    borderRadius: 22,
    padding: 22,
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
  playsLeft: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginBottom: 12,
  },
  stageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(35,35,70,0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: "100%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(80,80,140,0.3)",
  },
  stageBtnLocked: {
    opacity: 0.4,
  },
  stageEmoji: {
    fontSize: 30,
    width: 44,
    textAlign: "center",
    marginRight: 10,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  stageDetail: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  stageReward: {
    color: "#FFA500",
    fontSize: 11,
    fontWeight: "bold",
  },
  closeBtn: {
    marginTop: 10,
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
  // Battle phase
  timerText: {
    color: "#FF4444",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  bossHpContainer: {
    width: "100%",
    height: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  bossHpBar: {
    height: "100%",
    borderRadius: 8,
  },
  bossHpText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 10,
  },
  bossArea: {
    alignItems: "center",
    padding: 20,
    position: "relative",
  },
  bossEmoji: {
    fontSize: 80,
  },
  bossName: {
    color: "#FF4444",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
  },
  dmgText: {
    position: "absolute",
    top: 10,
    right: 20,
    color: "#FF4444",
    fontSize: 24,
    fontWeight: "bold",
  },
  comboText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  totalDmg: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 4,
  },
  // Result phase
  resultEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  resultTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
  resultStats: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginBottom: 4,
  },
});
