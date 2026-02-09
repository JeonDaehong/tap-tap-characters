import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  SectionList,
  Animated,
  Easing,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import CuteCat from "../components/CuteCat";
import {
  ALL_CATS,
  ALL_GRADES,
  ALL_RACES,
  CatData,
  GRADE_CONFIG,
  getEnhancedConfig,
  getEnhancementCost,
  MAX_ENHANCEMENT,
} from "../data/cats";
import { getSkinByCatId, getSkinById, SkinData } from "../data/skins";
import * as storage from "../utils/storage";

interface Section {
  title: string;
  subtitle?: string;
  data: CatData[][];
}

function buildSections(): Section[] {
  const sections: Section[] = [];

  for (const race of ALL_RACES) {
    const raceCats = ALL_CATS.filter(c => c.race === race);
    if (raceCats.length === 0) continue;

    // Sort by grade within race (SSS first)
    raceCats.sort((a, b) => ALL_GRADES.indexOf(a.grade) - ALL_GRADES.indexOf(b.grade));

    // Chunk into rows of 2
    const rows: CatData[][] = [];
    for (let i = 0; i < raceCats.length; i += 2) {
      rows.push(raceCats.slice(i, i + 2));
    }

    sections.push({
      title: race,
      subtitle: `${raceCats.length}종`,
      data: rows,
    });
  }
  return sections;
}

const sections = buildSections();

const ENHANCE_STARS = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];
const ENHANCE_COLORS = ["#888", "#6B9BD1", "#9B6BD1", "#FFD700", "#FF69B4", "#FF4444"];

