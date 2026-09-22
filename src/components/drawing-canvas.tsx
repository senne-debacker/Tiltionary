// src/components/drawing-canvas.tsx
// Het tekenvlak: rendert de opgeslagen lijnen plus (optioneel) het balletje.
//
// Gebruikt BEWUST niet het thema (zie `canvas` in constants/theme): een
// tekening wordt gedeeld tussen spelers die elk een andere systeeminstelling
// kunnen hebben, en moet er bij iedereen hetzelfde uitzien.

import React, { forwardRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { canvas, INK } from "@/constants/theme";
import { BALL_RADIUS } from "@/hooks/use-tilt-drawing";
import type { ReactNode } from "react";
import type {
  LayoutChangeEvent,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import type { DrawPath, Point } from "@/types/game";

type DrawingCanvasProps = {
  paths?: DrawPath[];
  position?: Point | null;
  showBall?: boolean;
  isPenLifted?: boolean;
  ballColor?: string;
  interactive?: boolean;
  viewBox?: string;
  hint?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  onTouchStart?: (event: GestureResponderEvent) => void;
  onTouchEnd?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// forwardRef zodat de sandbox de <Svg> kan aanspreken (svgRef.toDataURL(...))
// om de tekening als PNG te exporteren voor opslaan/delen.
const DrawingCanvas = forwardRef<Svg, DrawingCanvasProps>(function DrawingCanvas(
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
        {paths.map((path: DrawPath, index: number) => (
          <Polyline
            key={index}
            points={path.points.map((p: Point) => `${p.x},${p.y}`).join(" ")}
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
  canvas: { flex: 1, backgroundColor: canvas.background, overflow: "hidden" },
  hint: {
    position: "absolute",
    top: "45%",
    width: "100%",
    textAlign: "center",
    color: canvas.hint,
    fontSize: 18,
    paddingHorizontal: 20,
  },
});

export default DrawingCanvas;
