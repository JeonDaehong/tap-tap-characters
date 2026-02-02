import AsyncStorage from "@react-native-async-storage/async-storage";

const SCORE_KEY = "cat_tap_score";
const COINS_KEY = "cat_tap_coins";
const COLLECTION_KEY = "cat_tap_collection";
const SELECTED_CAT_KEY = "cat_tap_selected";
const TUTORIAL_KEY = "cat_tap_tutorial";
const HP_KEY = "cat_tap_hp";
const ACHIEVEMENTS_KEY = "cat_tap_achievements";
const HP_ZERO_COUNT_KEY = "cat_tap_hp_zero_count";

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
