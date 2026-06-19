import { useState } from "react";
import { STATUSES, todayDDMMYYYY, isDue } from "@tech-refresh/core/contacts";
import { buildFunnelSummary } from "@tech-refresh/core/funnel";
import { colors, tints } from "@tech-refresh/core/tokens";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { ContactCard } from "./ContactCard";
import { ContactForm } from "./ContactForm";
import { QuestLeftRail } from "./QuestLeftRail";
import { QuestRightRail } from "./QuestRightRail";
import { EMPTY_FORM } from "./types";
import {
  useAddRetroMutation,
  useContactStoriesQuery,
  useContactsQuery,
  useDeleteContactMutation,
  useDeleteRetroMutation,
  usePipelineVelocityQuery,
  useSaveContactMutation,
  useStatusEventsQuery,
} from "./queries";
import type { Contact, Retro } from "./types";

export default function Quest() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [retroFor, setRetroFor] = useState<string | null>(null);

  const { data: contacts = null, error: loadError } = useContactsQuery();
  const { data: stories = [] } = useContactStoriesQuery();
  const { data: statusEvents = [] } = useStatusEventsQuery();
  const { data: velocity, error: velocityError, isFetching: velocityLoading } = usePipelineVelocityQuery();
  const funnel = buildFunnelSummary(contacts ?? [], statusEvents);

  const saveMutation = useSaveContactMutation();
  const deleteMutation = useDeleteContactMutation();
  const retroAddMutation = useAddRetroMutation();
  const retroDeleteMutation = useDeleteRetroMutation();

  const mutationError =
    saveMutation.error || deleteMutation.error || retroAddMutation.error || retroDeleteMutation.error;
  const error = loadError
    ? `Couldn't load contacts: ${loadError.message}`
    : mutationError
      ? `Save failed: ${mutationError.message}`
      : null;

  const handleSave = (form: Omit<Contact, "id" | "retros">) => {
    if (!form.name.trim()) return;
    saveMutation.mutate({
      ...form,
      id: editingId === "new" ? undefined : editingId ?? undefined,
      date: form.date || todayDDMMYYYY(),
    });
    setEditingId(null);
  };

  const handleDelete = (contact: Contact) => {
    if (window.confirm(`Delete "${contact.name}"?`)) {
      deleteMutation.mutate(contact.id);
    }
  };

  const handleAdvance = (contact: Contact) => {
    const next = STATUSES[STATUSES.indexOf(contact.status) + 1];
    if (!next) return;
    saveMutation.mutate({ ...contact, status: next, date: todayDDMMYYYY() });
  };

  const handleClearAction = (contact: Contact) => {
    saveMutation.mutate({ ...contact, nextAction: "", nextActionDate: "" });
  };

  const handleAddRetro = (contactId: string, retro: Omit<Retro, "id" | "date">) => {
    retroAddMutation.mutate({ contactId, retro });
    setRetroFor(null);
  };

  const handleDeleteRetro = (_contactId: string, retroId: string) => {
    retroDeleteMutation.mutate(retroId);
  };

  const sorted = contacts ? [...contacts].sort((a: Contact, b: Contact) => (isDue(b) ? 1 : 0) - (isDue(a) ? 1 : 0)) : null;
  const dueCount = contacts ? contacts.filter(isDue).length : 0;
  const dueContacts = contacts ? contacts.filter(isDue) : [];

  return (
    <WorkspaceLayout
      mainLabel="Quest"
      left={
        <QuestLeftRail
          canAdd={!!contacts && editingId !== "new"}
          contacts={contacts ?? []}
          dueCount={dueCount}
          onAdd={() => setEditingId("new")}
        />
      }
      right={
        <QuestRightRail
          dueContacts={dueContacts}
          funnel={funnel}
          velocity={velocity}
          velocityError={velocityError}
          velocityLoading={velocityLoading}
        />
      }
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 850, color: colors.textBright }}>
          Quest
        </h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 500 }}>
          {contacts ? `${contacts.length} in pipeline` : "loading..."}
        </span>
      </div>
      <p style={{ margin: "0 0 20px", color: colors.textFaint, fontSize: 13, maxWidth: 760, lineHeight: 1.6 }}>
        Track contacts, applications, follow-ups, and interview retros. Synced to Supabase.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: tints.dangerSoft,
            border: `1px solid ${colors.danger}60`,
            borderRadius: 10,
            color: colors.dangerBright,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {editingId === "new" && (
        <div style={{ marginBottom: 16 }}>
          <ContactForm
            initial={{ ...EMPTY_FORM, date: todayDDMMYYYY() }}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted?.map((contact) =>
          editingId === contact.id ? (
            <ContactForm key={contact.id} initial={contact} onSave={handleSave} onCancel={() => setEditingId(null)} />
          ) : (
            <ContactCard
              key={contact.id}
              contact={contact}
              stories={stories}
              retroOpen={retroFor === contact.id}
              onEdit={() => setEditingId(contact.id ?? null)}
              onDelete={() => handleDelete(contact)}
              onAdvance={() => handleAdvance(contact)}
              onClearAction={() => handleClearAction(contact)}
              onOpenRetro={() => setRetroFor(retroFor === contact.id ? null : contact.id ?? null)}
              onAddRetro={(retro) => contact.id && handleAddRetro(contact.id, retro)}
              onDeleteRetro={(retroId) => contact.id && handleDeleteRetro(contact.id, retroId)}
            />
          )
        )}
      </div>
    </WorkspaceLayout>
  );
}
