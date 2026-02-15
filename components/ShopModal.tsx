import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as storage from "../utils/storage";

interface Props {
  visible: boolean;
  onClose: () => void;
  coins: number;
  onPurchase: (itemType: "lifePotion" | "greedDice", cost: number) => void;
}

interface ShopItem {
  id: "lifePotion" | "greedDice";
  name: string;
  emoji: string;
  description: string;
  cost: number;
  weeklyLimit: number;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "lifePotion",
    name: "생명의 물약",
    emoji: "💊",
    description: "모든 캐릭터의 HP를 100으로 회복합니다",
    cost: 500,
    weeklyLimit: 3,
  },
  {
    id: "greedDice",
    name: "탐욕의 주사위",
    emoji: "🎲",
    description: "탐욕의 미로를 이동하는데 사용하는 주사위",
    cost: 500,
    weeklyLimit: 10,
  },
];

export default function ShopModal({ visible, onClose, coins, onPurchase }: Props) {
  const [shopData, setShopData] = useState<storage.ShopPurchaseData | null>(null);
  const [inventory, setInventory] = useState<storage.InventoryData>({ lifePotion: 0, greedDice: 0 });
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const [sd, inv] = await Promise.all([
        storage.getShopPurchases(),
        storage.getInventory(),
      ]);
      setShopData(sd);
      setInventory(inv);
      setSuccessMsg("");
    })();
  }, [visible]);

  const getBought = (id: "lifePotion" | "greedDice"): number => {
    if (!shopData) return 0;
    return id === "lifePotion" ? shopData.lifePotionBought : shopData.greedDiceBought;
  };

  const handleBuy = useCallback(async (item: ShopItem) => {
    if (!shopData) return;
    if (coins < item.cost) return;
    const bought = getBought(item.id);
    if (bought >= item.weeklyLimit) return;

    // Update inventory
    const newInv = { ...inventory };
    newInv[item.id] += 1;
    await storage.setInventory(newInv);
    setInventory(newInv);

    // Update shop purchases
    const newShop = { ...shopData };
    if (item.id === "lifePotion") newShop.lifePotionBought += 1;
    else newShop.greedDiceBought += 1;
    await storage.setShopPurchases(newShop);
    setShopData(newShop);

    // Deduct coins via parent
    onPurchase(item.id, item.cost);

    setSuccessMsg(`${item.name} 구매 완료!`);
    setTimeout(() => setSuccessMsg(""), 2000);
  }, [shopData, inventory, coins, onPurchase]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>🏪 상점</Text>
          <View style={s.divider} />

          {successMsg ? (
            <View style={s.successBanner}>
              <Text style={s.successText}>✨ {successMsg}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            {SHOP_ITEMS.map((item) => {
              const bought = getBought(item.id);
              const soldOut = bought >= item.weeklyLimit;
              const cantAfford = coins < item.cost;
              const disabled = soldOut || cantAfford;
              const owned = inventory[item.id];

              return (
                <View key={item.id} style={s.itemCard}>
                  <Text style={s.itemEmoji}>{item.emoji}</Text>
                  <View style={s.itemInfo}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemDesc}>{item.description}</Text>
                    <Text style={s.itemStock}>
                      이번 주: {bought}/{item.weeklyLimit} | 보유: {owned}개
                    </Text>
                  </View>
                  <Pressable
                    style={[s.buyBtn, disabled && s.buyBtnDisabled]}
                    onPress={() => handleBuy(item)}
                    disabled={disabled}
                  >
                    <Text style={[s.buyBtnText, disabled && s.buyBtnTextDisabled]}>
                      {soldOut ? "품절" : `💰 ${item.cost}`}
                    </Text>
                  </Pressable>
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
    borderRadius: 22,
    padding: 22,
    width: "88%",
    maxWidth: 380,
    maxHeight: "80%",
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
  successBanner: {
    backgroundColor: "rgba(76,255,76,0.12)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(76,255,76,0.3)",
  },
  successText: {
    color: "#4CFF4C",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
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
  itemDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginBottom: 3,
  },
  itemStock: {
    color: "rgba(255,215,0,0.6)",
    fontSize: 10,
  },
  buyBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buyBtnDisabled: {
    backgroundColor: "#3a3a5a",
  },
  buyBtnText: {
    color: "#1a1a2e",
    fontSize: 13,
    fontWeight: "bold",
  },
  buyBtnTextDisabled: {
    color: "#666",
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
