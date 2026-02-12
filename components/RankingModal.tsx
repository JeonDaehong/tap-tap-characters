import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { ALL_CATS } from "../data/cats";

interface Props {
  visible: boolean;
  onClose: () => void;
  score: number;
  collection: string[];
}

interface BotPlayer {
  name: string;
  score: number;
  collection: number;
}

const BOT_NAMES = [
  "탭마스터", "냥이집사", "럭키스타", "다크호스", "골드핑거",
  "스피드킹", "드래곤킬러", "별빛기사", "폭풍탭", "미스터탭",
  "슈퍼노바", "탭의신", "은빛여우", "블레이즈", "천재뽑기",
  "무한탭탭", "코인헌터", "레전드", "피닉스", "쉐도우",
];

function generateBots(weekSeed: string): BotPlayer[] {
  // Simple seeded random based on week string
  let seed = 0;
  for (let i = 0; i < weekSeed.length; i++) {
    seed = ((seed << 5) - seed + weekSeed.charCodeAt(i)) | 0;
  }
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  return BOT_NAMES.map((name) => ({
    name,
    score: Math.floor(rand() * 500000) + 1000,
    collection: Math.floor(rand() * ALL_CATS.length) + 1,
  }));
}

function getWeekStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
}

export default function RankingModal({ visible, onClose, score, collection }: Props) {
  const [rankings, setRankings] = useState<{ name: string; score: number; isPlayer: boolean }[]>([]);
  const [playerRank, setPlayerRank] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const bots = generateBots(getWeekStr());
    const all = [
      ...bots.map((b) => ({ name: b.name, score: b.score, isPlayer: false })),
      { name: "나", score, isPlayer: true },
    ];
    all.sort((a, b) => b.score - a.score);
    setRankings(all);
    setPlayerRank(all.findIndex((r) => r.isPlayer) + 1);
  }, [visible, score]);

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return "#aaa";
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          <Text style={s.title}>🏆 주간 랭킹</Text>
          <View style={s.divider} />

          {/* Player stats */}
          <View style={s.playerCard}>
            <Text style={s.playerRank}>내 순위: {playerRank}위</Text>
            <View style={s.playerStats}>
              <View style={s.statItem}>
                <Text style={s.statLabel}>점수</Text>
                <Text style={s.statValue}>{score.toLocaleString()}</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statLabel}>수집</Text>
                <Text style={s.statValue}>{collection.length}/{ALL_CATS.length}</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statLabel}>달성률</Text>
                <Text style={s.statValue}>{Math.floor((collection.length / ALL_CATS.length) * 100)}%</Text>
              </View>
            </View>
          </View>

          {/* Leaderboard */}
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {rankings.map((r, i) => (
              <View
                key={i}
                style={[s.row, r.isPlayer && s.rowPlayer]}
              >
                <Text style={[s.rankNum, { color: getRankColor(i + 1) }]}>
                  {getRankEmoji(i + 1)}
                </Text>
                <Text style={[s.rowName, r.isPlayer && s.rowNamePlayer]} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={[s.rowScore, r.isPlayer && s.rowScorePlayer]}>
                  {r.score.toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Text style={s.resetNote}>매주 월요일 초기화</Text>

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
    width: "88%",
    maxWidth: 380,
    maxHeight: "80%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.2)",
  },
  title: {
    color: "#FFD700",
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
  playerCard: {
    width: "100%",
    backgroundColor: "rgba(100,120,255,0.12)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.25)",
  },
  playerRank: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  playerStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  list: {
    width: "100%",
    maxHeight: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "rgba(35,35,70,0.5)",
  },
  rowPlayer: {
    backgroundColor: "rgba(100,120,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.4)",
  },
  rankNum: {
    width: 32,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  rowName: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
  },
  rowNamePlayer: {
    color: "#FFD700",
    fontWeight: "bold",
  },
  rowScore: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "bold",
  },
  rowScorePlayer: {
    color: "#FFD700",
  },
  resetNote: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    marginTop: 8,
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
});
