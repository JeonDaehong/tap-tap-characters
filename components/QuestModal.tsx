import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { QuestProgress } from "../utils/storage";

// ── Quest Definitions ───────────────────────────────────────────────────────

interface QuestDef {
  icon: string;
  title: string;
  target: number;
  rewardCoins: number;
  rewardMedals: number;
}

const DAILY_QUESTS: QuestDef[] = [
  { icon: "👆", title: "탭 100회", target: 100, rewardCoins: 50, rewardMedals: 0 },
  { icon: "🎰", title: "캐릭터 뽑기 3회", target: 3, rewardCoins: 100, rewardMedals: 0 },
  { icon: "🎮", title: "미니게임 참여", target: 1, rewardCoins: 50, rewardMedals: 0 },
  { icon: "🪙", title: "코인 500 획득", target: 500, rewardCoins: 0, rewardMedals: 30 },
  { icon: "🏅", title: "모든 일일 과제 완료", target: 1, rewardCoins: 200, rewardMedals: 50 },
];

const WEEKLY_QUESTS: QuestDef[] = [
  { icon: "👆", title: "탭 3000회", target: 3000, rewardCoins: 300, rewardMedals: 0 },
  { icon: "🎰", title: "캐릭터 뽑기 20회", target: 20, rewardCoins: 500, rewardMedals: 0 },
  { icon: "⚔️", title: "강화 3회 성공", target: 3, rewardCoins: 0, rewardMedals: 100 },
  { icon: "🎮", title: "미니게임 5회 참여", target: 5, rewardCoins: 200, rewardMedals: 0 },
  { icon: "🏅", title: "모든 주간 과제 완료", target: 1, rewardCoins: 1000, rewardMedals: 200 },
];

// ── Helper: get current progress value for a quest ──────────────────────────

function getDailyProgress(qp: QuestProgress, index: number): number {
  switch (index) {
    case 0: return qp.dailyTaps;
    case 1: return qp.dailyGachaPulls;
    case 2: return qp.dailyMinigames;
    case 3: return qp.dailyCoinsEarned;
    case 4: {
      // "Complete all" quest: check if first 4 daily quests are claimed
      const allPrevClaimed = qp.dailyClaimed
        .slice(0, 4)
        .every((c) => c === true);
      return allPrevClaimed ? 1 : 0;
    }
    default: return 0;
  }
}

