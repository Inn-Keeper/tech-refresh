import { NativeTabs } from "expo-router/unstable-native-tabs";

const { Icon, Label } = NativeTabs.Trigger;

// True native tab bar (UITabBarController on iOS — Liquid Glass on current
// versions, native bottom navigation on Android) instead of JS-rendered tabs.
export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Prep</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stories">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Stories</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="board">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Arch Board</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="contacts">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Contacts</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
