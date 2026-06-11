import { useState } from "react";
import { Alert, FlatList, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STATUSES, STATUS_STYLES, todayDDMMYYYY, isDue } from "@tech-refresh/core/contacts";
import { buildFunnelSummary } from "@tech-refresh/core/funnel";
import { t } from "@tech-refresh/core/i18n";
import { api } from "@/lib/api";
import { colors } from "@/theme";
import { Badge, Button, Field, MiniButton, Pill, Screen, Section, inputStyle, multilineStyle } from "@/components/ui";
import { DateField } from "@/components/DateField";
import type { Contact } from "@tech-refresh/core/api";

const EMPTY_FORM: Contact = {
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

export default function ContactsScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Contact | null>(null);
  const [retroFor, setRetroFor] = useState<string | null>(null);

  const { data: contacts, error } = useQuery<Contact[]>({ queryKey: ["contacts"], queryFn: api.listContacts });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["status-events"] });
  };
  const saveMutation = useMutation({ mutationFn: api.upsertContact, onSettled: invalidate });
  const deleteMutation = useMutation({ mutationFn: api.deleteContact, onSettled: invalidate });
  const addRetroMutation = useMutation({
    mutationFn: ({ contactId, retro }: { contactId: string; retro: typeof EMPTY_RETRO }) =>
      api.addRetro(contactId, retro),
    onSettled: invalidate,
  });
  const deleteRetroMutation = useMutation({ mutationFn: api.deleteRetro, onSettled: invalidate });

  const { data: statusEvents = [] } = useQuery({ queryKey: ["status-events"], queryFn: api.listStatusEvents });
  const funnel = buildFunnelSummary(contacts ?? [], statusEvents);
  const sorted = [...(contacts ?? [])].sort((a, b) => Number(isDue(b)) - Number(isDue(a)));
  const dueCount = funnel.due;

  const confirmDelete = (contact: Contact) =>
    Alert.alert(t("contacts.deleteTitle"), t("contacts.deleteMessage", { name: contact.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteMutation.mutate(contact.id) },
    ]);

  const handleSave = (form: Contact) => {
    if (form.name.trim()) {
      saveMutation.mutate({ ...form, date: form.date || todayDDMMYYYY() });
    }
    setEditing(null);
  };

  const advanceStatus = (contact: Contact) => {
    const next = STATUSES[STATUSES.indexOf(contact.status) + 1];
    if (next) saveMutation.mutate({ ...contact, status: next, date: todayDDMMYYYY() });
  };

  const clearNextAction = (contact: Contact) =>
    saveMutation.mutate({ ...contact, nextAction: "", nextActionDate: "" });

  if (editing) {
    return (
      <Screen>
        <ContactForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={sorted}
        keyExtractor={(contact) => contact.id!}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {error && <Text style={{ color: "#fca5a5", fontSize: 13 }}>{t("contacts.loadError", { message: error.message })}</Text>}

            <FunnelDashboard summary={funnel} />

            {dueCount > 0 && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: "#7f1d1d30",
                  borderWidth: 1,
                  borderColor: "#ef444460",
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#fca5a5", fontSize: 13, fontWeight: "600" }}>
                  {t("contacts.dueBanner", { count: dueCount, plural: dueCount > 1 ? "s" : "" })}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setEditing({ ...EMPTY_FORM, date: todayDDMMYYYY() })}
              style={{
                padding: 12,
                backgroundColor: "#6366f125",
                borderWidth: 1,
                borderColor: "#6366f160",
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#a5b4fc", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                + Add contact
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 250)).springify().damping(18)}>
            <ContactCard
              contact={item}
              retroFormOpen={retroFor === item.id}
              onEdit={() => setEditing(item)}
              onDelete={() => confirmDelete(item)}
              onAdvance={() => advanceStatus(item)}
              onClearAction={() => clearNextAction(item)}
              onToggleRetroForm={() => setRetroFor(retroFor === item.id ? null : item.id!)}
              onAddRetro={(retro) => {
                addRetroMutation.mutate({ contactId: item.id!, retro });
                setRetroFor(null);
              }}
              onDeleteRetro={(retroId) => deleteRetroMutation.mutate(retroId)}
            />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

type FunnelSummary = ReturnType<typeof buildFunnelSummary>;

function percent(value: number) {
  return Math.round(value * 100);
}

function FunnelDashboard({ summary }: { summary: FunnelSummary }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textBright }}>{t("funnel.title")}</Text>
          <Text style={{ fontSize: 11, color: colors.textFaint }}>{t("funnel.subtitle")}</Text>
        </View>
        <Badge label={t("funnel.active", { count: summary.active })} color={colors.accent} />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Metric label={t("funnel.appsPerWeek")} value={String(summary.applicationsPerWeek)} color={colors.green} />
        <Metric label={t("funnel.interviews")} value={String(summary.reached.Interviewing)} color={colors.amber} />
        <Metric label={t("funnel.offers")} value={String(summary.reached.Offer)} color="#a78bfa" />
      </View>

      <View style={{ gap: 8 }}>
        <ConversionRow
          label={t("funnel.contactedToApplied")}
          value={summary.rates.contactedToApplied}
          detail={`${summary.reached.Applied}/${summary.reached.Contacted}`}
          color={colors.green}
        />
        <ConversionRow
          label={t("funnel.appliedToInterviewing")}
          value={summary.rates.appliedToInterviewing}
          detail={`${summary.reached.Interviewing}/${summary.reached.Applied}`}
          color={colors.amber}
        />
        <ConversionRow
          label={t("funnel.interviewingToOffer")}
          value={summary.rates.interviewingToOffer}
          detail={`${summary.reached.Offer}/${summary.reached.Interviewing}`}
          color="#a78bfa"
        />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {summary.statuses.map((status: string) => (
          <Badge key={status} label={`${status}: ${summary.counts[status] ?? 0}`} color={STATUS_STYLES[status].color} />
        ))}
      </View>

      <View style={{ gap: 5 }}>
        {summary.signals.slice(0, 2).map((signal: string) => (
          <Text key={signal} style={{ fontSize: 11.5, lineHeight: 16, color: colors.textDim }}>
            - {signal}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 56,
        padding: 10,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: `${color}40`,
        borderRadius: 8,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color }}>{value}</Text>
      <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textFaint }}>
        {label}
      </Text>
    </View>
  );
}

