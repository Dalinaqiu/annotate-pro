"use client";

import { useState } from "react";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  twoFactorEnabled: boolean;
  createdAt: string;
  _count: {
    sessions: number;
    apiKeys: number;
  };
}

interface UsersTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  const getStatusBadge = (status: User["status"]) => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-800",
      INACTIVE: "bg-slate-100 text-slate-800",
      SUSPENDED: "bg-red-100 text-red-800",
      PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
    };
    const labels = {
      ACTIVE: "活跃",
      INACTIVE: "未激活",
      SUSPENDED: "已暂停",
      PENDING_VERIFICATION: "待验证",
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              用户
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              2FA
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              会话数
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              API密钥
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              创建时间
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-700">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0">
                    {user.image ? (
                      <img className="h-10 w-10 rounded-full" src={user.image} alt={user.name || ""} />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300">
                        <span className="text-sm font-medium text-slate-700">
                          {(user.name || user.email)[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-slate-900">{user.name || "未设置"}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                {getStatusBadge(user.status)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                {user.twoFactorEnabled ? (
                  <span className="text-green-600">已启用</span>
                ) : (
                  <span className="text-slate-400">未启用</span>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                {user._count.sessions}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                {user._count.apiKeys}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                {new Date(user.createdAt).toLocaleDateString("zh-CN")}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      编辑
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-500">暂无用户数据</div>
      )}
    </div>
  );
}

