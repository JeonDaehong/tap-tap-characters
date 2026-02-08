import { ImageSource } from "./cats";

export interface SkinData {
  id: string;
  name: string;
  description: string;
  catId: string;           // 필요 캐릭터 ID
  medalCost: number;       // 뽑기 1회 비용 (황금)
  dropRate: number;        // 스킨 획득 확률 (0.10 = 10%)
  coinChanceBonus: number; // coinChance에 더할 값 (0.1 = +1%)
  thumbnail: ImageSource;
  detailImage: ImageSource; // 상세 모달용 이미지
  danceFrames: ImageSource[];
  hurtFrames: ImageSource[];
  collapsedFrame: ImageSource;
}

export const ALL_SKINS: SkinData[] = [
  {
    id: "seraph_beach",
    name: "해변의 여신 세라피",
    description: "파도와 함께 춤추는 세라피. 여름 바다의 축복이 깃들어 있다.",
    catId: "seraph",
    medalCost: 100,
    dropRate: 0.10,       // 10%
    coinChanceBonus: 0.1, // +1%
    thumbnail: require("../assets/img/y_skin_21.png"),
    detailImage: require("../assets/img/y_skin_100.png"),
    danceFrames: [
      require("../assets/img/y_skin_1.png"),
      require("../assets/img/y_skin_2.png"),
      require("../assets/img/y_skin_3.png"),
      require("../assets/img/y_skin_4.png"),
      require("../assets/img/y_skin_5.png"),
      require("../assets/img/y_skin_6.png"),
      require("../assets/img/y_skin_7.png"),
      require("../assets/img/y_skin_8.png"),
      require("../assets/img/y_skin_9.png"),
      require("../assets/img/y_skin_10.png"),
      require("../assets/img/y_skin_11.png"),
      require("../assets/img/y_skin_12.png"),
      require("../assets/img/y_skin_13.png"),
      require("../assets/img/y_skin_14.png"),
      require("../assets/img/y_skin_21.png"),
      require("../assets/img/y_skin_22.png"),
    ],
    hurtFrames: [
      require("../assets/img/y_skin_15.png"),
      require("../assets/img/y_skin_16.png"),
      require("../assets/img/y_skin_17.png"),
      require("../assets/img/y_skin_18.png"),
      require("../assets/img/y_skin_19.png"),
    ],
    collapsedFrame: require("../assets/img/y_skin_20.png"),
  },
];

export const SKIN_GACHA_COST = 100; // 황금

// 스킨 뽑기 결과
export type SkinGachaResult =
  | { type: "skin" }           // 10% - 스킨 획득
  | { type: "full_refund" }    // 20% - 황금 전액 환급
  | { type: "half_refund" }    // 20% - 황금 절반 환급
  | { type: "nothing" };       // 50% - 꽝

export function rollSkinGacha(): SkinGachaResult {
  const rand = Math.random();
  if (rand < 0.10) return { type: "skin" };
  if (rand < 0.30) return { type: "full_refund" };
  if (rand < 0.50) return { type: "half_refund" };
  return { type: "nothing" };
}

export function getSkinByCatId(catId: string): SkinData[] {
  return ALL_SKINS.filter(s => s.catId === catId);
}

export function getSkinById(skinId: string): SkinData | undefined {
  return ALL_SKINS.find(s => s.id === skinId);
}
