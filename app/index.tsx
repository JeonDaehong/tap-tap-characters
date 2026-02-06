import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
  BackHandler,
  Image,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import * as storage from "../utils/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MenuScreen() {
  const router = useRouter();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [bgmEnabled, setBgmEnabled] = useState(true);

  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(30)).current;
  const catBounce = useRef(new Animated.Value(0)).current;
  const charShake = useRef(new Animated.Value(0)).current;

  // Audio refs
  const bgmRef = useRef<Audio.Sound | null>(null);
  const tapSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // Load settings and sounds
    (async () => {
      const [sfx, bgm] = await Promise.all([
        storage.getSfxEnabled(),
        storage.getBgmEnabled(),
      ]);
      setSfxEnabled(sfx);
      setBgmEnabled(bgm);

      try {
        const { sound: bgmSound } = await Audio.Sound.createAsync(
          require("../assets/sfx/bgm_menu.wav"),
          { isLooping: true, volume: 0.3 }
        );
        bgmRef.current = bgmSound;
        if (bgm) {
          await bgmSound.playAsync();
        }
      } catch {}
      try {
        const { sound: tap } = await Audio.Sound.createAsync(
          require("../assets/sfx/tap.wav"),
          { volume: 0.6 }
        );
        tapSoundRef.current = tap;
      } catch {}
    })();

    return () => {
      bgmRef.current?.stopAsync().then(() => bgmRef.current?.unloadAsync());
      tapSoundRef.current?.unloadAsync();
    };
  }, []);

  const toggleSfx = useCallback(async () => {
    const newVal = !sfxEnabled;
    setSfxEnabled(newVal);
    await storage.setSfxEnabled(newVal);
  }, [sfxEnabled]);

  const toggleBgm = useCallback(async () => {
    const newVal = !bgmEnabled;
    setBgmEnabled(newVal);
    await storage.setBgmEnabled(newVal);
    if (newVal) {
      bgmRef.current?.playAsync();
    } else {
      bgmRef.current?.pauseAsync();
    }
  }, [bgmEnabled]);

  // Stop BGM when navigating away
  const handleStartGame = useCallback(() => {
    bgmRef.current?.stopAsync();
    router.push("/game");
  }, [router]);

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonsTranslateY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]),
    ]).start();

    // Cat bouncing animation loop
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(catBounce, { toValue: -15, duration: 800, useNativeDriver: true }),
        Animated.timing(catBounce, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    bounceLoop.start();

    return () => bounceLoop.stop();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      setExitModalVisible(true);
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const handleExit = () => {
    bgmRef.current?.stopAsync();
    BackHandler.exitApp();
  };

  const handleCharacterTap = useCallback(() => {
    // Play tap sound
    if (sfxEnabled) {
      tapSoundRef.current?.setPositionAsync(0).then(() => tapSoundRef.current?.playAsync());
    }

    // Character shake
    Animated.sequence([
      Animated.timing(charShake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(charShake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(charShake, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(charShake, { toValue: -4, duration: 30, useNativeDriver: true }),
      Animated.timing(charShake, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  }, [charShake]);

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      {/* Title Area */}
      <Animated.View
        style={[
          styles.titleArea,
          {
            opacity: titleOpacity,
            transform: [{ scale: titleScale }],
          },
        ]}
      >
        <Pressable onPress={handleCharacterTap} style={styles.charactersRow}>
          <Animated.View style={{ transform: [{ translateY: catBounce }, { translateX: charShake }] }}>
            <Image
              source={require("../assets/img/m_1.png")}
              style={styles.leftSideImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View style={{ transform: [{ translateY: catBounce }, { translateX: charShake }] }}>
            <Image
              source={require("../assets/img/y_9.png")}
              style={styles.centerImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View style={{ transform: [{ translateY: catBounce }, { translateX: charShake }] }}>
            <Image
              source={require("../assets/img/ack_1.png")}
              style={styles.rightSideImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Pressable>
        <Text style={styles.title}>탭탭 캐릭터즈</Text>
        <Text style={styles.subtitle}>탭하고 수집하고 성장하자!</Text>
      </Animated.View>

      {/* Menu Buttons */}
      <Animated.View
        style={[
          styles.menuButtons,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.menuButton,
            styles.startButton,
            pressed && styles.menuButtonPressed,
          ]}
          onPress={handleStartGame}
        >
          <Text style={styles.menuButtonEmoji}>🎮</Text>
          <Text style={styles.menuButtonText}>게임 시작</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuButton,
            styles.settingsButton,
            pressed && styles.menuButtonPressed,
          ]}
          onPress={() => setSettingsVisible(true)}
        >
          <Text style={styles.menuButtonEmoji}>⚙️</Text>
          <Text style={styles.menuButtonText}>설정</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuButton,
            styles.exitButton,
            pressed && styles.menuButtonPressed,
          ]}
          onPress={() => setExitModalVisible(true)}
        >
          <Text style={styles.menuButtonEmoji}>🚪</Text>
          <Text style={styles.menuButtonText}>종료</Text>
        </Pressable>
      </Animated.View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚙️ 설정</Text>

            <Pressable style={styles.settingItem} onPress={toggleSfx}>
              <Text style={styles.settingLabel}>🔊 효과음</Text>
              <Text style={[styles.settingValue, sfxEnabled && styles.settingValueOn]}>
                {sfxEnabled ? "ON" : "OFF"}
              </Text>
            </Pressable>

            <Pressable style={styles.settingItem} onPress={toggleBgm}>
              <Text style={styles.settingLabel}>🎵 배경음악</Text>
              <Text style={[styles.settingValue, bgmEnabled && styles.settingValueOn]}>
                {bgmEnabled ? "ON" : "OFF"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>닫기</Text>
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
        <Pressable style={styles.modalOverlay} onPress={() => setExitModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🚪 종료</Text>
            <Text style={styles.exitMessage}>정말 게임을 종료하시겠습니까?</Text>

            <View style={styles.exitButtons}>
              <Pressable
                style={[styles.exitBtn, styles.exitBtnCancel]}
                onPress={() => setExitModalVisible(false)}
              >
                <Text style={styles.exitBtnText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.exitBtn, styles.exitBtnConfirm]}
                onPress={handleExit}
              >
                <Text style={styles.exitBtnText}>종료</Text>
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
    backgroundColor: "#16213e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 100,
  },
  bgDecoration1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  bgDecoration2: {
    position: "absolute",
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(138, 43, 226, 0.05)",
  },
  titleArea: {
    alignItems: "center",
    marginBottom: 15,
  },
  charactersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: SCREEN_WIDTH,
    maxWidth: 500,
  },
  centerImage: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55,
    maxWidth: 280,
    maxHeight: 280,
    zIndex: 2,
    marginHorizontal: SCREEN_WIDTH * -0.12,
  },
  leftSideImage: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    maxWidth: 200,
    maxHeight: 200,
    zIndex: 1,
    marginRight: SCREEN_WIDTH * -0.15,
  },
  rightSideImage: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    maxWidth: 200,
    maxHeight: 200,
    zIndex: 1,
    marginLeft: SCREEN_WIDTH * -0.15,
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "rgba(255, 215, 0, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginTop: 8,
  },
  menuButtons: {
    width: "100%",
    gap: 8,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  menuButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  startButton: {
    backgroundColor: "#2a5a2a",
    borderColor: "#3a7a3a",
  },
  settingsButton: {
    backgroundColor: "#2a2a5a",
    borderColor: "#3a3a7a",
  },
  exitButton: {
    backgroundColor: "#5a2a2a",
    borderColor: "#7a3a3a",
  },
  menuButtonEmoji: {
    fontSize: 22,
  },
  menuButtonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
  },
  version: {
    position: "absolute",
    bottom: 20,
    color: "#555",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 28,
    width: "85%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  settingLabel: {
    fontSize: 16,
    color: "#fff",
  },
  settingValue: {
    fontSize: 14,
    color: "#888",
    backgroundColor: "#2a2a4a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingValueOn: {
    color: "#4f4",
    backgroundColor: "#2a4a2a",
  },
  modalCloseBtn: {
    marginTop: 24,
    backgroundColor: "#2a2a5a",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  exitMessage: {
    color: "#aaa",
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  exitButtons: {
    flexDirection: "row",
    gap: 16,
  },
  exitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  exitBtnCancel: {
    backgroundColor: "#444",
  },
  exitBtnConfirm: {
    backgroundColor: "#a33",
  },
  exitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
