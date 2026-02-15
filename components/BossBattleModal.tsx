import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
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

interface TowerFloor {
  name: string;
  emoji: string;
  hp: number;
  rewardCoins: number;
  rewardMedals: number;
}

const TOWER_FLOORS: TowerFloor[] = [
  { name: "고블린 대장", emoji: "👺", hp: 5000, rewardCoins: 100, rewardMedals: 0 },
  { name: "오우거 킹", emoji: "👹", hp: 12500, rewardCoins: 200, rewardMedals: 5 },
  { name: "드래곤 로드", emoji: "🐉", hp: 25000, rewardCoins: 400, rewardMedals: 15 },
  { name: "타이탄 제왕", emoji: "⚡", hp: 50000, rewardCoins: 800, rewardMedals: 30 },
  { name: "신계의 지배자", emoji: "🌟", hp: 100000, rewardCoins: 1600, rewardMedals: 60 },
  { name: "심해의 군주", emoji: "🌊", hp: 200000, rewardCoins: 3200, rewardMedals: 100 },
  { name: "화염의 왕", emoji: "🔥", hp: 400000, rewardCoins: 6400, rewardMedals: 150 },
  { name: "얼음의 여왕", emoji: "❄️", hp: 800000, rewardCoins: 12800, rewardMedals: 200 },
  { name: "혼돈의 마왕", emoji: "💀", hp: 1600000, rewardCoins: 25600, rewardMedals: 300 },
  { name: "태초의 신", emoji: "✨", hp: 3200000, rewardCoins: 51200, rewardMedals: 500 },
];

const GRADE_DAMAGE: Record<CatGrade, number> = {
  C: 1, B: 2, A: 3, S: 5, SS: 8, SSS: 15,
};

const MAX_PLAYS_PER_DAY = 2;
const BATTLE_TIME = 30;

