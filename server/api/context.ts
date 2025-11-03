import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export type Context = {
  session: Session | null;
};

export async function createContext(opts: { req?: Request; resHeaders?: Headers }): Promise<Context> {
  // 在fetch适配器中获取session
  // 注意：这需要从headers中提取cookies
  let session: Session | null = null;
  
  try {
    // 在Next.js的fetch适配器中，我们需要通过不同的方式获取session
    // 这里暂时返回null，实际使用时需要根据请求头获取session
    // session = await getServerSession(authOptions);
  } catch (error) {
    console.error("Error getting session:", error);
  }

  return {
    session,
  };
}

