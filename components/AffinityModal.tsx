import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import * as storage from "../utils/storage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  catId: string;
  catName?: string;
  onReward?: (coins: number) => void;
}

interface ChapterData {
  chapter: number;
  title: string;
  requiredLevel: number;
  paragraphs: string[];
  image: any;
}

const STORY_IMAGES: Record<number, any> = {
  1: require("../assets/img/y_story_1.png"),
  2: require("../assets/img/y_story_2.png"),
  3: require("../assets/img/y_story_3.png"),
  4: require("../assets/img/y_story_4.png"),
  5: require("../assets/img/y_story_5.png"),
};

const SPECIAL_IMAGE = require("../assets/img/y_story_100.png");

const CHAPTERS: ChapterData[] = [
  {
    chapter: 1,
    title: "빛이 내려온 날",
    requiredLevel: 1,
    image: STORY_IMAGES[1],
    paragraphs: [
      "그날, 아무 일도 일어나지 않을 것 같던 폐허의 성당에 빛이 내려왔다.\n천장의 균열 사이로 떨어진 빛의 중심에서, 한 천사가 조용히 무릎을 꿇고 기도하고 있었다.",
      "작은 몸, 흰 날개, 그리고 머리 위에 떠 있는 희미한 고리.\n그녀의 이름은 세라피였다.",
      "기도를 마친 세라피가 눈을 뜨는 순간, 시선은 자연스럽게 플레이어가 서 있는 방향으로 향했다.\n말은 없었지만, 마치 오래전부터 이 만남을 알고 있었다는 듯한 눈빛이었다.",
      "세라피는 이 세계의 빛이 점점 사라지고 있다는 사실을 알고 있었고,\n혼자서는 더 이상 그 빛을 지켜낼 수 없다는 것도 알고 있었다.",
      "플레이어가 한 발 다가섰을 때, 세라피는 조용히 고개를 끄덕였다.\n그렇게 말 없는 동행이 시작된다.\n빛과 인간이 처음으로 같은 길을 걷기 시작한 순간이었다.",
    ],
  },
  {
    chapter: 2,
    title: "손을 내미는 천사",
    requiredLevel: 3,
    image: STORY_IMAGES[2],
    paragraphs: [
      "여정이 시작되자 세라피는 더 이상 제단 위의 존재가 아니었다.\n그녀는 플레이어의 곁을 따라 걸으며, 어둠에 잠긴 세상을 하나씩 마주했다.",
      "폐허가 된 마을에서, 사람들의 흔적만 남은 거리에서,\n세라피는 자주 걸음을 멈추고 하늘을 올려다보았다.\n빛이 사라진 이유를, 그리고 자신이 내려온 의미를 스스로에게 묻는 듯했다.",
      "어둠이 짙어진 순간, 세라피는 망설임 없이 날개를 펼쳤다.\n플레이어를 향해 손을 내밀며, 작지만 분명한 목소리로 말했다.",
      "\"혼자가 아니면… 더 멀리 갈 수 있어요.\"",
      "그 손을 잡는 순간, 세라피의 빛은 조금 더 강해졌다.\n이 동행은 보호가 아니라 서로를 의지하는 관계라는 사실을,\n그녀는 이미 알고 있었다.",
    ],
  },
  {
    chapter: 3,
    title: "균열의 노래",
    requiredLevel: 5,
    image: STORY_IMAGES[3],
    paragraphs: [
      "빛이 닿지 않는 땅에서, 세라피의 노래는 처음으로 흔들리기 시작했다.\n정화되지 않은 어둠은 공간에 균열을 만들고, 그 균열은 세라피의 힘을 잠식했다.",
      "그녀는 무대를 만들지 못했다.\n노래는 끊기고, 날개는 무겁게 처졌다.",
      "플레이어가 다가가자, 세라피는 고개를 숙였다.\n자신의 힘이 부족하다는 것을 인정하는 듯한 표정이었다.",
      "그러나 그 순간, 세라피는 깨달았다.\n지금까지의 노래는 세상을 향한 것이었지만,\n이번 노래는 한 사람을 향한 것이어야 한다는 것을.",
      "플레이어의 존재를 느끼며, 세라피는 다시 노래를 부른다.\n빛은 완전하지 않았지만, 균열은 조금씩 봉합되기 시작했다.\n\n그날 이후, 세라피의 노래는 혼자가 아닌 둘의 노래가 되었다.",
    ],
  },
  {
    chapter: 4,
    title: "날개를 접는 선택",
    requiredLevel: 7,
    image: STORY_IMAGES[4],
    paragraphs: [
      "여정의 끝에서, 세라피는 선택을 강요받는다.\n이 세계를 완전히 정화하려면, 더 이상 하늘의 존재로 남아 있을 수 없다는 진실.",
      "빛을 지키기 위해, 그녀는 날개를 잃어야 했다.",
      "세라피는 처음으로 두려움을 드러냈다.\n하늘로 돌아갈 수 없을지도 모른다는 불안,\n그리고 플레이어 곁을 떠나야 할지도 모른다는 공포.",
      "하지만 선택의 순간, 세라피는 날개를 펼치지 않았다.\n대신 플레이어의 가까이에 서서 조용히 말했다.",
      "\"이제는… 같은 높이에서 걷고 싶어요.\"\n\n빛은 줄어들었지만, 세라피는 더 이상 흔들리지 않았다.\n그녀는 천사가 아니라, 동행자가 되기를 선택했다.",
    ],
  },
  {
    chapter: 5,
    title: "빛이 머무는 곳",
    requiredLevel: 10,
    image: STORY_IMAGES[5],
    paragraphs: [
      "모든 여정이 끝난 밤, 작은 모닥불 앞에서 세라피는 조용히 앉아 있었다.\n하늘에는 별이 떠 있고, 멀리 마을의 불빛이 흔들리고 있었다.",
      "세라피는 플레이어의 곁으로 다가와,\n아무 말 없이 머리에 손을 얹었다.",
      "\"당신이 있어서… 저는 사라지지 않았어요.\"",
      "그녀의 빛은 더 이상 눈부시지 않았다.\n하지만 그 빛은, 플레이어가 어디에 있든 함께 머무는 빛이었다.",
      "세라피는 웃었다.\n천사로서가 아니라, 누군가의 곁에 있는 존재로서.\n\n그 순간, 이 여정의 진짜 의미가 완성된다.\n세계를 구한 이야기가 아니라,\n서로를 선택한 이야기로.",
    ],
  },
];

