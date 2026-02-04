import React, { useState, useRef, useEffect } from "react";
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

const { width: SCREEN_W } = Dimensions.get("window");

export default function MenuScreen() {
  const router = useRouter();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [ballVisible, setBallVisible] = useState(false);

  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(30)).current;
  const catBounce = useRef(new Animated.Value(0)).current;

  // Ball animation
  const ballX = useRef(new Animated.Value(-100)).current;
  const ballY = useRef(new Animated.Value(-200)).current;
  const ballScale = useRef(new Animated.Value(0.3)).current;
  const ballRotate = useRef(new Animated.Value(0)).current;

  // Impact effects
  const impactScale = useRef(new Animated.Value(0)).current;
  const impactOpacity = useRef(new Animated.Value(0)).current;
  const charShake = useRef(new Animated.Value(0)).current;

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

  const handleStartGame = () => {
    router.push("/game");
  };

  const handleExit = () => {
    BackHandler.exitApp();
  };

  const handleCharacterTap = () => {
    if (ballVisible) return; // Prevent spam

    // Random start from edges
    const startPositions = [
      { x: -100, y: 100 },   // left
      { x: SCREEN_W + 50, y: 150 },  // right
    ];
    const start = startPositions[Math.floor(Math.random() * startPositions.length)];

    ballX.setValue(start.x);
    ballY.setValue(start.y);
    ballScale.setValue(0.8);
    ballRotate.setValue(0);
    setBallVisible(true);

    // Ball flying to center
    Animated.parallel([
      Animated.timing(ballX, {
        toValue: SCREEN_W / 2 - 30,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(ballY, {
        toValue: 180,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(ballRotate, {
        toValue: 2,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Impact!
      setBallVisible(false);

      // Small impact burst at hit location
      impactScale.setValue(0.5);
      impactOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(impactScale, {
          toValue: 1.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(impactOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Light character shake
      Animated.sequence([
        Animated.timing(charShake, { toValue: 8, duration: 40, useNativeDriver: true }),
        Animated.timing(charShake, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(charShake, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(charShake, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    });
  };

  const ballRotateInterpolate = ballRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />

      {/* Flying ball */}
      {ballVisible && (
        <Animated.View
          style={[
            styles.flyingBall,
            {
              transform: [
                { translateX: ballX },
                { translateY: ballY },
                { scale: ballScale },
                { rotate: ballRotateInterpolate },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.ballEmoji}>⚽</Text>
        </Animated.View>
      )}

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

          {/* Impact burst effect */}
          <Animated.View
            style={[
              styles.impactBurst,
              {
                opacity: impactOpacity,
                transform: [{ scale: impactScale }],
              },
            ]}
            pointerEvents="none"
          />
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

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>🔊 효과음</Text>
              <Text style={styles.settingValue}>ON</Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>🎵 배경음악</Text>
              <Text style={styles.settingValue}>준비중</Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>📳 진동</Text>
              <Text style={styles.settingValue}>준비중</Text>
            </View>

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
    marginLeft: -60,
    marginRight: -60,
  },
  centerImage: {
    width: 400,
    height: 400,
    zIndex: 2,
    marginHorizontal: -80,
  },
  leftSideImage: {
    width: 280,
    height: 280,
    zIndex: 1,
    marginRight: -130,
  },
  rightSideImage: {
    width: 280,
    height: 280,
    zIndex: 1,
    marginLeft: -130,
  },
  flyingBall: {
    position: "absolute",
    zIndex: 200,
  },
  ballEmoji: {
    fontSize: 60,
  },
  impactBurst: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 2,
    borderColor: "#fff",
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
