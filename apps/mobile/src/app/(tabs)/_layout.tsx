import { NativeTabs } from "expo-router/unstable-native-tabs";
import { t } from "@tech-refresh/core/i18n";
import { useTabBarHidden } from "@/lib/uiStore";

const { Icon, Label } = NativeTabs.Trigger;

// True native tab bar (UITabBarController on iOS — Liquid Glass on current
// versions, native bottom navigation on Android) instead of JS-rendered tabs.
// The Arch Board's zen mode hides it for an edge-to-edge canvas.
export default function TabLayout() {
  const hidden = useTabBarHidden();

  return (
    <NativeTabs hidden={hidden}>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>{t("tabs.prep")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stories">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>{t("tabs.stories")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="board">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>{t("tabs.board")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="contacts">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>{t("tabs.contacts")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
