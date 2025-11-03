"use client";

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  onExport?: () => void;
}

export function AuditLogTable({ logs, onExport }: AuditLogTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; color: string }> = {
      CREATE: { label: "创建", color: "bg-green-100 text-green-800" },
      UPDATE: { label: "更新", color: "bg-blue-100 text-blue-800" },
      DELETE: { label: "删除", color: "bg-red-100 text-red-800" },
      LOGIN: { label: "登录", color: "bg-purple-100 text-purple-800" },
      LOGOUT: { label: "登出", color: "bg-slate-100 text-slate-800" },
      REVOKE: { label: "撤销", color: "bg-orange-100 text-orange-800" },
    };
    const config = actionMap[action] || { label: action, color: "bg-slate-100 text-slate-800" };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                用户
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                操作
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                资源
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                资源ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                IP地址
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                详情
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {formatDate(log.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">
                      {log.user?.name || "系统"}
                    </div>
                    <div className="text-xs text-slate-500">{log.user?.email || "-"}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{getActionBadge(log.action)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {log.resource}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 font-mono text-xs">
                  {log.resourceId || "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {log.ipAddress || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  <details className="cursor-pointer">
                    <summary className="text-blue-600 hover:text-blue-800">查看</summary>
                    <pre className="mt-2 max-w-md overflow-auto rounded bg-slate-50 p-2 text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">暂无审计日志</div>
        )}
      </div>
      {onExport && logs.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={onExport}
            className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            导出CSV
          </button>
        </div>
      )}
    </div>
  );
}

