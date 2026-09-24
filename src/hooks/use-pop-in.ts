// Scale animation for content that should pop in when a screen opens.

import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

/** Returns a scale value that animates from 0.7 to 1 on mount. */
export function usePopIn(duration = 400) {
  const [scale] = useState(() => new Animated.Value(0.7));

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [scale, duration]);

  return scale;
}
