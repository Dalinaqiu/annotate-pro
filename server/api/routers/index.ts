import { router } from "@/libs/trpc";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { sessionsRouter } from "./sessions";
import { apiKeysRouter } from "./apiKeys";
import { auditRouter } from "./audit";
import { datasetsRouter } from "./datasets";
import { tasksRouter } from "./tasks";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  sessions: sessionsRouter,
  apiKeys: apiKeysRouter,
  audit: auditRouter,
  datasets: datasetsRouter,
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
