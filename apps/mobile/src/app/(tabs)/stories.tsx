import { useState } from "react";
import { Alert, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { COMPETENCIES, COMPETENCY_COLORS, PROMPTS } from "@tech-refresh/core/stories";
import { t } from "@tech-refresh/core/i18n";
import { api } from "@/lib/api";
import { colors } from "@/theme";
import { Badge, Button, Field, MiniButton, Pill, Screen, Section, inputStyle, multilineStyle } from "@/components/ui";
import type { Story } from "@tech-refresh/core/api";

const EMPTY_FORM: Story = { title: "", competency: "Conflict", situation: "", task: "", action: "", result: "" };

export default function StoriesScreen() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"stories" | "drill">("stories");
  const [editing, setEditing] = useState<Story | null>(null);

  const { data: stories, error } = useQuery<Story[]>({ queryKey: ["stories"], queryFn: api.listStories });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stories"] });
  const saveMutation = useMutation({ mutationFn: api.upsertStory, onSettled: invalidate });
  const deleteMutation = useMutation({ mutationFn: api.deleteStory, onSettled: invalidate });

  const confirmDelete = (story: Story) =>
    Alert.alert(t("stories.deleteTitle"), t("stories.deleteMessage", { title: story.title }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteMutation.mutate(story.id) },
    ]);

  const handleSave = (form: Story) => {
    if (form.title.trim()) saveMutation.mutate(form);
    setEditing(null);
  };

  if (editing) {
    return (
      <Screen>
        <StoryForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={mode === "stories" ? (stories ?? []) : []}
        keyExtractor={(story) => story.id!}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pill label={t("stories.myStories")} active={mode === "stories"} onPress={() => setMode("stories")} />
              <Pill label={t("stories.drillPrompts")} active={mode === "drill"} onPress={() => setMode("drill")} />
            </View>

            {error && <Text style={{ color: "#fca5a5", fontSize: 13 }}>{t("stories.loadError", { message: error.message })}</Text>}

            {mode === "stories" ? (
              <TouchableOpacity
                onPress={() => setEditing(EMPTY_FORM)}
                style={{
                  padding: 12,
                  backgroundColor: "#6366f125",
                  borderWidth: 1,
                  borderColor: "#6366f160",
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#a5b4fc", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                  + Add story
                </Text>
              </TouchableOpacity>
            ) : (
              <PromptDrill stories={stories ?? []} />
            )}

            {mode === "stories" && stories?.length === 0 && (
              <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center", marginTop: 16 }}>
                {t("stories.empty")}
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 250)).springify().damping(18)}>
            <StoryCard story={item} onEdit={() => setEditing(item)} onDelete={() => confirmDelete(item)} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

type StoryCardProps = { story: Story; onEdit?: () => void; onDelete?: () => void };

function StoryCard({ story, onEdit, onDelete }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = COMPETENCY_COLORS[story.competency] ?? colors.textFaint;

  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: `${color}30`, borderRadius: 14, padding: 16 }}>
      <TouchableOpacity
        onPress={() => setExpanded((value) => !value)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Badge label={story.competency} color={color} />
        <Text style={{ flex: 1, color: colors.textBright, fontSize: 14, fontWeight: "600" }}>{story.title}</Text>
        <Text style={{ color: colors.textFaint, fontSize: 12 }}>{expanded ? "▴" : "▾"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Section label="Situation" text={story.situation} />
          <Section label="Task" text={story.task} />
          <Section label="Action" text={story.action} />
          <Section label="Result" text={story.result} />
          {onEdit && onDelete && (
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
              <MiniButton label={t("common.edit")} color={colors.textDim} onPress={onEdit} />
              <MiniButton label={t("common.delete")} color={colors.red} onPress={onDelete} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

type StoryFormProps = { initial: Story; onSave: (story: Story) => void; onCancel: () => void };

function StoryForm({ initial, onSave, onCancel }: StoryFormProps) {
  const [form, setForm] = useState({ ...initial });
  const set = (field: keyof Story) => (value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Title *">
        <TextInput style={inputStyle} value={form.title} onChangeText={set("title")} autoFocus />
      </Field>
      <Field label="Competency">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {COMPETENCIES.map((competency: string) => (
            <Pill
              key={competency}
              label={competency}
              active={form.competency === competency}
              activeColor={COMPETENCY_COLORS[competency]}
              onPress={() => set("competency")(competency)}
            />
          ))}
        </View>
      </Field>
      <Field label="Situation — context, stakes, who was involved">
        <TextInput style={[inputStyle, multilineStyle]} value={form.situation} onChangeText={set("situation")} multiline />
      </Field>
      <Field label="Task — what was YOUR responsibility">
        <TextInput style={[inputStyle, multilineStyle]} value={form.task} onChangeText={set("task")} multiline />
      </Field>
      <Field label="Action — what you specifically did (the longest part)">
        <TextInput style={[inputStyle, multilineStyle]} value={form.action} onChangeText={set("action")} multiline />
      </Field>
      <Field label="Result — outcome with numbers, and what you learned">
        <TextInput style={[inputStyle, multilineStyle]} value={form.result} onChangeText={set("result")} multiline />
      </Field>

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <Button label={t("common.cancel")} variant="ghost" onPress={onCancel} />
        <Button label={t("common.save")} onPress={() => onSave(form)} disabled={!form.title.trim()} />
      </View>
    </ScrollView>
  );
}

function PromptDrill({ stories }: { stories: Story[] }) {
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [revealed, setRevealed] = useState(false);

  const prompt = PROMPTS[promptIndex];
  const matching = stories.filter((story) => story.competency === prompt.competency);

  const nextPrompt = () => {
    let next = Math.floor(Math.random() * PROMPTS.length);
    if (next === promptIndex) next = (next + 1) % PROMPTS.length;
    setPromptIndex(next);
    setRevealed(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <Animated.View
        key={promptIndex}
        entering={FadeInDown.springify().damping(16)}
        style={{
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 20,
          alignItems: "center",
          gap: 10,
        }}
      >
        <Badge label={prompt.competency} color={COMPETENCY_COLORS[prompt.competency]} />
        <Text style={{ color: colors.textBright, fontSize: 16, fontWeight: "600", lineHeight: 23, textAlign: "center" }}>
          "{prompt.text}"
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: 12, textAlign: "center" }}>
          Answer out loud — aim for 90 seconds.
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label={t("stories.reveal")} onPress={() => setRevealed(true)} disabled={revealed} />
          <Button label={t("stories.nextPrompt")} variant="ghost" onPress={nextPrompt} />
        </View>
      </Animated.View>

      {revealed &&
        (matching.length === 0 ? (
          <Text style={{ color: "#fbbf24", fontSize: 13, textAlign: "center" }}>
            {t("stories.noStoryFor", { competency: prompt.competency })}
          </Text>
        ) : (
          matching.map((story) => <StoryCard key={story.id} story={story} />)
        ))}
    </View>
  );
}
