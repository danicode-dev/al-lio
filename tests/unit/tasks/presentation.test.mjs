import assert from "node:assert/strict";
import test from "node:test";

import { serializeTasks } from "../../../src/features/tasks/server/presentation.ts";

test("serializeTasks preserves the Tasks client contract for page-scoped loading (issue #332)", () => {
  const [task] = serializeTasks([{
    id: "task-1",
    user_id: "user-1",
    title: "Prepare release",
    description: null,
    category: null,
    status: "pendiente",
    priority: null,
    due_date: "2026-09-12T15:00:00.000Z",
    completed_at: null,
    progress_notes: null,
    reminder_at: "2026-09-11T08:30:00.000Z",
    related_type: null,
    related_id: null,
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T10:00:00.000Z",
  }]);

  assert.equal(task.due_at, "2026-09-12");
  assert.equal(task.due_date, "2026-09-12");
  assert.equal(task.category, "diario");
  assert.equal(task.priority, "media");
  assert.deepEqual(task.progress_notes, []);
  assert.equal(task.reminder_at, "2026-09-11T08:30:00.000Z");
  assert.equal(task.completed_at, "");
  assert.equal(task.updated_at, "2026-09-01T10:00:00.000Z");
});
