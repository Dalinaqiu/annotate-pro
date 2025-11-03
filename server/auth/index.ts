import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "../db";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    verifyRequest: "/login?verifyRequest=true",
  },
  providers: [
    // 邮箱密码登录
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "Two Factor Code", type: "text", required: false },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("邮箱和密码不能为空");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("用户不存在或未设置密码");
        }

        const isValidPassword = await compare(credentials.password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error("密码错误");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("账户已被禁用");
        }

        // TODO: 2FA验证逻辑

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    // Magic Link邮箱登录
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "noreply@annotatepro.com",
      maxAge: 24 * 60 * 60, // 24小时
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      
      // 刷新session时更新token
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // 记录登录审计日志
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: isNewUser ? "SIGNUP" : "LOGIN",
          resource: "User",
          resourceId: user.id,
          details: {
            provider: account?.provider,
            isNewUser,
          },
        },
      });
    },
    async signOut({ token }) {
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: "LOGOUT",
            resource: "User",
          },
        });
      }
    },
  },
};

// 密码加密工具函数
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

// 生成API Key
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `ap_${randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 8);
  return {
    key,
    hash: key, // TODO: 应该使用hash存储
    prefix,
  };
}

// 角色权限检查
export enum Role {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  PROJECT_ADMIN = "PROJECT_ADMIN",
  ANNOTATOR = "ANNOTATOR",
  REVIEWER = "REVIEWER",
  GUEST = "GUEST",
}

export enum Permission {
  // 用户管理
  USER_CREATE = "USER_CREATE",
  USER_UPDATE = "USER_UPDATE",
  USER_DELETE = "USER_DELETE",
  USER_VIEW = "USER_VIEW",
  
  // 项目管理
  PROJECT_CREATE = "PROJECT_CREATE",
  PROJECT_UPDATE = "PROJECT_UPDATE",
  PROJECT_DELETE = "PROJECT_DELETE",
  PROJECT_VIEW = "PROJECT_VIEW",
  
  // 任务管理
  TASK_CREATE = "TASK_CREATE",
  TASK_ASSIGN = "TASK_ASSIGN",
  TASK_ANNOTATE = "TASK_ANNOTATE",
  TASK_REVIEW = "TASK_REVIEW",
  
  // 系统管理
  SYSTEM_SETTINGS = "SYSTEM_SETTINGS",
  AUDIT_VIEW = "AUDIT_VIEW",
}

// 角色默认权限映射
export const rolePermissions: Record<Role, Permission[]> = {
  [Role.SYSTEM_ADMIN]: Object.values(Permission),
  [Role.ORG_ADMIN]: [
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_VIEW,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_VIEW,
    Permission.TASK_CREATE,
    Permission.TASK_ASSIGN,
  ],
  [Role.PROJECT_ADMIN]: [
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_VIEW,
    Permission.TASK_CREATE,
    Permission.TASK_ASSIGN,
    Permission.TASK_REVIEW,
  ],
  [Role.ANNOTATOR]: [
    Permission.PROJECT_VIEW,
    Permission.TASK_ANNOTATE,
  ],
  [Role.REVIEWER]: [
    Permission.PROJECT_VIEW,
    Permission.TASK_REVIEW,
  ],
  [Role.GUEST]: [
    Permission.PROJECT_VIEW,
  ],
};

// 权限检查辅助函数
export async function hasPermission(
  userId: string,
  permission: Permission,
  resourceId?: string
): Promise<boolean> {
  // TODO: 实现基于项目和资源的权限检查
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { role: true },
      },
    },
  });

  if (!user) return false;

  // 检查用户在所有项目中的角色权限
  for (const membership of user.memberships) {
    const permissions = membership.role.permissions as Permission[];
    if (permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}
