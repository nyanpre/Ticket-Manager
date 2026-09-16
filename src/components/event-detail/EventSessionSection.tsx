import type { EventSession, Application, MemberDemand, GroupMember } from '../../types';

interface Props {
  sessions: EventSession[];
  applications: Application[];
  demands: MemberDemand[];
  members: GroupMember[];
  currentUserId?: string;
  onToggleDemand: (sessionId: string) => void;
}

export function EventSessionSection({
  sessions,
  applications,
  demands,
  members,
  currentUserId,
  onToggleDemand,
}: Props) {
  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || '未登録';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">チケット照合</span>
        <span className="text-[10px] text-slate-400">希望 vs 当選枚数</span>
      </div>

      {sessions.map((sess) => {
        const sessionDemands = demands.filter((d) => d.session_id === sess.id);
        const sessionApps = applications.filter((a) => a.session_id === sess.id);

        const wonCount = sessionApps
          .filter((a) => a.status === 'won')
          .reduce((sum, a) => sum + a.ticket_count, 0);

        const pendingCount = sessionApps
          .filter((a) => a.status === 'pending')
          .reduce((sum, a) => sum + a.ticket_count, 0);

        const isMyDemand = demands.some((d) => d.session_id === sess.id && d.user_id === currentUserId);
        const diff = wonCount - sessionDemands.length;

        return (
          <div key={sess.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">{sess.name}</span>
                <span className="text-[11px] text-slate-400 ml-2">
                  希望: <strong>{sessionDemands.length}人</strong>
                </span>
              </div>
              <button
                onClick={() => onToggleDemand(sess.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  isMyDemand ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {isMyDemand ? '✓ 希望済' : '参加希望'}
              </button>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">当選 {wonCount}枚</span>
                  {pendingCount > 0 && (
                    <span className="text-amber-600 font-semibold">(待機 {pendingCount}枚)</span>
                  )}
                </div>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    diff === 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : diff > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {diff === 0 ? '過不足なし' : diff > 0 ? `${diff}枚 余剰` : `${Math.abs(diff)}枚 不足`}
                </span>
              </div>

              {sessionDemands.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                  {sessionDemands.map((d) => (
                    <span
                      key={d.id}
                      className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                    >
                      {getMemberName(d.user_id)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}