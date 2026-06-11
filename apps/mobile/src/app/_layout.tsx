import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SignIn } from "@/components/SignIn";
import { colors } from "@/theme";

const CACHE_TTL = 24 * 60 * 60 * 1000;

// Offline-first reads: the query cache is persisted to AsyncStorage, so
// contacts/stories/scores render instantly (and offline) from the last
// known state, then refetch in the background. Writes still need network.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, gcTime: CACHE_TTL } },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: CACHE_TTL }}>
        <StatusBar style="light" />
        {session === undefined && (
          <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textFaint }}>Loading…</Text>
          </View>
        )}
        {session === null && <SignIn />}
        {session && (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        )}
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
