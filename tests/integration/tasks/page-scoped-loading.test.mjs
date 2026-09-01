// Source-level assertion rationale: the route-group and React-cache boundary
// requires a live Next.js request plus PostgreSQL to execute. These assertions
// pin the composition and forbidden dependencies; the serializer itself runs
// directly in the accompanying unit test.
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("Tasks uses a page-scoped authenticated store without loading unrelated dashboard data (issue #332)", async () => {
  const [tasksLayout, tasksLoading, dashboardLayout, sharedLayout, pageStore, globalStore, tasksView] = await Promise.all([
    readFile(new URL("../../../src/app/(tasks)/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/app/(tasks)/loading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/private-app-layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/features/tasks/server/page-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../src/lib/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../src/features/tasks/client/tasks-view.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(tasksLayout, /<PrivateAppLayout loadStore=\{getTasksPageStore\}>/);
  assert.match(tasksLoading, /TasksLoading/);
  assert.match(dashboardLayout, /<PrivateAppLayout loadStore=\{getGlobalStore\}>/);
  assert.match(sharedLayout, /<ApplicationStoreProvider initialStore=\{store\}>/);
  assert.equal((sharedLayout.match(/<ApplicationStoreProvider\b/g) ?? []).length, 1);

  assert.match(pageStore, /getAuthenticatedStudentContext\(\)/);
  assert.match(pageStore, /getTasksByUser\(session\.uid\)/);
  assert.match(pageStore, /serializeTasks\(await getTasksByUser/);
  for (const unrelatedLoader of [
    "getGlobalStore",
    "getCoursesByUser",
    "getHackathonsByUser",
    "getAllTechOpportunities",
    "getFpContentForProfile",
    "getLearningOverview",
  ]) {
    assert.doesNotMatch(pageStore, new RegExp(`\\b${unrelatedLoader}\\b`));
  }

  assert.match(pageStore, /console\.error\("\[tasks\] Failed to load the page-scoped task list"/);
  assert.match(pageStore, /loadIssues: taskLoadFailed \? \["tasks"\] : \[\]/);
  assert.match(pageStore, /techOpportunities: \[\]/);
  assert.match(pageStore, /courses: \[\]/);
  assert.match(pageStore, /hackathons: \[\]/);
  assert.match(pageStore, /fpContent: \[\]/);
  assert.match(pageStore, /roadmap: null/);
  assert.match(pageStore, /companies: \[\]/);

  assert.match(globalStore, /import \{ serializeTasks \} from "@\/features\/tasks\/server\/presentation"/);
  assert.doesNotMatch(tasksView, /tasksLoaded = store\.tasks\.length/, "an empty server-loaded task list must still consume a task deep link");

  await assert.rejects(
    access(new URL("../../../src/app/(dashboard)/tasks/page.tsx", import.meta.url)),
    /ENOENT/,
    "the global-store route group must no longer own /tasks",
  );
});
