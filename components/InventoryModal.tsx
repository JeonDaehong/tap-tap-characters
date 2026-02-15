import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import * as storage from "../utils/storage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onUseLifePotion: () => void;
  onOpenMaze: () => void;
}

interface ItemDef {
  id: keyof storage.InventoryData;
  name: string;
  emoji: string;
  description: string;
}

const ITEMS: ItemDef[] = [
  {
    id: "lifePotion",
    name: "생명의 물약",
    emoji: "💊",
    description: "모든 캐릭터의 HP를 100으로 회복합니다",
  },
  {
    id: "greedDice",
    name: "탐욕의 주사위",
    emoji: "🎲",
    description: "탐욕의 미로에서 이동하는데 사용합니다",
  },
];

export default function InventoryModal({
  visible,
  onClose,
  onUseLifePotion,
  onOpenMaze,
}: Props) {
  const [inventory, setInventory] = useState<storage.InventoryData>({
    lifePotion: 0,
    greedDice: 0,
  });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const inv = await storage.getInventory();
      setInventory(inv);
    })();
  }, [visible]);

  const handleUsePotion = () => {
    if (inventory.lifePotion <= 0) return;
    Alert.alert(
      "생명의 물약 사용",
      "모든 캐릭터의 HP를 100으로 회복합니다.\n사용하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "사용",
          onPress: async () => {
            const newInv = { ...inventory, lifePotion: inventory.lifePotion - 1 };
            await storage.setInventory(newInv);
            setInventory(newInv);
            onUseLifePotion();
          },
        },
      ]
    );
  };

  const handleUseDice = () => {
    onClose();
    setTimeout(() => onOpenMaze(), 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>🎒 아이템창</Text>
          <View style={s.divider} />

          {ITEMS.map((item) => {
            const count = inventory[item.id];
            const isEmpty = count <= 0;

            return (
              <View key={item.id} style={[s.itemCard, isEmpty && s.itemCardEmpty]}>
                <Text style={s.itemEmoji}>{item.emoji}</Text>
                <View style={s.itemInfo}>
                  <Text style={[s.itemName, isEmpty && s.itemNameEmpty]}>
                    {item.name}
                  </Text>
                  <Text style={s.itemDesc}>{item.description}</Text>
                  <Text style={[s.itemCount, isEmpty && s.itemCountEmpty]}>
                    보유: {count}개
                  </Text>
                </View>
                <Pressable
                  style={[s.useBtn, isEmpty && s.useBtnDisabled]}
                  disabled={isEmpty}
                  onPress={() => {
                    if (item.id === "lifePotion") handleUsePotion();
                    else handleUseDice();
                  }}
                >
                  <Text style={[s.useBtnText, isEmpty && s.useBtnTextDisabled]}>
                    {item.id === "lifePotion" ? "사용" : "미로 이동"}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <Text style={s.hint}>
            아이템은 상점에서 구매할 수 있습니다
          </Text>

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
    borderRadius: 22,
    padding: 22,
    width: "88%",
    maxWidth: 380,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  divider: {
    width: "60%",
    height: 1,
    backgroundColor: "rgba(255,215,0,0.2)",
    alignSelf: "center",
    marginBottom: 14,
    marginTop: 4,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#3a3a5a",
  },
  itemCardEmpty: {
    opacity: 0.6,
  },
  itemEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 3,
  },
  itemNameEmpty: {
    color: "#888",
  },
  itemDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginBottom: 3,
  },
  itemCount: {
    color: "#4CFF4C",
    fontSize: 12,
    fontWeight: "bold",
  },
  itemCountEmpty: {
    color: "#ff6b6b",
  },
  useBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  useBtnDisabled: {
    backgroundColor: "#3a3a5a",
  },
  useBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  useBtnTextDisabled: {
    color: "#666",
  },
  hint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
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
