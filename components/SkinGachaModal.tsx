import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import {
  ALL_SKINS,
  SkinData,
  SKIN_GACHA_COST,
  rollSkinGacha,
  SkinGachaResult,
} from "../data/skins";

interface SkinGachaModalProps {
  visible: boolean;
  onClose: () => void;
  medals: number;
  collection: string[];     // owned cat IDs
  ownedSkins: string[];     // owned skin IDs
  onPull: (skin: SkinData, result: SkinGachaResult) => void;
}

export default function SkinGachaModal({
  visible,
  onClose,
  medals,
  collection,
  ownedSkins,
  onPull,
}: SkinGachaModalProps) {
  const [selectedSkin, setSelectedSkin] = useState<SkinData | null>(null);
  const [phase, setPhase] = useState<"list" | "pulling" | "result">("list");
  const [gachaResult, setGachaResult] = useState<SkinGachaResult | null>(null);

  const buildupScale = useRef(new Animated.Value(1)).current;
  const buildupRotate = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const drumrollRef = useRef<Audio.Sound | null>(null);
  const revealRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { sound: dr } = await Audio.Sound.createAsync(
          require("../assets/sfx/drumroll.wav"),
          { volume: 0.5 }
        );
        drumrollRef.current = dr;
        const { sound: rv } = await Audio.Sound.createAsync(
          require("../assets/sfx/reveal.wav"),
          { volume: 0.6 }
        );
        revealRef.current = rv;
      } catch {}
    })();
    return () => {
      drumrollRef.current?.unloadAsync();
      revealRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setPhase("list");
      setSelectedSkin(null);
      setGachaResult(null);
    }
  }, [visible]);

  const handlePull = () => {
    if (!selectedSkin || medals < SKIN_GACHA_COST) return;
    if (!collection.includes(selectedSkin.catId)) return;
    if (ownedSkins.includes(selectedSkin.id)) return;

    setPhase("pulling");
    const result = rollSkinGacha();
    setGachaResult(result);

    // Play drumroll
    drumrollRef.current?.setPositionAsync(0).then(() => {
      drumrollRef.current?.playAsync();
    }).catch(() => {});

    // Buildup animation
    buildupScale.setValue(1);
    buildupRotate.setValue(0);

    Animated.sequence([
      // Shake buildup (2s)
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(buildupRotate, { toValue: 1, duration: 50, useNativeDriver: true }),
            Animated.timing(buildupRotate, { toValue: -1, duration: 50, useNativeDriver: true }),
          ]),
          { iterations: 15 },
        ),
        Animated.sequence([
          Animated.timing(buildupScale, { toValue: 1.2, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(buildupScale, { toValue: 0.9, duration: 300, useNativeDriver: true }),
          Animated.timing(buildupScale, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => {
      // Explosion
      drumrollRef.current?.stopAsync().catch(() => {});
      revealRef.current?.setPositionAsync(0).then(() => {
        revealRef.current?.playAsync();
      }).catch(() => {});

      flashOpacity.setValue(1);
      Animated.timing(flashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();

      // Reveal result
      setPhase("result");
      resultScale.setValue(0);
      resultOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(resultScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleResultClose = () => {
    if (!selectedSkin || !gachaResult) return;
    onPull(selectedSkin, gachaResult);
    setPhase("list");
    setSelectedSkin(null);
    setGachaResult(null);
  };

  const rotate = buildupRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const getResultText = (result: SkinGachaResult, skin: SkinData) => {
    switch (result.type) {
      case "skin":
        return { emoji: "🎉", title: "스킨 획득!", desc: skin.name, color: "#FFD700" };
      case "full_refund":
        return { emoji: "💰", title: "황금 환급!", desc: `${SKIN_GACHA_COST} 황금 돌려받기`, color: "#4CAF50" };
      case "half_refund":
        return { emoji: "🪙", title: "절반 환급", desc: `${Math.floor(SKIN_GACHA_COST / 2)} 황금 돌려받기`, color: "#FFA500" };
      case "nothing":
        return { emoji: "💨", title: "꽝!", desc: "다음에 다시 도전하세요...", color: "#888" };
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        {/* Flash */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#FFD700", opacity: flashOpacity, zIndex: 0 }]}
          pointerEvents="none"
        />

        <View style={styles.modal}>
          {/* List Phase */}
          {phase === "list" && (
            <>
              <Text style={styles.title}>👗 스킨 뽑기</Text>
              <Text style={styles.medalInfo}>👑 보유 황금: {medals}</Text>

              <ScrollView style={styles.skinList} contentContainerStyle={styles.skinListContent}>
                {ALL_SKINS.map(skin => {
                  const ownsCat = collection.includes(skin.catId);
                  const ownsSkin = ownedSkins.includes(skin.id);
                  const isSelected = selectedSkin?.id === skin.id;

                  return (
                    <Pressable
                      key={skin.id}
                      style={[
                        styles.skinCard,
                        isSelected && styles.skinCardSelected,
                        ownsSkin && styles.skinCardOwned,
                      ]}
                      onPress={() => !ownsSkin && setSelectedSkin(skin)}
                    >
                      <Image
                        source={skin.detailImage}
                        style={styles.skinThumb}
                        resizeMode="contain"
                      />
                      <View style={styles.skinInfo}>
                        <Text style={styles.skinName}>{skin.name}</Text>
                        <Text style={styles.skinDesc}>{skin.description}</Text>
                        <Text style={styles.skinBonus}>코인 획득 +1%</Text>
                        {!ownsCat && (
                          <Text style={styles.skinLocked}>🔒 캐릭터 미보유</Text>
                        )}
                        {ownsSkin && (
                          <Text style={styles.skinOwnedLabel}>✅ 보유 중</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedSkin && !ownedSkins.includes(selectedSkin.id) && (
                <Pressable
                  style={[
                    styles.pullBtn,
                    (!collection.includes(selectedSkin.catId) || medals < SKIN_GACHA_COST) && styles.pullBtnDisabled,
                  ]}
                  onPress={handlePull}
                  disabled={!collection.includes(selectedSkin.catId) || medals < SKIN_GACHA_COST}
                >
                  <Text style={styles.pullBtnText}>뽑기!</Text>
                  <Text style={styles.pullCost}>👑 {SKIN_GACHA_COST}</Text>
                </Pressable>
              )}

              <View style={styles.rateInfo}>
                <Text style={styles.rateText}>확률: 스킨 10% | 전액환급 20% | 반환급 20% | 꽝 50%</Text>
              </View>

              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>닫기</Text>
              </Pressable>
            </>
          )}

          {/* Pulling Phase */}
          {phase === "pulling" && selectedSkin && (
            <Animated.View style={[styles.pullAnim, {
              transform: [{ scale: buildupScale }, { rotate }],
            }]}>
              <Text style={{ fontSize: 80 }}>🎁</Text>
              <Text style={styles.pullingText}>두근두근...</Text>
            </Animated.View>
          )}

          {/* Result Phase */}
          {phase === "result" && gachaResult && selectedSkin && (() => {
            const info = getResultText(gachaResult, selectedSkin);
            return (
              <Animated.View style={[styles.resultBox, {
                opacity: resultOpacity,
                transform: [{ scale: resultScale }],
              }]}>
                <Text style={{ fontSize: 60 }}>{info.emoji}</Text>
                <Text style={[styles.resultTitle, { color: info.color }]}>{info.title}</Text>
                {gachaResult.type === "skin" && (
                  <Image
                    source={selectedSkin.detailImage}
                    style={styles.resultSkinImg}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.resultDesc}>{info.desc}</Text>
                <Pressable style={styles.resultBtn} onPress={handleResultClose}>
                  <Text style={styles.resultBtnText}>확인</Text>
                </Pressable>
              </Animated.View>
            );
          })()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 24,
    width: 330,
    maxHeight: "85%",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#9B6BD1",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  medalInfo: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 16,
  },
  skinList: {
    width: "100%",
    maxHeight: 280,
  },
  skinListContent: {
    gap: 10,
  },
  skinCard: {
    flexDirection: "row",
    backgroundColor: "#222244",
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: "#333",
  },
  skinCardSelected: {
    borderColor: "#FFD700",
    backgroundColor: "#2a2a5a",
  },
  skinCardOwned: {
    borderColor: "#4CAF50",
    opacity: 0.7,
  },
  skinThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  skinInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  skinName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  skinDesc: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 2,
  },
  skinBonus: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  skinLocked: {
    color: "#e94560",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
  },
  skinOwnedLabel: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  pullBtn: {
    backgroundColor: "#9B6BD1",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#9B6BD1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  pullBtnDisabled: {
    backgroundColor: "#444",
    shadowOpacity: 0,
    elevation: 0,
  },
  pullBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  pullCost: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  rateInfo: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  rateText: {
    color: "#666",
    fontSize: 10,
    textAlign: "center",
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  closeBtnText: {
    color: "#888",
    fontSize: 14,
  },
  pullAnim: {
    alignItems: "center",
    paddingVertical: 50,
  },
  pullingText: {
    color: "#ccc",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    letterSpacing: 2,
  },
  resultBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  resultSkinImg: {
    width: 120,
    height: 120,
    marginVertical: 12,
  },
  resultDesc: {
    color: "#ccc",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  resultBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  resultBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
