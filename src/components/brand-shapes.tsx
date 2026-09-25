// Decorative block of rounded shapes in the four brand colors, in the bento
// style of the styleboard. The last block holds a line with a ball at its
// end, the drawing motif of the game.

import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useTheme } from "@/hooks/use-theme";
import { stroke } from "@/constants/theme";

type BrandShapesProps = { width?: number };

/** The shapes are drawn on a 320 by 140 grid and scale with `width`. */
export function BrandShapes({ width = 320 }: BrandShapesProps) {
  const theme = useTheme();
  const line = { stroke: theme.line, strokeWidth: stroke.regular };

  return (
    <Svg width={width} height={(width * 140) / 320} viewBox="-1 -1 322 142">
      <Rect x={0} y={0} width={76} height={140} rx={38} fill={theme.blue} {...line} />
      <Circle cx={124} cy={38} r={38} fill={theme.red} {...line} />
      <Rect x={86} y={86} width={76} height={54} rx={27} fill={theme.green} {...line} />
      <Rect x={172} y={0} width={148} height={64} rx={32} fill={theme.yellow} {...line} />
      <Rect x={172} y={76} width={148} height={64} rx={20} fill={theme.surface} {...line} />
      <Path
        d="M190,120 C 210,92 228,132 250,108 C 266,90 276,104 290,98"
        fill="none"
        stroke={theme.text}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Circle cx={292} cy={97} r={9} fill={theme.red} {...line} />
    </Svg>
  );
}
