"use client";

export interface Session {
  id: string;
  expires: string;
  createdAt: string;
  updatedAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceName: string | null;
  isActive: boolean;
}

interface SessionsTableProps {
  sessions: Session[];
  onRevoke?: (sessionId: string) => void;
}

export function SessionsTable({ sessions, onRevoke }: SessionsTableProps) {
  const parseUserAgent = (userAgent: string | null) => {
    if (!userAgent) return "未知设备";
    
    if (userAgent.includes("Chrome")) return "Chrome浏览器";
    if (userAgent.includes("Firefox")) return "Firefox浏览器";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari浏览器";
    if (userAgent.includes("Edge")) return "Edge浏览器";
    
    return userAgent.substring(0, 50);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                设备/浏览器
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                IP地址
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                最后活跃
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                过期时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">
                      {session.deviceName || parseUserAgent(session.userAgent)}
                    </div>
                    {session.userAgent && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {session.userAgent}
                      </div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {session.ipAddress || "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {formatDate(session.updatedAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {formatDate(session.expires)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {session.isActive ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      活跃
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                      已失效
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  {session.isActive && onRevoke && (
                    <button
                      onClick={() => onRevoke(session.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      下线
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">暂无会话数据</div>
        )}
      </div>
      {sessions.length > 0 && (
        <div className="flex justify-end">
          <button className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            下线所有其他设备
          </button>
        </div>
      )}
    </div>
  );
}

