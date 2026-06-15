import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RANKS, rankForXp } from "@tech-refresh/core/gamification";
import { colors, layout } from "@tech-refresh/core/tokens";
import { EMPTY_PROFILE_FORM, PROFILE_FIELDS, profileFormToUpdate, profileToForm } from "@tech-refresh/core/user";
import { friendlyAuthError } from "@tech-refresh/core/auth";
import * as api from "./api";
import { supabase } from "./supabase";
import { poeVisibleByDefault, setPoeAssistantVisible } from "./poeAssistantUtils";
import { ProfileAside } from "./profile/ProfileAside";
import { ProfileFormSection } from "./profile/ProfileFormSection";
import {
  githubAccountIdFromIdentity,
  githubAccountIdFromMetadata,
  githubUrlFromIdentity,
  githubUrlFromMetadata,
} from "./profile/githubUtils";
import type { ProfileForm } from "./profile/types";

const GITHUB_LINK_PENDING_KEY = "grip.githubLinkPending";
const GITHUB_LINKED_KEY = "grip.githubLinked";

type ProfileProps = {
  githubLinked?: boolean;
  onGitHubLinkedSeen?: () => void;
  onSignOut?: () => void;
};

export default function Profile({ githubLinked = false, onGitHubLinkedSeen, onSignOut }: ProfileProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM as ProfileForm);
  const [linkedInThisSession, setLinkedInThisSession] = useState(
    () => githubLinked || window.localStorage.getItem(GITHUB_LINKED_KEY) === "1"
  );
  const [poeVisible, setPoeVisible] = useState(poeVisibleByDefault);

  const { data: profile = null, error: loadError, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getUser,
  });
  const { data: identities = [], error: identitiesError } = useQuery({
    queryKey: ["auth-identities"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      return data.identities ?? [];
    },
  });
  const { data: authUser = null, error: authUserError } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const { data: githubViewerUrl = "", error: githubViewerError } = useQuery({
    queryKey: ["github-viewer-url", githubLinked],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.provider_token;
      if (!token) return "";
      const response = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return "";
      const viewer = await response.json();
      return typeof viewer.html_url === "string" ? viewer.html_url : "";
    },
    enabled: githubLinked,
    retry: false,
    staleTime: 1000 * 60 * 15,
  });

  const authProviders = authUser?.app_metadata?.providers ?? [];
  const authIdentities = authUser?.identities ?? [];
  const githubIdentity = [...identities, ...authIdentities].find((identity) => identity.provider === "github");
  const githubAccountId = githubAccountIdFromIdentity(githubIdentity) || githubAccountIdFromMetadata(authUser?.user_metadata);

  const { data: githubPublicUrl = "", error: githubPublicError } = useQuery({
    queryKey: ["github-public-url", githubAccountId],
    queryFn: async () => {
      if (!githubAccountId) return "";
      const response = await fetch(`https://api.github.com/user/${encodeURIComponent(githubAccountId)}`);
      if (!response.ok) return "";
      const user = await response.json();
      return typeof user.html_url === "string" ? user.html_url : "";
    },
    enabled: !!githubAccountId,
    retry: false,
    staleTime: 1000 * 60 * 60,
  });

  const saveMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });
  const saveGithubUrlMutation = useMutation({
    mutationFn: (githubUrl: string) => api.updateProfile({ githubUrl }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["github-techs"] });
    },
  });
  const githubPrepMutation = useMutation({
    mutationFn: (useGithubTechsForPrep: boolean) => api.updateProfile({ useGithubTechsForPrep }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["github-techs"] });
    },
  });
  const resetMutation = useMutation({
    mutationFn: api.resetScores,
    onSuccess: () => {
      queryClient.setQueryData(["scores"], { xp: 0, answers: {} });
      if (profile) queryClient.setQueryData(["profile"], { ...profile, xp: 0 });
      queryClient.invalidateQueries({ queryKey: ["accuracy-timeline"] });
    },
  });
  const linkGitHubMutation = useMutation({
    mutationFn: async () => {
      window.localStorage.setItem(GITHUB_LINK_PENDING_KEY, "1");
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/?linked=github`, skipBrowserRedirect: true },
      });
      if (error) {
        window.localStorage.removeItem(GITHUB_LINK_PENDING_KEY);
        throw new Error(friendlyAuthError(error.message));
      }
      if (data?.url) window.location.assign(data.url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-identities"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const githubUrl =
    profile?.githubUrl ||
    githubUrlFromIdentity(githubIdentity) ||
    githubUrlFromMetadata(authUser?.user_metadata) ||
    githubViewerUrl ||
    githubPublicUrl;
  const githubConnected = linkedInThisSession || authProviders.includes("github") || !!githubIdentity;

  useEffect(() => {
    if (!profile) return;
    const next = profileToForm(profile) as ProfileForm;
    if (!next.githubUrl && githubUrl) next.githubUrl = githubUrl;
    setForm(next);
  }, [githubUrl, profile]);

  useEffect(() => {
    if (!profile || profile.githubUrl || !githubUrl || saveGithubUrlMutation.isPending) return;
    saveGithubUrlMutation.mutate(githubUrl);
  }, [githubUrl, profile, saveGithubUrlMutation]);

  useEffect(() => {
    if (!githubLinked) return;
    setLinkedInThisSession(true);
    const timeout = window.setTimeout(() => onGitHubLinkedSeen?.(), 4000);
    return () => window.clearTimeout(timeout);
  }, [githubLinked, onGitHubLinkedSeen]);

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const rank = rankForXp(profile?.xp ?? 0) ?? RANKS[0]!;
  const next = RANKS.find((item) => item.min > rank.min);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    saveMutation.mutate(profileFormToUpdate(form));
  };
  const resetScores = () => {
    if (!window.confirm("Reset all XP and answer history? This cannot be undone.")) return;
    resetMutation.mutate();
  };
  const updatePoeVisibility = (checked: boolean) => {
    setPoeVisible(checked);
    setPoeAssistantVisible(checked);
  };
  const error = (loadError ||
    identitiesError ||
    authUserError ||
    githubViewerError ||
    githubPublicError ||
    saveMutation.error ||
    saveGithubUrlMutation.error ||
    githubPrepMutation.error ||
    resetMutation.error ||
    linkGitHubMutation.error) as Error | null;
  const completionItems = PROFILE_FIELDS.filter((field) => (form[field.key] ?? "").trim()).length;
  const completionPct = Math.round((completionItems / PROFILE_FIELDS.length) * 100);

  return (
    <main
      style={{
        minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        background: colors.bg,
      }}
    >
      <ProfileAside
        completionItems={completionItems}
        completionPct={completionPct}
        form={form}
        githubConnected={githubConnected}
        githubPrepPending={githubPrepMutation.isPending}
        linkPending={linkGitHubMutation.isPending}
        next={next}
        onGithubPrepChange={(checked) => githubPrepMutation.mutate(checked)}
        onLinkGitHub={() => linkGitHubMutation.mutate()}
        onPoeVisibilityChange={updatePoeVisibility}
        onResetScores={resetScores}
        onSignOut={onSignOut}
        poeVisible={poeVisible}
        profile={profile}
        rank={rank}
        resetPending={resetMutation.isPending}
        resetSuccess={resetMutation.isSuccess}
      />
      <ProfileFormSection
        error={error}
        form={form}
        githubLinked={githubLinked}
        isLoading={isLoading}
        onSave={save}
        onSetField={set}
        profile={profile}
        savePending={saveMutation.isPending}
        saveSuccess={saveMutation.isSuccess}
      />
    </main>
  );
}