function getWeeklyProgress(qp: QuestProgress, index: number): number {
  switch (index) {
    case 0: return qp.weeklyTaps;
    case 1: return qp.weeklyGachaPulls;
    case 2: return qp.weeklyEnhancements;
    case 3: return qp.weeklyMinigames;
    case 4: {
      const allPrevClaimed = qp.weeklyClaimed
        .slice(0, 4)
        .every((c) => c === true);
      return allPrevClaimed ? 1 : 0;
    }
    default: return 0;
  }
}

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number, medals: number) => void;
  onClaimQuest: (questType: "daily" | "weekly", index: number) => void;
  questProgress: QuestProgress;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function QuestModal({
  visible,
  onClose,
  onReward,
  onClaimQuest,
  questProgress,
}: Props) {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  const quests = activeTab === "daily" ? DAILY_QUESTS : WEEKLY_QUESTS;
  const claimed = activeTab === "daily"
    ? questProgress.dailyClaimed
    : questProgress.weeklyClaimed;

  // Count completed daily / weekly quests for the subtitle
  const dailyCompleted = useMemo(
    () => questProgress.dailyClaimed.filter(Boolean).length,
    [questProgress.dailyClaimed],
  );
  const weeklyCompleted = useMemo(
    () => questProgress.weeklyClaimed.filter(Boolean).length,
    [questProgress.weeklyClaimed],
  );

  const handleClaim = (index: number) => {
    const quest = quests[index];
    onClaimQuest(activeTab, index);
    onReward(quest.rewardCoins, quest.rewardMedals);
  };

  // ── Reward label ──────────────────────────────────────────────────────────
  const rewardLabel = (q: QuestDef): string => {
    const parts: string[] = [];
    if (q.rewardCoins > 0) parts.push(`${q.rewardCoins} 코인`);
    if (q.rewardMedals > 0) parts.push(`${q.rewardMedals} 황금`);
    return parts.join(" + ");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          {/* ── Title ─────────────────────────────────────────────── */}
          <Text style={s.title}>{"📋 과제"}</Text>

          {/* ── Tab Bar ───────────────────────────────────────────── */}
          <View style={s.tabBar}>
            <Pressable
              style={[s.tab, activeTab === "daily" && s.tabActive]}
              onPress={() => setActiveTab("daily")}
            >
              <Text
                style={[
                  s.tabText,
                  activeTab === "daily" && s.tabTextActive,
                ]}
              >
                {"일일 과제"}
              </Text>
              <Text style={s.tabCount}>
                {dailyCompleted}/{DAILY_QUESTS.length}
              </Text>
            </Pressable>

            <Pressable
              style={[s.tab, activeTab === "weekly" && s.tabActive]}
              onPress={() => setActiveTab("weekly")}
            >
              <Text
                style={[
                  s.tabText,
                  activeTab === "weekly" && s.tabTextActive,
                ]}
              >
                {"주간 과제"}
              </Text>
              <Text style={s.tabCount}>
                {weeklyCompleted}/{WEEKLY_QUESTS.length}
              </Text>
            </Pressable>
          </View>

          {/* ── Quest List ────────────────────────────────────────── */}
          <ScrollView
            style={s.list}
            showsVerticalScrollIndicator={false}
          >
            {quests.map((quest, i) => {
              const progress =
                activeTab === "daily"
                  ? getDailyProgress(questProgress, i)
                  : getWeeklyProgress(questProgress, i);
              const clamped = Math.min(progress, quest.target);
              const isComplete = clamped >= quest.target;
              const isClaimed = claimed[i] ?? false;
              const canClaim = isComplete && !isClaimed;
              const ratio = quest.target > 0 ? clamped / quest.target : 0;

              return (
                <View
                  key={`${activeTab}-${i}`}
                  style={[
                    s.questRow,
                    isClaimed && s.questRowClaimed,
                  ]}
                >
                  {/* Icon */}
                  <View style={s.questIconWrap}>
                    <Text style={s.questIcon}>
                      {isClaimed ? "\u2705" : quest.icon}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={s.questInfo}>
                    <Text
                      style={[
                        s.questTitle,
                        isClaimed && s.questTitleClaimed,
                      ]}
                    >
                      {quest.title}
                    </Text>

                    {/* Progress bar */}
                    <View style={s.progressBarBg}>
                      <View
                        style={[
                          s.progressBarFill,
                          {
                            width: `${Math.min(ratio * 100, 100)}%`,
                            backgroundColor: isClaimed
                              ? "#555"
                              : isComplete
                                ? "#4CAF50"
                                : "#2e7d32",
                          },
                        ]}
                      />
                    </View>

                    <View style={s.questMeta}>
                      <Text style={s.progressText}>
                        {clamped}/{quest.target}
                      </Text>
                      <Text style={s.rewardText}>
                        {"🎁 "}
                        {rewardLabel(quest)}
                      </Text>
                    </View>
                  </View>

                  {/* Claim button */}
                  <View style={s.claimWrap}>
                    {isClaimed ? (
                      <View style={s.claimedBadge}>
                        <Text style={s.claimedBadgeText}>완료</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[
                          s.claimBtn,
                          !canClaim && s.claimBtnDisabled,
                        ]}
                        disabled={!canClaim}
                        onPress={() => handleClaim(i)}
                      >
                        <Text
                          style={[
                            s.claimBtnText,
                            !canClaim && s.claimBtnTextDisabled,
                          ]}
                        >
                          받기
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Close Button ──────────────────────────────────────── */}
          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

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
    width: "92%",
    maxHeight: "85%",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },

  /* ── Tab Bar ─────────────────────────────────────────────────────────────── */
  tabBar: {
    flexDirection: "row",
    marginBottom: 14,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#12122a",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: "#2a2a5a",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  tabText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "bold",
  },
  tabTextActive: {
    color: "#FFD700",
  },
  tabCount: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },

  /* ── Quest List ──────────────────────────────────────────────────────────── */
  list: {
    flexGrow: 0,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#3a3a5a",
  },
  questRowClaimed: {
    borderColor: "#4CAF50",
    backgroundColor: "#1e2e1e",
    opacity: 0.75,
  },

  /* ── Icon ─────────────────────────────────────────────────────────────────── */
  questIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  questIcon: {
    fontSize: 22,
  },

  /* ── Info ─────────────────────────────────────────────────────────────────── */
  questInfo: {
    flex: 1,
    marginRight: 8,
  },
  questTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  questTitleClaimed: {
    color: "#888",
    textDecorationLine: "line-through",
  },

  /* ── Progress Bar ────────────────────────────────────────────────────────── */
  progressBarBg: {
    height: 8,
    backgroundColor: "#1a1a2e",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },

  /* ── Meta (counts + reward) ──────────────────────────────────────────────── */
  questMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    color: "#aaa",
    fontSize: 11,
  },
  rewardText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "bold",
  },

  /* ── Claim Button ────────────────────────────────────────────────────────── */
  claimWrap: {
    width: 56,
    alignItems: "center",
  },
  claimBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  claimBtnDisabled: {
    backgroundColor: "#3a3a5a",
  },
  claimBtnText: {
    color: "#1a1a2e",
    fontSize: 13,
    fontWeight: "bold",
  },
  claimBtnTextDisabled: {
    color: "#666",
  },
  claimedBadge: {
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  claimedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  /* ── Close Button ────────────────────────────────────────────────────────── */
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
