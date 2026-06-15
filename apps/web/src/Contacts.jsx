import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLE_POSITIONS, STATUSES, STATUS_STYLES, todayDDMMYYYY, isDue } from "@tech-refresh/core/contacts";
import { buildFunnelSummary } from "@tech-refresh/core/funnel";
import { FunnelDashboard } from "./FunnelDashboard.jsx";
import * as api from "./api.js";
import { colors, tints } from "@tech-refresh/core/tokens";
import { BrandIcon } from "./BrandIcon.jsx";
import { Combobox } from "./Combobox.jsx";
import { WorkspaceLayout, WorkspacePanel, WorkspaceTitle } from "./WorkspaceLayout.jsx";

const EMPTY_FORM = {
  name: "",
  role: "",
  link: "",
  note: "",
  status: "Contacted",
  date: "",
  nextAction: "",
  nextActionDate: "",
};

const EMPTY_RETRO = { round: "", questions: "", wentWell: "", toImprove: "" };

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  background: colors.bgDeep,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

const textareaStyle = { ...inputStyle, minHeight: 56, resize: "vertical", lineHeight: 1.5 };

export default function Contacts() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null); // contact id, "new", or null
  const [retroFor, setRetroFor] = useState(null); // contact id with open retro form

  const { data: contacts = null, error: loadError } = useQuery({
    queryKey: ["contacts"],
    queryFn: api.listContacts,
  });
  const { data: statusEvents = [] } = useQuery({ queryKey: ["status-events"], queryFn: api.listStatusEvents });
  const funnel = buildFunnelSummary(contacts ?? [], statusEvents);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["status-events"] });
  };
  const saveMutation = useMutation({ mutationFn: api.upsertContact, onSettled: invalidate });
  const deleteMutation = useMutation({ mutationFn: api.deleteContact, onSettled: invalidate });
  const retroAddMutation = useMutation({
    mutationFn: ({ contactId, retro }) => api.addRetro(contactId, retro),
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

  const handleSave = (form) => {
    if (!form.name.trim()) return;
    saveMutation.mutate({
      ...form,
      id: editingId === "new" ? undefined : editingId,
      date: form.date || todayDDMMYYYY(),
    });
    setEditingId(null);
  };

  const handleDelete = (c) => {
    if (window.confirm(`Delete "${c.name}"?`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const handleAdvance = (c) => {
    const next = STATUSES[STATUSES.indexOf(c.status) + 1];
    if (!next) return;
    saveMutation.mutate({ ...c, status: next, date: todayDDMMYYYY() });
  };

  const handleClearAction = (c) => {
    saveMutation.mutate({ ...c, nextAction: "", nextActionDate: "" });
  };

  const handleAddRetro = (contactId, retro) => {
    retroAddMutation.mutate({ contactId, retro });
    setRetroFor(null);
  };

  const handleDeleteRetro = (contactId, retroId) => {
    retroDeleteMutation.mutate(retroId);
  };

  const sorted = contacts ? [...contacts].sort((a, b) => isDue(b) - isDue(a)) : null;
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
      right={<ContactsRightRail dueContacts={dueContacts} funnel={funnel} />}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 850, color: colors.textBright }}>
          Hiring Contacts
        </h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 500 }}>
          {contacts ? `${contacts.length} in pipeline` : "loading…"}
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
        {sorted?.map((c) =>
          editingId === c.id ? (
            <ContactForm key={c.id} initial={c} onSave={handleSave} onCancel={() => setEditingId(null)} />
          ) : (
            <ContactCard
              key={c.id}
              contact={c}
              retroOpen={retroFor === c.id}
              onEdit={() => setEditingId(c.id)}
              onDelete={() => handleDelete(c)}
              onAdvance={() => handleAdvance(c)}
              onClearAction={() => handleClearAction(c)}
              onOpenRetro={() => setRetroFor(retroFor === c.id ? null : c.id)}
              onAddRetro={(retro) => handleAddRetro(c.id, retro)}
              onDeleteRetro={(retroId) => handleDeleteRetro(c.id, retroId)}
            />
          )
        )}
      </div>
    </WorkspaceLayout>
  );
}

