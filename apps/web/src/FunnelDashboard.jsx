import { STATUS_STYLES } from "@tech-refresh/core/contacts";
import { t } from "@tech-refresh/core/i18n";

const percent = (value) => Math.round(value * 100);

// Web twin of the mobile funnel dashboard: same buildFunnelSummary input.
export function FunnelDashboard({ summary }) {
  return (
    <div
      style={{
        background: "#1e2330",
        border: "1px solid #2d3748",
        borderRadius: 12,
        padding: "16px 18px",
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{t("funnel.title")}</div>
          <div style={{ fontSize: 11, color: "#475569" }}>{t("funnel.subtitle")}</div>
        </div>
        <span
          style={{
            padding: "3px 10px",
            background: "#6366f120",
            borderRadius: 20,
            color: "#a5b4fc",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {t("funnel.active", { count: summary.active })}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Metric label={t("funnel.appsPerWeek")} value={summary.applicationsPerWeek} color="#22c55e" />
        <Metric label={t("funnel.interviews")} value={summary.reached.Interviewing} color="#f59e0b" />
        <Metric label={t("funnel.offers")} value={summary.reached.Offer} color="#a78bfa" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ConversionRow
          label={t("funnel.contactedToApplied")}
          value={summary.rates.contactedToApplied}
          detail={`${summary.reached.Applied}/${summary.reached.Contacted}`}
          color="#22c55e"
        />
        <ConversionRow
          label={t("funnel.appliedToInterviewing")}
          value={summary.rates.appliedToInterviewing}
          detail={`${summary.reached.Interviewing}/${summary.reached.Applied}`}
          color="#f59e0b"
        />
        <ConversionRow
          label={t("funnel.interviewingToOffer")}
          value={summary.rates.interviewingToOffer}
          detail={`${summary.reached.Offer}/${summary.reached.Interviewing}`}
          color="#a78bfa"
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {summary.statuses.map((status) => (
          <span
            key={status}
            style={{
              padding: "3px 10px",
              background: `${STATUS_STYLES[status].color}20`,
              borderRadius: 20,
              color: STATUS_STYLES[status].color,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {status}: {summary.counts[status] ?? 0}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {summary.signals.slice(0, 2).map((signal) => (
          <span key={signal} style={{ fontSize: 12, lineHeight: 1.45, color: "#94a3b8" }}>
            – {signal}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "#1a1f2e",
        border: `1px solid ${color}40`,
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#475569" }}>{label}</div>
    </div>
  );
}

function ConversionRow({ label, value, detail, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#475569" }}>{detail}</span>
        <span style={{ width: 38, textAlign: "right", fontSize: 11.5, fontWeight: 700, color }}>
          {percent(value)}%
        </span>
      </div>
      <div style={{ height: 6, background: "#1a1f2e", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${percent(value)}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}
