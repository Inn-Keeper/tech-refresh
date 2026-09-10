import { meta } from "@tech-refresh/core/arch";
import { t } from "@tech-refresh/core/i18n";
import { buildPushback } from "@tech-refresh/core/pushback";
import { colors, layout } from "@tech-refresh/core/tokens";

import { DesignTimer } from "./DesignTimer";
import { EdgeInspector } from "./EdgeInspector";
import { EvalResults } from "./EvalResults";
import { NodeInspector } from "./NodeInspector";
import { NodePalette } from "./NodePalette";
import { SavedBoards } from "./SavedBoards";
import { TalkTrack } from "./TalkTrack";
import styles from "./ArchBoard.module.css";
import { useArchBoard } from "./useArchBoard";
import { ScenarioPanel } from "./ScenarioPanel";
import { BoardToolbar } from "./BoardToolbar";
import { BoardCanvas } from "./BoardCanvas";

export default function ArchBoard() {
  const board = useArchBoard();
  const {
    scenariosError,
    boardsError,
    boardsLoading,
    retryBoards,
    nodes,
    edges,
    connectFrom,
    inspectingId,
    setInspectingId,
    inspectingEdgeId,
    setInspectingEdgeId,
    result,
    savedOpen,
    talkOpen,
    talkSections,
    talkRating,
    activeBoardId,
    allScenarios,
    scenario,
    nodeById,
    snapshot,
    activeWorkflowStep,
    savedBoards,
    saveBoardMutation,
    deleteBoardMutation,
    deleteScenarioMutation,
    commit,
    requestBoard,
    addNode,
    patchNode,
    removeEdge,
    patchEdge,
  } = board;

  const inspectedEdge = edges.find((edge) => edge.id === inspectingEdgeId);

  return (
    <main
      className={styles.page}
      style={{
        minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
        ["--arch-border" as string]: colors.border,
        ["--arch-text-dim" as string]: colors.textDim,
        ["--arch-surface" as string]: colors.surface,
        ["--arch-canvas" as string]: colors.bgDeep,
        ["--arch-text" as string]: colors.text,
        ["--arch-accent" as string]: colors.accentBright,
      }}
    >
      <h1
        style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: colors.textBright }}
      >
        Arch Board
      </h1>
      <p style={{ margin: "0 0 16px", color: colors.textFaint, fontSize: 13 }}>
        Pick a scenario, click components to add them, then move and connect them on the canvas. Select a node handle
        and a target, or hold Shift and drag between handles.
      </p>

      <ScenarioPanel {...board} />

      <DesignTimer />

      <BoardToolbar {...board} />

      {/* Persistence feedback and saved drafts. */}
      {(saveBoardMutation.error || deleteBoardMutation.error || deleteScenarioMutation.error || boardsError) && (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: colors.dangerBright }}>
          {saveBoardMutation.error
            ? `${t("board.saveFailedTitle")}: ${saveBoardMutation.error.message}`
            : deleteBoardMutation.error
              ? `Delete failed: ${deleteBoardMutation.error.message}`
              : deleteScenarioMutation.error
                ? `Delete failed: ${deleteScenarioMutation.error.message}`
                : t("board.boardsError", { message: (boardsError as Error).message })}
        </p>
      )}

      {savedOpen &&
        (boardsLoading ? (
          <p style={{ color: colors.textFaint }}>Loading saved boards…</p>
        ) : boardsError ? (
          <p
            role="alert"
            style={{ color: colors.dangerBright }}
          >
            Could not load saved boards. <button onClick={() => retryBoards()}>Retry</button>
          </p>
        ) : (
          <SavedBoards
            activeBoardId={activeBoardId}
            allScenarios={allScenarios}
            boards={savedBoards}
            onDelete={(id) => deleteBoardMutation.mutate(id)}
            onLoad={requestBoard}
          />
        ))}

      {/* Editing guidance and canvas. */}
      <div
        className={styles.workflow}
        aria-label="Design workflow"
      >
        <div className={`${styles.workflowStep} ${activeWorkflowStep === 1 ? styles.workflowActive : ""}`}>
          <strong>1. Add components</strong>
          <span>Choose the building blocks from the palette.</span>
        </div>
        <div className={`${styles.workflowStep} ${activeWorkflowStep === 2 ? styles.workflowActive : ""}`}>
          <strong>2. Connect nodes</strong>
          <span aria-live="polite">
            {connectFrom
              ? `Now choose a target for ${meta(nodeById[connectFrom]?.type ?? "client").label}, or press Escape.`
              : "Select a node handle, then choose another node."}
          </span>
        </div>
        <div className={`${styles.workflowStep} ${activeWorkflowStep === 3 ? styles.workflowActive : ""}`}>
          <strong>3. Describe the arrow</strong>
          <span>Click an arrow or use “Edit arrow” to set its mode and protocol.</span>
        </div>
      </div>
      {scenariosError && (
        <p
          role="alert"
          style={{ color: colors.dangerBright }}
        >
          Custom scenarios could not be loaded.
        </p>
      )}
      <label
        className={styles.connectionRow}
        style={{ color: colors.textDim }}
      >
        Edit arrow{" "}
        <select
          className={styles.connectionSelect}
          disabled={edges.length === 0}
          value={inspectingEdgeId ?? ""}
          onChange={(event) => setInspectingEdgeId(event.target.value || null)}
        >
          <option value="">{edges.length === 0 ? "Connect two nodes first" : "Select an arrow to edit"}</option>
          {edges.map((edge) => (
            <option
              key={edge.id}
              value={edge.id}
            >
              {meta(nodeById[edge.from]?.type ?? "client").label} → {meta(nodeById[edge.to]?.type ?? "client").label}
              {edge.protocol ? ` · ${edge.protocol}` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.editor}>
        <NodePalette onAddNode={addNode} />

        <BoardCanvas {...board} />
      </div>

      {/* Details for the current selection. */}
      {inspectedEdge && (
        <EdgeInspector
          edge={inspectedEdge}
          from={nodeById[inspectedEdge.from]}
          to={nodeById[inspectedEdge.to]}
          onChange={(patch) => patchEdge(inspectedEdge.id, patch)}
          onRemove={() => removeEdge(inspectedEdge.id)}
          onClose={() => setInspectingEdgeId(null)}
        />
      )}

      {inspectingId && nodeById[inspectingId] && (
        <NodeInspector
          node={nodeById[inspectingId]}
          onChange={(patch) => patchNode(inspectingId, patch)}
          onClose={() => setInspectingId(null)}
        />
      )}

      {talkOpen && (
        <TalkTrack
          sections={talkSections}
          rating={talkRating}
          onChangeSection={(id, value) => {
            commit({ ...snapshot(), talkSections: { ...talkSections, [id]: value }, talkGrade: null });
          }}
          onChangeRating={(value) => {
            commit({ ...snapshot(), talkRating: value, talkGrade: null });
          }}
        />
      )}

      {result && (
        <EvalResults
          result={result}
          scenario={scenario}
          pushback={buildPushback(scenario, nodes)}
        />
      )}
    </main>
  );
}
