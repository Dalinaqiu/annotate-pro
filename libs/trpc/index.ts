import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { Context } from "@/server/api/context";

const t = initTRPC.context<Context>().create();

// 基础router和procedure
export const router = t.router;
export const publicProcedure = t.procedure;

// 需要认证的procedure
export const protectedProcedure = t.procedure.use(async (opts) => {
  const session = opts.ctx.session;
  
  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "需要登录" });
  }
  
  return opts.next({
    ctx: {
      ...opts.ctx,
      session,
      user: session.user,
    },
  });
});

// 需要管理员权限的procedure
export const adminProcedure = protectedProcedure.use(async (opts) => {
  // TODO: 检查是否为系统管理员
  // 这里应该查询用户角色
  return opts.next();
});
