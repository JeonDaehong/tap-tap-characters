import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
  AppState,
  AppStateStatus,
  BackHandler,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Audio } from "expo-av";
import CuteCat, { AnimationState } from "../components/CuteCat";
import GachaModal from "../components/GachaModal";
import SlotMachineModal from "../components/SlotMachineModal";
import SkinGachaModal from "../components/SkinGachaModal";
import FallingParticles from "../components/FallingParticles";
import HPBar from "../components/HPBar";
import AchievementModal from "../components/AchievementModal";
import AchievementCelebration from "../components/AchievementCelebration";
import { ALL_ACHIEVEMENTS, Achievement } from "../data/achievements";
import {
  ALL_CATS,
  CatData,
  GACHA_COST,
  GRADE_CONFIG,
  rollGacha,
  hasParticleEffect,
  hasCustomBackground,
  hasDarkStormEffect,
  getEnhancedConfig,
} from "../data/cats";
import { SkinData, SkinGachaResult, SKIN_GACHA_COST, getSkinById } from "../data/skins";
import MemoryGameModal from "../components/MemoryGameModal";
import FortuneModal from "../components/FortuneModal";
import ExpeditionModal from "../components/ExpeditionModal";
import QuestModal from "../components/QuestModal";
import RankingModal from "../components/RankingModal";
import BossBattleModal from "../components/BossBattleModal";
import AttendanceModal from "../components/AttendanceModal";
import * as storage from "../utils/storage";

