import { evaluate } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import { emptyTalkTrack, TALK_TRACK_SECTIONS } from "@tech-refresh/core/talkTrack";
import { colors } from "@tech-refresh/core/tokens";

import { BrandIcon } from "../components/BrandIcon";
import { redo, undo } from "./editorState.js";
import styles from "./ArchBoard.module.css";
import type { ArchBoardController } from "./useArchBoard";
import { ghostAction } from "./buttonStyles";

type Props = Pick<
  ArchBoardController,
  | "boardsLoading"
  | "nodes"
  | "edges"
  | "setResult"
  | "savedOpen"
  | "setSavedOpen"
  | "talkOpen"
  | "setTalkOpen"
  | "talkSections"
  | "talkRating"
  | "talkGrade"
  | "activeBoardId"
  | "activeBoardTitle"
  | "canvasRef"
  | "historyRef"
  | "submittedSnapshotRef"
  | "scenario"
  | "snapshot"
  | "isDirty"
  | "savedBoards"
  | "saveBoardMutation"
  | "applyHistory"
  | "commit"
  | "liveCost"
  | "liveMaint"
  | "talkAnswered"
>;

export function BoardToolbar({
  boardsLoading,
  nodes,
  edges,
  setResult,
  savedOpen,
  setSavedOpen,
  talkOpen,
  setTalkOpen,
  talkSections,
  talkRating,
  talkGrade,
  activeBoardId,
  activeBoardTitle,
  canvasRef,
  historyRef,
  submittedSnapshotRef,
  scenario,
  snapshot,
  isDirty,
  savedBoards,
  saveBoardMutation,
  applyHistory,
  commit,
  liveCost,
  liveMaint,
  talkAnswered,
}: Props) {
  return (
    <>
      {/* Live cost ticker + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <span
          aria-live="polite"
          style={{ fontSize: 12, color: isDirty ? colors.warningBright : colors.successBright }}
        >
          {saveBoardMutation.isPending
            ? "Saving…"
            : isDirty
              ? "Unsaved changes"
              : activeBoardId
                ? "Saved"
                : "New board"}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: liveCost > scenario.budget ? colors.danger : colors.textDim,
          }}
        >
          <BrandIcon
            name="cost"
            color={liveCost > scenario.budget ? colors.danger : colors.textDim}
            size={14}
          />
          Cost {liveCost} / budget {scenario.budget}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: colors.textDim,
          }}
        >
          <BrandIcon
            name="maintenance"
            color={colors.textDim}
            size={14}
          />
          Maintenance load {liveMaint}
        </span>
        <div className={styles.actions}>
          <button
            className={styles.toolbarButton}
            onClick={() => applyHistory(undo(historyRef.current))}
            disabled={!historyRef.current?.past.length}
          >
            Undo
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => applyHistory(redo(historyRef.current))}
            disabled={!historyRef.current?.future.length}
          >
            Redo
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => canvasRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" })}
          >
            Reset view
          </button>
          <button
            onClick={() => setTalkOpen((value) => !value)}
            style={{
              ...ghostAction(
                talkOpen ? colors.accentBright : colors.textDim,
                talkOpen ? colors.accent : colors.border,
              ),
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <BrandIcon
              name="spark"
              color={talkOpen ? colors.accentBright : colors.textDim}
              size={13}
            />
            {t("talk.title")} ({talkAnswered}/{TALK_TRACK_SECTIONS.length})
          </button>
          <button
            onClick={() => setSavedOpen((value) => !value)}
            style={ghostAction(
              savedOpen ? colors.accentBright : colors.textDim,
              savedOpen ? colors.accent : colors.border,
            )}
          >
            {t("board.saved")}
            {savedOpen && !boardsLoading ? ` (${savedBoards.length})` : ""}
          </button>
          <button
            onClick={() => {
              submittedSnapshotRef.current = snapshot();
              saveBoardMutation.mutate({
                id: activeBoardId ?? undefined,
                title: activeBoardTitle ?? t("board.draftTitle", { scenario: scenario.name }),
                scenarioId: scenario.id,
                nodes,
                edges,
                talkTrack: { sections: talkSections, rating: talkRating },
                talkGrade,
              });
            }}
            disabled={saveBoardMutation.isPending}
            style={ghostAction(colors.successBright, `${colors.success}60`)}
          >
            {saveBoardMutation.isPending ? t("common.saving") : t("common.save")}
          </button>
          <button
            onClick={() =>
              commit({
                ...snapshot(),
                nodes: [],
                edges: [],
                talkSections: emptyTalkTrack(),
                talkRating: null,
                talkGrade: null,
              })
            }
            style={ghostAction()}
          >
            Clear board
          </button>
          <button
            onClick={() => setResult(evaluate(scenario as Parameters<typeof evaluate>[0], nodes, edges))}
            disabled={nodes.length === 0}
            style={{
              padding: "7px 16px",
              background: colors.accent,
              border: "none",
              borderRadius: 8,
              color: colors.onAccent,
              fontSize: 12,
              fontWeight: 600,
              cursor: nodes.length ? "pointer" : "not-allowed",
              opacity: nodes.length ? 1 : 0.5,
            }}
          >
            Evaluate design
          </button>
        </div>
      </div>
    </>
  );
}
