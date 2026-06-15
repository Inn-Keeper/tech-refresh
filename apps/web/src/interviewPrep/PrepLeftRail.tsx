import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../components/BrandIcon";
import { categoryIconName } from "../components/brandIconNames";
import { WorkspacePanel, WorkspaceTitle } from "../components/WorkspaceLayout";
import type { Category, GithubStatus, PrepItem, Scores } from "./types";

function categoryAnswered(cat: Category, scores: Scores) {
  return cat.items.filter((item) => scores.answers[item.tech]?.correct || scores.answers[item.tech]?.wrong).length;
}

export function PrepLeftRail({ activeCategoryName, allItems, categories, githubStatus, scores, search, setSearch, onCategory }: {
  activeCategoryName: string;
  allItems: PrepItem[];
  categories: Category[];
  githubStatus: GithubStatus;
  scores: Scores;
  search: string;
  setSearch: (s: string) => void;
  onCategory: (name: string) => void;
}) {
  return (
    <>
      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="layers" color={colors.accentBright} size={17} />}
          title="Practice map"
          subtitle={`${allItems.length} technologies grouped by interview surface.`}
        />
        <div style={{ position: "relative", marginTop: 14 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
            <BrandIcon name="search" color={colors.textFaint} size={13} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technology"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 10px 9px 32px",
              background: colors.bgDeep,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </WorkspacePanel>

      <WorkspacePanel style={{ padding: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {categories.map((cat) => {
            const active = activeCategoryName === cat.name && !search.trim();
            const answered = categoryAnswered(cat, scores);
            const pct = Math.round((answered / cat.items.length) * 100);
            return (
              <button
                key={cat.name}
                onClick={() => onCategory(cat.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 10px",
                  border: "none",
                  borderRadius: 7,
                  background: active ? `${cat.color}24` : "transparent",
                  color: active ? colors.textBright : colors.textDim,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <BrandIcon name={categoryIconName(cat.name)} color={active ? cat.color : colors.textFaint} size={15} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 750 }}>{cat.name}</span>
                  <span style={{ display: "block", marginTop: 3, color: colors.textFaint, fontSize: 10.5 }}>
                    {answered}/{cat.items.length} touched
                  </span>
                </span>
                <span style={{ width: 34, textAlign: "right", color: pct > 0 ? cat.color : colors.textFaint, fontSize: 11, fontWeight: 800 }}>
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </WorkspacePanel>

      {githubStatus?.enabled && githubStatus?.hasUrl && (
        <WorkspacePanel tone="sunken" style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 1.5 }}>
          {githubStatus.loading
            ? "Reading public GitHub repo languages..."
            : githubStatus.error
              ? "GitHub tech sync could not load. Saved profile URL is still intact."
              : githubStatus.count
                ? `${githubStatus.count} profile techs matched from public GitHub repos.`
                : "No matching prep techs found from public GitHub repos yet."}
        </WorkspacePanel>
      )}
    </>
  );
}
