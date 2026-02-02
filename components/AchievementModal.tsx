import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ALL_ACHIEVEMENTS } from "../data/achievements";

interface Props {
  visible: boolean;
  unlocked: string[];
  onClose: () => void;
}

export default function AchievementModal({ visible, unlocked, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>🏆 업적</Text>
          <Text style={s.subtitle}>
            {unlocked.length} / {ALL_ACHIEVEMENTS.length} 달성
          </Text>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {ALL_ACHIEVEMENTS.map((ach, i) => {
              const isUnlocked = unlocked.includes(ach.id);
              return (
                <View key={ach.id} style={[s.item, isUnlocked && s.itemUnlocked]}>
                  <Text style={s.itemIcon}>{isUnlocked ? ach.icon : "❓"}</Text>
                  <View style={s.itemInfo}>
                    <Text style={[s.itemTitle, !isUnlocked && s.itemTitleLocked]}>
                      {isUnlocked ? ach.title : "???"}
                    </Text>
                    {isUnlocked && (
                      <Text style={s.itemDesc}>{ach.description}</Text>
                    )}
                  </View>
                  {isUnlocked && <Text style={s.checkmark}>✅</Text>}
                </View>
              );
            })}
          </ScrollView>

          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>닫기</Text>
          </Pressable>
        </View>
      </View>
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
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  list: {
    flexGrow: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#3a3a5a",
  },
  itemUnlocked: {
    borderColor: "#FFD700",
    backgroundColor: "#2a2a3e",
  },
  itemIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  itemTitleLocked: {
    color: "#666",
  },
  itemDesc: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    marginLeft: 8,
  },
  closeBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: "#2a2a5a",
    borderRadius: 10,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
