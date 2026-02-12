import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import * as storage from "../utils/storage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number, medals: number) => void;
}

const DAY_REWARDS = [
  { day: 1, coins: 50, medals: 0, emoji: "💰" },
  { day: 2, coins: 100, medals: 0, emoji: "💰" },
  { day: 3, coins: 150, medals: 0, emoji: "💎" },
  { day: 4, coins: 200, medals: 0, emoji: "💰" },
  { day: 5, coins: 0, medals: 5, emoji: "👑" },
  { day: 6, coins: 300, medals: 0, emoji: "💰" },
  { day: 7, coins: 500, medals: 15, emoji: "🎁" },
];

export default function AttendanceModal({ visible, onClose, onReward }: Props) {
  const [attendance, setAttendance] = useState<storage.AttendanceData | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardInfo, setRewardInfo] = useState({ coins: 0, medals: 0 });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const data = await storage.getAttendance();
      setAttendance(data);
      setClaimed(data.claimedToday);
      setShowReward(false);
    })();
  }, [visible]);

  const handleClaim = async () => {
    if (!attendance || claimed) return;
    const dayIndex = ((attendance.consecutiveDays - 1) % 7);
    const reward = DAY_REWARDS[dayIndex];
    const updated = await storage.claimAttendance();
    setAttendance(updated);
    setClaimed(true);
    setRewardInfo({ coins: reward.coins, medals: reward.medals });
    setShowReward(true);
    onReward(reward.coins, reward.medals);
  };

  const currentDayIndex = attendance ? ((attendance.consecutiveDays - 1) % 7) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          <Text style={s.title}>📅 출석 보상</Text>
          <View style={s.divider} />

          {attendance && (
            <Text style={s.streak}>
              🔥 연속 {attendance.consecutiveDays}일 출석!
            </Text>
          )}

          {/* 7-day grid */}
          <View style={s.grid}>
            {DAY_REWARDS.map((reward, i) => {
              const isPast = i < currentDayIndex;
              const isCurrent = i === currentDayIndex;
              const isFuture = i > currentDayIndex;
              return (
                <View
                  key={i}
                  style={[
                    s.dayBox,
                    isPast && s.dayBoxPast,
                    isCurrent && !claimed && s.dayBoxCurrent,
                    isCurrent && claimed && s.dayBoxClaimed,
                  ]}
                >
                  <Text style={s.dayLabel}>Day {reward.day}</Text>
                  <Text style={s.dayEmoji}>{reward.emoji}</Text>
                  <Text style={s.dayReward}>
                    {reward.coins > 0 ? `💰${reward.coins}` : ""}
                    {reward.coins > 0 && reward.medals > 0 ? "\n" : ""}
                    {reward.medals > 0 ? `👑${reward.medals}` : ""}
                  </Text>
                  {isPast && <Text style={s.checkMark}>✅</Text>}
                  {isCurrent && claimed && <Text style={s.checkMark}>✅</Text>}
                </View>
              );
            })}
          </View>

          {/* Claim button */}
          {!claimed ? (
            <Pressable onPress={handleClaim} style={s.claimBtn}>
              <Text style={s.claimBtnText}>오늘의 보상 받기!</Text>
            </Pressable>
          ) : showReward ? (
            <View style={s.rewardResult}>
              <Text style={s.rewardText}>
                {rewardInfo.coins > 0 ? `💰 ${rewardInfo.coins} 코인` : ""}
                {rewardInfo.coins > 0 && rewardInfo.medals > 0 ? " + " : ""}
                {rewardInfo.medals > 0 ? `👑 ${rewardInfo.medals} 메달` : ""}
                {" 획득!"}
              </Text>
            </View>
          ) : (
            <Text style={s.alreadyClaimed}>오늘 보상을 이미 받았습니다</Text>
          )}

          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>닫기</Text>
          </Pressable>
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
    padding: 20,
    width: "90%",
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
    marginBottom: 10,
    marginTop: 4,
  },
  streak: {
    color: "#FFA500",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  dayBox: {
    width: 80,
    height: 90,
    backgroundColor: "rgba(35,35,70,0.8)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(80,80,140,0.3)",
    padding: 4,
  },
  dayBoxPast: {
    opacity: 0.5,
    backgroundColor: "rgba(50,100,50,0.3)",
  },
  dayBoxCurrent: {
    borderColor: "#FFD700",
    borderWidth: 2,
    backgroundColor: "rgba(255,215,0,0.1)",
  },
  dayBoxClaimed: {
    backgroundColor: "rgba(50,100,50,0.3)",
    borderColor: "rgba(50,200,50,0.4)",
  },
  dayLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "bold",
  },
  dayEmoji: {
    fontSize: 24,
    marginVertical: 2,
  },
  dayReward: {
    color: "#FFA500",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  checkMark: {
    position: "absolute",
    top: 2,
    right: 4,
    fontSize: 12,
  },
  claimBtn: {
    backgroundColor: "rgba(255,165,0,0.8)",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,200,0,0.4)",
  },
  claimBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  rewardResult: {
    backgroundColor: "rgba(50,200,50,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
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
  alreadyClaimed: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    marginBottom: 8,
  },
  closeBtn: {
    marginTop: 4,
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
});
