import AsyncStorage from "@react-native-async-storage/async-storage";

const SCORE_KEY = "cat_tap_score";
const COINS_KEY = "cat_tap_coins";
const COLLECTION_KEY = "cat_tap_collection";
const SELECTED_CAT_KEY = "cat_tap_selected";
const TUTORIAL_KEY = "cat_tap_tutorial";
const HP_KEY = "cat_tap_hp";
const ACHIEVEMENTS_KEY = "cat_tap_achievements";
const HP_ZERO_COUNT_KEY = "cat_tap_hp_zero_count";
const SFX_ENABLED_KEY = "cat_tap_sfx_enabled";
const BGM_ENABLED_KEY = "cat_tap_bgm_enabled";
const ENHANCEMENT_KEY = "cat_tap_enhancement";
const MEDALS_KEY = "cat_tap_medals";
const OWNED_SKINS_KEY = "cat_tap_owned_skins";
const EQUIPPED_SKINS_KEY = "cat_tap_equipped_skins";

// --- Score ---
export async function getScore(): Promise<number> {
  const v = await AsyncStorage.getItem(SCORE_KEY);
  return v ? parseInt(v, 10) : 0;
}
export async function setScore(score: number): Promise<void> {
  await AsyncStorage.setItem(SCORE_KEY, score.toString());
}

// --- Coins ---
export async function getCoins(): Promise<number> {
  const v = await AsyncStorage.getItem(COINS_KEY);
  return v ? parseInt(v, 10) : 0;
}
export async function setCoins(coins: number): Promise<void> {
  await AsyncStorage.setItem(COINS_KEY, coins.toString());
}

// --- Collection ---
export async function getCollection(): Promise<string[]> {
  const v = await AsyncStorage.getItem(COLLECTION_KEY);
  return v ? JSON.parse(v) : [];
}
export async function addToCollection(catId: string): Promise<string[]> {
  const collection = await getCollection();
  if (!collection.includes(catId)) {
    collection.push(catId);
    await AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  }
  return collection;
}

// --- Selected Cat ---
export async function getSelectedCat(): Promise<string> {
  const v = await AsyncStorage.getItem(SELECTED_CAT_KEY);
  return v ?? "";
}
export async function setSelectedCat(catId: string): Promise<void> {
  await AsyncStorage.setItem(SELECTED_CAT_KEY, catId);
}

// --- Tutorial ---
export async function getTutorialComplete(): Promise<boolean> {
  const v = await AsyncStorage.getItem(TUTORIAL_KEY);
  return v === "true";
}
export async function setTutorialComplete(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_KEY, "true");
}
export async function getTutorialStep(): Promise<number> {
  const v = await AsyncStorage.getItem("cat_tap_tutorial_step");
  return v ? parseInt(v, 10) : 0;
}
export async function setTutorialStep(step: number): Promise<void> {
  await AsyncStorage.setItem("cat_tap_tutorial_step", step.toString());
}
export async function getTutorialCatId(): Promise<string> {
  return (await AsyncStorage.getItem("cat_tap_tutorial_cat")) ?? "";
}
export async function setTutorialCatId(catId: string): Promise<void> {
  await AsyncStorage.setItem("cat_tap_tutorial_cat", catId);
}

// --- HP System ---
export interface CatHPData {
  hp: number;
  lastUpdate: number; // timestamp ms
  tapCount: number;   // accumulated taps since last HP loss
}

async function getAllHP(): Promise<Record<string, CatHPData>> {
  const v = await AsyncStorage.getItem(HP_KEY);
  return v ? JSON.parse(v) : {};
}

async function saveAllHP(data: Record<string, CatHPData>): Promise<void> {
  await AsyncStorage.setItem(HP_KEY, JSON.stringify(data));
}

export async function getCatHP(catId: string): Promise<CatHPData> {
  const all = await getAllHP();
  const now = Date.now();
  if (!all[catId]) {
    return { hp: 100, lastUpdate: now, tapCount: 0 };
  }
  // Apply time-based regen
  const data = all[catId];
  const minutesPassed = Math.floor((now - data.lastUpdate) / 60000);
  if (minutesPassed > 0) {
    data.hp = Math.min(100, data.hp + minutesPassed);
    data.lastUpdate = now;
    all[catId] = data;
    await saveAllHP(all);
  }
  return data;
}

export async function setCatHP(catId: string, hp: number, tapCount: number): Promise<void> {
  const all = await getAllHP();
  all[catId] = { hp: Math.max(0, Math.min(100, hp)), lastUpdate: Date.now(), tapCount };
  await saveAllHP(all);
}

