import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Dimensions, View } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const POOL_SIZE = 80;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  size: number;
  active: boolean;
}

interface FallingParticlesProps {
  trigger: number;
  emoji?: string;
}

export default React.memo(function FallingParticles({ trigger, emoji = "🍓" }: FallingParticlesProps) {
  const poolRef = useRef<Particle[] | null>(null);
  if (poolRef.current === null) {
    poolRef.current = Array.from({ length: POOL_SIZE }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(-50),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      size: 18 + Math.random() * 14,
      active: false,
    }));
  }
  const pool = poolRef.current;

  const nextIdx = useRef(0);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    // Skip initial mount and only react to actual changes
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    if (trigger === 0) return;

    const count = 2 + Math.floor(Math.random() * 2);
    let spawned = 0;
    let searchStart = nextIdx.current;

    // Find inactive particles only — never touch active ones
    for (let attempt = 0; attempt < POOL_SIZE && spawned < count; attempt++) {
      const idx = (searchStart + attempt) % POOL_SIZE;
      const p = pool[idx];
      if (p.active) continue;

      p.active = true;
      spawned++;
      nextIdx.current = (idx + 1) % POOL_SIZE;

      const startX = Math.random() * SCREEN_W * 0.8 + SCREEN_W * 0.1;
      p.x.setValue(startX);
      p.y.setValue(-30 - Math.random() * 40);
      p.rotate.setValue(0);
      p.opacity.setValue(0.8);
      p.size = 18 + Math.random() * 14;

      const duration = 1800 + Math.random() * 1200;
      const drift = (Math.random() - 0.5) * 60;

      Animated.parallel([
        Animated.timing(p.y, {
          toValue: SCREEN_H + 30,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: startX + drift,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: (Math.random() - 0.5) * 4,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration,
          delay: duration * 0.6,
          useNativeDriver: true,
        }),
      ]).start(() => {
        p.active = false;
      });
    }
  }, [trigger]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pool.map((p, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.particle,
            {
              fontSize: p.size,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotate.interpolate({
                    inputRange: [-4, 4],
                    outputRange: ["-45deg", "45deg"],
                  })
                },
              ],
            },
          ]}
        >
          {emoji}
        </Animated.Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
  },
});
