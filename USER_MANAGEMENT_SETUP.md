# 用户管理模块设置指南

本文档说明如何设置和使用AnnotatePro的用户管理模块。

## 📋 前置要求

- Node.js 18+
- PostgreSQL 数据库
- pnpm（推荐）或 npm

## 🚀 安装步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件，添加以下配置：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/annotatepro"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # 使用 openssl rand -base64 32 生成

# OAuth (可选)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# 邮箱配置 (Magic Link需要)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="noreply@annotatepro.com"
```

### 3. 初始化数据库

```bash
# 生成Prisma客户端
pnpm db:generate

# 推送Schema到数据库
pnpm db:push

# 或者使用迁移
pnpm db:migrate
```

### 4. 初始化角色数据

在数据库中手动创建初始角色，或运行以下SQL：

```sql
INSERT INTO roles (id, name, "displayName", description, permissions) VALUES
  ('role_system_admin', 'SYSTEM_ADMIN', '系统管理员', '拥有所有权限', '[]'),
  ('role_org_admin', 'ORG_ADMIN', '组织管理员', '管理组织内项目与成员', '[]'),
  ('role_project_admin', 'PROJECT_ADMIN', '项目管理员', '管理项目配置与任务', '[]'),
  ('role_annotator', 'ANNOTATOR', '标注员', '执行标注任务', '[]'),
  ('role_reviewer', 'REVIEWER', '审核员', '质量审核与修改', '[]'),
  ('role_guest', 'GUEST', '访客', '只读访问', '[]');
```

### 5. 启动开发服务器

```bash
pnpm dev
```

## 📁 文件结构

```
├── prisma/
│   └── schema.prisma          # 数据库Schema定义
├── server/
│   ├── auth/
│   │   └── index.ts           # NextAuth配置和权限工具
│   ├── api/
│   │   ├── context.ts         # tRPC上下文
│   │   └── routers/
│   │       ├── auth.ts        # 认证相关API
│   │       ├── users.ts       # 用户管理API
│   │       ├── sessions.ts    # 会话管理API
│   │       ├── apiKeys.ts     # API密钥管理API
│   │       ├── audit.ts       # 审计日志API
│   │       └── index.ts       # Router聚合
│   └── db/
│       └── index.ts           # Prisma客户端
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts       # NextAuth API路由
│   │   └── trpc/[trpc]/
│   │       └── route.ts       # tRPC API路由
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx       # 登录页面
│   │   └── register/
│   │       └── page.tsx       # 注册页面
│   └── (admin)/
│       └── admin/
│           └── page.tsx       # 管理后台页面
├── components/
│   └── admin/
│       ├── UsersTable.tsx     # 用户列表组件
│       ├── SessionsTable.tsx  # 会话列表组件
│       ├── ApiKeysTable.tsx   # API密钥列表组件
│       └── AuditLogTable.tsx  # 审计日志组件
└── libs/
    └── trpc/
        └── index.ts           # tRPC工具函数
```

## 🔐 功能说明

### 身份认证

1. **邮箱密码登录**：支持邮箱和密码登录
2. **OAuth登录**：支持Google和GitHub OAuth登录
3. **Magic Link**：通过邮箱发送登录链接，24小时有效
4. **2FA**：双因素认证（代码框架已准备，待完善）

### 用户管理

- 用户列表：查看所有用户，支持搜索和状态筛选
- 创建用户：管理员可以创建新用户
- 编辑用户：更新用户信息和状态
- 删除用户：删除用户账户（不能删除自己）

### 会话管理

- 查看所有活跃会话
- 显示设备信息、IP地址、最后活跃时间
- 支持单个会话下线
- 支持一键下线所有其他设备

### API密钥管理

- 创建API密钥：支持命名和设置过期时间
- 查看所有API密钥
- 撤销API密钥
- 显示最后使用时间

### 审计日志

- 记录所有用户操作
- 支持按用户、操作类型、资源类型筛选
- 支持按时间范围筛选
- 支持导出CSV格式

## 🔧 权限系统

### 角色定义

- **SYSTEM_ADMIN**：系统管理员，拥有所有权限
- **ORG_ADMIN**：组织管理员，管理组织内项目与成员
- **PROJECT_ADMIN**：项目管理员，管理项目配置与任务
- **ANNOTATOR**：标注员，执行标注任务
- **REVIEWER**：审核员，质量审核与修改
- **GUEST**：访客，只读访问

### 权限检查

使用 `hasPermission` 函数检查用户权限：

```typescript
import { hasPermission, Permission } from "@/server/auth";

const canCreate = await hasPermission(userId, Permission.USER_CREATE);
```

## 📝 待完善功能

以下功能已提供代码框架，需要进一步完善：

1. **2FA双因素认证**：需要集成TOTP库（如speakeasy）
2. **邮箱验证**：注册后发送验证邮件
3. **密码重置**：完整的密码重置流程
4. **tRPC客户端集成**：前端需要使用tRPC客户端调用API
5. **角色分配界面**：用户角色分配的UI
6. **权限管理界面**：可视化的权限配置界面

## 🐛 已知问题

1. 注册API调用路径需要根据实际tRPC客户端配置调整
2. 前端组件需要集成tRPC客户端才能正常工作
3. 部分功能需要实际的环境变量配置（如邮箱、OAuth）

## 📚 相关文档

- [NextAuth.js文档](https://next-auth.js.org/)
- [tRPC文档](https://trpc.io/)
- [Prisma文档](https://www.prisma.io/docs)

