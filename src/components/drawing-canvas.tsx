// The canvas: renders the stored lines and, optionally, the ball.
// It uses the fixed canvas colors instead of the theme, so a shared drawing
// looks the same for every player. Only the outline follows the theme.

import { forwardRef, type ReactNode } from "react";
import { StyleSheet, View, Text } from "react-native";
import Svg, { Polyline, Circle, Rect } from "react-native-svg";
import { canvas, fonts, INK_COLORS, radius, spacing, stroke } from "@/constants/theme";
import { BALL_RADIUS } from "@/hooks/use-tilt-drawing";
import { useTheme } from "@/hooks/use-theme";
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

// The ref points at the Svg, so the sandbox can export it with toDataURL().
const DrawingCanvas = forwardRef<Svg, DrawingCanvasProps>(function DrawingCanvas(
  {
    paths = [],
    position,
    showBall = false,
    isPenLifted = false,
    ballColor = INK_COLORS[0],
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
  const theme = useTheme();
  const responderProps = interactive
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: onTouchStart,
        onResponderRelease: onTouchEnd,
      }
    : {};

  return (
    <View style={[styles.frame, { borderColor: theme.line }, style]}>
      <View style={styles.canvas} onLayout={onLayout} {...responderProps}>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}

        <Svg
          ref={svgRef}
          height="100%"
          width="100%"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* A filled background, so an exported PNG is not transparent. */}
          <Rect width="100%" height="100%" fill={canvas.background} />

          {paths.map((path, index) => (
            <Polyline
              key={index}
              points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={path.color || INK_COLORS[0]}
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
              stroke={canvas.ink}
              strokeWidth={stroke.bold}
              opacity={isPenLifted ? 0.35 : 1}
            />
          )}
        </Svg>

        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderWidth: stroke.regular,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: canvas.background,
  },
  canvas: { flex: 1 },
  hint: {
    position: "absolute",
    top: "45%",
    width: "100%",
    textAlign: "center",
    color: canvas.hint,
    fontFamily: fonts.mono,
    fontSize: 14,
    paddingHorizontal: spacing.xl,
  },
});

export default DrawingCanvas;
