import { useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STATUSES, isDue, todayDDMMYYYY } from "@tech-refresh/core/contacts";
import { buildFunnelSummary } from "@tech-refresh/core/funnel";
import { t } from "@tech-refresh/core/i18n";
import { useLocale } from "@/lib/useLocale";
import { api } from "@/lib/api";
import { colors, layout, tints } from "@/theme";
import { HeaderAction, Screen, ScreenHeader } from "@/components/ui";
import type { Contact } from "@tech-refresh/core/api";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ContactForm, EMPTY_CONTACT_FORM } from "@/components/contacts/ContactForm";
import { ContactsFunnel } from "@/components/contacts/ContactsFunnel";
import { EMPTY_RETRO } from "@/components/contacts/RetroForm";

export default function ContactsScreen() {
  const locale = useLocale();
  const insets = useSafeAreaInsets();
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
  const { data: stories = [] } = useQuery({ queryKey: ["stories"], queryFn: api.listStories });
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
      <Screen key={locale}>
        <ContactForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      </Screen>
    );
  }

  return (
    <Screen key={locale}>
      <ScreenHeader
        title={t("tabs.contacts")}
        subtitle={t("screen.contactsSubtitle")}
        right={<HeaderAction icon="contact" label={t("contacts.addContact")} onPress={() => setEditing({ ...EMPTY_CONTACT_FORM, date: todayDDMMYYYY() })} />}
      />
      <FlatList
        data={sorted}
        keyExtractor={(contact) => contact.id!}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + layout.tabBarClearance }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {error && <Text style={{ color: colors.dangerBright, fontSize: 13 }}>{t("contacts.loadError", { message: error.message })}</Text>}

            <ContactsFunnel summary={funnel} />

            {dueCount > 0 && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: tints.dangerSoft,
                  borderWidth: 1,
                  borderColor: `${colors.danger}60`,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: colors.dangerBright, fontSize: 13, fontWeight: "600" }}>
                  {t("contacts.dueBanner", { count: dueCount, plural: dueCount > 1 ? "s" : "" })}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 250)).springify().damping(18)}>
            <ContactCard
              contact={item}
              stories={stories}
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
