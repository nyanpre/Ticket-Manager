import { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { EventSession, Application, MemberDemand, GroupMember } from '../../types/index';

interface Props {
  sessions: EventSession[];
  applications: Application[];
  demands: MemberDemand[];
  members: GroupMember[];
  currentUserId?: string;
  onToggleDemand: (sessionId: string, targetUserId?: string) => void;
}

export function EventSessionSection({
  sessions,
  applications,
  demands,
  members,
  currentUserId,
  onToggleDemand,
}: Props) {
  const [selectedGuestMap, setSelectedGuestMap] = useState<Record<string, string>>({});
  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || '未登録';

  const guestMembers = members.filter((m) => m.is_guest || m.user_id.startsWith('guest_'));

  return (
    <div className="space-y-2.5 font-['Noto_Sans_JP']">
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
              
              {/* 自分の参加希望トグル */}
              <button
                onClick={() => onToggleDemand(sess.id, currentUserId)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                  isMyDemand ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {isMyDemand ? '✓ 希望済' : '自分の希望'}
              </button>
            </div>

            {/* ゲストの参加希望代理登録 */}
            {guestMembers.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <select
                  value={selectedGuestMap[sess.id] || ''}
                  onChange={(e) => setSelectedGuestMap({ ...selectedGuestMap, [sess.id]: e.target.value })}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 focus:outline-none"
                >
                  <option value="">ゲストの希望を追加...</option>
                  {guestMembers.map((g) => {
                    const alreadyDemanded = sessionDemands.some((d) => d.user_id === g.user_id);
                    return (
                      <option key={g.id} value={g.user_id} disabled={alreadyDemanded}>
                        {g.display_name} {alreadyDemanded ? '(希望済)' : ''}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  disabled={!selectedGuestMap[sess.id]}
                  onClick={() => {
                    if (!selectedGuestMap[sess.id]) return;
                    onToggleDemand(sess.id, selectedGuestMap[sess.id]);
                    setSelectedGuestMap({ ...selectedGuestMap, [sess.id]: '' });
                  }}
                  className="px-2 py-1 bg-indigo-50 active:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-[10px] disabled:opacity-40 cursor-pointer"
                >
                  反映
                </button>
              </div>
            )}

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
                  {sessionDemands.map((d) => {
                    const member = members.find((m) => m.user_id === d.user_id);
                    const isGuest = member?.is_guest || member?.user_id.startsWith('guest_');

                    // 該当メンバーの申込状況を取得
                    const userApps = sessionApps.filter(
                      (a) => a.applicant_user_id === d.user_id
                    );

                    // ステータス判定（当選 > 待機 > 落選 > 未提出）
                    let statusType: 'won' | 'pending' | 'lost' | 'unsubmitted' = 'unsubmitted';
                    if (userApps.length > 0) {
                      if (userApps.some((a) => a.status === 'won')) {
                        statusType = 'won';
                      } else if (userApps.some((a) => a.status === 'pending')) {
                        statusType = 'pending';
                      } else if (userApps.some((a) => a.status === 'lost')) {
                        statusType = 'lost';
                      }
                    }

                    // バッジスタイルとアイコンの決定
                    let badgeClass = 'bg-slate-100 text-slate-400 border-slate-200'; // 未提出（灰色）
                    let statusLabel = '未提出';
                    let StatusIcon = null;

                    if (statusType === 'won') {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
                      statusLabel = '当選';
                      StatusIcon = <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />;
                    } else if (statusType === 'pending') {
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
                      statusLabel = '待機';
                      StatusIcon = <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />;
                    } else if (statusType === 'lost') {
                      badgeClass = 'bg-rose-50 text-rose-700 border-rose-300';
                      statusLabel = '落選';
                      StatusIcon = <XCircle className="w-2.5 h-2.5 text-rose-500 shrink-0" />;
                    }

                    return (
                      <span
                        key={d.id}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition ${badgeClass}`}
                        title={`${getMemberName(d.user_id)}: ${statusLabel}`}
                      >
                        {StatusIcon}
                        <span>{getMemberName(d.user_id)}</span>

                        {/* ゲスト希望削除ボタン */}
                        {isGuest && (
                          <button
                            type="button"
                            onClick={() => onToggleDemand(sess.id, d.user_id)}
                            className="text-slate-400 hover:text-rose-500 ml-0.5"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default EventSessionSection;