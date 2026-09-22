// src/components/DrawingCanvas.js
import React, { forwardRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { colors, INK } from "../theme";
import { BALL_RADIUS } from "../hooks/useTiltDrawing";

// forwardRef zodat de sandbox de <Svg> kan aanspreken (svgRef.toDataURL(...))
// om de tekening als PNG te exporteren voor opslaan/delen.
const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    paths = [],
    position,
    showBall = false,
    isPenLifted = false,
    ballColor = INK,
    interactive = false,
    viewBox,
    hint,
    onLayout,
    onTouchStart,
    onTouchEnd,
    style,
    children,
  },
  svgRef,
) {
  const responderProps = interactive
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: onTouchStart,
        onResponderRelease: onTouchEnd,
      }
    : {};

  return (
    <View
      style={[styles.canvas, style]}
      onLayout={onLayout}
      {...responderProps}
    >
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <Svg
        ref={svgRef}
        height="100%"
        width="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {paths.map((path, index) => (
          <Polyline
            key={index}
            points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={path.color || INK}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {showBall && position && (
          <Circle
            cx={position.x}
            cy={position.y}
            r={BALL_RADIUS}
            fill={ballColor}
            opacity={isPenLifted ? 0.4 : 1}
          />
        )}
      </Svg>

      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: colors.surfaceLight, overflow: "hidden" },
  hint: {
    position: "absolute",
    top: "45%",
    width: "100%",
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 18,
    paddingHorizontal: 20,
  },
});

export default React.memo(DrawingCanvas);
