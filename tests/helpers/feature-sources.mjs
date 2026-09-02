import { readFile } from "node:fs/promises";

const featureFiles = {
  work: ["work/client/work-feature.tsx"],
  tasks: ["tasks/client/tasks-view.tsx"],
  courses: [
    "courses/client/course-catalogue-model.ts",
    "courses/client/courses-filter-controls.tsx",
    "courses/client/courses-catalogue.tsx",
    "courses/client/courses-feature.tsx",
    "courses/client/course-detail-view.tsx",
  ],
  events: [
    // events-feature.tsx first so `function Hackathons(` / `HackathonDetailView`
    // slice anchors resolve inside it; the pure model is concatenated last so it
    // never lands inside a `CourseDetailView` -> `function Hackathons(` slice.
    "events/client/events-feature.tsx",
    "events/client/events-filter-controls.tsx",
    "events/client/event-catalogue-model.ts",
  ],
  calendar: ["calendar/client/calendar-feature.tsx"],
  resources: ["resources/client/sources-feature.tsx"],
  settings: ["settings/client/settings-feature.tsx"],
  bloc: [
    "bloc/client/bloc-notepad.tsx",
    "bloc/client/bloc-editor-toolbar.tsx",
    "bloc/client/bloc-note-list.tsx",
    "bloc/client/bloc-note-menus.tsx",
    "bloc/client/bloc-editor-helpers.ts",
    "bloc/client/bloc-export.ts",
    "bloc/client/bloc-persistence.ts",
    "bloc/client/bloc-types.ts",
    "bloc/client/bloc-feature.tsx",
  ],
};

export async function readFeatureSource(...features) {
  const files = features.flatMap((feature) => featureFiles[feature] ?? []);
  return (await Promise.all(
    files.map((file) => readFile(new URL(`../../src/features/${file}`, import.meta.url), "utf8")),
  )).join("\n\n");
}

export function readProductFeatureSources() {
  return readFeatureSource("work", "tasks", "courses", "events", "calendar", "resources", "settings", "bloc");
}