export async function initCatHP(catId: string): Promise<void> {
  const all = await getAllHP();
  if (!all[catId]) {
    all[catId] = { hp: 100, lastUpdate: Date.now(), tapCount: 0 };
    await saveAllHP(all);
  }
}

// --- Achievements ---
export async function getUnlockedAchievements(): Promise<string[]> {
  const v = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
  return v ? JSON.parse(v) : [];
}

export async function unlockAchievement(id: string): Promise<string[]> {
  const unlocked = await getUnlockedAchievements();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  }
  return unlocked;
}

// --- HP Zero Counter ---
export async function getHpZeroCount(): Promise<number> {
  const v = await AsyncStorage.getItem(HP_ZERO_COUNT_KEY);
  return v ? parseInt(v, 10) : 0;
}

export async function incrementHpZeroCount(): Promise<number> {
  const count = (await getHpZeroCount()) + 1;
  await AsyncStorage.setItem(HP_ZERO_COUNT_KEY, count.toString());
  return count;
}

// --- Sound Settings ---
export async function getSfxEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(SFX_ENABLED_KEY);
  return v !== "false"; // default true
}
export async function setSfxEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SFX_ENABLED_KEY, enabled.toString());
}
export async function getBgmEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(BGM_ENABLED_KEY);
  return v !== "false"; // default true
}
export async function setBgmEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BGM_ENABLED_KEY, enabled.toString());
}

// --- Medals ---
export async function getMedals(): Promise<number> {
  const v = await AsyncStorage.getItem(MEDALS_KEY);
  return v ? parseInt(v, 10) : 0;
}
export async function setMedals(medals: number): Promise<void> {
  await AsyncStorage.setItem(MEDALS_KEY, medals.toString());
}

// --- Owned Skins ---
export async function getOwnedSkins(): Promise<string[]> {
  const v = await AsyncStorage.getItem(OWNED_SKINS_KEY);
  return v ? JSON.parse(v) : [];
}
export async function addOwnedSkin(skinId: string): Promise<string[]> {
  const skins = await getOwnedSkins();
  if (!skins.includes(skinId)) {
    skins.push(skinId);
    await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(skins));
  }
  return skins;
}

// --- Equipped Skins (per cat) ---
async function getAllEquippedSkins(): Promise<Record<string, string>> {
  const v = await AsyncStorage.getItem(EQUIPPED_SKINS_KEY);
  return v ? JSON.parse(v) : {};
}
export async function getEquippedSkin(catId: string): Promise<string> {
  const all = await getAllEquippedSkins();
  return all[catId] ?? "";
}
export async function getAllEquippedSkinsData(): Promise<Record<string, string>> {
  return getAllEquippedSkins();
}
export async function setEquippedSkin(catId: string, skinId: string): Promise<void> {
  const all = await getAllEquippedSkins();
  all[catId] = skinId;
  await AsyncStorage.setItem(EQUIPPED_SKINS_KEY, JSON.stringify(all));
}
export async function clearEquippedSkin(catId: string): Promise<void> {
  const all = await getAllEquippedSkins();
  delete all[catId];
  await AsyncStorage.setItem(EQUIPPED_SKINS_KEY, JSON.stringify(all));
}

// --- Mini-game Daily Reset ---
const MINIGAME_KEY = "cat_tap_minigame";

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getMinigamePlayed(gameId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(`${MINIGAME_KEY}_${gameId}`);
  return v === getTodayStr();
}

export async function setMinigamePlayed(gameId: string): Promise<void> {
  await AsyncStorage.setItem(`${MINIGAME_KEY}_${gameId}`, getTodayStr());
}

// --- Expedition System ---
const EXPEDITION_KEY = "cat_tap_expedition";

export interface ExpeditionSlot {
  catId: string;
  startTime: number;   // timestamp ms
  duration: number;     // duration ms
  baseReward: number;
  status: "idle" | "active" | "complete";
}

export async function getExpeditions(): Promise<ExpeditionSlot[]> {
  const v = await AsyncStorage.getItem(EXPEDITION_KEY);
  const slots: ExpeditionSlot[] = v ? JSON.parse(v) : [
    { catId: "", startTime: 0, duration: 0, baseReward: 0, status: "idle" },
    { catId: "", startTime: 0, duration: 0, baseReward: 0, status: "idle" },
    { catId: "", startTime: 0, duration: 0, baseReward: 0, status: "idle" },
  ];
  // Auto-complete expired expeditions
  const now = Date.now();
  for (const slot of slots) {
    if (slot.status === "active" && now >= slot.startTime + slot.duration) {
      slot.status = "complete";
    }
  }
  await AsyncStorage.setItem(EXPEDITION_KEY, JSON.stringify(slots));
  return slots;
}

