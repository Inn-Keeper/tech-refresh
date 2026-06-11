import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STATUSES, STATUS_STYLES, todayDDMMYYYY, isDue } from "@tech-refresh/core/contacts";
import { buildFunnelSummary } from "@tech-refresh/core/funnel";
import { FunnelDashboard } from "./FunnelDashboard.jsx";
import * as api from "./api.js";

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
  background: "#13161f",
  border: "1px solid #2d3748",
  borderRadius: 8,
  color: "#e2e8f0",
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

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 48px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
          Hiring Contacts
        </h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
          {contacts ? `${contacts.length} in pipeline` : "loading…"}
        </span>
      </div>
      <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
        Recruiters contacted and applications submitted. Synced to Supabase.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "#7f1d1d30",
            border: "1px solid #ef444460",
            borderRadius: 10,
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <FunnelDashboard summary={funnel} />

      {dueCount > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "#7f1d1d30",
            border: "1px solid #ef444460",
            borderRadius: 10,
            color: "#fca5a5",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⏰ {dueCount} follow-up{dueCount > 1 ? "s" : ""} due — these lose offers when they slip.
        </div>
      )}

      {contacts && editingId !== "new" && (
        <button
          onClick={() => setEditingId("new")}
          style={{
            marginBottom: 16,
            padding: "9px 16px",
            background: "#6366f125",
            border: "1px solid #6366f160",
            borderRadius: 10,
            color: "#a5b4fc",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add contact
        </button>
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
    </div>
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
        background: "#1e2330",
        border: `1px solid ${due ? "#ef444480" : `${status.color}30`}`,
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
        {c.date && <span style={{ fontSize: 11, color: "#64748b" }}>{c.date}</span>}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {nextStatus && (
            <ActionButton onClick={onAdvance} color={STATUS_STYLES[nextStatus].color}>
              → {nextStatus}
            </ActionButton>
          )}
          <ActionButton onClick={onOpenRetro} color="#a5b4fc">
            + Retro
          </ActionButton>
          <ActionButton onClick={onEdit} color="#94a3b8">
            Edit
          </ActionButton>
          <ActionButton onClick={onDelete} color="#ef4444">
            Delete
          </ActionButton>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{c.name}</div>

      {c.role && (
        <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 4 }}>
          {c.link ? (
            <a href={c.link} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc", textDecoration: "none" }}>
              {c.role} ↗
            </a>
          ) : (
            c.role
          )}
        </div>
      )}

      {c.note && <div style={{ fontSize: 12.5, color: "#94a3b8" }}>{c.note}</div>}

      {c.nextAction && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background: due ? "#7f1d1d30" : "#f59e0b15",
            border: `1px solid ${due ? "#ef444460" : "#f59e0b40"}`,
            borderRadius: 8,
            fontSize: 12.5,
            color: due ? "#fca5a5" : "#fbbf24",
          }}
        >
          <span style={{ fontWeight: 600 }}>{due ? "🔴 DUE" : "⏰"}</span>
          <span style={{ flex: 1 }}>
            {c.nextAction}
            {c.nextActionDate && <span style={{ opacity: 0.7 }}> · {c.nextActionDate}</span>}
          </span>
          <button
            onClick={onClearAction}
            title="Mark done"
            style={{
              padding: "3px 10px",
              background: "transparent",
              border: `1px solid ${due ? "#ef444460" : "#f59e0b50"}`,
              borderRadius: 6,
              color: "inherit",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done ✓
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
            border: "1px solid #2d3748",
            borderRadius: 8,
            color: "#94a3b8",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          📓 Retros ({retros.length}) {showRetros ? "▴" : "▾"}
        </button>
      )}

      {showRetros &&
        retros.map((r) => (
          <div
            key={r.id}
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "#1a1f2e",
              border: "1px solid #2d3748",
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>{r.round || "Interview"}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{r.date}</span>
              <button
                onClick={() => onDeleteRetro(r.id)}
                title="Delete retro"
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ×
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
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em" }}>
        {label.toUpperCase()}:{" "}
      </span>
      <span style={{ fontSize: 12.5, color: "#94a3b8", whiteSpace: "pre-wrap" }}>{text}</span>
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
        background: "#1a1f2e",
        border: "1px solid #6366f160",
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
            border: "1px solid #2d3748",
            borderRadius: 8,
            color: "#94a3b8",
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
            background: "#6366f1",
            border: "none",
            borderRadius: 8,
            color: "#fff",
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
        background: "#1e2330",
        border: "1px solid #6366f160",
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
        <Field label="Status">
          <select style={inputStyle} value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Role / Position">
        <input style={inputStyle} value={form.role} onChange={set("role")} />
      </Field>
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
            border: "1px solid #2d3748",
            borderRadius: 8,
            color: "#94a3b8",
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
            background: "#6366f1",
            border: "none",
            borderRadius: 8,
            color: "#fff",
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
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.03em" }}>{label}</span>
      {children}
    </label>
  );
}

// Native browser date picker bound to the app's DD-MM-YYYY format.
function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      style={{ ...inputStyle, colorScheme: "dark" }}
      value={api.dateToDb(value) ?? ""}
      onChange={(e) => onChange(api.dateToUi(e.target.value))}
    />
  );
}
