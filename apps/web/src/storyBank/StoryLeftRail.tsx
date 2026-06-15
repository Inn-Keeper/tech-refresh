import React from "react";
import { colors, tints } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../BrandIcon";
import { WorkspacePanel, WorkspaceTitle } from "../WorkspaceLayout";
import type { Story } from "./types";

export function StoryLeftRail({
  canAdd,
  mode,
  onAdd,
  setMode,
  stories,
}: {
  canAdd: boolean;
  mode: string;
  onAdd: () => void;
  setMode: (m: "stories" | "drill") => void;
  stories: Story[];
}) {
  return (
    <>
      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="story" color={colors.accentBright} size={17} />}
          title="Behavioral prep"
          subtitle={`${stories.length} saved stories. Keep the center for writing and rehearsing.`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {[
            { id: "stories", icon: "story", label: "My stories" },
            { id: "drill", icon: "prompt", label: "Drill prompts" },
          ].map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMode(item.id as "stories" | "drill")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  border: "none",
                  borderRadius: 7,
                  background: active ? tints.accentSoft : "transparent",
                  color: active ? colors.accentBright : colors.textDim,
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <BrandIcon name={item.icon} color={active ? colors.accentBright : colors.textFaint} size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </WorkspacePanel>

      <WorkspacePanel tone="sunken">
        <WorkspaceTitle
          icon={<BrandIcon name="spark" color={colors.warningBright} size={17} />}
          title="Next useful action"
          subtitle={
            mode === "stories"
              ? "Write one specific story, then reuse it across prompts."
              : "Answer out loud before revealing matching stories."
          }
        />
        {canAdd && (
          <button
            onClick={onAdd}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "9px 12px",
              background: colors.accent,
              border: "none",
              borderRadius: 8,
              color: colors.onAccent,
              fontSize: 12,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Add story
          </button>
        )}
      </WorkspacePanel>
    </>
  );
}
