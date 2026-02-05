import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  SectionList,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import CuteCat from "../components/CuteCat";
import {
  ALL_CATS,
  ALL_GRADES,
  ALL_RACES,
  CatData,
  CatRace,
  GRADE_CONFIG,
} from "../data/cats";
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

export default function CollectionScreen() {
  const router = useRouter();
  const [collection, setCollection] = useState<string[]>([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [detailCat, setDetailCat] = useState<CatData | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0); // 0=none, 4=select card, 5=equip
  const [tutorialCatId, setTutorialCatId] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [rawCollection, sel, tut, savedStep, savedCatId] = await Promise.all([
          storage.getCollection(),
          storage.getSelectedCat(),
          storage.getTutorialComplete(),
          storage.getTutorialStep(),
          storage.getTutorialCatId(),
        ]);
        const validIds = new Set(ALL_CATS.map(cat => cat.id));
        const c = rawCollection.filter(id => validIds.has(id));
        setCollection(c);
        setSelectedCatId(sel);

        if (!tut && savedStep === 3 && savedCatId) {
          // Tutorial in progress — guide to select the new character
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
    // During tutorial step 4, only allow tapping the tutorial cat
    if (tutorialStep === 4 && cat.id !== tutorialCatId) return;
    setDetailCat(cat);
    if (tutorialStep === 4) {
      setTutorialStep(5); // Move to step 5: equip
    }
  };

  const handleEquip = async () => {
    if (!detailCat) return;
    setSelectedCatId(detailCat.id);
    await storage.setSelectedCat(detailCat.id);
    setDetailCat(null);

    if (tutorialStep === 5) {
      // Tutorial complete!
      await storage.setTutorialComplete();
      await storage.setTutorialStep(0);
      await storage.setTutorialCatId("");
      setTutorialStep(0);
      // Go back to game
      router.back();
    }
  };

  const renderCard = (cat: CatData) => {
    const owned = collection.includes(cat.id);
    const isSelected = cat.id === selectedCatId;
    const grade = GRADE_CONFIG[cat.grade];
    const isTutorialTarget = tutorialStep === 4 && cat.id === tutorialCatId;
    const isTutorialDimmed = tutorialStep === 4 && cat.id !== tutorialCatId;

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
        {cat.listImage ? (
          <Image
            source={cat.listImage}
            style={[
              { width: 70, height: 70, transform: [{ scale: 2 }] },
              !owned && { opacity: 0.15, tintColor: "#333" },
            ]}
            resizeMode="contain"
          />
        ) : (
          <CuteCat colors={cat.colors} size={70} silhouette={!owned} />
        )}
        {owned ? (
          <>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
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
              const grade = GRADE_CONFIG[detailCat.grade];
              const isEquipped = detailCat.id === selectedCatId;
              return (
                <>
                  <Text style={[styles.detailGrade, { backgroundColor: grade.color }]}>
                    {grade.label}
                  </Text>

                  <View style={styles.detailImageWrap}>
                    {detailCat.thumbnail ? (
                      <Image source={detailCat.thumbnail} style={{ width: 160, height: 160 }} resizeMode="contain" />
                    ) : (
                      <CuteCat colors={detailCat.colors} size={140} />
                    )}
                  </View>

                  <Text style={styles.detailName}>{detailCat.name}</Text>
                  <Text style={styles.detailRace}>{detailCat.race}</Text>
                  <Text style={styles.detailDesc}>{detailCat.description}</Text>

                  <View style={styles.statsTable}>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>점수/탭</Text>
                      <Text style={styles.statVal}>{grade.scorePerTap}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>코인확률</Text>
                      <Text style={styles.statVal}>{Math.round(grade.coinChance * 10)}%</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>크리티컬</Text>
                      <Text style={styles.statVal}>{grade.critChance}%</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statKey}>HP손실</Text>
                      <Text style={styles.statVal}>{grade.hpLossInterval}탭당 -1</Text>
                    </View>
                  </View>

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
  unknown: { color: "#555", fontSize: 14, marginTop: 8 },
  selectedLabel: { color: "#FFD700", fontSize: 10, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center" },
  detailModal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 28,
    width: 320,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  detailGrade: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  detailImageWrap: { marginBottom: 12 },
  detailName: { fontSize: 26, fontWeight: "bold", color: "#fff" },
  detailRace: { fontSize: 13, color: "#aaa", marginTop: 4 },
  detailDesc: { fontSize: 14, color: "#aaa", textAlign: "center", marginTop: 10, lineHeight: 20, paddingHorizontal: 8 },

  statsTable: {
    marginTop: 14,
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  statKey: { color: "#888", fontSize: 12 },
  statVal: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  detailButtons: { marginTop: 20, flexDirection: "row", gap: 12, alignItems: "center" },
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
});
