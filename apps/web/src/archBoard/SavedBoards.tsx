import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";
import type { AugmentedScenario, SavedBoard } from "./types";

export function SavedBoards({
  activeBoardId,
  allScenarios,
  boards,
  onDelete,
  onLoad,
}: {
  activeBoardId: string | null;
  allScenarios: AugmentedScenario[];
  boards: SavedBoard[];
  onDelete: (id: string) => void;
  onLoad: (board: SavedBoard) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12 }}>
      {boards.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: colors.textFaint }}>{t("board.savedEmpty")}</p>
      ) : (
        boards.map((board) => {
          const boardScenario = allScenarios.find((item) => item.id === board.scenarioId);
          const active = board.id === activeBoardId;
          return (
            <div
              key={board.id}
              style={{
                minWidth: 220,
                padding: "10px 12px",
                background: colors.well,
                border: `1px solid ${active ? colors.accent : colors.border}`,
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.textBright,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {board.title}
              </span>
              <span style={{ fontSize: 10.5, color: colors.textFaint }}>
                {t("board.boardMeta", {
                  scenario: boardScenario?.name ?? board.scenarioId,
                  nodes: board.nodes.length,
                  edges: board.edges.length,
                })}
              </span>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={() => onLoad(board)}
                  style={{
                    padding: "3px 10px",
                    background: "transparent",
                    border: `1px solid ${colors.accent}60`,
                    borderRadius: 6,
                    color: colors.accentBright,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("common.load")}
                </button>
                <button
                  onClick={() => board.id && window.confirm(t("board.deleteMessage", { title: board.title })) && onDelete(board.id)}
                  style={{
                    padding: "3px 10px",
                    background: "transparent",
                    border: `1px solid ${colors.danger}50`,
                    borderRadius: 6,
                    color: colors.dangerBright,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