export default function GameScreen() {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [danceFrame, setDanceFrame] = useState(0);
  const [collection, setCollection] = useState<string[]>([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [hp, setHp] = useState(100);
  const [tapCount, setTapCount] = useState(0);
  const [enhanceLevel, setEnhanceLevel] = useState(0);
  const [medals, setMedals] = useState(0);
  const [ownedSkins, setOwnedSkins] = useState<string[]>([]);
  const [equippedSkinId, setEquippedSkinId] = useState("");

  const [slotVisible, setSlotVisible] = useState(false);
  const [skinGachaVisible, setSkinGachaVisible] = useState(false);

  const [particleTrigger, setParticleTrigger] = useState(0);
  const [gachaVisible, setGachaVisible] = useState(false);
  const [gachaResult, setGachaResult] = useState<CatData | null>(null);
  const [gachaIsNew, setGachaIsNew] = useState(false);
  const [gachaForced, setGachaForced] = useState(false);

  const [critText, setCritText] = useState(false);
  const [coinPopup, setCoinPopup] = useState(false);
  const [holyFlash, setHolyFlash] = useState(false);
  const [darkStorm, setDarkStorm] = useState(false);
  const [gachaMenuVisible, setGachaMenuVisible] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [insufficientMsg, setInsufficientMsg] = useState("");
  const [miniGameMenuVisible, setMiniGameMenuVisible] = useState(false);
  const [memoryGameVisible, setMemoryGameVisible] = useState(false);
  const [fortuneVisible, setFortuneVisible] = useState(false);
  const [expeditionVisible, setExpeditionVisible] = useState(false);
  const [questVisible, setQuestVisible] = useState(false);
  const [rankingVisible, setRankingVisible] = useState(false);
  const [bossVisible, setBossVisible] = useState(false);
  const [attendanceVisible, setAttendanceVisible] = useState(false);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [questProgress, setQuestProgress] = useState<storage.QuestProgress>(storage.DEFAULT_QUEST_PROGRESS);
  const [enhancements, setEnhancements] = useState<Record<string, storage.EnhancementData>>({});

  const [tutorialDone, setTutorialDone] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0); // 0=done, 1=tap 뽑기, 2=tap 일반뽑기, 3=tap 컬렉션
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [celebratingAchievement, setCelebratingAchievement] = useState<Achievement | null>(null);
  const celebrationQueue = useRef<Achievement[]>([]);

  const bounceAnim = useRef(new Animated.Value(1)).current;
  const flinchAnim = useRef(new Animated.Value(0)).current;
  const critOpacity = useRef(new Animated.Value(0)).current;
  const critScale = useRef(new Animated.Value(0.5)).current;
  const coinOpacity = useRef(new Animated.Value(0)).current;
  const coinTranslateY = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const critSoundRef = useRef<Audio.Sound | null>(null);
  const darkSoundRef = useRef<Audio.Sound | null>(null);
  const darkCritSoundRef = useRef<Audio.Sound | null>(null);
  const holyAuraScale = useRef(new Animated.Value(0.3)).current;
  const holyAuraOpacity = useRef(new Animated.Value(0)).current;
  const holyAura2Scale = useRef(new Animated.Value(0.2)).current;
  const holyAura2Opacity = useRef(new Animated.Value(0)).current;
  const holyRingRotation = useRef(new Animated.Value(0)).current;
  const holyRingOpacity = useRef(new Animated.Value(0)).current;
  const darkStormOpacity = useRef(new Animated.Value(0)).current;
  const auraScale = useRef(new Animated.Value(0)).current;
  const auraOpacity = useRef(new Animated.Value(0)).current;
  const aura2Scale = useRef(new Animated.Value(0)).current;
  const aura2Opacity = useRef(new Animated.Value(0)).current;
  const aura3Scale = useRef(new Animated.Value(0)).current;
  const aura3Opacity = useRef(new Animated.Value(0)).current;
  const darkPulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/meow.wav"),
        { volume: 0.3 }
      );
      soundRef.current = sound;
      try {
        const { sound: cs } = await Audio.Sound.createAsync(
          require("../assets/sfx/critical.wav"),
          { volume: 0.4 }
        );
        critSoundRef.current = cs;
      } catch {}
      try {
        const { sound: ds } = await Audio.Sound.createAsync(
          require("../assets/sfx/dark.mp3"),
          { volume: 0.5 }
        );
        darkSoundRef.current = ds;
      } catch {}
      try {
        const { sound: dcs } = await Audio.Sound.createAsync(
          require("../assets/sfx/dark_cri.mp3"),
          { volume: 0.6 }
        );
        darkCritSoundRef.current = dcs;
      } catch {}
    })();
    return () => {
      soundRef.current?.unloadAsync();
      critSoundRef.current?.unloadAsync();
      darkSoundRef.current?.unloadAsync();
      darkCritSoundRef.current?.unloadAsync();
    };
  }, []);

  const [exitModalVisible, setExitModalVisible] = useState(false);

  // Handle Android back button - show exit confirmation
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (gachaVisible || gachaMenuVisible || achievementModalVisible || comingSoonVisible || slotVisible || skinGachaVisible || miniGameMenuVisible || memoryGameVisible || fortuneVisible || expeditionVisible || questVisible || rankingVisible || bossVisible || attendanceVisible || moreMenuVisible) {
        return false;
      }
      setExitModalVisible(true);
      return true;
    });
    return () => backHandler.remove();
  }, [gachaVisible, gachaMenuVisible, achievementModalVisible, comingSoonVisible, slotVisible, skinGachaVisible, miniGameMenuVisible, memoryGameVisible, fortuneVisible, expeditionVisible, questVisible, rankingVisible, bossVisible, attendanceVisible, moreMenuVisible]);

  // HP regen timer
  useEffect(() => {
    if (!selectedCatId) return;
    const interval = setInterval(() => {
      setHp(prev => {
        const newHp = Math.min(100, prev + 1);
        storage.setCatHP(selectedCatId, newHp, tapCount);
        return newHp;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedCatId, tapCount]);

  // Reload HP when app comes back from background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && selectedCatId) {
        const hpData = await storage.getCatHP(selectedCatId);
        setHp(hpData.hp);
        setTapCount(hpData.tapCount);
      }
    });
    return () => subscription.remove();
  }, [selectedCatId]);

  const showCelebration = useCallback((ach: Achievement) => {
    if (celebratingAchievement) {
      celebrationQueue.current.push(ach);
    } else {
      setCelebratingAchievement(ach);
    }
  }, [celebratingAchievement]);

  const onCelebrationDone = useCallback(() => {
    const next = celebrationQueue.current.shift();
    setCelebratingAchievement(next ?? null);
  }, []);

  const tryUnlock = useCallback(async (id: string) => {
    const current = await storage.getUnlockedAchievements();
    if (current.includes(id)) return;
    const updated = await storage.unlockAchievement(id);
    setUnlockedAchievements(updated);
    const ach = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (ach) showCelebration(ach);
  }, [showCelebration]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, c, sel, co, tut, achList, sfx, med, oSkins] = await Promise.all([
          storage.getScore(),
          storage.getCollection(),
          storage.getSelectedCat(),
          storage.getCoins(),
          storage.getTutorialComplete(),
          storage.getUnlockedAchievements(),
          storage.getSfxEnabled(),
          storage.getMedals(),
          storage.getOwnedSkins(),
        ]);
        setScore(s);
        const validIds = new Set(ALL_CATS.map(cat => cat.id));
        setCollection(c.filter(id => validIds.has(id)));
        setSelectedCatId(sel);
        setCoins(co);
        setTutorialDone(tut);
        setUnlockedAchievements(achList);
        setSfxEnabled(sfx);
        setMedals(med);
        setOwnedSkins(oSkins);

        // Load quest progress and enhancements
        const [qp, allEnh] = await Promise.all([
          storage.getQuestProgress(),
          storage.getAllCatEnhancements(),
        ]);
        setQuestProgress(qp);
        setEnhancements(allEnh);

        if (sel) {
          const [hpData, enhData, eqSkin] = await Promise.all([
            storage.getCatHP(sel),
            storage.getCatEnhancement(sel),
            storage.getEquippedSkin(sel),
          ]);
          setHp(hpData.hp);
          setTapCount(hpData.tapCount);
          setEnhanceLevel(enhData.level);
          setEquippedSkinId(eqSkin);
        } else {
          setEnhanceLevel(0);
          setEquippedSkinId("");
        }

        // Check score-based achievements on load
        if (s >= 10000) tryUnlock("score_10k");
        if (s >= 100000) tryUnlock("score_100k");
        if (s >= 1000000) tryUnlock("score_1m");
        if (co >= 1000) tryUnlock("coins_1000");
        if (c.length >= 10) tryUnlock("collect_10");
        if (c.some(id => ALL_CATS.find(cat => cat.id === id)?.grade === "SSS")) tryUnlock("sss_pull");

        // Show attendance popup if not claimed today
        if (tut) {
          const attendance = await storage.getAttendance();
          if (!attendance.claimedToday) {
            setAttendanceVisible(true);
          }
        }

        if (!tut) {
          // Check if tutorial is mid-progress (e.g. came back from collection)
          const savedStep = await storage.getTutorialStep();
          if (savedStep > 0) {
            setTutorialStep(savedStep);
            // If tutorial completed in collection (step 0 stored), will be caught by tut check
          } else {
            await storage.setCoins(100);
            setCoins(100);
            setTutorialStep(1); // Start tutorial: tap 뽑기 button
          }
        } else {
          setTutorialStep(0);
          tryUnlock("first_start");
        }
      })();
    }, [])
  );

  const selectedCat = ALL_CATS.find(c => c.id === selectedCatId) ?? null;
  const gradeConfig = selectedCat ? getEnhancedConfig(selectedCat.grade, enhanceLevel) : GRADE_CONFIG["C"];

  // Determine if a skin is equipped and resolve frames
  const equippedSkin = equippedSkinId ? getSkinById(equippedSkinId) : null;
  const useSkin = !!(equippedSkin && selectedCat && equippedSkin.catId === selectedCat.id);
  // Apply skin coinChance bonus
  const skinCoinBonus = useSkin ? equippedSkin!.coinChanceBonus : 0;

  const handleTutorialGachaButton = useCallback(() => {
    if (tutorialStep === 1) {
      setTutorialStep(2); // Move to step 2: tap 일반 뽑기
      setGachaMenuVisible(true);
    }
  }, [tutorialStep]);

  const handleTutorialNormalGacha = useCallback(() => {
    if (tutorialStep === 2) {
      setGachaMenuVisible(false);
      setGachaForced(true);
      const result = rollGacha();
      setGachaResult(result);
      setGachaIsNew(true);
      setGachaVisible(true);
      // Don't complete tutorial yet — step 3 comes after gacha closes
    }
  }, [tutorialStep]);

  const animationState: AnimationState =
    hp <= 4 ? "collapsed" : hp <= 50 ? "hurt" : "normal";

  const handleTap = useCallback(() => {
    // No character selected - don't allow tap
    if (!selectedCat) return;

    // HP 0: no score/coin, only flinch
    if (hp <= 0) {
      if (sfxEnabled) soundRef.current?.replayAsync().catch(() => {});
      flinchAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flinchAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]).start();
      return;
    }

    const isCrit = Math.random() * 100 < gradeConfig.critChance;
    const pts = gradeConfig.scorePerTap * (isCrit ? 2 : 1);
    const newScore = score + pts;
    setScore(newScore);
    storage.setScore(newScore);

    // coinChance: C=1 → 10%, B=1.1 → 11%, ... SSS=3 → 30% + skin bonus
    if (Math.random() < (gradeConfig.coinChance + skinCoinBonus) * 0.1) {
      const newCoins = coins + 1;
      setCoins(newCoins);
      storage.setCoins(newCoins);
      // Quest: coin earned
      setQuestProgress((prev: storage.QuestProgress) => {
        const updated = { ...prev, dailyCoinsEarned: prev.dailyCoinsEarned + 1 };
        storage.setQuestProgress(updated);
        return updated;
      });
      setCoinPopup(true);
      coinOpacity.setValue(1);
      coinTranslateY.setValue(0);
      Animated.parallel([
        Animated.timing(coinOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        Animated.timing(coinTranslateY, { toValue: -40, duration: 800, useNativeDriver: true }),
      ]).start(() => setCoinPopup(false));
    }

    // Use skin frame counts when skin is active
    const activeFrames = (() => {
      if (animationState === "collapsed") return 1;
      if (useSkin && equippedSkin) {
        return animationState === "hurt"
          ? equippedSkin.hurtFrames.length
          : equippedSkin.danceFrames.length;
      }
      return animationState === "hurt" && selectedCat.hurtFrames
        ? selectedCat.hurtFrames.length
        : selectedCat.danceFrames?.length ?? gradeConfig.danceFrames;
    })();
    setDanceFrame(prev => (prev + 1) % activeFrames);

    const newTapCount = tapCount + 1;
    let newHp = hp;
    if (newTapCount >= gradeConfig.hpLossInterval) {
      newHp = Math.max(0, hp - 1);
      setHp(newHp);
      setTapCount(0);
      storage.setCatHP(selectedCat.id, newHp, 0);
    } else {
      setTapCount(newTapCount);
      storage.setCatHP(selectedCat.id, hp, newTapCount);
    }

    // Achievement checks
    if (newScore >= 10000) tryUnlock("score_10k");
    if (newScore >= 100000) tryUnlock("score_100k");
    if (newScore >= 1000000) tryUnlock("score_1m");
    if (coins >= 1000) tryUnlock("coins_1000");
    if (newHp === 0) {
      storage.incrementHpZeroCount().then(count => {
        if (count >= 10) tryUnlock("hp_zero_10");
      });
    }

    // Quest progress: taps
    setQuestProgress((prev: storage.QuestProgress) => {
      const updated = { ...prev, dailyTaps: prev.dailyTaps + 1, weeklyTaps: prev.weeklyTaps + 1 };
      storage.setQuestProgress(updated);
      return updated;
    });

    // Affinity XP: +1 per tap when seraph is equipped
    if (selectedCat.id === "seraph") {
      storage.getAffinity("seraph").then((data) => {
        if (data.level < 10) {
          const updated = storage.addAffinityXp(data, 1);
          storage.setAffinity("seraph", updated);
        }
      });
    }

    if (hasParticleEffect(selectedCat.grade) && selectedCat.particleEmoji) {
      setParticleTrigger(prev => prev + 1);
    }

    // S grade holy aura effect (not SSS - SSS has its own dark storm)
    if (hasCustomBackground(selectedCat.grade) && !hasDarkStormEffect(selectedCat.grade)) {
      setHolyFlash(true);

      // Inner glow burst
      holyAuraScale.setValue(0.3);
      holyAuraOpacity.setValue(0.8);

      // Outer glow ring
      holyAura2Scale.setValue(0.2);
      holyAura2Opacity.setValue(0.6);

      // Spinning ring
      holyRingOpacity.setValue(0.7);
      holyRingRotation.setValue(0);

      Animated.parallel([
        // Inner glow expand & fade
        Animated.spring(holyAuraScale, { toValue: 1.8, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(holyAuraOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        // Outer glow expand & fade (delayed)
        Animated.sequence([
          Animated.delay(60),
          Animated.spring(holyAura2Scale, { toValue: 2.2, friction: 4, tension: 60, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(60),
          Animated.timing(holyAura2Opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        // Spinning ring
        Animated.timing(holyRingRotation, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(holyRingOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => setHolyFlash(false));
    }

    // SSS grade dark storm + multi-layer aura effect
    if (hasDarkStormEffect(selectedCat.grade)) {
      setDarkStorm(true);
      darkStormOpacity.setValue(0.9);
      darkPulseScale.setValue(1);

      // First aura (innermost, fast)
      auraScale.setValue(0.3);
      auraOpacity.setValue(1);

      // Second aura (middle, medium)
      aura2Scale.setValue(0.2);
      aura2Opacity.setValue(0.8);

      // Third aura (outermost, slow)
      aura3Scale.setValue(0.1);
      aura3Opacity.setValue(0.6);

      Animated.parallel([
        // Dark storm flash
        Animated.sequence([
          Animated.timing(darkStormOpacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
          Animated.timing(darkStormOpacity, { toValue: 0.9, duration: 100, useNativeDriver: true }),
          Animated.timing(darkStormOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        // Screen pulse
        Animated.sequence([
          Animated.timing(darkPulseScale, { toValue: 1.05, duration: 100, useNativeDriver: true }),
          Animated.timing(darkPulseScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        // First aura - fast expand
        Animated.spring(auraScale, { toValue: 2, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(auraOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        // Second aura - medium expand (delayed)
        Animated.sequence([
          Animated.delay(50),
          Animated.spring(aura2Scale, { toValue: 2.2, friction: 4, tension: 80, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(50),
          Animated.timing(aura2Opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        // Third aura - slow expand (more delayed)
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(aura3Scale, { toValue: 2.5, friction: 3, tension: 60, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(aura3Opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start(() => setDarkStorm(false));
    }

    if (isCrit) {
      setCritText(true);
      critOpacity.setValue(1);
      critScale.setValue(0.5);
      Animated.parallel([
        Animated.spring(critScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(critOpacity, { toValue: 0, duration: 1000, delay: 300, useNativeDriver: true }),
      ]).start(() => setCritText(false));
      // SSS grade uses dark_cri sound for critical, others use normal critical sound
      if (sfxEnabled && !hasDarkStormEffect(selectedCat.grade)) {
        critSoundRef.current?.replayAsync().catch(() => {});
      }
    }

    // Play sound - SSS grade uses dark sounds, others use normal meow
    if (sfxEnabled) {
      if (hasDarkStormEffect(selectedCat.grade)) {
        if (isCrit && darkCritSoundRef.current) {
          darkCritSoundRef.current.replayAsync().catch(() => {});
        } else if (darkSoundRef.current) {
          darkSoundRef.current.replayAsync().catch(() => {});
        }
      } else {
        soundRef.current?.replayAsync().catch(() => {});
      }
    }

    if (animationState === "collapsed") {
      flinchAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flinchAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(flinchAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]).start();
    } else {
      bounceAnim.setValue(0.85);
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [score, coins, hp, tapCount, bounceAnim, flinchAnim, animationState, selectedCat, gradeConfig, tryUnlock, sfxEnabled, skinCoinBonus]);

  const handleGacha = useCallback(async () => {
    if (coins < GACHA_COST) return;
    const newCoins = coins - GACHA_COST;
    setCoins(newCoins);
    await storage.setCoins(newCoins);

    const result = rollGacha();
    const isNew = !collection.includes(result.id);
    if (isNew) {
      const newCollection = await storage.addToCollection(result.id);
      setCollection(newCollection);
      await storage.initCatHP(result.id);
    } else {
      // Duplicate → add as enhancement material
      await storage.addCatDuplicate(result.id);
    }

    setGachaResult(result);
    setGachaIsNew(isNew);
    setGachaForced(false);
    setGachaVisible(true);

    // Quest: gacha pull
    setQuestProgress((prev: storage.QuestProgress) => {
      const updated = { ...prev, dailyGachaPulls: prev.dailyGachaPulls + 1, weeklyGachaPulls: prev.weeklyGachaPulls + 1 };
      storage.setQuestProgress(updated);
      return updated;
    });

    if (result.grade === "SSS") tryUnlock("sss_pull");
    const newCollLen = isNew ? collection.length + 1 : collection.length;
    if (newCollLen >= 10) tryUnlock("collect_10");
  }, [coins, collection, tryUnlock]);

  const handleGachaClose = useCallback(async () => {
    setGachaVisible(false);
  }, []);

  const handleSlotResult = useCallback(async (medalCount: number) => {
    const newCoins = coins - 100;
    setCoins(newCoins);
    await storage.setCoins(newCoins);
    const newMedals = medals + medalCount;
    setMedals(newMedals);
    await storage.setMedals(newMedals);
  }, [coins, medals]);

  const handleSkinGachaPull = useCallback(async (skin: SkinData, result: SkinGachaResult) => {
    let newMedals = medals - SKIN_GACHA_COST;
    if (result.type === "skin") {
      const newSkins = await storage.addOwnedSkin(skin.id);
      setOwnedSkins(newSkins);
      if (newSkins.length >= 1) tryUnlock("skin_1");
    } else if (result.type === "full_refund") {
      newMedals += SKIN_GACHA_COST;
    } else if (result.type === "half_refund") {
      newMedals += Math.floor(SKIN_GACHA_COST / 2);
    }
    setMedals(newMedals);
    await storage.setMedals(newMedals);
  }, [medals, tryUnlock]);

  const handleMiniGameReward = useCallback(async (reward: number) => {
    if (reward <= 0) return;
    const newCoins = coins + reward;
    setCoins(newCoins);
    await storage.setCoins(newCoins);
    // Quest: minigame + coins
    setQuestProgress((prev: storage.QuestProgress) => {
      const updated = {
        ...prev,
        dailyMinigames: prev.dailyMinigames + 1,
        weeklyMinigames: prev.weeklyMinigames + 1,
        dailyCoinsEarned: prev.dailyCoinsEarned + reward,
      };
      storage.setQuestProgress(updated);
      return updated;
    });
  }, [coins]);

  const handleExpeditionReward = useCallback(async (reward: number) => {
    const newCoins = coins + reward;
    setCoins(newCoins);
    await storage.setCoins(newCoins);
    setQuestProgress((prev: storage.QuestProgress) => {
      const updated = { ...prev, dailyCoinsEarned: prev.dailyCoinsEarned + reward };
      storage.setQuestProgress(updated);
      return updated;
    });
  }, [coins]);

  const handleQuestReward = useCallback(async (rewardCoins: number, rewardMedals: number) => {
    if (rewardCoins > 0) {
      const newCoins = coins + rewardCoins;
      setCoins(newCoins);
      await storage.setCoins(newCoins);
    }
    if (rewardMedals > 0) {
      const newMedals = medals + rewardMedals;
      setMedals(newMedals);
      await storage.setMedals(newMedals);
    }
  }, [coins, medals]);

  const handleAttendanceReward = useCallback(async (rewardCoins: number, rewardMedals: number) => {
    if (rewardCoins > 0) {
      const newCoins = coins + rewardCoins;
      setCoins(newCoins);
      await storage.setCoins(newCoins);
    }
    if (rewardMedals > 0) {
      const newMedals = medals + rewardMedals;
      setMedals(newMedals);
      await storage.setMedals(newMedals);
    }
  }, [coins, medals]);

  const handleBossReward = useCallback(async (rewardCoins: number, rewardMedals: number) => {
    if (rewardCoins > 0) {
      const newCoins = coins + rewardCoins;
      setCoins(newCoins);
      await storage.setCoins(newCoins);
    }
    if (rewardMedals > 0) {
      const newMedals = medals + rewardMedals;
      setMedals(newMedals);
      await storage.setMedals(newMedals);
    }
  }, [coins, medals]);

  const handleClaimQuest = useCallback(async (questType: "daily" | "weekly", index: number) => {
    setQuestProgress((prev: storage.QuestProgress) => {
      const updated = { ...prev };
      if (questType === "daily") {
        updated.dailyClaimed = [...prev.dailyClaimed];
        updated.dailyClaimed[index] = true;
      } else {
        updated.weeklyClaimed = [...prev.weeklyClaimed];
        updated.weeklyClaimed[index] = true;
      }
      storage.setQuestProgress(updated);
      return updated;
    });
  }, []);

  const handleTutorialStart = useCallback(async (cat: CatData) => {
    const newCoins = coins - GACHA_COST;
    setCoins(Math.max(0, newCoins));
    await storage.setCoins(Math.max(0, newCoins));

    const isNew = !collection.includes(cat.id);
    if (isNew) {
      const newCollection = await storage.addToCollection(cat.id);
      setCollection(newCollection);
    }
    await storage.initCatHP(cat.id);

    // Don't auto-select — guide user to collection to select
    await storage.setTutorialCatId(cat.id);
    await storage.setTutorialStep(3);

    setGachaVisible(false);
    setGachaForced(false);
    setTutorialStep(3); // Move to step 3: tap 컬렉션
  }, [coins, collection]);

  const bgColor = selectedCat && hasCustomBackground(selectedCat.grade) && selectedCat.backgroundColor
    ? selectedCat.backgroundColor
    : "#16213e";

  const isHurtOrCollapsed = selectedCat && ((animationState === "collapsed" && (useSkin ? equippedSkin!.collapsedFrame : selectedCat.collapsedFrame)) || (animationState === "hurt" && (useSkin ? equippedSkin!.hurtFrames : selectedCat.hurtFrames)));

  const catImgSource = (() => {
    if (!selectedCat) return null;
    if (useSkin && equippedSkin) {
      if (animationState === "collapsed") return equippedSkin.collapsedFrame;
      if (animationState === "hurt") return equippedSkin.hurtFrames[danceFrame % equippedSkin.hurtFrames.length];
      return equippedSkin.danceFrames[danceFrame % equippedSkin.danceFrames.length];
    }
    if (!selectedCat.danceFrames) return null;
    if (animationState === "collapsed" && selectedCat.collapsedFrame) return selectedCat.collapsedFrame;
    if (animationState === "hurt" && selectedCat.hurtFrames) return selectedCat.hurtFrames[danceFrame % selectedCat.hurtFrames.length];
    return selectedCat.danceFrames[danceFrame % selectedCat.danceFrames.length];
  })();

  const catImgScale = isHurtOrCollapsed ? 2.5 : 2.5;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {selectedCat && hasParticleEffect(selectedCat.grade) && selectedCat.particleEmoji && (
        <FallingParticles trigger={particleTrigger} emoji={selectedCat.particleEmoji} />
      )}

      {/* holyFlash aura is rendered inside catContainer */}

      {darkStorm && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#1a0a2e", opacity: darkStormOpacity, zIndex: 50 }]}
          pointerEvents="none"
        />
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Pressable
            style={styles.debugBtn}
            onPress={async () => {
              const c = coins + 100;
              setCoins(c);
              await storage.setCoins(c);
            }}
          >
            <Text style={styles.debugBtnText}>+100</Text>
          </Pressable>
        </View>
        <View style={styles.scoreArea}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
        </View>
        <View style={styles.topRight}>
          <View style={styles.currencyPill}>
            <Text style={styles.currencyIcon}>💰</Text>
            <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          </View>
          <View style={[styles.currencyPill, styles.medalPill]}>
            <Text style={styles.currencyIcon}>👑</Text>
            <Text style={styles.medalText}>{medals.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Grade badge */}
      {selectedCat && (
        <View style={[styles.gradeBadge, { backgroundColor: gradeConfig.color }]}>
          <Text style={styles.gradeBadgeText}>{gradeConfig.label}</Text>
        </View>
      )}

      {critText && (
        <Animated.Text style={[styles.critText, { opacity: critOpacity, transform: [{ scale: critScale }] }]}>
          CRITICAL!
        </Animated.Text>
      )}

      {coinPopup && (
        <Animated.Text style={[styles.coinPopup, { opacity: coinOpacity, transform: [{ translateY: coinTranslateY }] }]}>
          +1 💰
        </Animated.Text>
      )}

      {/* Cat */}
      <Pressable onPress={handleTap} style={styles.catArea}>
        <View style={styles.catContainer}>
          {/* S grade Holy Aura effects */}
          {selectedCat && holyFlash && hasCustomBackground(selectedCat.grade) && !hasDarkStormEffect(selectedCat.grade) && (
            <>
              {/* Outer soft glow */}
              <Animated.View
                style={[styles.holyAura2, {
                  opacity: holyAura2Opacity,
                  transform: [{ scale: holyAura2Scale }],
                }]}
                pointerEvents="none"
              />
              {/* Inner bright glow */}
              <Animated.View
                style={[styles.holyAura, {
                  opacity: holyAuraOpacity,
                  transform: [{ scale: holyAuraScale }],
                }]}
                pointerEvents="none"
              />
              {/* Spinning ring */}
              <Animated.View
                style={[styles.holyRing, {
                  opacity: holyRingOpacity,
                  transform: [{ rotate: holyRingRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }],
                }]}
                pointerEvents="none"
              />
            </>
          )}
          {/* SSS Multi-layer Aura effects */}
          {selectedCat && darkStorm && hasDarkStormEffect(selectedCat.grade) && (
            <>
              {/* Third aura - outermost, dark purple */}
              <Animated.View
                style={[
                  styles.auraEffect3,
                  {
                    opacity: aura3Opacity,
                    transform: [{ scale: aura3Scale }],
                  },
                ]}
                pointerEvents="none"
              />
              {/* Second aura - middle, purple */}
              <Animated.View
                style={[
                  styles.auraEffect2,
                  {
                    opacity: aura2Opacity,
                    transform: [{ scale: aura2Scale }],
                  },
                ]}
                pointerEvents="none"
              />
              {/* First aura - innermost, bright purple */}
              <Animated.View
                style={[
                  styles.auraEffect,
                  {
                    opacity: auraOpacity,
                    transform: [{ scale: auraScale }],
                  },
                ]}
                pointerEvents="none"
              />
            </>
          )}
          <Animated.View style={{ transform: [{ scale: bounceAnim }, { translateX: flinchAnim }] }}>
            {!selectedCat ? (
              <View style={styles.emptyCharacter}>
                <Text style={styles.emptyCharacterText}>?</Text>
              </View>
            ) : catImgSource ? (
              <Image
                source={catImgSource}
                style={{ width: 200, height: 200, transform: [{ scale: catImgScale }] }}
                resizeMode="contain"
              />
            ) : (
              <CuteCat
                colors={selectedCat.colors}
                size={180}
                danceFrame={danceFrame}
                totalFrames={gradeConfig.danceFrames}
                animationState={animationState}
              />
            )}
          </Animated.View>
        </View>
        <Image source={require("../assets/img/tap.png")} style={styles.tapHintImg} resizeMode="contain" />
      </Pressable>

      {/* HP bar below cat */}
      {selectedCat && (
        <View style={{ marginTop: 10, marginBottom: 16 }}>
          <HPBar current={hp} />
        </View>
      )}

      {/* Bottom nav bar - 4 fixed buttons */}
      <View style={[styles.bottomBar, tutorialStep > 0 && { zIndex: 60 }]}>
        <View style={[tutorialStep === 3 && styles.tutorialBtnElevated, { overflow: "visible", flex: 1 }]}>
          {tutorialStep === 3 && (
            <View style={[styles.tutorialHint, { left: -10 }]}>
              <Text style={styles.tutorialHintText}>👇 캐릭터를 장착하세요!</Text>
            </View>
          )}
          <Pressable
            onPress={() => router.push("/collection")}
            style={[styles.bottomTab, tutorialStep > 0 && tutorialStep !== 3 && styles.bottomBtnDisabled, tutorialStep === 3 && styles.bottomBtnHighlight]}
            disabled={tutorialStep > 0 && tutorialStep !== 3}
          >
            <Text style={styles.bottomTabEmoji}>📚</Text>
            <Text style={styles.bottomTabLabel}>컬렉션</Text>
          </Pressable>
        </View>

        <View style={[tutorialStep === 1 && styles.tutorialBtnElevated, { overflow: "visible", flex: 1 }]}>
          {tutorialStep === 1 && (
            <View style={styles.tutorialHint}>
              <Text style={styles.tutorialHintText}>👇 여기를 눌러주세요!</Text>
            </View>
          )}
          <Pressable
            onPress={tutorialStep === 1 ? handleTutorialGachaButton : () => setGachaMenuVisible(true)}
            style={[styles.bottomTab, tutorialStep === 1 && styles.bottomBtnHighlight, tutorialStep > 0 && tutorialStep !== 1 && styles.bottomBtnDisabled]}
            disabled={tutorialStep > 0 && tutorialStep !== 1}
          >
            <Text style={styles.bottomTabEmoji}>🎁</Text>
            <Text style={styles.bottomTabLabel}>뽑기</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setRankingVisible(true)} style={[styles.bottomTab, { flex: 1 }, tutorialStep > 0 && styles.bottomBtnDisabled]} disabled={tutorialStep > 0}>
          <Text style={styles.bottomTabEmoji}>🏆</Text>
          <Text style={styles.bottomTabLabel}>랭킹</Text>
        </Pressable>

        <Pressable onPress={() => setMoreMenuVisible(true)} style={[styles.bottomTab, { flex: 1 }, tutorialStep > 0 && styles.bottomBtnDisabled]} disabled={tutorialStep > 0}>
          <Text style={styles.bottomTabEmoji}>📋</Text>
          <Text style={styles.bottomTabLabel}>메뉴</Text>
        </Pressable>
      </View>

      {/* More menu modal */}
      <Modal visible={moreMenuVisible} transparent animationType="fade" onRequestClose={() => setMoreMenuVisible(false)}>
        <Pressable style={styles.gachaOverlay} onPress={() => setMoreMenuVisible(false)}>
          <View style={styles.gachaMenu} onStartShouldSetResponder={() => true}>
            <Text style={styles.gachaMenuTitle}>메뉴</Text>
            <View style={styles.menuDivider} />

            <Pressable style={styles.gachaMenuItem} onPress={() => { setMoreMenuVisible(false); setMiniGameMenuVisible(true); }}>
              <Text style={styles.gachaMenuEmoji}>🎮</Text>
              <Text style={styles.gachaMenuText}>미니게임</Text>
            </Pressable>

            <Pressable style={styles.gachaMenuItem} onPress={() => { setMoreMenuVisible(false); setExpeditionVisible(true); }}>
              <Text style={styles.gachaMenuEmoji}>⚔️</Text>
              <Text style={styles.gachaMenuText}>원정대</Text>
            </Pressable>

            <Pressable style={styles.gachaMenuItem} onPress={() => { setMoreMenuVisible(false); setBossVisible(true); }}>
              <Text style={styles.gachaMenuEmoji}>🐉</Text>
              <Text style={styles.gachaMenuText}>보스 도전</Text>
            </Pressable>

            <Pressable style={styles.gachaMenuItem} onPress={() => { setMoreMenuVisible(false); setQuestVisible(true); }}>
              <Text style={styles.gachaMenuEmoji}>📋</Text>
              <Text style={styles.gachaMenuText}>과제</Text>
            </Pressable>

            <Pressable style={styles.gachaMenuItem} onPress={() => { setMoreMenuVisible(false); setAchievementModalVisible(true); }}>
              <Text style={styles.gachaMenuEmoji}>🏅</Text>
              <Text style={styles.gachaMenuText}>업적</Text>
            </Pressable>

            <Pressable style={styles.gachaMenuItem} onPress={() => { setMoreMenuVisible(false); setAttendanceVisible(true); }}>
              <Text style={styles.gachaMenuEmoji}>📅</Text>
              <Text style={styles.gachaMenuText}>출석 체크</Text>
            </Pressable>

            <Pressable onPress={() => setMoreMenuVisible(false)} style={styles.gachaMenuClose}>
              <Text style={styles.gachaMenuCloseText}>닫기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Gacha sub-menu modal */}
      <Modal
        visible={gachaMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => tutorialStep === 0 && setGachaMenuVisible(false)}
      >
        <Pressable style={styles.gachaOverlay} onPress={() => tutorialStep === 0 && setGachaMenuVisible(false)}>
          <View style={styles.gachaMenu}>
            <Text style={styles.gachaMenuTitle}>뽑기</Text>
            <View style={styles.menuDivider} />

            {tutorialStep === 2 && (
              <View style={styles.tutorialHintInline}>
                <Text style={[styles.tutorialHintText, { color: "#fff" }]}>👇 일반 뽑기를 눌러주세요!</Text>
              </View>
            )}

            <Pressable
              onPress={tutorialStep === 2 ? handleTutorialNormalGacha : () => {
                if (coins < GACHA_COST) {
                  setGachaMenuVisible(false);
                  setInsufficientMsg(`코인이 부족합니다!\n필요: 💰 ${GACHA_COST} / 보유: 💰 ${coins}`);
                  return;
                }
                setGachaMenuVisible(false);
                handleGacha();
              }}
              style={[
                styles.gachaMenuItem,
                tutorialStep === 2 && styles.gachaMenuItemHighlight
              ]}
            >
              <Text style={styles.gachaMenuEmoji}>🎁</Text>
              <Text style={styles.gachaMenuText}>일반 뽑기</Text>
              <Text style={styles.gachaMenuCost}>💰 {GACHA_COST}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (tutorialStep === 2) return;
                if (coins < 100) {
                  setGachaMenuVisible(false);
                  setInsufficientMsg(`코인이 부족합니다!\n필요: 💰 100 / 보유: 💰 ${coins}`);
                  return;
                }
                setGachaMenuVisible(false);
                setSlotVisible(true);
              }}
              style={[styles.gachaMenuItem, tutorialStep === 2 && styles.gachaMenuItemDisabledTutorial]}
              disabled={tutorialStep === 2}
            >
              <Text style={styles.gachaMenuEmoji}>👑</Text>
              <Text style={styles.gachaMenuText}>황금왕관 뽑기</Text>
              <Text style={styles.gachaMenuCost}>💰 100</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (tutorialStep === 2) return;
                setGachaMenuVisible(false);
                setSkinGachaVisible(true);
              }}
              style={[styles.gachaMenuItem, tutorialStep === 2 && styles.gachaMenuItemDisabledTutorial]}
              disabled={tutorialStep === 2}
            >
              <Text style={styles.gachaMenuEmoji}>👗</Text>
              <Text style={styles.gachaMenuText}>스킨 뽑기</Text>
              <Text style={styles.gachaMenuCost}>👑 100</Text>
            </Pressable>

            {tutorialStep === 0 && (
              <Pressable onPress={() => setGachaMenuVisible(false)} style={styles.gachaMenuClose}>
                <Text style={styles.gachaMenuCloseText}>닫기</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      <GachaModal
        visible={gachaVisible}
        cat={gachaResult}
        isNew={gachaIsNew}
        forced={gachaForced}
        onClose={handleGachaClose}
        onTutorialStart={handleTutorialStart}
      />

      <AchievementModal
        visible={achievementModalVisible}
        unlocked={unlockedAchievements}
        onClose={() => setAchievementModalVisible(false)}
      />

      <SlotMachineModal
        visible={slotVisible}
        onClose={() => setSlotVisible(false)}
        onResult={handleSlotResult}
        coins={coins}
      />

      <SkinGachaModal
        visible={skinGachaVisible}
        onClose={() => setSkinGachaVisible(false)}
        medals={medals}
        collection={collection}
        ownedSkins={ownedSkins}
        onPull={handleSkinGachaPull}
      />

      {/* Mini-game Menu Modal */}
      <Modal
        visible={miniGameMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMiniGameMenuVisible(false)}
      >
        <Pressable style={styles.gachaOverlay} onPress={() => setMiniGameMenuVisible(false)}>
          <View style={styles.gachaMenu}>
            <Text style={styles.gachaMenuTitle}>미니게임</Text>
            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => { setMiniGameMenuVisible(false); setMemoryGameVisible(true); }}
              style={styles.gachaMenuItem}
            >
              <Text style={styles.gachaMenuEmoji}>🃏</Text>
              <Text style={styles.gachaMenuText}>기억력 게임</Text>
              <Text style={styles.gachaMenuCost}>1일 1회</Text>
            </Pressable>

            <Pressable
              onPress={() => { setMiniGameMenuVisible(false); setFortuneVisible(true); }}
              style={styles.gachaMenuItem}
            >
              <Text style={styles.gachaMenuEmoji}>🔮</Text>
              <Text style={styles.gachaMenuText}>오늘의 운세</Text>
              <Text style={styles.gachaMenuCost}>1일 1회</Text>
            </Pressable>

            <Pressable onPress={() => setMiniGameMenuVisible(false)} style={styles.gachaMenuClose}>
              <Text style={styles.gachaMenuCloseText}>닫기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Mini-game Modals */}
      <MemoryGameModal
        visible={memoryGameVisible}
        onClose={() => setMemoryGameVisible(false)}
        onReward={handleMiniGameReward}
      />
      <FortuneModal
        visible={fortuneVisible}
        onClose={() => setFortuneVisible(false)}
        onReward={handleMiniGameReward}
      />
      <ExpeditionModal
        visible={expeditionVisible}
        onClose={() => setExpeditionVisible(false)}
        onReward={handleExpeditionReward}
        collection={collection}
        enhancements={enhancements}
        selectedCatId={selectedCatId}
      />
      <QuestModal
        visible={questVisible}
        onClose={() => setQuestVisible(false)}
        onReward={handleQuestReward}
        onClaimQuest={handleClaimQuest}
        questProgress={questProgress}
      />
      <RankingModal
        visible={rankingVisible}
        onClose={() => setRankingVisible(false)}
        score={score}
        collection={collection}
      />
      <BossBattleModal
        visible={bossVisible}
        onClose={() => setBossVisible(false)}
        onReward={handleBossReward}
        selectedGrade={selectedCat?.grade ?? null}
        enhanceLevel={enhanceLevel}
      />
      <AttendanceModal
        visible={attendanceVisible}
        onClose={() => setAttendanceVisible(false)}
        onReward={handleAttendanceReward}
      />
      <AchievementCelebration
        achievement={celebratingAchievement}
        onDone={onCelebrationDone}
      />

      {/* Tutorial Step 1 Overlay - only dim non-target areas */}
      {tutorialStep === 1 && (
        <View style={styles.tutorialOverlayStep1} pointerEvents="none">
          <View style={styles.tutorialBanner}>
            <Text style={styles.tutorialBannerText}>💰 100 코인이 지급되었어요!</Text>
            <Text style={styles.tutorialBannerSubtext}>아래 뽑기 버튼을 눌러 캐릭터를 뽑아보세요!</Text>
          </View>
        </View>
      )}

      {/* Tutorial Step 3 Overlay - guide to collection */}
      {tutorialStep === 3 && (
        <View style={styles.tutorialOverlayStep1} pointerEvents="none">
          <View style={styles.tutorialBanner}>
            <Text style={styles.tutorialBannerText}>🎉 새 캐릭터를 뽑았어요!</Text>
            <Text style={styles.tutorialBannerSubtext}>컬렉션에서 캐릭터를 장착해보세요!</Text>
          </View>
        </View>
      )}

      {/* Coming Soon Modal */}
      <Modal
        visible={comingSoonVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setComingSoonVisible(false)}
      >
        <Pressable style={styles.comingSoonOverlay} onPress={() => setComingSoonVisible(false)}>
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonEmoji}>🚧</Text>
            <Text style={styles.comingSoonTitle}>준비중</Text>
            <Text style={styles.comingSoonDesc}>열심히 준비하고 있어요!{"\n"}조금만 기다려주세요!</Text>
            <Pressable onPress={() => setComingSoonVisible(false)} style={styles.comingSoonBtn}>
              <Text style={styles.comingSoonBtnText}>확인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Insufficient Funds Modal */}
      <Modal
        visible={!!insufficientMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setInsufficientMsg("")}
      >
        <Pressable style={styles.comingSoonOverlay} onPress={() => setInsufficientMsg("")}>
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonEmoji}>💸</Text>
            <Text style={styles.comingSoonTitle}>잔액 부족</Text>
            <Text style={styles.comingSoonDesc}>{insufficientMsg}</Text>
            <Pressable onPress={() => setInsufficientMsg("")} style={styles.comingSoonBtn}>
              <Text style={styles.comingSoonBtnText}>확인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={exitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)}
      >
        <Pressable style={styles.comingSoonOverlay} onPress={() => setExitModalVisible(false)}>
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonEmoji}>🚪</Text>
            <Text style={styles.comingSoonTitle}>종료</Text>
            <Text style={styles.comingSoonDesc}>정말 게임을 종료하시겠습니까?</Text>
            <View style={styles.exitButtons}>
              <Pressable onPress={() => setExitModalVisible(false)} style={styles.exitBtnCancel}>
                <Text style={styles.comingSoonBtnText}>취소</Text>
              </Pressable>
              <Pressable onPress={() => { setExitModalVisible(false); router.replace("/"); }} style={styles.exitBtnConfirm}>
                <Text style={styles.comingSoonBtnText}>종료</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(100,120,255,0.1)",
  },
  scoreArea: {
    flex: 1,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 4,
    fontWeight: "bold",
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "rgba(255,215,0,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  currencyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,165,0,0.15)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.2)",
  },
  medalPill: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderColor: "rgba(255,215,0,0.2)",
    marginTop: 4,
  },
  currencyIcon: {
    fontSize: 12,
  },
  coinText: {
    fontSize: 13,
    color: "#FFA500",
    fontWeight: "bold",
  },
  medalText: {
    fontSize: 12,
    color: "#FFD700",
    fontWeight: "bold",
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gradeBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  critText: {
    position: "absolute",
    top: "35%",
    fontSize: 36,
    fontWeight: "bold",
    color: "#FF4444",
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    zIndex: 10,
  },
  coinPopup: {
    position: "absolute",
    top: "40%",
    right: "25%",
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFA500",
    zIndex: 10,
  },
  catArea: {
    alignItems: "center",
    padding: 20,
  },
  tapHintImg: {
    width: 140,
    height: 70,
    marginTop: 8,
  },
  bottomBar: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "rgba(10,10,30,0.95)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "rgba(100,120,255,0.15)",
    paddingVertical: 6,
    paddingBottom: 10,
    paddingHorizontal: 4,
    overflow: "visible",
  },
  bottomTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  bottomTabEmoji: {
    fontSize: 22,
    marginBottom: 3,
  },
  bottomTabLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "bold",
  },
  gachaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  gachaMenu: {
    backgroundColor: "#1a1a2e",
    borderRadius: 22,
    padding: 24,
    width: "82%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.2)",
    shadowColor: "#4060ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  gachaMenuTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  menuDivider: {
    width: "60%",
    height: 1,
    backgroundColor: "rgba(100,120,255,0.2)",
    marginBottom: 14,
    marginTop: 4,
  },
  gachaMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(35,35,70,0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: "100%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(80,80,140,0.3)",
  },
  gachaMenuItemDisabled: {
    backgroundColor: "#333",
    opacity: 0.5,
  },
  gachaMenuEmoji: {
    fontSize: 20,
    width: 40,
    height: 40,
    lineHeight: 40,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
  },
  gachaMenuText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
  },
  gachaMenuCost: {
    color: "#FFA500",
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "rgba(255,165,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  gachaMenuSoon: {
    color: "#888",
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gachaMenuClose: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  gachaMenuCloseText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "bold",
  },
  debugBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  debugBtnText: {
    color: "rgba(255,215,0,0.7)",
    fontSize: 11,
    fontWeight: "bold",
  },
  topLeft: {
    flex: 1,
    alignItems: "flex-start" as const,
    zIndex: 999,
  },
  topRight: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  comingSoonOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  comingSoonBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 32,
    alignItems: "center" as const,
    width: 300,
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.2)",
    shadowColor: "#4060ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  comingSoonEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  comingSoonTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold" as const,
    marginBottom: 10,
  },
  comingSoonDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  comingSoonBtn: {
    marginTop: 22,
    backgroundColor: "rgba(50,50,110,0.9)",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(100,120,255,0.3)",
  },
  comingSoonBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold" as const,
  },
  catContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  auraEffect: {
    position: "absolute" as const,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(107, 0, 153, 0.3)",
    borderWidth: 4,
    borderColor: "#9B30FF",
    shadowColor: "#9B30FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  auraEffect2: {
    position: "absolute" as const,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(75, 0, 130, 0.2)",
    borderWidth: 3,
    borderColor: "#6B0099",
    shadowColor: "#6B0099",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  auraEffect3: {
    position: "absolute" as const,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(30, 0, 50, 0.15)",
    borderWidth: 2,
    borderColor: "#4B0082",
    shadowColor: "#4B0082",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
  },
  holyAura: {
    position: "absolute" as const,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(135, 206, 250, 0.25)",
    borderWidth: 3,
    borderColor: "rgba(173, 216, 230, 0.7)",
    shadowColor: "#87CEFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35,
  },
  holyAura2: {
    position: "absolute" as const,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(200, 230, 255, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(135, 206, 250, 0.4)",
    shadowColor: "#B0E0E6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  holyRing: {
    position: "absolute" as const,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: "rgba(255, 255, 255, 0.8)",
    borderBottomColor: "rgba(173, 216, 230, 0.6)",
  },
  emptyCharacter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#2a2a4a",
    borderWidth: 4,
    borderColor: "#3a3a6a",
    borderStyle: "dashed",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyCharacterText: {
    fontSize: 80,
    color: "#555",
    fontWeight: "bold" as const,
  },
  tutorialOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  tutorialBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 30,
    alignItems: "center" as const,
    width: 300,
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  tutorialEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  tutorialTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold" as const,
    marginBottom: 12,
  },
  tutorialDesc: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center" as const,
    lineHeight: 24,
    marginBottom: 16,
  },
  tutorialCoins: {
    backgroundColor: "#2a4a2a",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  tutorialCoinsText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold" as const,
  },
  tutorialBtn: {
    backgroundColor: "#4a2a8a",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#6a4aaa",
  },
  tutorialBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold" as const,
  },
  tutorialHint: {
    position: "absolute" as const,
    top: -38,
    zIndex: 100,
    backgroundColor: "#FFD700",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    minWidth: 180,
  },
  tutorialHintInline: {
    marginBottom: 10,
    alignItems: "center" as const,
  },
  tutorialHintText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "bold" as const,
    textAlign: "center" as const,
  },
  bottomBtnDisabled: {
    opacity: 0.15,
  },
  tutorialBtnElevated: {
    zIndex: 100,
  },
  bottomBtnHighlight: {
    borderColor: "#FFD700",
    borderWidth: 4,
    backgroundColor: "#5a6aff",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  gachaMenuItemHighlight: {
    borderColor: "#FFD700",
    borderWidth: 3,
    backgroundColor: "#2a5a3a",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  gachaMenuItemDisabledTutorial: {
    opacity: 0.2,
  },
  tutorialOverlayStep1: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 80,
    alignItems: "center" as const,
    zIndex: 50,
  },
  tutorialBanner: {
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
    alignItems: "center" as const,
  },
  tutorialBannerText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold" as const,
  },
  tutorialBannerSubtext: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  exitButtons: {
    flexDirection: "row" as const,
    gap: 14,
    marginTop: 22,
  },
  exitBtnCancel: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  exitBtnConfirm: {
    backgroundColor: "rgba(200,50,50,0.8)",
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.3)",
  },
});