export async function setExpeditions(slots: ExpeditionSlot[]): Promise<void> {
  await AsyncStorage.setItem(EXPEDITION_KEY, JSON.stringify(slots));
}

// --- Quest System ---
const QUEST_KEY = "cat_tap_quest";

export interface QuestProgress {
  // daily
  dailyTaps: number;
  dailyGachaPulls: number;
  dailyMinigames: number;
  dailyCoinsEarned: number;
  dailyClaimed: boolean[];
  dailyDate: string;
  // weekly
  weeklyTaps: number;
  weeklyGachaPulls: number;
  weeklyEnhancements: number;
  weeklyMinigames: number;
  weeklyClaimed: boolean[];
  weeklyStartDate: string;
}

export const DEFAULT_QUEST_PROGRESS: QuestProgress = {
  dailyTaps: 0,
  dailyGachaPulls: 0,
  dailyMinigames: 0,
  dailyCoinsEarned: 0,
  dailyClaimed: [false, false, false, false, false],
  dailyDate: "",
  weeklyTaps: 0,
  weeklyGachaPulls: 0,
  weeklyEnhancements: 0,
  weeklyMinigames: 0,
  weeklyClaimed: [false, false, false, false, false],
  weeklyStartDate: "",
};

function getWeekStartStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export async function getQuestProgress(): Promise<QuestProgress> {
  const v = await AsyncStorage.getItem(QUEST_KEY);
  let q: QuestProgress = v ? JSON.parse(v) : { ...DEFAULT_QUEST_PROGRESS };
  const today = getTodayStr();
  const weekStart = getWeekStartStr();
  let changed = false;
  // Reset daily if date changed
  if (q.dailyDate !== today) {
    q.dailyTaps = 0;
    q.dailyGachaPulls = 0;
    q.dailyMinigames = 0;
    q.dailyCoinsEarned = 0;
    q.dailyClaimed = [false, false, false, false, false];
    q.dailyDate = today;
    changed = true;
  }
  // Reset weekly if week changed
  if (q.weeklyStartDate !== weekStart) {
    q.weeklyTaps = 0;
    q.weeklyGachaPulls = 0;
    q.weeklyEnhancements = 0;
    q.weeklyMinigames = 0;
    q.weeklyClaimed = [false, false, false, false, false];
    q.weeklyStartDate = weekStart;
    changed = true;
  }
  if (changed) {
    await AsyncStorage.setItem(QUEST_KEY, JSON.stringify(q));
  }
  return q;
}

export async function setQuestProgress(q: QuestProgress): Promise<void> {
  await AsyncStorage.setItem(QUEST_KEY, JSON.stringify(q));
}

// --- Enhancement System ---
export interface EnhancementData {
  level: number;      // 0~5강
  duplicates: number; // 보유 중복 재료 수
}

async function getAllEnhancements(): Promise<Record<string, EnhancementData>> {
  const v = await AsyncStorage.getItem(ENHANCEMENT_KEY);
  return v ? JSON.parse(v) : {};
}

async function saveAllEnhancements(data: Record<string, EnhancementData>): Promise<void> {
  await AsyncStorage.setItem(ENHANCEMENT_KEY, JSON.stringify(data));
}

export async function getCatEnhancement(catId: string): Promise<EnhancementData> {
  const all = await getAllEnhancements();
  return all[catId] ?? { level: 0, duplicates: 0 };
}

export async function getAllCatEnhancements(): Promise<Record<string, EnhancementData>> {
  return getAllEnhancements();
}

export async function addCatDuplicate(catId: string): Promise<EnhancementData> {
  const all = await getAllEnhancements();
  if (!all[catId]) all[catId] = { level: 0, duplicates: 0 };
  all[catId].duplicates += 1;
  await saveAllEnhancements(all);
  return all[catId];
}

export async function enhanceCat(catId: string): Promise<EnhancementData | null> {
  const all = await getAllEnhancements();
  if (!all[catId]) all[catId] = { level: 0, duplicates: 0 };
  const data = all[catId];
  const cost = data.level + 1; // 0→1: 1개, 1→2: 2개, ...
  if (data.level >= 5 || data.duplicates < cost) return null;
  data.duplicates -= cost;
  data.level += 1;
  await saveAllEnhancements(all);
  return data;
}
