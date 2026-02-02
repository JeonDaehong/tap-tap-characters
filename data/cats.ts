export type CatGrade = "C" | "B" | "A" | "S" | "SS" | "SSS";
export type CatRace = "인간족" | "수인족" | "천족" | "마인" | "골렘족" | "요정족" | "악마" | "기계족";

export interface CatColors {
  body: string;
  belly: string;
  ear: string;
  eye: string;
  nose: string;
  cheek: string;
}

export type ImageSource = ReturnType<typeof require>;

export interface CatData {
  id: string;
  name: string;
  description: string;
  grade: CatGrade;
  race: CatRace;
  colors: CatColors;

  // Images (optional, only 미깡이 has these for now)
  danceFrames?: ImageSource[];
  hurtFrames?: ImageSource[];
  collapsedFrame?: ImageSource;
  thumbnail?: ImageSource;
  listImage?: ImageSource;

  // Effects (grade-derived)
  particleEmoji?: string;       // A+: falling particle emoji
  backgroundColor?: string;     // S+: custom background color
  backgroundImage?: ImageSource; // S+: custom background image
  dialogues?: string[];         // SS+: random speech on tap
}

export interface GradeConfig {
  label: string;
  color: string;
  weight: number;
  scorePerTap: number;
  coinChance: number;     // percent
  danceFrames: number;
  critChance: number;     // percent
  hpLossInterval: number; // taps per 1 HP loss
}

export const GRADE_CONFIG: Record<CatGrade, GradeConfig> = {
  C:   { label: "C",   color: "#888888", weight: 40, scorePerTap: 1, coinChance: 1,   danceFrames: 3,  critChance: 1,  hpLossInterval: 2 },
  B:   { label: "B",   color: "#6B9BD1", weight: 30, scorePerTap: 1, coinChance: 1.1, danceFrames: 5,  critChance: 2,  hpLossInterval: 3  },
  A:   { label: "A",   color: "#9B6BD1", weight: 15, scorePerTap: 1, coinChance: 1.2, danceFrames: 6,  critChance: 3,  hpLossInterval: 5 },
  S:   { label: "S",   color: "#FFD700", weight: 10, scorePerTap: 1, coinChance: 2,   danceFrames: 8,  critChance: 5,  hpLossInterval: 10 },
  SS:  { label: "SS",  color: "#FF69B4", weight: 4,  scorePerTap: 2, coinChance: 2.5, danceFrames: 10, critChance: 5,  hpLossInterval: 20 },
  SSS: { label: "SSS", color: "#FF4444", weight: 1,  scorePerTap: 2, coinChance: 3,   danceFrames: 12, critChance: 10, hpLossInterval: 30 },
};

export const ALL_RACES: CatRace[] = ["인간족", "수인족", "천족", "마인", "골렘족", "요정족", "악마", "기계족"];
export const ALL_GRADES: CatGrade[] = ["SSS", "SS", "S", "A", "B", "C"];

// Grade feature helpers
export function hasParticleEffect(grade: CatGrade): boolean {
  return ["A", "S", "SS", "SSS"].includes(grade);
}
export function hasCustomBackground(grade: CatGrade): boolean {
  return ["S", "SS", "SSS"].includes(grade);
}
export function hasDialogue(grade: CatGrade): boolean {
  return ["SS", "SSS"].includes(grade);
}
export function hasSFX(grade: CatGrade): boolean {
  return ["SS", "SSS"].includes(grade);
}

