import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ALL_CATS, GRADE_CONFIG, CatData, CatGrade } from "../data/cats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExpeditionStatus = "idle" | "active" | "complete";

interface ExpeditionSlot {
  catId: string | null;
  startTime: number; // ms epoch
  duration: number;  // ms
  baseReward: number;
  status: ExpeditionStatus;
}

interface ExpeditionDuration {
  label: string;
  durationMs: number;
  baseReward: number;
}

type UIPhase =
  | { kind: "overview" }
  | { kind: "selectCharacter"; slotIndex: number }
  | { kind: "selectDuration"; slotIndex: number; catId: string }
  | { kind: "confirm"; slotIndex: number; catId: string; expedition: ExpeditionDuration };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExpeditionModalProps {
  visible: boolean;
  onClose: () => void;
  onReward: (coins: number) => void;
  collection: string[];
  enhancements: Record<string, { level: number; duplicates: number }>;
  selectedCatId: string; // 현재 선택중인 캐릭터 (원정 불가)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "cat_tap_expedition";
const SLOT_COUNT = 3;

const EXPEDITION_DURATIONS: ExpeditionDuration[] = [
  { label: "단기 원정 (30분)", durationMs: 30 * 60 * 1000, baseReward: 50 },
  { label: "중기 원정 (2시간)", durationMs: 2 * 60 * 60 * 1000, baseReward: 250 },
  { label: "장기 원정 (6시간)", durationMs: 6 * 60 * 60 * 1000, baseReward: 1000 },
];

const GRADE_MULTIPLIER: Record<CatGrade, number> = {
  C: 1,
  B: 1.5,
  A: 2,
  S: 3,
  SS: 5,
  SSS: 10,
};

const ENHANCEMENT_BONUS_PER_LEVEL = 0.2; // +20 % per level

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptySlots(): ExpeditionSlot[] {
  return Array.from({ length: SLOT_COUNT }, () => ({
    catId: null,
    startTime: 0,
    duration: 0,
    baseReward: 0,
    status: "idle" as ExpeditionStatus,
  }));
}

function getCatById(id: string): CatData | undefined {
  return ALL_CATS.find((c) => c.id === id);
}

function computeReward(
  baseReward: number,
  grade: CatGrade,
  enhancementLevel: number,
): number {
  const gradeMultiplier = GRADE_MULTIPLIER[grade];
  const enhancementMultiplier = 1 + ENHANCEMENT_BONUS_PER_LEVEL * enhancementLevel;
  return Math.floor(baseReward * gradeMultiplier * enhancementMultiplier);
}

function formatTime(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}분`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExpeditionModal({
  visible,
  onClose,
  onReward,
  collection,
  enhancements,
  selectedCatId,
}: ExpeditionModalProps) {
  const [slots, setSlots] = useState<ExpeditionSlot[]>(createEmptySlots);
  const [phase, setPhase] = useState<UIPhase>({ kind: "overview" });
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Persistence ----------------------------------------------------------

  const saveSlots = useCallback(async (next: ExpeditionSlot[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Silently fail -- storage might be unavailable in dev
    }
  }, []);

  const loadSlots = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ExpeditionSlot[] = JSON.parse(raw);
        // Recheck completed status for any active expedition whose time is up
        const updated = parsed.map((slot) => {
          if (
            slot.status === "active" &&
            slot.startTime + slot.duration <= Date.now()
          ) {
            return { ...slot, status: "complete" as ExpeditionStatus };
          }
          return slot;
        });
        // Pad to SLOT_COUNT if data was saved with fewer slots
        while (updated.length < SLOT_COUNT) {
          updated.push({
            catId: null,
            startTime: 0,
            duration: 0,
            baseReward: 0,
            status: "idle",
          });
        }
        setSlots(updated);
        // Persist if anything changed
        if (JSON.stringify(updated) !== raw) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // ---- Effects --------------------------------------------------------------

  // Load persisted state when modal opens
  useEffect(() => {
    if (visible) {
      loadSlots();
      setPhase({ kind: "overview" });
    }
  }, [visible, loadSlots]);

  // 1-second timer while visible
  useEffect(() => {
    if (visible) {
      intervalRef.current = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible]);

  // Auto-mark completed expeditions on each tick
  useEffect(() => {
    let changed = false;
    const updated = slots.map((slot) => {
      if (
        slot.status === "active" &&
        slot.startTime + slot.duration <= now
      ) {
        changed = true;
        return { ...slot, status: "complete" as ExpeditionStatus };
      }
      return slot;
    });
    if (changed) {
      setSlots(updated);
      saveSlots(updated);
    }
  }, [now, slots, saveSlots]);

  // ---- Derived values -------------------------------------------------------

  const busyCatIds = new Set(
    slots
      .filter((s) => s.status === "active" || s.status === "complete")
      .map((s) => s.catId)
      .filter(Boolean) as string[],
  );
  // 현재 선택중인 캐릭터도 원정 불가
  if (selectedCatId) busyCatIds.add(selectedCatId);

  const availableCats = ALL_CATS.filter(
    (cat) => collection.includes(cat.id) && !busyCatIds.has(cat.id),
  );

  // ---- Actions --------------------------------------------------------------

  const handleStartExpedition = useCallback(
    async (slotIndex: number, catId: string, expedition: ExpeditionDuration) => {
      const next = [...slots];
      next[slotIndex] = {
        catId,
        startTime: Date.now(),
        duration: expedition.durationMs,
        baseReward: expedition.baseReward,
        status: "active",
      };
      setSlots(next);
      await saveSlots(next);
      setPhase({ kind: "overview" });
    },
    [slots, saveSlots],
  );

  const handleCollectReward = useCallback(
    async (slotIndex: number) => {
      const slot = slots[slotIndex];
      if (!slot || slot.status !== "complete" || !slot.catId) return;

      const cat = getCatById(slot.catId);
      if (!cat) return;

      const enhLevel = enhancements[slot.catId]?.level ?? 0;
      const reward = computeReward(slot.baseReward, cat.grade, enhLevel);

      const next = [...slots];
      next[slotIndex] = {
        catId: null,
        startTime: 0,
        duration: 0,
        baseReward: 0,
        status: "idle",
      };
      setSlots(next);
      await saveSlots(next);

      onReward(reward);
    },
    [slots, enhancements, onReward, saveSlots],
  );

  // ---- Renderers ------------------------------------------------------------

  const renderSlotCard = (slot: ExpeditionSlot, index: number) => {
    const cat = slot.catId ? getCatById(slot.catId) : null;

    if (slot.status === "idle") {
      return (
        <TouchableOpacity
          key={index}
          style={styles.slotCard}
          activeOpacity={0.7}
          onPress={() => setPhase({ kind: "selectCharacter", slotIndex: index })}
        >
          <View style={styles.slotEmpty}>
            <Text style={styles.slotEmptyPlus}>+</Text>
            <Text style={styles.slotEmptyLabel}>슬롯 {index + 1}</Text>
            <Text style={styles.slotEmptySub}>탭하여 원정 시작</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const remaining = slot.startTime + slot.duration - now;
    const isComplete = slot.status === "complete" || remaining <= 0;
    const enhLevel = slot.catId ? (enhancements[slot.catId]?.level ?? 0) : 0;
    const expectedReward =
      cat && slot.catId
        ? computeReward(slot.baseReward, cat.grade, enhLevel)
        : slot.baseReward;

    return (
      <View key={index} style={[styles.slotCard, isComplete && styles.slotCardComplete]}>
        <View style={styles.slotActiveRow}>
          {cat?.thumbnail ? (
            <Image source={cat.thumbnail} style={styles.slotThumb} />
          ) : (
            <View style={[styles.slotThumb, styles.slotThumbPlaceholder]}>
              <Text style={styles.slotThumbText}>{cat?.name?.[0] ?? "?"}</Text>
            </View>
          )}
          <View style={styles.slotInfo}>
            <View style={styles.slotNameRow}>
              <Text style={styles.slotName}>{cat?.name ?? "???"}</Text>
              {cat && (
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: GRADE_CONFIG[cat.grade].color },
                  ]}
                >
                  <Text style={styles.gradeBadgeText}>{cat.grade}</Text>
                </View>
              )}
              {enhLevel > 0 && (
                <Text style={styles.enhLabel}>+{enhLevel}</Text>
              )}
            </View>
            <Text style={styles.slotRewardLabel}>
              예상 보상: <Text style={styles.slotRewardValue}>{expectedReward}</Text> 코인
            </Text>
            <Text style={styles.slotDuration}>
              총 시간: {formatDuration(slot.duration)}
            </Text>
          </View>
        </View>

        {isComplete ? (
          <TouchableOpacity
            style={styles.collectButton}
            activeOpacity={0.7}
            onPress={() => handleCollectReward(index)}
          >
            <Text style={styles.collectButtonText}>보상 받기</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.timerContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      100,
                      ((now - slot.startTime) / slot.duration) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.timerText}>남은 시간: {formatTime(remaining)}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCharacterItem = ({ item }: { item: CatData }) => {
    if (phase.kind !== "selectCharacter") return null;
    const enhLevel = enhancements[item.id]?.level ?? 0;
    const gradeColor = GRADE_CONFIG[item.grade].color;

    return (
      <TouchableOpacity
        style={styles.charItem}
        activeOpacity={0.7}
        onPress={() =>
          setPhase({
            kind: "selectDuration",
            slotIndex: phase.slotIndex,
            catId: item.id,
          })
        }
      >
        {item.thumbnail ? (
          <Image source={item.thumbnail} style={styles.charThumb} />
        ) : (
          <View style={[styles.charThumb, styles.charThumbPlaceholder]}>
            <Text style={styles.charThumbText}>{item.name[0]}</Text>
          </View>
        )}
        <View style={styles.charInfo}>
          <View style={styles.charNameRow}>
            <Text style={styles.charName}>{item.name}</Text>
            <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
              <Text style={styles.gradeBadgeText}>{item.grade}</Text>
            </View>
            {enhLevel > 0 && (
              <Text style={styles.enhLabel}>+{enhLevel}</Text>
            )}
          </View>
          <Text style={styles.charMultiplier}>
            보상 배율: x{GRADE_MULTIPLIER[item.grade]}
            {enhLevel > 0 && ` (+${enhLevel * 20}% 강화 보너스)`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDurationOption = (exp: ExpeditionDuration) => {
    if (phase.kind !== "selectDuration") return null;
    const cat = getCatById(phase.catId);
    if (!cat) return null;

    const enhLevel = enhancements[phase.catId]?.level ?? 0;
    const reward = computeReward(exp.baseReward, cat.grade, enhLevel);

    return (
      <TouchableOpacity
        key={exp.label}
        style={styles.durationItem}
        activeOpacity={0.7}
        onPress={() =>
          setPhase({
            kind: "confirm",
            slotIndex: phase.slotIndex,
            catId: phase.catId,
            expedition: exp,
          })
        }
      >
        <Text style={styles.durationLabel}>{exp.label}</Text>
        <Text style={styles.durationReward}>예상 보상: {reward} 코인</Text>
      </TouchableOpacity>
    );
  };

  const renderConfirm = () => {
    if (phase.kind !== "confirm") return null;
    const cat = getCatById(phase.catId);
    if (!cat) return null;

    const enhLevel = enhancements[phase.catId]?.level ?? 0;
    const reward = computeReward(
      phase.expedition.baseReward,
      cat.grade,
      enhLevel,
    );

    return (
      <View style={styles.confirmContainer}>
        <Text style={styles.confirmTitle}>원정 확인</Text>

        <View style={styles.confirmCard}>
          {cat.thumbnail ? (
            <Image source={cat.thumbnail} style={styles.confirmThumb} />
          ) : (
            <View style={[styles.confirmThumb, styles.charThumbPlaceholder]}>
              <Text style={styles.charThumbText}>{cat.name[0]}</Text>
            </View>
          )}
          <View style={styles.confirmInfo}>
            <View style={styles.charNameRow}>
              <Text style={styles.confirmName}>{cat.name}</Text>
              <View
                style={[
                  styles.gradeBadge,
                  { backgroundColor: GRADE_CONFIG[cat.grade].color },
                ]}
              >
                <Text style={styles.gradeBadgeText}>{cat.grade}</Text>
              </View>
              {enhLevel > 0 && (
                <Text style={styles.enhLabel}>+{enhLevel}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.confirmDetails}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>원정 유형</Text>
            <Text style={styles.confirmValue}>{phase.expedition.label}</Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>소요 시간</Text>
            <Text style={styles.confirmValue}>
              {formatDuration(phase.expedition.durationMs)}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>등급 배율</Text>
            <Text style={styles.confirmValue}>
              x{GRADE_MULTIPLIER[cat.grade]}
            </Text>
          </View>
          {enhLevel > 0 && (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>강화 보너스</Text>
              <Text style={styles.confirmValue}>+{enhLevel * 20}%</Text>
            </View>
          )}
          <View style={[styles.confirmRow, styles.confirmRowTotal]}>
            <Text style={styles.confirmTotalLabel}>예상 보상</Text>
            <Text style={styles.confirmTotalValue}>{reward} 코인</Text>
          </View>
        </View>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={styles.confirmCancelBtn}
            activeOpacity={0.7}
            onPress={() => setPhase({ kind: "overview" })}
          >
            <Text style={styles.confirmCancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmOkBtn}
            activeOpacity={0.7}
            onPress={() =>
              handleStartExpedition(
                phase.slotIndex,
                phase.catId,
                phase.expedition,
              )
            }
          >
            <Text style={styles.confirmOkText}>출발!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ---- Main render ----------------------------------------------------------

  const renderContent = () => {
    switch (phase.kind) {
      case "overview":
        return (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {slots.map((slot, i) => renderSlotCard(slot, i))}
          </ScrollView>
        );

      case "selectCharacter":
        return (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.phaseTitle}>캐릭터 선택</Text>
            <Text style={styles.phaseSub}>
              슬롯 {phase.slotIndex + 1}에 배치할 캐릭터를 선택하세요
            </Text>
            {availableCats.length === 0 ? (
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>
                  배치 가능한 캐릭터가 없습니다
                </Text>
              </View>
            ) : (
              availableCats.map((item) => (
                <React.Fragment key={item.id}>
                  {renderCharacterItem({ item })}
                </React.Fragment>
              ))
            )}
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => setPhase({ kind: "overview" })}
            >
              <Text style={styles.backButtonText}>돌아가기</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case "selectDuration": {
        const selectedCat = getCatById(phase.catId);
        return (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.phaseTitle}>원정 시간 선택</Text>
            {selectedCat && (
              <Text style={styles.phaseSub}>
                {selectedCat.name} ({selectedCat.grade})
              </Text>
            )}
            <View style={styles.durationList}>
              {EXPEDITION_DURATIONS.map((exp) => renderDurationOption(exp))}
            </View>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() =>
                setPhase({
                  kind: "selectCharacter",
                  slotIndex: phase.slotIndex,
                })
              }
            >
              <Text style={styles.backButtonText}>돌아가기</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      }

      case "confirm":
        return (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderConfirm()}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>원정</Text>
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.7}
              onPress={() => {
                setPhase({ kind: "overview" });
                onClose();
              }}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Modal frame
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD700",
    overflow: "hidden",
    flexDirection: "column",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,215,0,0.25)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },

  // Scroll body
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },

  // Slot cards
  slotCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  slotCardComplete: {
    borderColor: "#FFD700",
    borderWidth: 1.5,
  },
  slotEmpty: {
    alignItems: "center",
    paddingVertical: 18,
  },
  slotEmptyPlus: {
    fontSize: 36,
    color: "rgba(255,215,0,0.5)",
    fontWeight: "300",
  },
  slotEmptyLabel: {
    fontSize: 15,
    color: "#ccc",
    marginTop: 4,
    fontWeight: "600",
  },
  slotEmptySub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  // Active slot
  slotActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  slotThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  slotThumbPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  slotThumbText: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
  },
  slotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  slotNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  slotName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 6,
  },
  slotRewardLabel: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },
  slotRewardValue: {
    color: "#FFD700",
    fontWeight: "bold",
  },
  slotDuration: {
    fontSize: 11,
    color: "#777",
    marginTop: 1,
  },

  // Timer
  timerContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  timerText: {
    fontSize: 13,
    color: "#ccc",
    textAlign: "center",
  },

  // Collect button
  collectButton: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  collectButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a2e",
  },

  // Phase screens
  phaseContainer: {
    flex: 1,
    padding: 14,
  },
  phaseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  phaseSub: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 14,
  },

  // Character list
  charList: {
    flex: 1,
  },
  charListContent: {
    paddingBottom: 12,
  },
  charItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
  },
  charThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  charThumbPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  charThumbText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
  },
  charInfo: {
    flex: 1,
    marginLeft: 10,
  },
  charNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  charName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 6,
  },
  charMultiplier: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 3,
  },

  // Grade badge
  gradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
  },
  enhLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
  },

  // Duration list
  durationList: {
    flex: 1,
  },
  durationItem: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  durationLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  durationReward: {
    fontSize: 13,
    color: "#FFD700",
  },

  // Confirm screen
  confirmContainer: {
    padding: 2,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  confirmThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  confirmInfo: {
    flex: 1,
    marginLeft: 12,
  },
  confirmName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 6,
  },
  confirmDetails: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  confirmRowTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,215,0,0.3)",
  },
  confirmLabel: {
    fontSize: 13,
    color: "#aaa",
  },
  confirmValue: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  confirmTotalLabel: {
    fontSize: 15,
    color: "#FFD700",
    fontWeight: "bold",
  },
  confirmTotalValue: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "bold",
  },

  // Confirm buttons
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmCancelBtn: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    color: "#aaa",
    fontWeight: "600",
  },
  confirmOkBtn: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FFD700",
    alignItems: "center",
  },
  confirmOkText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a2e",
  },

  // Back button
  backButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 13,
    color: "#aaa",
    fontWeight: "600",
  },

  // Empty state
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyListText: {
    fontSize: 14,
    color: "#777",
  },
});