function ConversionRow({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 11.5, fontWeight: "600", color: colors.textDim }}>{label}</Text>
        <Text style={{ fontSize: 11, color: colors.textFaint }}>{detail}</Text>
        <Text style={{ width: 38, textAlign: "right", fontSize: 11.5, fontWeight: "700", color }}>
          {percent(value)}%
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 999, overflow: "hidden" }}>
        <View style={{ width: `${percent(value)}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
      </View>
    </View>
  );
}

type ContactCardProps = {
  contact: Contact;
  retroFormOpen: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdvance: () => void;
  onClearAction: () => void;
  onToggleRetroForm: () => void;
  onAddRetro: (retro: typeof EMPTY_RETRO) => void;
  onDeleteRetro: (retroId: string) => void;
};

function ContactCard({
  contact,
  retroFormOpen,
  onEdit,
  onDelete,
  onAdvance,
  onClearAction,
  onToggleRetroForm,
  onAddRetro,
  onDeleteRetro,
}: ContactCardProps) {
  const [showRetros, setShowRetros] = useState(false);
  const status = STATUS_STYLES[contact.status] ?? STATUS_STYLES.Contacted;
  const nextStatus = STATUSES[STATUSES.indexOf(contact.status) + 1];
  const due = isDue(contact);
  const retros = contact.retros ?? [];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: due ? "#ef444480" : `${status.color}30`,
        borderRadius: 14,
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Badge label={contact.status} color={status.color} />
        {!!contact.date && <Text style={{ fontSize: 11, color: colors.textFaint }}>{contact.date}</Text>}
        <View style={{ flexDirection: "row", gap: 6, marginLeft: "auto" }}>
          {nextStatus && (
            <MiniButton label={`→ ${nextStatus}`} color={STATUS_STYLES[nextStatus].color} onPress={onAdvance} />
          )}
          <MiniButton label={t("contacts.addRetro")} color="#a5b4fc" onPress={onToggleRetroForm} />
        </View>
      </View>

      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textBright }}>{contact.name}</Text>

      {!!contact.role &&
        (contact.link ? (
          <TouchableOpacity onPress={() => Linking.openURL(contact.link)}>
            <Text style={{ fontSize: 13, color: "#7dd3fc" }}>{contact.role} ↗</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ fontSize: 13, color: "#cbd5e1" }}>{contact.role}</Text>
        ))}

      {!!contact.note && <Text style={{ fontSize: 12.5, color: colors.textDim }}>{contact.note}</Text>}

      {!!contact.nextAction && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 10,
            backgroundColor: due ? "#7f1d1d30" : "#f59e0b15",
            borderWidth: 1,
            borderColor: due ? "#ef444460" : "#f59e0b40",
            borderRadius: 8,
          }}
        >
          <Text style={{ flex: 1, fontSize: 12.5, color: due ? "#fca5a5" : "#fbbf24" }}>
            {due ? "🔴 DUE · " : "⏰ "}
            {contact.nextAction}
            {!!contact.nextActionDate && ` · ${contact.nextActionDate}`}
          </Text>
          <MiniButton label={t("common.done")} color={due ? "#fca5a5" : "#fbbf24"} onPress={onClearAction} />
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        {retros.length > 0 && (
          <MiniButton
            label={`${t("contacts.retros", { count: retros.length })} ${showRetros ? "▴" : "▾"}`}
            color={colors.textDim}
            onPress={() => setShowRetros((value) => !value)}
          />
        )}
        <MiniButton label={t("common.edit")} color={colors.textDim} onPress={onEdit} />
        <MiniButton label={t("common.delete")} color={colors.red} onPress={onDelete} />
      </View>

      {showRetros &&
        retros.map((retro) => (
          <View
            key={retro.id}
            style={{
              padding: 12,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#cbd5e1", flex: 1 }}>
                {retro.round || "Interview"}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textFaint }}>{retro.date}</Text>
              <MiniButton label="✕" color={colors.textFaint} onPress={() => onDeleteRetro(retro.id)} />
            </View>
            <Section label="Questions asked" text={retro.questions} />
            <Section label="Went well" text={retro.wentWell} />
            <Section label="To improve" text={retro.toImprove} />
          </View>
        ))}

      {retroFormOpen && <RetroForm onSave={onAddRetro} onCancel={onToggleRetroForm} />}
    </View>
  );
}

type RetroFormProps = { onSave: (retro: typeof EMPTY_RETRO) => void; onCancel: () => void };

function RetroForm({ onSave, onCancel }: RetroFormProps) {
  const [form, setForm] = useState({ ...EMPTY_RETRO });
  const set = (field: keyof typeof EMPTY_RETRO) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <View
      style={{
        padding: 12,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: "#6366f160",
        borderRadius: 10,
        gap: 8,
      }}
    >
      <Field label="Round">
        <TextInput
          style={inputStyle}
          value={form.round}
          onChangeText={set("round")}
          placeholder="Recruiter screen / Tech round / System design…"
          placeholderTextColor={colors.textFaint}
          autoFocus
        />
      </Field>
      <Field label="Questions they actually asked">
        <TextInput style={[inputStyle, multilineStyle]} value={form.questions} onChangeText={set("questions")} multiline />
      </Field>
      <Field label="Went well">
        <TextInput style={[inputStyle, multilineStyle]} value={form.wentWell} onChangeText={set("wentWell")} multiline />
      </Field>
      <Field label="To improve">
        <TextInput style={[inputStyle, multilineStyle]} value={form.toImprove} onChangeText={set("toImprove")} multiline />
      </Field>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <Button label={t("common.cancel")} variant="ghost" onPress={onCancel} />
        <Button label={t("contacts.saveRetro")} onPress={() => onSave(form)} />
      </View>
    </View>
  );
}

type ContactFormProps = { initial: Contact; onSave: (contact: Contact) => void; onCancel: () => void };

function ContactForm({ initial, onSave, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (field: keyof Contact) => (value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Name *">
        <TextInput style={inputStyle} value={form.name} onChangeText={set("name")} autoFocus />
      </Field>
      <Field label="Status">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {STATUSES.map((status: string) => (
            <Pill
              key={status}
              label={status}
              active={form.status === status}
              activeColor={STATUS_STYLES[status].color}
              onPress={() => set("status")(status)}
            />
          ))}
        </View>
      </Field>
      <Field label="Role / Position">
        <TextInput style={inputStyle} value={form.role} onChangeText={set("role")} />
      </Field>
      <Field label="Link">
        <TextInput
          style={inputStyle}
          value={form.link}
          onChangeText={set("link")}
          placeholder="https://…"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="url"
        />
      </Field>
      <Field label="Note">
        <TextInput style={inputStyle} value={form.note} onChangeText={set("note")} />
      </Field>
      <DateField label="Date" value={form.date} onChange={set("date")} />
      <Field label="Next action — what's the next move?">
        <TextInput
          style={inputStyle}
          value={form.nextAction}
          onChangeText={set("nextAction")}
          placeholder="Chase for feedback / send thank-you note…"
          placeholderTextColor={colors.textFaint}
        />
      </Field>
      <DateField label="Next action due" value={form.nextActionDate} onChange={set("nextActionDate")} clearable />

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Button label={t("common.cancel")} variant="ghost" onPress={onCancel} />
        <Button label={t("common.save")} onPress={() => onSave(form)} disabled={!form.name.trim()} />
      </View>
    </ScrollView>
  );
}
