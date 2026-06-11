import { useEffect } from "react";

const DISMISS_MS = 2100;

const PARTICLE_COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ec4899", "#38bdf8", "#a78bfa"];
const PARTICLES = Array.from({ length: 36 }, (_, index) => ({
  angle: (Math.PI * 2 * index) / 36 + (index % 5) * 0.1,
  distance: 90 + (index % 9) * 22,
  size: 5 + (index % 4) * 2,
  delay: (index % 6) * 45,
  color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
}));

// CSS-animated twin of the mobile Skia celebration.
export function CelebrationOverlay({ title, subtitle, accent = "#6366f1", onDone }) {
  useEffect(() => {
    const done = setTimeout(onDone, DISMISS_MS);
    return () => clearTimeout(done);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117a8",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes celebration-burst {
          from { transform: translate(0, 0); opacity: 1; }
          to { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
        @keyframes celebration-pop {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {PARTICLES.map((particle, index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: particle.color,
            "--dx": `${Math.cos(particle.angle) * particle.distance}px`,
            "--dy": `${Math.sin(particle.angle) * particle.distance + 50}px`,
            animation: `celebration-burst 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${particle.delay}ms forwards`,
          }}
        />
      ))}

      <div
        style={{
          minWidth: 260,
          maxWidth: 360,
          padding: "20px 26px",
          borderRadius: 14,
          border: `1px solid ${accent}90`,
          background: "#1e2330f2",
          textAlign: "center",
          animation: "celebration-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 800 }}>{title}</div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{subtitle}</div>
      </div>
    </div>
  );
}
