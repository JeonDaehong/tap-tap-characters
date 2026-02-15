import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ALL_ACHIEVEMENTS } from "../data/achievements";
import * as storage from "../utils/storage";

interface Props {
  visible: boolean;
  unlocked: string[];
  onClose: () => void;
  onClaimReward: (coins: number, medals: number, xp: number) => void;
}

export default function AchievementModal({ visible, unlocked, onClose, onClaimReward }: Props) {
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const claimed = await storage.getClaimedAchievementRewards();
      setClaimedRewards(claimed);
    })();
  }, [visible]);

  const handleClaim = async (achId: string) => {
    const ach = ALL_ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return;
    const updated = await storage.claimAchievementReward(achId);
    setClaimedRewards(updated);
    onClaimReward(ach.rewardCoins, ach.rewardMedals, ach.rewardXp);
  };

  const rewardLabel = (coins: number, medals: number, xp: number): string => {
    const parts: string[] = [];
    if (coins > 0) parts.push(`${coins} 코인`);
    if (medals > 0) parts.push(`${medals} 황금`);
    if (xp > 0) parts.push(`${xp} XP`);
    return parts.join(" + ");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>🏆 업적</Text>
          <Text style={s.subtitle}>
            {unlocked.length} / {ALL_ACHIEVEMENTS.length} 달성
          </Text>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {ALL_ACHIEVEMENTS.map((ach) => {
              const isUnlocked = unlocked.includes(ach.id);
              const isClaimed = claimedRewards.includes(ach.id);
              const canClaim = isUnlocked && !isClaimed;

              return (
                <View key={ach.id} style={[s.item, isUnlocked && s.itemUnlocked]}>
                  <Text style={s.itemIcon}>{isUnlocked ? ach.icon : "❓"}</Text>
                  <View style={s.itemInfo}>
                    <Text style={[s.itemTitle, !isUnlocked && s.itemTitleLocked]}>
                      {isUnlocked ? ach.title : "???"}
                    </Text>
                    {isUnlocked && (
                      <Text style={s.itemDesc}>{ach.description}</Text>
                    )}
                    {isUnlocked && (
                      <Text style={s.rewardText}>
                        🎁 {rewardLabel(ach.rewardCoins, ach.rewardMedals, ach.rewardXp)}
                      </Text>
                    )}
                  </View>
                  <View style={s.claimWrap}>
                    {isClaimed ? (
                      <Text style={s.checkmark}>✅</Text>
                    ) : canClaim ? (
                      <Pressable style={s.claimBtn} onPress={() => handleClaim(ach.id)}>
                        <Text style={s.claimBtnText}>받기</Text>
                      </Pressable>
                    ) : (
                      <Text style={s.lockIcon}>🔒</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>닫기</Text>
          </Pressable>
        </View>
      </View>
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
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  list: {
    flexGrow: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#3a3a5a",
  },
  itemUnlocked: {
    borderColor: "#FFD700",
    backgroundColor: "#2a2a3e",
  },
  itemIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  itemTitleLocked: {
    color: "#666",
  },
  itemDesc: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  rewardText: {
    color: "#FFD700",
    fontSize: 11,
    marginTop: 3,
  },
  claimWrap: {
    width: 50,
    alignItems: "center",
  },
  checkmark: {
    fontSize: 18,
  },
  lockIcon: {
    fontSize: 16,
    opacity: 0.4,
  },
  claimBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  claimBtnText: {
    color: "#1a1a2e",
    fontSize: 13,
    fontWeight: "bold",
  },
  closeBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: "#2a2a5a",
    borderRadius: 10,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
