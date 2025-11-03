import { router } from "@/libs/trpc";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { sessionsRouter } from "./sessions";
import { apiKeysRouter } from "./apiKeys";
import { auditRouter } from "./audit";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  sessions: sessionsRouter,
  apiKeys: apiKeysRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
