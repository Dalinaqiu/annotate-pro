"use client";

import { useState } from "react";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  onCreate?: () => void;
  onRevoke?: (apiKeyId: string) => void;
}

export function ApiKeysTable({ apiKeys, onCreate, onRevoke }: ApiKeysTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatDate = (date: string | null) => {
    if (!date) return "永不过期";
    return new Date(date).toLocaleDateString("zh-CN");
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                API Key前缀
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                创建时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                最后使用
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                过期时间
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                  {apiKey.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono">
                      {apiKey.prefix}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${apiKey.prefix}...`, apiKey.id)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      {copiedId === apiKey.id ? "已复制" : "复制"}
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {formatDate(apiKey.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : "从未使用"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {isExpired(apiKey.expiresAt) ? (
                    <span className="text-red-600">已过期</span>
                  ) : (
                    <span className="text-slate-500">{formatDate(apiKey.expiresAt)}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  {onRevoke && (
                    <button
                      onClick={() => onRevoke(apiKey.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      撤销
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {apiKeys.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            暂无API密钥，点击上方按钮创建
          </div>
        )}
      </div>

      {/* 创建API Key对话框占位 */}
      {onCreate && (
        <div className="flex justify-end">
          <button
            onClick={onCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            创建API密钥
          </button>
        </div>
      )}
    </div>
  );
}

