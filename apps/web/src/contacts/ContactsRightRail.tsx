import React from "react";
import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../BrandIcon";
import { FunnelDashboard } from "../FunnelDashboard";
import { WorkspacePanel, WorkspaceTitle } from "../WorkspaceLayout";
import type { Contact } from "./types";

type FunnelSummary = Parameters<typeof FunnelDashboard>[0]["summary"];

export function ContactsRightRail({
  dueContacts,
  funnel,
}: {
  dueContacts: Contact[];
  funnel: FunnelSummary;
}) {
  return (
    <>
      <FunnelDashboard summary={funnel} compact />
      <WorkspacePanel>
        <WorkspaceTitle
          icon={
            <BrandIcon
              name="calendar"
              color={dueContacts.length ? colors.dangerBright : colors.successBright}
              size={17}
            />
          }
          title={dueContacts.length ? "Due now" : "No overdue actions"}
          subtitle={dueContacts.length ? "Clear these first." : "Your follow-up queue is calm."}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {dueContacts.slice(0, 5).map((contact) => (
            <div key={contact.id} style={{ fontSize: 12, lineHeight: 1.45 }}>
              <div style={{ color: colors.textBright, fontWeight: 800 }}>{contact.name}</div>
              <div style={{ color: colors.textFaint }}>{contact.nextAction}</div>
            </div>
          ))}
          {dueContacts.length === 0 && (
            <p style={{ margin: 0, color: colors.textFaint, fontSize: 12 }}>
              Add next actions to keep the pipeline moving.
            </p>
          )}
        </div>
      </WorkspacePanel>
    </>
  );
}