function ContactsLeftRail({ canAdd, contacts, dueCount, onAdd }) {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, contacts.filter((contact) => contact.status === status).length]));

  return (
    <>
      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="contact" color={colors.accentBright} size={17} />}
          title="Pipeline"
          subtitle={`${contacts.length} people tracked. Keep the list ordered by urgency.`}
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
            Add contact
          </button>
        )}
      </WorkspacePanel>

      <WorkspacePanel style={{ padding: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STATUSES.map((status) => {
            const style = STATUS_STYLES[status];
            return (
              <div
                key={status}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 7,
                  background: counts[status] ? `${style.color}14` : "transparent",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: counts[status] ? style.color : colors.border }} />
                <span style={{ flex: 1, color: counts[status] ? colors.text : colors.textFaint, fontSize: 12.5, fontWeight: 750 }}>{status}</span>
                <span style={{ color: counts[status] ? style.color : colors.textFaint, fontSize: 12, fontWeight: 850 }}>{counts[status]}</span>
              </div>
            );
          })}
        </div>
      </WorkspacePanel>

      {dueCount > 0 && (
        <WorkspacePanel tone="sunken" style={{ borderColor: `${colors.danger}70` }}>
          <WorkspaceTitle
            icon={<BrandIcon name="warning" color={colors.dangerBright} size={17} />}
            title={`${dueCount} follow-up${dueCount > 1 ? "s" : ""} due`}
            subtitle="These lose momentum when they slip."
          />
        </WorkspacePanel>
      )}
    </>
  );
}

function ContactsRightRail({ dueContacts, funnel }) {
  return (
    <>
      <FunnelDashboard summary={funnel} compact />
      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="calendar" color={dueContacts.length ? colors.dangerBright : colors.successBright} size={17} />}
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
          {dueContacts.length === 0 && <p style={{ margin: 0, color: colors.textFaint, fontSize: 12 }}>Add next actions to keep the pipeline moving.</p>}
        </div>
      </WorkspacePanel>
    </>
  );
}

