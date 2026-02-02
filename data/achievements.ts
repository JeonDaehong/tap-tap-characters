export interface Achievement {
  id: string;
  title: string;
  description: string; // shown only after unlock
  icon: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "hp_zero_10",
    title: "오늘은.. 일.. 더는 못해요...",
    description: "캐릭터를 HP 0으로 10회 이상 만들기",
    icon: "😵",
  },
  {
    id: "sss_pull",
    title: "드디어 뽑았다!",
    description: "SSS급 캐릭터를 1개 이상 뽑기",
    icon: "🌟",
  },
  {
    id: "collect_10",
    title: "초보 수집가",
    description: "캐릭터 10개 수집하기",
    icon: "📚",
  },
  {
    id: "founder",
    title: "개국공신",
    description: "회원가입 선착 100명 달성",
    icon: "👑",
  },
  {
    id: "score_10k",
    title: "가볍게 탭탭!",
    description: "스코어 1만 달성",
    icon: "👆",
  },
  {
    id: "score_100k",
    title: "즐겁게 탭탭!",
    description: "스코어 10만 달성",
    icon: "🔥",
  },
  {
    id: "score_1m",
    title: "화려하게 탭탭!",
    description: "스코어 100만 달성",
    icon: "💎",
  },
  {
    id: "coins_1000",
    title: "난 돈이 좋아!",
    description: "코인 1000개 보유하기",
    icon: "💰",
  },
  {
    id: "founder_100",
    title: "개국공신",
    description: "회원가입 선착 100명만 획득",
    icon: "🏅",
  },
  {
    id: "first_start",
    title: "오늘부터 탭탭 시작!",
    description: "게임을 처음 시작하기",
    icon: "🎉",
  },
];
