import React from "react";
import { View, StyleSheet } from "react-native";

interface PixelCatProps {
  frame: (string | null)[][];
  pixelSize?: number;
  silhouette?: boolean;
}

export default function PixelCat({ frame, pixelSize = 16, silhouette = false }: PixelCatProps) {
  return (
    <View style={styles.container}>
      {frame.map((row, y) => (
        <View key={y} style={styles.row}>
          {row.map((color, x) => (
            <View
              key={x}
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: color
                  ? silhouette
                    ? "#333"
                    : color
                  : "transparent",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
  },
});