function ContactCard({
  contact: c,
  retroOpen,
  onEdit,
  onDelete,
  onAdvance,
  onClearAction,
  onOpenRetro,
  onAddRetro,
  onDeleteRetro,
}) {
  const [showRetros, setShowRetros] = useState(false);
  const status = STATUS_STYLES[c.status] || STATUS_STYLES.Contacted;
  const nextStatus = STATUSES[STATUSES.indexOf(c.status) + 1];
  const due = isDue(c);
  const retros = c.retros || [];

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${due ? `${colors.danger}80` : `${status.color}30`}`,
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "3px 10px",
            background: status.bg,
            borderRadius: 20,
            color: status.color,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {c.status.toUpperCase()}
        </span>
        {c.date && <span style={{ fontSize: 11, color: colors.textFaint }}>{c.date}</span>}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {nextStatus && (
            <ActionButton onClick={onAdvance} color={STATUS_STYLES[nextStatus].color}>
              → {nextStatus}
            </ActionButton>
          )}
          <ActionButton onClick={onOpenRetro} color={colors.accentBright}>
            + Retro
          </ActionButton>
          <ActionButton onClick={onEdit} color={colors.textDim}>
            Edit
          </ActionButton>
          <ActionButton onClick={onDelete} color={colors.danger}>
            Delete
          </ActionButton>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: colors.textBright, marginBottom: 4 }}>{c.name}</div>

      {c.role && (
        <div style={{ fontSize: 13, color: colors.text, marginBottom: 4 }}>
          {c.link ? (
            <a href={c.link} target="_blank" rel="noreferrer" style={{ color: colors.accentBright, textDecoration: "none" }}>
              {c.role} ↗
            </a>
          ) : (
            c.role
          )}
        </div>
      )}

      {c.note && <div style={{ fontSize: 12.5, color: colors.textDim }}>{c.note}</div>}

      {c.nextAction && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background: due ? tints.dangerSoft : tints.warningSoft,
            border: `1px solid ${due ? `${colors.danger}60` : `${colors.warning}40`}`,
            borderRadius: 8,
            fontSize: 12.5,
            color: due ? colors.dangerBright : colors.warningBright,
          }}
        >
          <BrandIcon name={due ? "warning" : "calendar"} color={due ? colors.dangerBright : colors.warningBright} size={15} />
          <span style={{ flex: 1 }}>
            {due && <span style={{ fontWeight: 600 }}>DUE · </span>}
            {c.nextAction}
            {c.nextActionDate && <span style={{ opacity: 0.7 }}> · {c.nextActionDate}</span>}
          </span>
          <button
            onClick={onClearAction}
            title="Mark done"
            style={{
              padding: "3px 10px",
              background: "transparent",
              border: `1px solid ${due ? `${colors.danger}60` : `${colors.warning}50`}`,
              borderRadius: 6,
              color: "inherit",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      )}

      {retros.length > 0 && (
        <button
          onClick={() => setShowRetros((v) => !v)}
          style={{
            marginTop: 10,
            padding: "4px 10px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textDim,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <BrandIcon name="retro" color={colors.textDim} size={12} />
          Retros ({retros.length})
          <BrandIcon name={showRetros ? "arrowUp" : "arrowDown"} color={colors.textDim} size={11} />
        </button>
      )}

      {showRetros &&
        retros.map((r) => (
          <div
            key={r.id}
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: colors.well,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{r.round || "Interview"}</span>
              <span style={{ fontSize: 11, color: colors.textFaint }}>{r.date}</span>
              <button
                onClick={() => onDeleteRetro(r.id)}
                title="Delete retro"
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <BrandIcon name="close" color={colors.textFaint} size={11} />
              </button>
            </div>
            <RetroLine label="Questions asked" text={r.questions} />
            <RetroLine label="Went well" text={r.wentWell} />
            <RetroLine label="To improve" text={r.toImprove} />
          </div>
        ))}

      {retroOpen && <RetroForm onSave={onAddRetro} onCancel={onOpenRetro} />}
    </div>
  );
}

function RetroLine({ label, text }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: colors.textFaint, letterSpacing: "0.06em" }}>
        {label.toUpperCase()}:{" "}
      </span>
      <span style={{ fontSize: 12.5, color: colors.textDim, whiteSpace: "pre-wrap" }}>{text}</span>
    </div>
  );
}

function RetroForm({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_RETRO);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div
      style={{
        marginTop: 10,
        padding: "12px 14px",
        background: colors.well,
        border: `1px solid ${colors.accent}60`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Field label="Round">
        <input style={inputStyle} value={form.round} onChange={set("round")} placeholder="Recruiter screen / Tech round / System design…" autoFocus />
      </Field>
      <Field label="Questions they actually asked">
        <textarea style={textareaStyle} value={form.questions} onChange={set("questions")} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Went well">
          <textarea style={textareaStyle} value={form.wentWell} onChange={set("wentWell")} />
        </Field>
        <Field label="To improve">
          <textarea style={textareaStyle} value={form.toImprove} onChange={set("toImprove")} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 14px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textDim,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          style={{
            padding: "6px 14px",
            background: colors.accent,
            border: "none",
            borderRadius: 8,
            color: colors.onAccent,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save retro
        </button>
      </div>
    </div>
  );
}

function ActionButton({ onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        background: "transparent",
        border: `1px solid ${color}50`,
        borderRadius: 8,
        color,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function ContactForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.accent}60`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Name *">
          <input style={inputStyle} value={form.name} onChange={set("name")} autoFocus />
        </Field>
        <Combobox
          label="Status"
          value={form.status}
          options={STATUSES.map((status) => ({ value: status, label: status, color: STATUS_STYLES[status].color }))}
          onChange={(status) => setForm((f) => ({ ...f, status }))}
        />
      </div>
      <Combobox
        label="Role / Position"
        searchable
        value={form.role}
        onChange={(role) => setForm((f) => ({ ...f, role }))}
        placeholder="Start typing a role..."
        options={ROLE_POSITIONS.map((role) => ({ value: role, label: role }))}
      />
      <Field label="Link">
        <input style={inputStyle} value={form.link} onChange={set("link")} placeholder="https://…" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Field label="Note">
          <input style={inputStyle} value={form.note} onChange={set("note")} />
        </Field>
        <Field label="Date">
          <DateInput value={form.date} onChange={(date) => setForm((f) => ({ ...f, date }))} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Field label="Next action — what's the next move?">
          <input
            style={inputStyle}
            value={form.nextAction}
            onChange={set("nextAction")}
            placeholder="Chase for feedback / send thank-you note / prep round 2…"
          />
        </Field>
        <Field label="Due">
          <DateInput
            value={form.nextActionDate}
            onChange={(nextActionDate) => setForm((f) => ({ ...f, nextActionDate }))}
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textDim,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim()}
          style={{
            padding: "8px 16px",
            background: colors.accent,
            border: "none",
            borderRadius: 8,
            color: colors.onAccent,
            fontSize: 13,
            fontWeight: 600,
            cursor: form.name.trim() ? "pointer" : "not-allowed",
            opacity: form.name.trim() ? 1 : 0.5,
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: colors.textFaint, letterSpacing: "0.03em" }}>{label}</span>
      {children}
    </label>
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      style={inputStyle}
      value={value}
      inputMode="numeric"
      maxLength={10}
      onChange={(e) => onChange(formatDateEntry(e.target.value))}
      placeholder="DD-MM-YYYY"
    />
  );
}

function formatDateEntry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}
