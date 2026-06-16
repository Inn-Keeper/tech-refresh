import "driver.js/dist/driver.css";
import "./tour.css";
import { driver } from "driver.js";
import { t } from "@tech-refresh/core/i18n";

export function startTour(onNavigate: (page: string) => void) {
  const d = driver({
    animate: true,
    smoothScroll: true,
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.7,
    stagePadding: 10,
    popoverClass: "grip-tour",
    nextBtnText: t("common.next"),
    prevBtnText: t("tour.prev"),
    doneBtnText: t("tour.done"),
    steps: [
      {
        popover: {
          title: t("tour.welcomeTitle"),
          description: t("tour.welcomeBody"),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "[data-tour='nav-prep']",
        popover: {
          title: t("tour.prepTitle"),
          description: t("tour.prepBody"),
          side: "bottom",
        },
      },
      {
        element: "[data-tour='nav-stories']",
        popover: {
          title: t("tour.storiesTitle"),
          description: t("tour.storiesBody"),
          side: "bottom",
        },
      },
      {
        element: "[data-tour='nav-board']",
        popover: {
          title: t("tour.boardTitle"),
          description: t("tour.boardBody"),
          side: "bottom",
        },
      },
      {
        element: "[data-tour='nav-contacts']",
        popover: {
          title: t("tour.questTitle"),
          description: t("tour.questBody"),
          side: "bottom",
        },
      },
      {
        element: "[data-tour='nav-profile']",
        popover: {
          title: t("tour.profileTitle"),
          description: t("tour.profileBody"),
          side: "bottom",
        },
      },
      {
        element: "[data-tour='nav-about']",
        popover: {
          title: t("tour.aboutTitle"),
          description: t("tour.aboutBody"),
          side: "bottom",
          onNextClick: () => {
            d.destroy();
            onNavigate("prep");
          },
        },
      },
    ],
  });

  d.drive();
}