export default function BossBattleModal({ visible, onClose, onReward, selectedGrade, enhanceLevel }: Props) {
  const [towerData, setTowerDataState] = useState<storage.TowerData | null>(null);
  const [phase, setPhase] = useState<"select" | "battle" | "result">("select");
  const [currentFloor, setCurrentFloor] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BATTLE_TIME);
  const [damageDealt, setDamageDealt] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showDmg, setShowDmg] = useState(false);
  const [clearedFloors, setClearedFloors] = useState<number[]>([]);
  const [totalRewardCoins, setTotalRewardCoins] = useState(0);
  const [totalRewardMedals, setTotalRewardMedals] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const towerRef = useRef<storage.TowerData | null>(null);
  const currentFloorRef = useRef(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dmgOpacity = useRef(new Animated.Value(0)).current;
  const dmgTranslateY = useRef(new Animated.Value(0)).current;
  const bossScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const data = await storage.getTowerData();
      setTowerDataState(data);
      towerRef.current = data;
      setPhase("select");
      setDamageDealt(0);
      setClearedFloors([]);
      setTotalRewardCoins(0);
      setTotalRewardMedals(0);
    })();
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getDamage = useCallback(() => {
    if (!selectedGrade) return 1;
    return GRADE_DAMAGE[selectedGrade] + Math.floor(enhanceLevel * 1.5);
  }, [selectedGrade, enhanceLevel]);

  const getFirstUncleared = useCallback((): number => {
    if (!towerRef.current) return 0;
    for (let i = 0; i < 10; i++) {
      if (towerRef.current.floorDamage[i] < TOWER_FLOORS[i].hp) return i;
    }
    return 9;
  }, []);

  const startBattle = useCallback(async () => {
    if (!towerRef.current || towerRef.current.playsToday >= MAX_PLAYS_PER_DAY) return;
    const floor = getFirstUncleared();
    setCurrentFloor(floor);
    currentFloorRef.current = floor;
    setTimeLeft(BATTLE_TIME);
    setDamageDealt(0);
    setComboCount(0);
    setClearedFloors([]);
    setTotalRewardCoins(0);
    setTotalRewardMedals(0);
    setPhase("battle");

    const updated = { ...towerRef.current, playsToday: towerRef.current.playsToday + 1 };
    towerRef.current = updated;
    setTowerDataState(updated);
    await storage.setTowerData(updated);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setPhase("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [getFirstUncleared]);

  const handleBossTap = useCallback(() => {
    if (phase !== "battle") return;
    const dmg = getDamage();
    setComboCount((prev) => prev + 1);
    setDamageDealt((prev) => prev + dmg);

    // Shake
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();

    bossScale.setValue(0.95);
    Animated.spring(bossScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

    // Dmg popup
    setShowDmg(true);
    dmgOpacity.setValue(1);
    dmgTranslateY.setValue(0);
    Animated.parallel([
      Animated.timing(dmgOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(dmgTranslateY, { toValue: -30, duration: 600, useNativeDriver: true }),
    ]).start(() => setShowDmg(false));

    // Apply damage
    if (!towerRef.current) return;
    const floorIdx = currentFloorRef.current;
    const floor = TOWER_FLOORS[floorIdx];
    if (!floor) return;

    towerRef.current.floorDamage[floorIdx] += dmg;

    if (towerRef.current.floorDamage[floorIdx] >= floor.hp) {
      // Floor cleared!
      towerRef.current.floorDamage[floorIdx] = floor.hp;
      setClearedFloors((prev) => [...prev, floorIdx]);
      setTotalRewardCoins((prev) => prev + floor.rewardCoins);
      setTotalRewardMedals((prev) => prev + floor.rewardMedals);
      onReward(floor.rewardCoins, floor.rewardMedals);

      // Auto-advance to next floor
      if (floorIdx < 9) {
        const next = floorIdx + 1;
        setCurrentFloor(next);
        currentFloorRef.current = next;
      } else {
        // All floors cleared!
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setPhase("result");
      }
    }

    // Save periodically
    storage.setTowerData(towerRef.current);
    setTowerDataState({ ...towerRef.current });
  }, [phase, getDamage, onReward]);

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  }, [onClose]);

  const floor = TOWER_FLOORS[currentFloor];
  const currentDmg = towerData?.floorDamage[currentFloor] ?? 0;
  const remainHp = floor ? Math.max(0, floor.hp - currentDmg) : 0;
  const hpPercent = floor ? Math.max(0, (remainHp / floor.hp) * 100) : 0;
  const hpColor = hpPercent > 50 ? "#4CFF4C" : hpPercent > 20 ? "#FFA500" : "#FF4444";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={phase === "battle" ? undefined : handleClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {phase === "select" && (
            <>
              <Text style={s.title}>🏰 도전의 탑</Text>
              <View style={s.divider} />

              {towerData && (
                <Text style={s.playsLeft}>
                  남은 횟수: {Math.max(0, MAX_PLAYS_PER_DAY - towerData.playsToday)}/{MAX_PLAYS_PER_DAY}
                </Text>
              )}

              {TOWER_FLOORS.map((fl, i) => {
                const dmgDone = towerData?.floorDamage[i] ?? 0;
                const cleared = dmgDone >= fl.hp;
                const firstUncleared = getFirstUncleared();
                const unlocked = i <= firstUncleared;
                const canPlay = towerData && towerData.playsToday < MAX_PLAYS_PER_DAY && i === firstUncleared;
                const floorHpPct = Math.min((dmgDone / fl.hp) * 100, 100);

                return (
                  <View key={i} style={[s.stageBtn, !unlocked && s.stageBtnLocked, cleared && s.stageBtnCleared]}>
                    <Text style={s.stageEmoji}>{cleared ? "✅" : unlocked ? fl.emoji : "🔒"}</Text>
                    <View style={s.stageInfo}>
                      <Text style={s.stageName}>{unlocked ? `${i + 1}층 - ${fl.name}` : `${i + 1}층 - ???`}</Text>
                      {unlocked && !cleared && (
                        <>
                          <View style={s.floorHpBar}>
                            <View style={[s.floorHpFill, { width: `${100 - floorHpPct}%` }]} />
                          </View>
                          <Text style={s.stageDetail}>
                            HP {Math.max(0, fl.hp - dmgDone).toLocaleString()}/{fl.hp.toLocaleString()}
                          </Text>
                        </>
                      )}
                      {cleared && <Text style={[s.stageDetail, { color: "#4CFF4C" }]}>클리어!</Text>}
                    </View>
                    <Text style={s.stageReward}>
                      {unlocked ? `💰${fl.rewardCoins.toLocaleString()}${fl.rewardMedals > 0 ? ` 👑${fl.rewardMedals}` : ""}` : ""}
                    </Text>
                  </View>
                );
              })}

              <Pressable
                onPress={startBattle}
                style={[s.startBtn, (!towerData || towerData.playsToday >= MAX_PLAYS_PER_DAY) && s.startBtnDisabled]}
                disabled={!towerData || towerData.playsToday >= MAX_PLAYS_PER_DAY}
              >
                <Text style={s.startBtnText}>
                  {towerData && towerData.playsToday >= MAX_PLAYS_PER_DAY ? "오늘 도전 완료" : "⚔️ 도전 시작!"}
                </Text>
              </Pressable>

              <Pressable onPress={handleClose} style={s.closeBtn}>
                <Text style={s.closeBtnText}>닫기</Text>
              </Pressable>
            </>
          )}

          {phase === "battle" && floor && (
            <>
              <Text style={s.floorTitle}>{currentFloor + 1}층 - {floor.name}</Text>
              <Text style={s.timerText}>⏱ {timeLeft}초</Text>

              <View style={s.bossHpContainer}>
                <View style={[s.bossHpBar, { width: `${hpPercent}%`, backgroundColor: hpColor }]} />
              </View>
              <Text style={s.bossHpText}>{remainHp.toLocaleString()}/{floor.hp.toLocaleString()}</Text>

              <Pressable onPress={handleBossTap} style={s.bossArea}>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: bossScale }] }}>
                  <Text style={s.bossEmoji}>{floor.emoji}</Text>
                </Animated.View>
                <Text style={s.bossName}>{floor.name}</Text>

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
              <Text style={s.totalDmg}>이번 도전 데미지: {damageDealt.toLocaleString()}</Text>
              {clearedFloors.length > 0 && (
                <Text style={s.clearMsg}>🎉 {clearedFloors.length}층 클리어!</Text>
              )}
            </>
          )}

          {phase === "result" && (
            <>
              <Text style={s.resultEmoji}>{clearedFloors.length > 0 ? "🎉" : "⏰"}</Text>
              <Text style={s.resultTitle}>
                {clearedFloors.length > 0 ? `${clearedFloors.length}층 클리어!` : "시간 종료!"}
              </Text>
              <Text style={s.resultDesc}>
                이번 도전 데미지: {damageDealt.toLocaleString()}{"\n"}
                콤보: {comboCount}
              </Text>
              {clearedFloors.length > 0 && (
                <View style={s.rewardBox}>
                  <Text style={s.rewardText}>
                    획득 보상: 💰 {totalRewardCoins.toLocaleString()}
                    {totalRewardMedals > 0 ? ` + 👑 ${totalRewardMedals.toLocaleString()}` : ""}
                  </Text>
                </View>
              )}
              {clearedFloors.length === 0 && (
                <Text style={s.encourageText}>내일 다시 도전하세요! 데미지는 누적됩니다.</Text>
              )}

              <Pressable onPress={() => setPhase("select")} style={s.closeBtn}>
                <Text style={s.closeBtnText}>확인</Text>
              </Pressable>
            </>
          )}
          </ScrollView>
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
    width: "90%",
    maxWidth: 400,
    maxHeight: Dimensions.get("window").height * 0.88,
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.2)",
  },
  scrollContent: {
    padding: 22,
    alignItems: "center",
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: "100%",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(80,80,140,0.3)",
  },
  stageBtnLocked: { opacity: 0.35 },
  stageBtnCleared: { borderColor: "rgba(76,255,76,0.3)", backgroundColor: "rgba(30,50,30,0.9)" },
  stageEmoji: { fontSize: 26, width: 38, textAlign: "center", marginRight: 10 },
  stageInfo: { flex: 1 },
  stageName: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  stageDetail: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 },
  stageReward: { color: "#FFA500", fontSize: 10, fontWeight: "bold" },
  floorHpBar: {
    width: "100%",
    height: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  floorHpFill: {
    height: "100%",
    backgroundColor: "#FF4444",
    borderRadius: 3,
  },
  startBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: "rgba(255,165,0,0.2)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.4)",
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: "#FFA500", fontSize: 16, fontWeight: "bold" },
  closeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  closeBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "bold" },
  floorTitle: { color: "#FFD700", fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  timerText: { color: "#FF4444", fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  bossHpContainer: {
    width: "100%",
    height: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  bossHpBar: { height: "100%", borderRadius: 8 },
  bossHpText: { color: "#fff", fontSize: 12, fontWeight: "bold", marginTop: 4, marginBottom: 10 },
  bossArea: { alignItems: "center", padding: 20, position: "relative" },
  bossEmoji: { fontSize: 80 },
  bossName: { color: "#FF4444", fontSize: 18, fontWeight: "bold", marginTop: 8 },
  dmgText: { position: "absolute", top: 10, right: 20, color: "#FF4444", fontSize: 24, fontWeight: "bold" },
  comboText: { color: "#FFD700", fontSize: 18, fontWeight: "bold", marginTop: 4 },
  totalDmg: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  clearMsg: { color: "#4CFF4C", fontSize: 16, fontWeight: "bold", marginTop: 8 },
  resultEmoji: { fontSize: 60, marginBottom: 8 },
  resultTitle: { color: "#fff", fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  resultDesc: { color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center", marginBottom: 10 },
  rewardBox: {
    backgroundColor: "rgba(50,200,50,0.15)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(50,200,50,0.3)",
  },
  rewardText: { color: "#4CFF4C", fontSize: 15, fontWeight: "bold", textAlign: "center" },
  encourageText: { color: "rgba(255,215,0,0.6)", fontSize: 13, textAlign: "center", marginBottom: 8 },
});
