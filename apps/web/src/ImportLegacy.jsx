import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase.js";
import { addXp, dateToDb } from "./api.js";
import legacyContacts from "./contacts.json";
import legacyStories from "./stories.json";
import legacyScores from "./scores.json";

// One-time migration of the pre-Supabase JSON files. Skips any table that
// already has rows, so it's safe to click twice. Delete this component (and
// the JSON files) once the import has run.
export default function ImportLegacy() {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const runImport = async () => {
    if (!window.confirm("Import legacy JSON data (contacts, stories, scores) into Supabase?")) return;
    setBusy(true);
    const summary = [];
    try {
      const { count: contactCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });
      if (contactCount === 0 && legacyContacts.length) {
        for (const c of legacyContacts) {
          const { data, error } = await supabase
            .from("contacts")
            .insert({
              name: c.name,
              status: c.status,
              role: c.role || null,
              link: c.link || null,
              note: c.note || null,
              date: dateToDb(c.date),
              next_action: c.nextAction || null,
              next_action_date: dateToDb(c.nextActionDate),
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          for (const r of c.retros ?? []) {
            const { error: rErr } = await supabase.from("retros").insert({
              contact_id: data.id,
              round: r.round || null,
              questions: r.questions || null,
              went_well: r.wentWell || null,
              to_improve: r.toImprove || null,
              date: dateToDb(r.date) ?? undefined,
            });
            if (rErr) throw new Error(rErr.message);
          }
        }
        summary.push(`${legacyContacts.length} contacts`);
      }

      const { count: storyCount } = await supabase
        .from("stories")
        .select("*", { count: "exact", head: true });
      if (storyCount === 0 && legacyStories.length) {
        const { error } = await supabase.from("stories").insert(
          legacyStories.map((s) => ({
            title: s.title,
            competency: s.competency,
            situation: s.situation || null,
            task: s.task || null,
            action: s.action || null,
            result: s.result || null,
          }))
        );
        if (error) throw new Error(error.message);
        summary.push(`${legacyStories.length} stories`);
      }

      const { count: eventCount } = await supabase
        .from("answer_events")
        .select("*", { count: "exact", head: true });
      if (eventCount === 0) {
        const events = Object.entries(legacyScores.answers).flatMap(([tech, s]) => [
          ...Array(s.correct).fill({ tech, correct: true, source: "import" }),
          ...Array(s.wrong).fill({ tech, correct: false, source: "import" }),
        ]);
        if (events.length) {
          const { error } = await supabase.from("answer_events").insert(events);
          if (error) throw new Error(error.message);
          summary.push(`${events.length} answers`);
        }
        if (legacyScores.xp > 0) {
          await addXp(legacyScores.xp);
          summary.push(`${legacyScores.xp} XP`);
        }
      }

      queryClient.invalidateQueries();
      window.alert(summary.length ? `Imported: ${summary.join(", ")}` : "Nothing to import — tables already have data.");
    } catch (err) {
      window.alert(`Import failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={runImport}
      disabled={busy}
      title="One-time import of the pre-Supabase JSON files"
      style={{
        padding: "5px 12px",
        background: "transparent",
        border: "1px solid #2d3748",
        borderRadius: 8,
        color: "#64748b",
        fontSize: 11,
        fontWeight: 600,
        cursor: busy ? "wait" : "pointer",
      }}
    >
      {busy ? "Importing…" : "⬆ Import legacy"}
    </button>
  );
}
