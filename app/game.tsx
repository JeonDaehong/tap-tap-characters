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
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Audio } from "expo-av";
import CuteCat, { AnimationState } from "../components/CuteCat";
import GachaModal from "../components/GachaModal";
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
} from "../data/cats";
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

  const [tutorialDone, setTutorialDone] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0); // 0=done, 1=tap 뽑기, 2=tap 일반뽑기, 3=tap 컬렉션
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
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
  const holyFlashOpacity = useRef(new Animated.Value(0)).current;
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
        const [s, c, sel, co, tut, achList] = await Promise.all([
          storage.getScore(),
          storage.getCollection(),
          storage.getSelectedCat(),
          storage.getCoins(),
          storage.getTutorialComplete(),
          storage.getUnlockedAchievements(),
        ]);
        setScore(s);
        const validIds = new Set(ALL_CATS.map(cat => cat.id));
        setCollection(c.filter(id => validIds.has(id)));
        setSelectedCatId(sel);
        setCoins(co);
        setTutorialDone(tut);
        setUnlockedAchievements(achList);

        if (sel) {
          const hpData = await storage.getCatHP(sel);
          setHp(hpData.hp);
          setTapCount(hpData.tapCount);
        }

        // Check score-based achievements on load
        if (s >= 10000) tryUnlock("score_10k");
        if (s >= 100000) tryUnlock("score_100k");
        if (s >= 1000000) tryUnlock("score_1m");
        if (co >= 1000) tryUnlock("coins_1000");
        if (c.length >= 10) tryUnlock("collect_10");
        if (c.some(id => ALL_CATS.find(cat => cat.id === id)?.grade === "SSS")) tryUnlock("sss_pull");

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
  const gradeConfig = selectedCat ? GRADE_CONFIG[selectedCat.grade] : GRADE_CONFIG["C"];

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
      soundRef.current?.replayAsync().catch(() => {});
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

    // coinChance: C=1 → 10%, B=1.1 → 11%, ... SSS=3 → 30%
    if (Math.random() < gradeConfig.coinChance * 0.1) {
      const newCoins = coins + 1;
      setCoins(newCoins);
      storage.setCoins(newCoins);
      setCoinPopup(true);
      coinOpacity.setValue(1);
      coinTranslateY.setValue(0);
      Animated.parallel([
        Animated.timing(coinOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        Animated.timing(coinTranslateY, { toValue: -40, duration: 800, useNativeDriver: true }),
      ]).start(() => setCoinPopup(false));
    }

    const activeFrames =
      animationState === "collapsed" ? 1
      : animationState === "hurt" && selectedCat.hurtFrames ? selectedCat.hurtFrames.length
      : selectedCat.danceFrames?.length ?? gradeConfig.danceFrames;
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

    if (hasParticleEffect(selectedCat.grade) && selectedCat.particleEmoji) {
      setParticleTrigger(prev => prev + 1);
    }

    // S+ grade holy flash effect
    if (hasCustomBackground(selectedCat.grade)) {
      setHolyFlash(true);
      holyFlashOpacity.setValue(0.6);
      Animated.timing(holyFlashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setHolyFlash(false));
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
      if (!hasDarkStormEffect(selectedCat.grade)) {
        critSoundRef.current?.replayAsync().catch(() => {});
      }
    }

    // Play sound - SSS grade uses dark sounds, others use normal meow
    if (hasDarkStormEffect(selectedCat.grade)) {
      if (isCrit && darkCritSoundRef.current) {
        darkCritSoundRef.current.replayAsync().catch(() => {});
      } else if (darkSoundRef.current) {
        darkSoundRef.current.replayAsync().catch(() => {});
      }
    } else {
      soundRef.current?.replayAsync().catch(() => {});
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
  }, [score, coins, hp, tapCount, bounceAnim, flinchAnim, animationState, selectedCat, gradeConfig, tryUnlock]);

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
    }

    setGachaResult(result);
    setGachaIsNew(isNew);
    setGachaForced(false);
    setGachaVisible(true);

    if (result.grade === "SSS") tryUnlock("sss_pull");
    const newCollLen = isNew ? collection.length + 1 : collection.length;
    if (newCollLen >= 10) tryUnlock("collect_10");
  }, [coins, collection, tryUnlock]);

  const handleGachaClose = useCallback(async () => {
    setGachaVisible(false);
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
  const isHurtOrCollapsed = selectedCat && ((animationState === "collapsed" && selectedCat.collapsedFrame) || (animationState === "hurt" && selectedCat.hurtFrames));
  const catImgSource = selectedCat?.danceFrames
    ? (animationState === "collapsed" && selectedCat.collapsedFrame
        ? selectedCat.collapsedFrame
        : animationState === "hurt" && selectedCat.hurtFrames
          ? selectedCat.hurtFrames[danceFrame % selectedCat.hurtFrames.length]
          : selectedCat.danceFrames[danceFrame % selectedCat.danceFrames.length])
    : null;
  const catImgScale = isHurtOrCollapsed ? 2.5 : 2.5;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {selectedCat && hasParticleEffect(selectedCat.grade) && selectedCat.particleEmoji && (
        <FallingParticles trigger={particleTrigger} emoji={selectedCat.particleEmoji} />
      )}

      {holyFlash && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#FFD700", opacity: holyFlashOpacity, zIndex: 50 }]}
          pointerEvents="none"
        />
      )}

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
            <Text style={styles.debugBtnText}>+100💰</Text>
          </Pressable>
        </View>
        <View style={styles.scoreArea}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.coinText}>💰 {coins}</Text>
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

      {/* Bottom game buttons */}
      <View style={[styles.bottomBar, tutorialStep > 0 && { zIndex: 60 }]}>
        <View style={[{ flex: 1, overflow: "visible" }, tutorialStep === 3 && styles.tutorialBtnElevated]}>
          {tutorialStep === 3 && (
            <View style={[styles.tutorialHint, { left: 0 }]}>
              <Text style={styles.tutorialHintText} numberOfLines={1}>👇 캐릭터를 장착하세요!</Text>
            </View>
          )}
          <Pressable
            onPress={() => router.push("/collection")}
            style={[styles.bottomBtn, tutorialStep > 0 && tutorialStep !== 3 && styles.bottomBtnDisabled, tutorialStep === 3 && styles.bottomBtnHighlight]}
            disabled={tutorialStep > 0 && tutorialStep !== 3}
          >
            <Text style={styles.bottomBtnEmoji}>📚</Text>
            <Text style={styles.bottomBtnLabel}>컬렉션</Text>
          </Pressable>
        </View>

        <View style={[{ flex: 1, overflow: "visible" }, tutorialStep === 1 && styles.tutorialBtnElevated]}>
          {tutorialStep === 1 && (
            <View style={styles.tutorialHint}>
              <Text style={styles.tutorialHintText} numberOfLines={1}>👇 여기를 눌러주세요!</Text>
            </View>
          )}
          <Pressable
            onPress={tutorialStep === 1 ? handleTutorialGachaButton : () => setGachaMenuVisible(true)}
            style={[styles.bottomBtn, tutorialStep === 1 && styles.bottomBtnHighlight, tutorialStep > 0 && tutorialStep !== 1 && styles.bottomBtnDisabled]}
            disabled={tutorialStep > 0 && tutorialStep !== 1}
          >
            <Text style={styles.bottomBtnEmoji}>🎁</Text>
            <Text style={styles.bottomBtnLabel}>뽑기</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setAchievementModalVisible(true)}
          style={[styles.bottomBtn, tutorialStep > 0 && styles.bottomBtnDisabled]}
          disabled={tutorialStep > 0}
        >
          <Text style={styles.bottomBtnEmoji}>🏅</Text>
          <Text style={styles.bottomBtnLabel}>업적</Text>
        </Pressable>

        <Pressable
          onPress={() => setComingSoonVisible(true)}
          style={[styles.bottomBtn, tutorialStep > 0 && styles.bottomBtnDisabled]}
          disabled={tutorialStep > 0}
        >
          <Text style={styles.bottomBtnEmoji}>🏆</Text>
          <Text style={styles.bottomBtnLabel}>랭킹</Text>
        </Pressable>
      </View>

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

            {tutorialStep === 2 && (
              <View style={styles.tutorialHintInline}>
                <Text style={[styles.tutorialHintText, { color: "#fff" }]}>👇 일반 뽑기를 눌러주세요!</Text>
              </View>
            )}

            <Pressable
              onPress={tutorialStep === 2 ? handleTutorialNormalGacha : () => { setGachaMenuVisible(false); handleGacha(); }}
              style={[
                styles.gachaMenuItem,
                coins < GACHA_COST && tutorialStep === 0 && styles.gachaMenuItemDisabled,
                tutorialStep === 2 && styles.gachaMenuItemHighlight
              ]}
              disabled={coins < GACHA_COST && tutorialStep === 0}
            >
              <Text style={styles.gachaMenuEmoji}>🎁</Text>
              <Text style={styles.gachaMenuText}>일반 뽑기</Text>
              <Text style={styles.gachaMenuCost}>💰 {GACHA_COST}</Text>
            </Pressable>

            <Pressable
              onPress={() => { setGachaMenuVisible(false); setComingSoonVisible(true); }}
              style={[styles.gachaMenuItem, tutorialStep === 2 && styles.gachaMenuItemDisabledTutorial]}
              disabled={tutorialStep === 2}
            >
              <Text style={styles.gachaMenuEmoji}>✨</Text>
              <Text style={styles.gachaMenuText}>특수 뽑기</Text>
              <Text style={styles.gachaMenuSoon}>SOON</Text>
            </Pressable>

            <Pressable
              onPress={() => { setGachaMenuVisible(false); setComingSoonVisible(true); }}
              style={[styles.gachaMenuItem, tutorialStep === 2 && styles.gachaMenuItemDisabledTutorial]}
              disabled={tutorialStep === 2}
            >
              <Text style={styles.gachaMenuEmoji}>👗</Text>
              <Text style={styles.gachaMenuText}>코스튬 뽑기</Text>
              <Text style={styles.gachaMenuSoon}>SOON</Text>
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
    paddingHorizontal: 16,
    marginBottom: 4,
    zIndex: 999,
  },
  topSpacer: {
    flex: 1,
  },
  scoreArea: {
    flex: 1,
    alignItems: "center",
  },
  coinArea: {
    flex: 1,
    alignItems: "flex-end",
  },
  scoreLabel: {
    fontSize: 11,
    color: "#888",
    letterSpacing: 3,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
  },
  coinText: {
    fontSize: 14,
    color: "#FFA500",
    fontWeight: "bold",
  },
  gradeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  gradeBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
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
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 12,
    overflow: "visible",
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: "#2a2a5a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3a3a6a",
  },
  bottomBtnEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  bottomBtnLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  gachaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  gachaMenu: {
    backgroundColor: "#1a1a2e",
    borderRadius: 18,
    padding: 24,
    width: "80%",
    maxWidth: 320,
    alignItems: "center",
  },
  gachaMenuTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  gachaMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a5a",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 10,
  },
  gachaMenuItemDisabled: {
    backgroundColor: "#333",
    opacity: 0.5,
  },
  gachaMenuEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  gachaMenuText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
  },
  gachaMenuCost: {
    color: "#FFA500",
    fontSize: 13,
    fontWeight: "bold",
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
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  gachaMenuCloseText: {
    color: "#888",
    fontSize: 14,
  },
  debugBtn: {
    backgroundColor: "#444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  debugBtnText: {
    color: "#FFD700",
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  comingSoonBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 30,
    alignItems: "center" as const,
    width: 280,
    borderWidth: 2,
    borderColor: "#333",
  },
  comingSoonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  comingSoonTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold" as const,
    marginBottom: 8,
  },
  comingSoonDesc: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  comingSoonBtn: {
    marginTop: 20,
    backgroundColor: "#2a2a5a",
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 10,
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
    alignSelf: "center" as const,
    zIndex: 100,
    backgroundColor: "#FFD700",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
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
});