const CHAPTER_REWARDS: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100, 5: 500 };

export default function AffinityModal({ visible, onClose, catId, catName, onReward }: Props) {
  const [affinity, setAffinityState] = useState<storage.AffinityData>({
    level: 0, xp: 0, readChapters: [], unlockedSpecial: false,
  });
  const [phase, setPhase] = useState<"main" | "story" | "gallery">("main");
  const [currentChapter, setCurrentChapter] = useState<ChapterData | null>(null);
  const [paragraphIdx, setParagraphIdx] = useState(0);
  const [galleryImage, setGalleryImage] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const data = await storage.getAffinity(catId);
      setAffinityState(data);
      setPhase("main");
      setCurrentChapter(null);
      setParagraphIdx(0);
      setGalleryImage(null);
    })();
  }, [visible, catId]);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const animateText = useCallback(() => {
    textFade.setValue(0);
    Animated.timing(textFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [textFade]);

  const startChapter = useCallback((ch: ChapterData) => {
    setCurrentChapter(ch);
    setParagraphIdx(0);
    setPhase("story");
    animateIn();
    animateText();
  }, [animateIn, animateText]);

  const [rewardPopup, setRewardPopup] = useState<number | null>(null);

  const handleStoryTap = useCallback(async () => {
    if (!currentChapter) return;
    if (paragraphIdx < currentChapter.paragraphs.length - 1) {
      setParagraphIdx((p) => p + 1);
      animateText();
    } else {
      // Mark chapter as read & give reward
      const updated = { ...affinity, readChapters: [...affinity.readChapters] };
      const isFirstRead = !updated.readChapters.includes(currentChapter.chapter);
      if (isFirstRead) {
        updated.readChapters.push(currentChapter.chapter);
        await storage.setAffinity(catId, updated);
        setAffinityState(updated);
        const reward = CHAPTER_REWARDS[currentChapter.chapter] ?? 100;
        onReward?.(reward);
        setRewardPopup(reward);
        setTimeout(() => setRewardPopup(null), 2500);
      }
      setPhase("main");
    }
  }, [currentChapter, paragraphIdx, affinity, catId, animateText, onReward]);

  const handleUnlockSpecial = useCallback(async () => {
    if (affinity.level >= 10 && !affinity.unlockedSpecial) {
      const updated = { ...affinity, unlockedSpecial: true, readChapters: [...affinity.readChapters] };
      await storage.setAffinity(catId, updated);
      setAffinityState(updated);
    }
    setGalleryImage(SPECIAL_IMAGE);
  }, [affinity, catId]);

  const xpNeeded = storage.getAffinityXpNeeded(affinity.level);
  const xpPercent = affinity.level >= 10 ? 100 : xpNeeded > 0 ? Math.min(100, (affinity.xp / xpNeeded) * 100) : 0;

  const heartLevel = Math.min(10, affinity.level);
  const heartFill = "❤️".repeat(Math.min(5, Math.ceil(heartLevel / 2)));
  const heartEmpty = "🤍".repeat(5 - Math.min(5, Math.ceil(heartLevel / 2)));

  if (galleryImage) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setGalleryImage(null)}>
        <Pressable style={s.galleryOverlay} onPress={() => setGalleryImage(null)}>
          <Image source={galleryImage} style={s.galleryImg} resizeMode="contain" />
          <Text style={s.galleryHint}>탭하여 닫기</Text>
        </Pressable>
      </Modal>
    );
  }

  if (phase === "story" && currentChapter) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setPhase("main")}>
        <Pressable style={s.storyOverlay} onPress={handleStoryTap}>
          <Animated.View style={[s.storyImgWrap, { opacity: fadeAnim }]}>
            <Image source={currentChapter.image} style={s.storyImg} resizeMode="cover" />
            <View style={s.storyImgGradient} />
          </Animated.View>

          <View style={s.storyContent}>
            <Text style={s.storyChapterLabel}>Chapter {currentChapter.chapter}</Text>
            <Text style={s.storyTitle}>{currentChapter.title}</Text>
            <View style={s.storyDivider} />
            <Animated.Text style={[s.storyText, { opacity: textFade }]}>
              {currentChapter.paragraphs[paragraphIdx]}
            </Animated.Text>
            <Text style={s.storyTapHint}>
              {paragraphIdx < currentChapter.paragraphs.length - 1
                ? `탭하여 계속 (${paragraphIdx + 1}/${currentChapter.paragraphs.length})`
                : "탭하여 마치기"}
            </Text>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {rewardPopup !== null && (
              <View style={s.rewardPopup}>
                <Text style={s.rewardPopupText}>💰 +{rewardPopup} 골드 획득!</Text>
              </View>
            )}
            <Text style={s.title}>💕 {catName ?? "세라피"} 애정도</Text>
            <View style={s.divider} />

            {/* Affinity level */}
            <View style={s.levelBox}>
              <Text style={s.heartDisplay}>{heartFill}{heartEmpty}</Text>
              <Text style={s.levelText}>Lv. {affinity.level} / 10</Text>
              {affinity.level < 10 && (
                <View style={s.xpBarOuter}>
                  <View style={[s.xpBarInner, { width: `${xpPercent}%` }]} />
                </View>
              )}
              {affinity.level < 10 ? (
                <Text style={s.xpText}>{affinity.xp} / {xpNeeded} XP</Text>
              ) : (
                <Text style={s.xpTextMax}>MAX</Text>
              )}
              <Text style={s.xpHint}>{catName ?? "세라피"}를 장착하고 탭하면 애정도가 올라요!</Text>
            </View>

            {/* Chapter list */}
            <Text style={s.sectionLabel}>스토리</Text>
            {CHAPTERS.map((ch) => {
              const unlocked = affinity.level >= ch.requiredLevel;
              const read = affinity.readChapters.includes(ch.chapter);
              return (
                <Pressable
                  key={ch.chapter}
                  style={[s.chapterBtn, !unlocked && s.chapterLocked]}
                  onPress={() => unlocked && startChapter(ch)}
                  disabled={!unlocked}
                >
                  <View style={s.chapterLeft}>
                    <Text style={s.chapterNum}>{unlocked ? `Ch.${ch.chapter}` : "🔒"}</Text>
                    <View>
                      <Text style={s.chapterTitle}>
                        {unlocked ? ch.title : "???"}
                      </Text>
                      <Text style={s.chapterReq}>
                        {unlocked ? (read ? "읽음" : "새로운 이야기") : `애정도 Lv.${ch.requiredLevel} 필요`}
                      </Text>
                    </View>
                  </View>
                  {unlocked && !read && <View style={s.newBadge}><Text style={s.newBadgeText}>NEW</Text></View>}
                </Pressable>
              );
            })}

            {/* Special image at level 10 */}
            {affinity.level >= 10 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 16 }]}>특별 일러스트</Text>
                <Pressable style={s.specialBtn} onPress={handleUnlockSpecial}>
                  <Text style={s.specialEmoji}>🌟</Text>
                  <Text style={s.specialText}>세라피 스페셜 일러스트</Text>
                </Pressable>
              </>
            )}

            {/* Gallery - review images */}
            {affinity.readChapters.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 16 }]}>회상</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galleryRow}>
                  {CHAPTERS.filter((ch) => affinity.readChapters.includes(ch.chapter)).map((ch) => (
                    <Pressable key={ch.chapter} style={s.galleryThumb} onPress={() => setGalleryImage(ch.image)}>
                      <Image source={ch.image} style={s.galleryThumbImg} resizeMode="cover" />
                      <Text style={s.galleryThumbLabel}>Ch.{ch.chapter}</Text>
                    </Pressable>
                  ))}
                  {affinity.unlockedSpecial && (
                    <Pressable style={s.galleryThumb} onPress={() => setGalleryImage(SPECIAL_IMAGE)}>
                      <Image source={SPECIAL_IMAGE} style={s.galleryThumbImg} resizeMode="cover" />
                      <Text style={s.galleryThumbLabel}>SP</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </>
            )}

            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>닫기</Text>
            </Pressable>
          </ScrollView>
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
    width: "90%",
    maxWidth: 400,
    maxHeight: SCREEN_H * 0.85,
    borderWidth: 1,
    borderColor: "rgba(255,100,150,0.2)",
  },
  scrollContent: {
    padding: 22,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  divider: {
    width: "60%",
    height: 1,
    backgroundColor: "rgba(255,100,150,0.3)",
    marginBottom: 16,
    marginTop: 4,
  },
  // Level box
  levelBox: {
    width: "100%",
    backgroundColor: "rgba(255,100,150,0.08)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,100,150,0.15)",
  },
  heartDisplay: {
    fontSize: 22,
    marginBottom: 6,
    letterSpacing: 2,
  },
  levelText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  xpBarOuter: {
    width: "100%",
    height: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 4,
  },
  xpBarInner: {
    height: "100%",
    backgroundColor: "#FF69B4",
    borderRadius: 5,
  },
  xpText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
  },
  xpTextMax: {
    color: "#FF69B4",
    fontSize: 14,
    fontWeight: "bold",
  },
  xpHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    marginTop: 6,
  },
  // Section
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  // Chapter buttons
  chapterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(35,35,70,0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: "100%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,100,150,0.15)",
  },
  chapterLocked: {
    opacity: 0.4,
  },
  chapterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  chapterNum: {
    color: "#FF69B4",
    fontSize: 14,
    fontWeight: "bold",
    width: 42,
  },
  chapterTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  chapterReq: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: "#FF69B4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  // Special
  specialBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: "100%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    gap: 12,
  },
  specialEmoji: {
    fontSize: 24,
  },
  specialText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Gallery row
  galleryRow: {
    width: "100%",
    marginBottom: 8,
  },
  galleryThumb: {
    marginRight: 8,
    alignItems: "center",
  },
  galleryThumbImg: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,100,150,0.3)",
  },
  galleryThumbLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 4,
  },
  // Gallery full view
  galleryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryImg: {
    width: SCREEN_W * 0.95,
    height: SCREEN_H * 0.8,
  },
  galleryHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginTop: 16,
  },
  // Story view
  storyOverlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  storyImgWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.5,
  },
  storyImg: {
    width: "100%",
    height: "100%",
  },
  storyImgGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "transparent",
    // Fake gradient with a semi-transparent black
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -40 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  storyContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_H * 0.4,
  },
  storyChapterLabel: {
    color: "#FF69B4",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  storyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  storyDivider: {
    width: 40,
    height: 2,
    backgroundColor: "#FF69B4",
    marginBottom: 16,
  },
  storyText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 26,
  },
  storyTapHint: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    marginTop: 20,
    textAlign: "center",
  },
  // Close
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
  rewardPopup: {
    backgroundColor: "rgba(255,165,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.4)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  rewardPopupText: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
});
