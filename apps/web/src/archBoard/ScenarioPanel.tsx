import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";

import { BrandIcon } from "../components/BrandIcon";
import { Combobox } from "../components/Combobox";
import { CATEGORY_ICONS } from "./constants";
import { ScaleBrief } from "./ScaleBrief";
import { ScenarioForm } from "./ScenarioForm";
import type { ArchBoardController } from "./useArchBoard";
import { ghostAction } from "./buttonStyles";

type Props = Pick<
  ArchBoardController,
  | "creatorOpen"
  | "setCreatorOpen"
  | "allScenarios"
  | "scenarioOptions"
  | "scenario"
  | "saveScenarioMutation"
  | "deleteScenarioMutation"
  | "switchScenario"
>;

export function ScenarioPanel({
  creatorOpen,
  setCreatorOpen,
  allScenarios,
  scenarioOptions,
  scenario,
  saveScenarioMutation,
  deleteScenarioMutation,
  switchScenario,
}: Props) {
  return (
    <>
      {/* Scenario picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <BrandIcon
          name={CATEGORY_ICONS[scenario.category ?? ""] ?? "board"}
          color={colors.accentBright}
          size={16}
        />
        <Combobox
          value={scenario.id}
          options={scenarioOptions}
          onChange={switchScenario}
          style={{ flex: 1, minWidth: 260 }}
          triggerStyle={{ padding: "9px 12px", fontWeight: 600 }}
        />
        <span style={{ fontSize: 11, color: colors.textFaint, fontWeight: 600 }}>{allScenarios.length} scenarios</span>
        {scenario.custom && (
          <button
            onClick={() =>
              window.confirm(`Delete scenario "${scenario.name}"?`) && deleteScenarioMutation.mutate(scenario.id)
            }
            style={ghostAction(colors.dangerBright, `${colors.danger}50`)}
          >
            {t("common.delete")}
          </button>
        )}
        <button
          onClick={() => setCreatorOpen((value) => !value)}
          style={{
            ...ghostAction(colors.accentBright, creatorOpen ? colors.accent : `${colors.accent}60`),
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <BrandIcon
            name="board"
            color={colors.accentBright}
            size={13}
          />
          New scenario
        </button>
      </div>

      {creatorOpen && (
        <ScenarioForm
          onSave={(form) => saveScenarioMutation.mutate(form)}
          onCancel={() => setCreatorOpen(false)}
          saving={saveScenarioMutation.isPending}
          error={saveScenarioMutation.error}
        />
      )}

      {scenario.brief && (
        <div
          style={{
            padding: "12px 16px",
            background: colors.well,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            marginBottom: 14,
            fontSize: 13,
            lineHeight: 1.6,
            color: colors.textDim,
          }}
        >
          {scenario.brief}
        </div>
      )}

      <ScaleBrief
        key={scenario.id}
        scenario={scenario}
      />
    </>
  );
}
