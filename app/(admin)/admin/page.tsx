"use client";

import { useState } from "react";

type Tab = "users" | "sessions" | "apiKeys" | "audit";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  return (
    <main className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">系统设置</h1>
        <p className="text-sm text-slate-600">
          用户管理、会话管理、API密钥和审计日志
        </p>
      </header>

      {/* Tab导航 */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {(["users", "sessions", "apiKeys", "audit"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "users" && "用户管理"}
              {tab === "sessions" && "会话管理"}
              {tab === "apiKeys" && "API密钥"}
              {tab === "audit" && "审计日志"}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab内容 */}
      <div className="mt-6">
        {activeTab === "users" && <UsersTab />}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "apiKeys" && <ApiKeysTab />}
        {activeTab === "audit" && <AuditTab />}
      </div>
    </main>
  );
}

// 用户管理Tab
function UsersTab() {
  // TODO: 使用tRPC获取用户列表
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">用户列表</h2>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          创建用户
        </button>
      </div>
      <div className="rounded-lg border bg-white">
        <p className="p-4 text-sm text-slate-500">
          用户列表功能需要集成tRPC客户端才能显示
        </p>
      </div>
    </div>
  );
}

// 会话管理Tab
function SessionsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">活跃会话</h2>
      <div className="rounded-lg border bg-white">
        <p className="p-4 text-sm text-slate-500">
          会话管理功能需要集成tRPC客户端才能显示
        </p>
      </div>
    </div>
  );
}

// API密钥Tab
function ApiKeysTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">API密钥</h2>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          创建API密钥
        </button>
      </div>
      <div className="rounded-lg border bg-white">
        <p className="p-4 text-sm text-slate-500">
          API密钥管理功能需要集成tRPC客户端才能显示
        </p>
      </div>
    </div>
  );
}

// 审计日志Tab
function AuditTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">审计日志</h2>
        <button className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          导出CSV
        </button>
      </div>
      <div className="rounded-lg border bg-white">
        <p className="p-4 text-sm text-slate-500">
          审计日志功能需要集成tRPC客户端才能显示
        </p>
      </div>
    </div>
  );
}