export default function CollectionScreen() {
  const router = useRouter();
  const [collection, setCollection] = useState<string[]>([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [detailCat, setDetailCat] = useState<CatData | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCatId, setTutorialCatId] = useState("");
  const [enhancements, setEnhancements] = useState<Record<string, storage.EnhancementData>>({});
  const [ownedSkins, setOwnedSkins] = useState<string[]>([]);
  const [equippedSkins, setEquippedSkins] = useState<Record<string, string>>({});
  const [detailTab, setDetailTab] = useState<"enhance" | "skin">("enhance");
  const [zoomImage, setZoomImage] = useState<any>(null);

  // Enhancement animation
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceSuccess, setEnhanceSuccess] = useState(false);
  const enhFlash = useRef(new Animated.Value(0)).current;
  const enhScale = useRef(new Animated.Value(1)).current;
  const enhStarScale = useRef(new Animated.Value(0)).current;
  const enhStarOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [rawCollection, sel, tut, savedStep, savedCatId, enhData, oSkins, eqSkins] = await Promise.all([
          storage.getCollection(),
          storage.getSelectedCat(),
          storage.getTutorialComplete(),
          storage.getTutorialStep(),
          storage.getTutorialCatId(),
          storage.getAllCatEnhancements(),
          storage.getOwnedSkins(),
          storage.getAllEquippedSkinsData(),
        ]);
        const validIds = new Set(ALL_CATS.map(cat => cat.id));
        const c = rawCollection.filter(id => validIds.has(id));
        setCollection(c);
        setSelectedCatId(sel);
        setEnhancements(enhData);
        setOwnedSkins(oSkins);
        setEquippedSkins(eqSkins);

        if (!tut && savedStep === 3 && savedCatId) {
          setTutorialStep(4);
          setTutorialCatId(savedCatId);
        } else {
          setTutorialStep(0);
        }
      })();
    }, [])
  );

  const handleCardPress = (cat: CatData) => {
    if (!collection.includes(cat.id)) return;
    if (tutorialStep === 4 && cat.id !== tutorialCatId) return;
    setDetailCat(cat);
    setEnhanceSuccess(false);
    setDetailTab("enhance");
    if (tutorialStep === 4) {
      setTutorialStep(5);
    }
  };

  const handleEquip = async () => {
    if (!detailCat) return;
    setSelectedCatId(detailCat.id);
    await storage.setSelectedCat(detailCat.id);
    setDetailCat(null);

    if (tutorialStep === 5) {
      await storage.setTutorialComplete();
      await storage.setTutorialStep(0);
      await storage.setTutorialCatId("");
      setTutorialStep(0);
      router.back();
    }
  };

  const handleEquipSkin = async (catId: string, skinId: string) => {
    await storage.setEquippedSkin(catId, skinId);
    setEquippedSkins(prev => ({ ...prev, [catId]: skinId }));
  };

  const handleUnequipSkin = async (catId: string) => {
    await storage.clearEquippedSkin(catId);
    setEquippedSkins(prev => {
      const copy = { ...prev };
      delete copy[catId];
      return copy;
    });
  };

  const handleEnhance = async () => {
    if (!detailCat) return;
    const data = enhancements[detailCat.id] ?? { level: 0, duplicates: 0 };
    const cost = getEnhancementCost(data.level);
    if (data.level >= MAX_ENHANCEMENT || data.duplicates < cost) return;

    setEnhancing(true);

    // Animate: flash + shake
    enhFlash.setValue(0);
    enhScale.setValue(1);
    enhStarScale.setValue(0);
    enhStarOpacity.setValue(0);

    Animated.sequence([
      // Shake buildup
      Animated.parallel([
        Animated.sequence([
          Animated.timing(enhScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(enhScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
          Animated.timing(enhScale, { toValue: 1.15, duration: 200, useNativeDriver: true }),
          Animated.timing(enhScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        ]),
        Animated.timing(enhFlash, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
      // Explosion
      Animated.parallel([
        Animated.timing(enhFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(enhScale, { toValue: 1.3, friction: 3, useNativeDriver: true }),
      ]),
      // Settle + star appears
      Animated.parallel([
        Animated.timing(enhFlash, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.spring(enhScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.spring(enhStarScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(enhStarOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(async () => {
      const result = await storage.enhanceCat(detailCat.id);
      if (result) {
        setEnhancements(prev => ({ ...prev, [detailCat.id]: result }));
        setEnhanceSuccess(true);
      }
      setEnhancing(false);

      // Fade star away after 1.5s
      setTimeout(() => {
        Animated.timing(enhStarOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
          setEnhanceSuccess(false);
        });
      }, 1500);
    });
  };

  const renderCard = (cat: CatData) => {
    const owned = collection.includes(cat.id);
    const isSelected = cat.id === selectedCatId;
    const grade = GRADE_CONFIG[cat.grade];
    const isTutorialTarget = tutorialStep === 4 && cat.id === tutorialCatId;
    const isTutorialDimmed = tutorialStep === 4 && cat.id !== tutorialCatId;
    const enh = enhancements[cat.id];
    const enhLevel = enh?.level ?? 0;

    return (
      <Pressable
        key={cat.id}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isTutorialTarget && styles.cardTutorialHighlight,
          isTutorialDimmed && { opacity: 0.3 },
        ]}
        onPress={() => handleCardPress(cat)}
      >
        {(() => {
          const eqSkinId = equippedSkins[cat.id];
          const eqSkin = eqSkinId ? getSkinById(eqSkinId) : null;
          const imgSource = owned && eqSkin ? eqSkin.thumbnail : cat.listImage;
          if (imgSource) {
            return (
              <Image
                source={imgSource}
                style={[
                  { width: 70, height: 70, transform: [{ scale: 2 }] },
                  !owned && { opacity: 0.15, tintColor: "#333" },
                ]}
                resizeMode="contain"
              />
            );
          }
          return <CuteCat colors={cat.colors} size={70} silhouette={!owned} />;
        })()}
        {owned ? (
          <>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
            {enhLevel > 0 && (
              <Text style={[styles.enhLabel, { color: ENHANCE_COLORS[enhLevel] }]}>
                +{enhLevel} {ENHANCE_STARS[enhLevel]}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.unknown}>???</Text>
        )}
        {isSelected && owned && (
          <Text style={styles.selectedLabel}>사용 중</Text>
        )}
        {isTutorialTarget && (
          <Text style={styles.tutorialCardHint}>👆 눌러주세요!</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tutorial banner */}
      {tutorialStep === 4 && (
        <View style={styles.tutorialBanner}>
          <Text style={styles.tutorialBannerText}>🎉 뽑은 캐릭터를 눌러서 장착해보세요!</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => `row-${idx}`}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={styles.title}>
            {collection.length} / {ALL_CATS.length} 수집 완료
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.subtitle && (
              <Text style={styles.sectionSub}>{section.subtitle}</Text>
            )}
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map(cat => renderCard(cat))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Detail Modal */}
      <Modal transparent visible={!!detailCat} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.detailModal}>
            {detailCat && (() => {
              const enh = enhancements[detailCat.id] ?? { level: 0, duplicates: 0 };
              const enhConfig = getEnhancedConfig(detailCat.grade, enh.level);
              const baseConfig = GRADE_CONFIG[detailCat.grade];
              const isEquipped = detailCat.id === selectedCatId;
              const cost = getEnhancementCost(enh.level);
              const canEnhance = enh.level < MAX_ENHANCEMENT && enh.duplicates >= cost;
              const isMaxed = enh.level >= MAX_ENHANCEMENT;

              return (
                <>
                  {/* Enhancement flash overlay */}
                  <Animated.View
                    style={[StyleSheet.absoluteFill, {
                      backgroundColor: ENHANCE_COLORS[Math.min(enh.level + 1, 5)],
                      opacity: enhFlash,
                      borderRadius: 20,
                      zIndex: 10,
                    }]}
                    pointerEvents="none"
                  />

                  {/* Success star burst */}
                  {enhanceSuccess && (
                    <Animated.View style={[styles.enhSuccessOverlay, {
                      opacity: enhStarOpacity,
                      transform: [{ scale: enhStarScale }],
                    }]} pointerEvents="none">
                      <Text style={styles.enhSuccessText}>
                        +{enh.level} 강화 성공!
                      </Text>
                      <Text style={[styles.enhSuccessStars, { color: ENHANCE_COLORS[enh.level] }]}>
                        {ENHANCE_STARS[enh.level]}
                      </Text>
                    </Animated.View>
                  )}

                  <Text style={[styles.detailGrade, { backgroundColor: baseConfig.color }]}>
                    {baseConfig.label}
                    {enh.level > 0 ? ` +${enh.level}` : ""}
                  </Text>

                  <Animated.View style={[styles.detailImageWrap, { transform: [{ scale: enhScale }] }]}>
                    {(() => {
                      const eqSkinId = equippedSkins[detailCat.id];
                      const eqSkin = eqSkinId ? getSkinById(eqSkinId) : null;
                      const imgSource = eqSkin ? eqSkin.detailImage : detailCat.thumbnail;
                      if (imgSource) {
                        return (
                          <Pressable onPress={() => setZoomImage(imgSource)}>
                            <Image source={imgSource} style={{ width: 160, height: 160 }} resizeMode="contain" />
                          </Pressable>
                        );
                      }
                      return <CuteCat colors={detailCat.colors} size={140} />;
                    })()}
                  </Animated.View>

                  <Text style={styles.detailName}>{detailCat.name}</Text>
                  <Text style={styles.detailRace}>{detailCat.race}</Text>

                  {/* Enhancement level indicator */}
                  {enh.level > 0 && (
                    <Text style={[styles.enhBadge, { color: ENHANCE_COLORS[enh.level] }]}>
                      {ENHANCE_STARS[enh.level]} +{enh.level}강
                    </Text>
                  )}

                  <Text style={styles.detailDesc}>{detailCat.description}</Text>

                  {/* Stats table with enhancement bonuses */}
                  <View style={styles.statsTable}>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>점수/탭</Text>
                      <Text style={styles.statVal}>{enhConfig.scorePerTap}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>코인확률</Text>
                      <View style={styles.statValRow}>
                        <Text style={styles.statVal}>{Math.round(enhConfig.coinChance * 10)}%</Text>
                        {enh.level > 0 && (
                          <Text style={styles.statBonus}>
                            (+{Math.round((enhConfig.coinChance - baseConfig.coinChance) * 10)}%)
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>크리티컬</Text>
                      <View style={styles.statValRow}>
                        <Text style={styles.statVal}>{enhConfig.critChance}%</Text>
                        {enh.level > 0 && (
                          <Text style={styles.statBonus}>
                            (+{(enhConfig.critChance - baseConfig.critChance).toFixed(1)}%)
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>HP손실</Text>
                      <View style={styles.statValRow}>
                        <Text style={styles.statVal}>{enhConfig.hpLossInterval}탭당 -1</Text>
                        {enh.level > 0 && (
                          <Text style={styles.statBonus}>
                            (+{enhConfig.hpLossInterval - baseConfig.hpLossInterval})
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Tab buttons */}
                  {tutorialStep === 0 && (() => {
                    const catSkins = getSkinByCatId(detailCat.id);
                    const hasSkins = catSkins.length > 0;

                    return (
                      <>
                        {hasSkins && (
                          <View style={styles.tabBar}>
                            <Pressable
                              style={[styles.tabBtn, detailTab === "enhance" && styles.tabBtnActive]}
                              onPress={() => setDetailTab("enhance")}
                            >
                              <Text style={[styles.tabBtnText, detailTab === "enhance" && styles.tabBtnTextActive]}>
                                승급
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles.tabBtn, detailTab === "skin" && styles.tabBtnActive]}
                              onPress={() => setDetailTab("skin")}
                            >
                              <Text style={[styles.tabBtnText, detailTab === "skin" && styles.tabBtnTextActive]}>
                                👗 스킨
                              </Text>
                            </Pressable>
                          </View>
                        )}

                        {/* Enhancement tab */}
                        {(detailTab === "enhance" || !hasSkins) && (
                          <View style={styles.enhSection}>
                            <View style={styles.enhHeader}>
                              <Text style={styles.enhTitle}>승급</Text>
                              <Text style={styles.enhMaterial}>
                                재료: {enh.duplicates}개
                                {!isMaxed && ` (필요: ${cost}개)`}
                              </Text>
                            </View>

                            <View style={styles.enhBarContainer}>
                              {[1, 2, 3, 4, 5].map(i => (
                                <View
                                  key={i}
                                  style={[
                                    styles.enhBarSegment,
                                    i <= enh.level && { backgroundColor: ENHANCE_COLORS[i] },
                                  ]}
                                >
                                  <Text style={styles.enhBarText}>{i}</Text>
                                </View>
                              ))}
                            </View>

                            {isMaxed ? (
                              <View style={styles.enhMaxBadge}>
                                <Text style={styles.enhMaxText}>MAX</Text>
                              </View>
                            ) : (
                              <Pressable
                                style={[
                                  styles.enhButton,
                                  canEnhance ? styles.enhButtonActive : styles.enhButtonDisabled,
                                ]}
                                onPress={handleEnhance}
                                disabled={!canEnhance || enhancing}
                              >
                                <Text style={styles.enhButtonText}>
                                  {enhancing ? "강화 중..." : `+${enh.level + 1}강 승급`}
                                </Text>
                                {!enhancing && (
                                  <Text style={styles.enhButtonCost}>
                                    재료 {cost}개 소모
                                  </Text>
                                )}
                              </Pressable>
                            )}
                          </View>
                        )}

                        {/* Skin tab */}
                        {detailTab === "skin" && hasSkins && (() => {
                          const currentSkinId = equippedSkins[detailCat.id] ?? "";
                          return (
                            <View style={styles.skinSection}>
                              {catSkins.map(skin => {
                                const owned = ownedSkins.includes(skin.id);
                                const equipped = currentSkinId === skin.id;
                                return (
                                  <View key={skin.id} style={styles.skinRow}>
                                    <Image source={skin.detailImage} style={styles.skinRowThumb} resizeMode="contain" />
                                    <View style={styles.skinRowInfo}>
                                      <Text style={styles.skinRowName}>{skin.name}</Text>
                                      <Text style={styles.skinRowBonus}>코인 획득 +1%</Text>
                                    </View>
                                    {owned ? (
                                      equipped ? (
                                        <Pressable
                                          style={styles.skinBtnUnequip}
                                          onPress={() => handleUnequipSkin(detailCat.id)}
                                        >
                                          <Text style={styles.skinBtnText}>해제</Text>
                                        </Pressable>
                                      ) : (
                                        <Pressable
                                          style={styles.skinBtnEquip}
                                          onPress={() => handleEquipSkin(detailCat.id, skin.id)}
                                        >
                                          <Text style={styles.skinBtnText}>착용</Text>
                                        </Pressable>
                                      )
                                    ) : (
                                      <Text style={styles.skinLockLabel}>🔒 미보유</Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })()}
                      </>
                    );
                  })()}

                  <View style={styles.detailButtons}>
                    {isEquipped ? (
                      <View style={styles.equippedBadge}>
                        <Text style={styles.equippedText}>사용 중</Text>
                      </View>
                    ) : (
                      <View>
                        {tutorialStep === 5 && (
                          <Text style={styles.tutorialEquipHint}>👇 캐릭터를 장착하세요!</Text>
                        )}
                        <Pressable
                          style={[styles.equipButton, tutorialStep === 5 && styles.equipButtonHighlight]}
                          onPress={handleEquip}
                        >
                          <Text style={styles.equipButtonText}>캐릭터 교체</Text>
                        </Pressable>
                      </View>
                    )}
                    {tutorialStep === 0 && (
                      <Pressable style={styles.closeButton} onPress={() => setDetailCat(null)}>
                        <Text style={styles.closeButtonText}>닫기</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Zoom image modal */}
      <Modal transparent visible={!!zoomImage} animationType="fade">
        <Pressable style={styles.zoomOverlay} onPress={() => setZoomImage(null)}>
          <Image source={zoomImage} style={styles.zoomImage} resizeMode="contain" />
          <Pressable style={styles.zoomCloseBtn} onPress={() => setZoomImage(null)}>
            <Text style={styles.zoomCloseBtnText}>✕ 닫기</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16213e" },
  listContent: { padding: 16 },
  title: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
  },
  sectionSub: {
    fontSize: 12,
    color: "#888",
  },

  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    width: 150,
    borderWidth: 2,
    borderColor: "#333",
  },
  cardSelected: { borderColor: "#FFD700" },
  cardTutorialHighlight: {
    borderColor: "#4CAF50",
    borderWidth: 3,
    backgroundColor: "#1a2e1a",
  },
  catName: { color: "#fff", fontSize: 13, fontWeight: "bold", marginTop: 8 },
  gradeLabel: { fontSize: 11, marginTop: 2 },
  enhLabel: { fontSize: 10, fontWeight: "bold", marginTop: 2 },
  unknown: { color: "#555", fontSize: 14, marginTop: 8 },
  selectedLabel: { color: "#FFD700", fontSize: 10, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center" },
  detailModal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 24,
    width: 330,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
    overflow: "hidden",
  },
  detailGrade: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  detailImageWrap: { marginBottom: 8 },
  detailName: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  detailRace: { fontSize: 13, color: "#aaa", marginTop: 2 },
  enhBadge: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  detailDesc: { fontSize: 13, color: "#aaa", textAlign: "center", marginTop: 8, lineHeight: 18, paddingHorizontal: 8 },

  statsTable: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  statKey: { color: "#888", fontSize: 12 },
  statVal: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  statValRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statBonus: { color: "#4CAF50", fontSize: 11, fontWeight: "bold" },

  // Enhancement section
  enhSection: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#0d0d1a",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  enhHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  enhTitle: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },
  enhMaterial: {
    color: "#aaa",
    fontSize: 11,
  },
  enhBarContainer: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
  },
  enhBarSegment: {
    flex: 1,
    height: 24,
    backgroundColor: "#222",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  enhBarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  enhButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  enhButtonActive: {
    backgroundColor: "#e94560",
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  enhButtonDisabled: {
    backgroundColor: "#333",
  },
  enhButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  enhButtonCost: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 2,
  },
  enhMaxBadge: {
    backgroundColor: "#FFD700",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  enhMaxText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 4,
  },

  // Enhancement animation
  enhSuccessOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
  },
  enhSuccessText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textShadowColor: "#FFD700",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  enhSuccessStars: {
    fontSize: 32,
    marginTop: 8,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    marginTop: 12,
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#111",
  },
  tabBtnActive: {
    backgroundColor: "#2a2a5a",
    borderBottomWidth: 2,
    borderBottomColor: "#FFD700",
  },
  tabBtnText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "bold",
  },
  tabBtnTextActive: {
    color: "#FFD700",
  },

  // Skin section
  skinSection: {
    marginTop: 8,
    width: "100%",
    backgroundColor: "#0d0d1a",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3a2a5a",
  },
  skinRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a30",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  skinRowThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  skinRowInfo: {
    flex: 1,
    marginLeft: 10,
  },
  skinRowName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  skinRowBonus: {
    color: "#4CAF50",
    fontSize: 11,
    marginTop: 2,
  },
  skinBtnEquip: {
    backgroundColor: "#9B6BD1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skinBtnUnequip: {
    backgroundColor: "#555",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skinBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  skinLockLabel: {
    color: "#888",
    fontSize: 11,
  },

  detailButtons: { marginTop: 14, flexDirection: "row", gap: 12, alignItems: "center" },
  equipButton: { backgroundColor: "#e94560", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  equipButtonHighlight: {
    backgroundColor: "#e94560",
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  equipButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  equippedBadge: { backgroundColor: "#333", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  equippedText: { color: "#FFD700", fontSize: 16, fontWeight: "bold" },
  closeButton: { backgroundColor: "#333", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  closeButtonText: { color: "#fff", fontSize: 16 },

  // Tutorial styles
  tutorialBanner: {
    backgroundColor: "#2a5a2a",
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  tutorialBannerText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  tutorialCardHint: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  tutorialEquipHint: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },

  // Zoom image modal
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomImage: {
    width: "85%",
    height: "65%",
  },
  zoomCloseBtn: {
    marginTop: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  zoomCloseBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
