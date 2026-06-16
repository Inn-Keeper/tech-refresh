import { colors } from "@tech-refresh/core/tokens";
import { t } from "@tech-refresh/core/i18n";
import { BrandIcon } from "../components/BrandIcon";
import { startTour } from "./tour";

type TKey = Parameters<typeof t>[0];

type FeatureCardProps = {
  icon: string;
  color: string;
  titleKey: TKey;
  taglineKey: TKey;
  bulletKeys: TKey[];
  page: string;
  onNavigate: (page: string) => void;
};

function FeatureCard({ icon, color, titleKey, taglineKey, bulletKeys, page, onNavigate }: FeatureCardProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${color}30`,
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <BrandIcon name={icon} color={color} size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.textBright }}>{t(titleKey)}</div>
          <div style={{ fontSize: 11.5, color: colors.textFaint, marginTop: 2 }}>{t(taglineKey)}</div>
        </div>
      </div>

      <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
        {bulletKeys.map((b) => (
          <li key={b} style={{ fontSize: 12.5, color: colors.textDim, lineHeight: 1.5 }}>
            {t(b)}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onNavigate(page)}
        style={{
          marginTop: "auto",
          alignSelf: "flex-start",
          padding: "6px 14px",
          background: `${color}18`,
          border: `1px solid ${color}40`,
          borderRadius: 8,
          color,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {t("about.open")}
      </button>
    </div>
  );
}

const FEATURES: Omit<FeatureCardProps, "onNavigate">[] = [
  {
    icon: "layers",
    color: "#818CF8",
    titleKey: "about.prep.title",
    taglineKey: "about.prep.tagline",
    page: "prep",
    bulletKeys: ["about.prep.b1", "about.prep.b2", "about.prep.b3", "about.prep.b4", "about.prep.b5", "about.prep.b6"],
  },
  {
    icon: "story",
    color: "#4ADE80",
    titleKey: "about.stories.title",
    taglineKey: "about.stories.tagline",
    page: "stories",
    bulletKeys: ["about.stories.b1", "about.stories.b2", "about.stories.b3", "about.stories.b4", "about.stories.b5"],
  },
  {
    icon: "board",
    color: "#FBBF24",
    titleKey: "about.board.title",
    taglineKey: "about.board.tagline",
    page: "board",
    bulletKeys: ["about.board.b1", "about.board.b2", "about.board.b3", "about.board.b4", "about.board.b5"],
  },
  {
    icon: "contact",
    color: "#38BDF8",
    titleKey: "about.quest.title",
    taglineKey: "about.quest.tagline",
    page: "contacts",
    bulletKeys: ["about.quest.b1", "about.quest.b2", "about.quest.b3", "about.quest.b4", "about.quest.b5"],
  },
  {
    icon: "profile",
    color: "#A78BFA",
    titleKey: "about.profile.title",
    taglineKey: "about.profile.tagline",
    page: "profile",
    bulletKeys: ["about.profile.b1", "about.profile.b2", "about.profile.b3", "about.profile.b4", "about.profile.b5"],
  },
];

export default function About({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 60px" }}>
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 850, color: colors.textBright }}>{t("about.title")}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: colors.textFaint, maxWidth: 560, lineHeight: 1.6 }}>
            {t("about.intro")}
          </p>
        </div>
        <button
          onClick={() => startTour(onNavigate)}
          data-tour="nav-about"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: colors.accent,
            border: "none",
            borderRadius: 10,
            color: colors.onAccent,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <BrandIcon name="spark" color={colors.onAccent} size={15} />
          {t("about.startTour")}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {FEATURES.map((f) => (
          <FeatureCard key={f.page} {...f} onNavigate={onNavigate} />
        ))}
      </div>

      <div
        style={{
          marginTop: 32,
          padding: "18px 22px",
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: colors.textBright, marginBottom: 8 }}>{t("about.howItWorks")}</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { labelKey: "about.how.syncedLabel", detailKey: "about.how.syncedDetail" },
            { labelKey: "about.how.offlineLabel", detailKey: "about.how.offlineDetail" },
            { labelKey: "about.how.adaptiveLabel", detailKey: "about.how.adaptiveDetail" },
            { labelKey: "about.how.privateLabel", detailKey: "about.how.privateDetail" },
          ].map((item) => (
            <div key={item.labelKey}>
              <div style={{ fontSize: 12, fontWeight: 800, color: colors.accent, marginBottom: 4 }}>{t(item.labelKey as Parameters<typeof t>[0])}</div>
              <div style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.5 }}>{t(item.detailKey as Parameters<typeof t>[0])}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
