import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { colors } from "@/theme";

type Props = {
  title: string;
  subtitle: string;
  accent?: string;
  onDone: () => void;
};

const PARTICLE_COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ec4899", "#38bdf8", "#a78bfa"];
const PARTICLES = Array.from({ length: 54 }, (_, index) => ({
  angle: (Math.PI * 2 * index) / 54 + (index % 5) * 0.08,
  distance: 72 + (index % 9) * 17,
  size: 2.5 + (index % 4),
  delay: (index % 6) * 0.045,
  color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
}));

const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

export function CelebrationOverlay({ title, subtitle, accent = colors.accent, onDone }: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const started = Date.now();
    let frame: number;
    const tick = () => {
      setProgress(Math.min(1, (Date.now() - started) / 1250));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const done = setTimeout(onDone, 2100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [onDone]);

  const particles = useMemo(() => {
    const cx = layout.width / 2;
    const cy = layout.height / 2 - 24;
    return PARTICLES.map((particle, index) => {
      const local = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)));
      const eased = easeOut(local);
      return {
        key: String(index),
        x: cx + Math.cos(particle.angle) * particle.distance * eased,
        y: cy + Math.sin(particle.angle) * particle.distance * eased + local * 42,
        r: particle.size * (1 - local * 0.35),
        color: particle.color,
        visible: local > 0 && local < 1,
      };
    });
  }, [layout.height, layout.width, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(180)}
      onLayout={(event) => setLayout(event.nativeEvent.layout)}
      style={styles.root}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {particles.map((particle) =>
          particle.visible ? <Circle key={particle.key} cx={particle.x} cy={particle.y} r={particle.r} color={particle.color} /> : null
        )}
      </Canvas>

      <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.badge, { borderColor: `${accent}90` }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f1117a8",
    zIndex: 20,
  },
  badge: {
    minWidth: 240,
    maxWidth: 320,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#1e2330f2",
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: colors.textBright,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
