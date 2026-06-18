import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STATUSES, todayDDMMYYYY, isDue } from "@tech-refresh/core/contacts";
import { buildFunnelSummary } from "@tech-refresh/core/funnel";
import { colors, tints } from "@tech-refresh/core/tokens";
import * as api from "../lib/api";
import { pipeline } from "../lib/api";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { ContactCard } from "./ContactCard";
import { ContactForm } from "./ContactForm";
import { ContactsLeftRail } from "./ContactsLeftRail";
import { ContactsRightRail } from "./ContactsRightRail";
import { EMPTY_FORM } from "./types";
import type { Contact, Retro } from "./types";

export default function Contacts() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [retroFor, setRetroFor] = useState<string | null>(null);

  const { data: contacts = null, error: loadError } = useQuery({
    queryKey: ["contacts"],
    queryFn: api.listContacts,
  });
  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: api.listStories,
  });
  const { data: statusEvents = [] } = useQuery({
    queryKey: ["status-events"],
    queryFn: api.listStatusEvents,
  });
  const { data: velocity } = useQuery({
    queryKey: ["pipeline-velocity"],
    queryFn: async () => {
      try {
        return await pipeline.getVelocity();
      } catch {
        return { stages: [] };
      }
    },
    // staleTime: 5 * 60 * 1000,
    enabled: !!contacts,
    retry: false,
    initialData: { stages: [] },
  });
  const funnel = buildFunnelSummary(contacts ?? [], statusEvents);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["status-events"] });
  };
  const saveMutation = useMutation({ mutationFn: api.upsertContact, onSettled: invalidate });
  const deleteMutation = useMutation({ mutationFn: api.deleteContact, onSettled: invalidate });
  const retroAddMutation = useMutation({
    mutationFn: ({ contactId, retro }: { contactId: string; retro: Omit<Retro, "id" | "date"> }) =>
      api.addRetro(contactId, retro),
    onSettled: invalidate,
  });
  const retroDeleteMutation = useMutation({ mutationFn: api.deleteRetro, onSettled: invalidate });

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
      mainLabel="Hiring contacts"
      left={
        <ContactsLeftRail
          canAdd={!!contacts && editingId !== "new"}
          contacts={contacts ?? []}
          dueCount={dueCount}
          onAdd={() => setEditingId("new")}
        />
      }
      right={<ContactsRightRail dueContacts={dueContacts} funnel={funnel} velocity={velocity} />}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 850, color: colors.textBright }}>
          Hiring Contacts
        </h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 500 }}>
          {contacts ? `${contacts.length} in pipeline` : "loading..."}
        </span>
      </div>
      <p style={{ margin: "0 0 20px", color: colors.textFaint, fontSize: 13, maxWidth: 760, lineHeight: 1.6 }}>
        Recruiters contacted and applications submitted. Synced to Supabase.
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
