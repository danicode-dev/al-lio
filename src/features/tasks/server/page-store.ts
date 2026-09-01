import "server-only";

import { cache } from "react";

import type { Store } from "@/components/store/types";
import { getAuthenticatedStudentContext } from "@/lib/auth/authenticated-student-context";
import { serializeTasks } from "@/features/tasks/server/presentation";
import { getTasksByUser } from "@/features/tasks/server/repository";

export const getTasksPageStore = cache(async (): Promise<Store> => {
  const { session, user } = await getAuthenticatedStudentContext();
  let tasks: Store["tasks"] = [];
  let taskLoadFailed = false;

  try {
    tasks = serializeTasks(await getTasksByUser(session.uid));
  } catch (error) {
    taskLoadFailed = true;
    console.error("[tasks] Failed to load the page-scoped task list", error);
  }

  const rawName = user.display_name || session.name || session.email.split("@")[0] || "Invitado";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  return {
    version: 2,
    userName,
    userEmail: session.email,
    tasks,
    techOpportunities: [],
    courses: [],
    hackathons: [],
    fpContent: [],
    roadmap: null,
    companies: [],
    loadIssues: taskLoadFailed ? ["tasks"] : [],
  };
});