export const ALL_CATS: CatData[] = [
  // === C Grade ===
  {
    id: "slime",
    name: "슬라임",
    description: "말랑말랑한 슬라임. 만지면 찰싹 달라붙는다. 의외로 귀엽다.",
    grade: "C",
    race: "악마",
    colors: { body: "#7CFC00", belly: "#ADFF2F", ear: "#32CD32", eye: "#222", nose: "#228B22", cheek: "#90EE90" },
    danceFrames: [
      require("../assets/img/s_1.png"),
      require("../assets/img/s_2.png"),
      require("../assets/img/s_3.png"),
      require("../assets/img/s_4.png"),
      require("../assets/img/s_5.png"),
    ],
    hurtFrames: [
      require("../assets/img/s_6.png"),
      require("../assets/img/s_7.png"),
      require("../assets/img/s_8.png"),
    ],
    collapsedFrame: require("../assets/img/s_9.png"),
    thumbnail: require("../assets/img/s_100.png"),
    listImage: require("../assets/img/s_1.png"),
  },
  {
    id: "mushroom",
    name: "버섯돌이",
    description: "축축한 곳에서 자란 귀여운 버섯. 독이 있을 것 같지만 의외로 무해하다.",
    grade: "C",
    race: "악마",
    colors: { body: "#CD853F", belly: "#FAEBD7", ear: "#8B4513", eye: "#222", nose: "#A0522D", cheek: "#DEB887" },
    danceFrames: [
      require("../assets/img/mush_1.png"),
      require("../assets/img/mush_2.png"),
      require("../assets/img/mush_3.png"),
      require("../assets/img/mush_4.png"),
      require("../assets/img/mush_5.png"),
    ],
    hurtFrames: [
      require("../assets/img/mush_6.png"),
      require("../assets/img/mush_7.png"),
      require("../assets/img/mush_8.png"),
    ],
    collapsedFrame: require("../assets/img/mush_9.png"),
    thumbnail: require("../assets/img/mush_100.png"),
    listImage: require("../assets/img/mush_1.png"),
  },
  // === B Grade ===
  {
    id: "byte",
    name: "바이트",
    description: "기계 부품으로 이루어진 로봇 거미. 가끔 삐빅 소리를 내며 감정을 표현한다.",
    grade: "B",
    race: "기계족",
    colors: { body: "#A8A8A8", belly: "#D0D0D0", ear: "#707070", eye: "#00FFFF", nose: "#808080", cheek: "#B0B0B0" },
    danceFrames: [
      require("../assets/img/metal_1.png"),
      require("../assets/img/metal_2.png"),
      require("../assets/img/metal_3.png"),
      require("../assets/img/metal_4.png"),
      require("../assets/img/metal_5.png"),
      require("../assets/img/metal_6.png"),
    ],
    hurtFrames: [
      require("../assets/img/metal_7.png"),
      require("../assets/img/metal_8.png"),
      require("../assets/img/metal_9.png"),
      require("../assets/img/metal_10.png"),
    ],
    collapsedFrame: require("../assets/img/metal_11.png"),
    thumbnail: require("../assets/img/metal_100.png"),
    listImage: require("../assets/img/metal_1.png"),
  },
  // === A Grade ===
  {
    id: "orange",
    name: "아이돌 미나",
    description: "무대 위에서 빛나는 톱스타 아이돌! 팬들의 환호에 에너지를 얻는다.",
    grade: "A",
    race: "인간족",
    colors: { body: "#F4A460", belly: "#FAEBD7", ear: "#D2691E", eye: "#222", nose: "#FFB6C1", cheek: "#FFB6C1" },
    danceFrames: [
      require("../assets/img/c_1.png"),
      require("../assets/img/c_2.png"),
      require("../assets/img/c_3.png"),
      require("../assets/img/c_4.png"),
      require("../assets/img/c_5.png"),
      require("../assets/img/c_6.png"),
      require("../assets/img/c_7.png"),
      require("../assets/img/c_8.png"),
    ],
    hurtFrames: [
      require("../assets/img/c_9.png"),
      require("../assets/img/c_10.png"),
      require("../assets/img/c_11.png"),
      require("../assets/img/c_12.png"),
      require("../assets/img/c_13.png"),
      require("../assets/img/c_14.png"),
    ],
    collapsedFrame: require("../assets/img/c_15.png"),
    thumbnail: require("../assets/img/c_100.png"),
    listImage: require("../assets/img/c_1.png"),
    particleEmoji: "🍓",
  },
  // === S Grade ===
  {
    id: "lumiel",
    name: "성기사 루미엘",
    description: "신성한 빛의 힘을 다루는 성기사. 어둠을 정화하는 것이 그녀의 사명이다.",
    grade: "S",
    race: "인간족",
    colors: { body: "#F5E6CA", belly: "#FFF8F0", ear: "#D4AF37", eye: "#4169E1", nose: "#FFB6C1", cheek: "#FFDAB9" },
    danceFrames: [
      require("../assets/img/m_1.png"),
      require("../assets/img/m_2.png"),
      require("../assets/img/m_3.png"),
      require("../assets/img/m_4.png"),
      require("../assets/img/m_5.png"),
      require("../assets/img/m_6.png"),
      require("../assets/img/m_7.png"),
      require("../assets/img/m_8.png"),
      require("../assets/img/m_9.png"),
      require("../assets/img/m_10.png"),
    ],
    hurtFrames: [
      require("../assets/img/m_11.png"),
      require("../assets/img/m_12.png"),
      require("../assets/img/m_13.png"),
    ],
    collapsedFrame: require("../assets/img/m_14.png"),
    thumbnail: require("../assets/img/m_100.png"),
    listImage: require("../assets/img/m_1.png"),
    particleEmoji: "✨",
    backgroundColor: "#1a1040",
  },
];

export const GACHA_COST = 100;

export function rollGacha(): CatData {
  const entries = Object.entries(GRADE_CONFIG) as [CatGrade, GradeConfig][];
  const totalWeight = entries.reduce((s, [, c]) => s + c.weight, 0);
  let rand = Math.random() * totalWeight;

  let targetGrade: CatGrade = "C";
  for (const [grade, config] of entries) {
    rand -= config.weight;
    if (rand <= 0) {
      targetGrade = grade;
      break;
    }
  }

  const pool = ALL_CATS.filter(c => c.grade === targetGrade);
  if (pool.length === 0) {
    // Fallback: pick random from all cats if no cat exists for this grade
    return ALL_CATS[Math.floor(Math.random() * ALL_CATS.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
