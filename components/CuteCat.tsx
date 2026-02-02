import React from "react";
import { View, StyleSheet } from "react-native";
import { CatColors } from "../data/cats";

export type AnimationState = "normal" | "hurt" | "collapsed";

interface CuteCatProps {
  colors: CatColors;
  size?: number;
  danceFrame?: number;
  totalFrames?: number;
  silhouette?: boolean;
  animationState?: AnimationState;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getKV(keyframes: number[], frame: number, totalFrames: number): number {
  const n = (frame % totalFrames) / totalFrames;
  const pos = n * (keyframes.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, keyframes.length - 1);
  return lerp(keyframes[lo], keyframes[hi], pos - lo);
}

const K = {
  head:  [0, -8, 0, 8, 0, -5],
  bodyY: [1, 0.95, 1.05, 0.95, 1.08, 1],
  bodyX: [1, 1.05, 0.95, 1.05, 0.92, 1],
  lPaw:  [0, -25, -15, 0, -20, -10],
  rPaw:  [0, 0, -15, -25, -20, -10],
  tail:  [0, 15, -10, 15, -15, 5],
  bounce:[0, -3, 0, -3, -12, 0],
};

function mixGray(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 128;
  const g = parseInt(hex.slice(3, 5), 16) || 128;
  const b = parseInt(hex.slice(5, 7), 16) || 128;
  const mr = Math.round(r + (128 - r) * amt);
  const mg = Math.round(g + (128 - g) * amt);
  const mb = Math.round(b + (128 - b) * amt);
  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}

export default function CuteCat({
  colors, size = 120, danceFrame = 0, totalFrames = 6,
  silhouette = false, animationState = "normal",
}: CuteCatProps) {
  const s = size;
  const c = silhouette
    ? { body: "#333", belly: "#444", ear: "#2a2a2a", eye: "#555", nose: "#444", cheek: "#3a3a3a" }
    : animationState === "hurt"
    ? { body: mixGray(colors.body, 0.3), belly: mixGray(colors.belly, 0.2), ear: mixGray(colors.ear, 0.3), eye: colors.eye, nose: mixGray(colors.nose, 0.3), cheek: mixGray(colors.cheek, 0.3) }
    : colors;

  const isC = animationState === "collapsed";
  const isH = animationState === "hurt";

  let headTilt = 0, bodyY = 1, bodyX = 1, lPaw = 0, rPaw = 0, tailW = 0, bounce = 0;
  let eyesClosed = false;

  if (isC) {
    bodyY = 0.7; bodyX = 1.2; eyesClosed = true;
    const f = danceFrame % 3;
    if (f === 1) { headTilt = -2; bounce = -2; }
    if (f === 2) { headTilt = 2; bounce = -1; }
  } else if (isH) {
    headTilt = getKV([0, -3, 0, 3], danceFrame, 4);
    bodyY = getKV([0.9, 0.88, 0.9, 0.88], danceFrame, 4);
    lPaw = -5; rPaw = -5;
    tailW = getKV([0, 5, 0, -5], danceFrame, 4);
    bounce = getKV([0, -1, 0, -1], danceFrame, 4);
    eyesClosed = danceFrame % 3 === 0;
  } else {
    headTilt = getKV(K.head, danceFrame, totalFrames);
    bodyY = getKV(K.bodyY, danceFrame, totalFrames);
    bodyX = getKV(K.bodyX, danceFrame, totalFrames);
    lPaw = getKV(K.lPaw, danceFrame, totalFrames);
    rPaw = getKV(K.rPaw, danceFrame, totalFrames);
    tailW = getKV(K.tail, danceFrame, totalFrames);
    bounce = getKV(K.bounce, danceFrame, totalFrames);
    eyesClosed = Math.abs(bounce) > 8;
  }

  const headSz = s * 0.55, bodyWd = s * 0.45, bodyHt = s * 0.35;
  const earSz = s * 0.15, eyeSz = s * 0.09, pupSz = s * 0.055;
  const noseSz = s * 0.04, cheekSz = s * 0.08, pawSz = s * 0.1;
  const tW = s * 0.3, tH = s * 0.06;

  return (
    <View style={[styles.container, { width: s, height: s * 1.1, top: bounce, transform: [{ rotate: isC ? "90deg" : "0deg" }] }]}>
      {/* Tail */}
      <View style={{ position: "absolute", bottom: s * 0.22, right: s * 0.05, width: tW, height: tH, backgroundColor: c.body, borderRadius: tH, transform: [{ rotate: `${-20 + tailW}deg` }], zIndex: 0 }} />

      {/* Body */}
      <View style={{ position: "absolute", bottom: s * 0.08, width: bodyWd, height: bodyHt, borderRadius: bodyWd * 0.45, backgroundColor: c.body, alignSelf: "center", transform: [{ scaleY: bodyY }, { scaleX: bodyX }], zIndex: 1 }}>
        <View style={{ position: "absolute", bottom: 2, alignSelf: "center", width: bodyWd * 0.6, height: bodyHt * 0.65, borderRadius: bodyWd * 0.3, backgroundColor: c.belly }} />
      </View>

      {/* Paws */}
      <View style={{ position: "absolute", bottom: s * 0.12, left: s * 0.18, width: pawSz, height: pawSz * 1.3, borderRadius: pawSz * 0.4, backgroundColor: c.body, transform: [{ rotate: `${20 + lPaw}deg` }], zIndex: 2 }} />
      <View style={{ position: "absolute", bottom: s * 0.12, right: s * 0.18, width: pawSz, height: pawSz * 1.3, borderRadius: pawSz * 0.4, backgroundColor: c.body, transform: [{ rotate: `${-20 + rPaw}deg` }], zIndex: 2 }} />

      {/* Feet */}
      <View style={{ position: "absolute", bottom: 0, left: s * 0.28, width: pawSz * 1.1, height: pawSz * 0.7, borderRadius: pawSz * 0.35, backgroundColor: c.body, zIndex: 2 }} />
      <View style={{ position: "absolute", bottom: 0, right: s * 0.28, width: pawSz * 1.1, height: pawSz * 0.7, borderRadius: pawSz * 0.35, backgroundColor: c.body, zIndex: 2 }} />

      {/* Head */}
      <View style={{ position: "absolute", top: s * 0.12, alignSelf: "center", width: headSz, height: headSz * 0.9, borderRadius: headSz * 0.45, backgroundColor: c.body, transform: [{ rotate: `${headTilt}deg` }], zIndex: 3 }}>
        {/* Ears */}
        {(["left", "right"] as const).map(side => {
          const pos = side === "left" ? { left: earSz * 0.2 } : { right: earSz * 0.2 };
          const iPos = side === "left" ? { left: earSz * 0.4 } : { right: earSz * 0.4 };
          return (
            <React.Fragment key={side}>
              <View style={{ position: "absolute", top: -earSz * 0.5, ...pos, width: 0, height: 0, borderLeftWidth: earSz * 0.6, borderRightWidth: earSz * 0.6, borderBottomWidth: earSz, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: c.body }} />
              <View style={{ position: "absolute", top: -earSz * 0.25, ...iPos, width: 0, height: 0, borderLeftWidth: earSz * 0.35, borderRightWidth: earSz * 0.35, borderBottomWidth: earSz * 0.6, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: c.ear }} />
            </React.Fragment>
          );
        })}

        {/* Eyes */}
        {(["left", "right"] as const).map(side => {
          const pos = side === "left" ? { left: headSz * 0.15 } : { right: headSz * 0.15 };
          return (
            <View key={`eye-${side}`} style={{ position: "absolute", top: headSz * 0.32, ...pos, width: eyeSz, height: eyesClosed ? eyeSz * 0.2 : eyeSz, borderRadius: eyeSz * 0.5, backgroundColor: "#FFF" }}>
              {!eyesClosed && (
                <>
                  <View style={{ position: "absolute", bottom: 1, alignSelf: "center", width: pupSz, height: pupSz, borderRadius: pupSz * 0.5, backgroundColor: c.eye }} />
                  <View style={{ position: "absolute", top: eyeSz * 0.15, right: eyeSz * 0.15, width: eyeSz * 0.25, height: eyeSz * 0.25, borderRadius: eyeSz * 0.15, backgroundColor: "#FFF" }} />
                </>
              )}
            </View>
          );
        })}

        {/* Nose */}
        <View style={{ position: "absolute", top: headSz * 0.55, alignSelf: "center", width: noseSz, height: noseSz * 0.7, borderRadius: noseSz * 0.3, backgroundColor: c.nose }} />

        {/* Mouth */}
        {isC ? (
          <View style={{ position: "absolute", top: headSz * 0.65, alignSelf: "center", width: noseSz * 2, height: 2, backgroundColor: c.ear, borderRadius: 1 }} />
        ) : isH ? (
          <View style={{ position: "absolute", top: headSz * 0.64, alignSelf: "center", width: noseSz * 1.5, height: noseSz * 0.8, borderRadius: noseSz * 0.4, borderTopWidth: 1.5, borderColor: c.ear, backgroundColor: "transparent" }} />
        ) : (
          <>
            <View style={{ position: "absolute", top: headSz * 0.62, left: headSz * 0.38, width: noseSz * 0.8, height: noseSz * 0.8, borderRadius: noseSz * 0.4, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: c.ear, backgroundColor: "transparent" }} />
            <View style={{ position: "absolute", top: headSz * 0.62, right: headSz * 0.38, width: noseSz * 0.8, height: noseSz * 0.8, borderRadius: noseSz * 0.4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: c.ear, backgroundColor: "transparent" }} />
          </>
        )}

        {/* Cheeks */}
        <View style={{ position: "absolute", top: headSz * 0.52, left: headSz * 0.05, width: cheekSz, height: cheekSz * 0.55, borderRadius: cheekSz * 0.3, backgroundColor: c.cheek, opacity: isH ? 0.3 : 0.5 }} />
        <View style={{ position: "absolute", top: headSz * 0.52, right: headSz * 0.05, width: cheekSz, height: cheekSz * 0.55, borderRadius: cheekSz * 0.3, backgroundColor: c.cheek, opacity: isH ? 0.3 : 0.5 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "flex-end" },
});
