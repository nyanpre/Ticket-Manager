import { useState } from 'react';
import { Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Application, EventSession, GroupMember, EventItem } from '../../types';

interface Props {
  event: EventItem;
  applications: Application[];
  sessions: EventSession[];
  members: GroupMember[];
  currentUserId?: string;
  onAddApplication: (sessionId: string, ticketCount: number, pairUserId: string, paymentMethod?: string) => Promise<void>;
  onStatusChange: (appId: string, status: 'pending' | 'won' | 'lost') => Promise<void>;
}

export function EventApplicationSection({
  event,
  applications,
  sessions,
  members,
  currentUserId,
  onAddApplication,
  onStatusChange,
}: Props) {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applySessionId, setApplySessionId] = useState(sessions[0]?.id || '');
  const [applyCount, setApplyCount] = useState(2);
  const [applyPairUid, setApplyPairUid] = useState('');
  const [applyPaymentMethod, setApplyPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || '未登録';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applySessionId) return;
    setSubmitting(true);
    try {
      await onAddApplication(applySessionId, applyCount, applyPairUid, applyPaymentMethod || undefined);
      setShowApplyForm(false);
      setApplyPairUid('');
      setApplyCount(2);
      setApplyPaymentMethod('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">申込状況</span>
        <button
          onClick={() => {
            if (!applySessionId && sessions.length > 0) setApplySessionId(sessions[0].id);
            setShowApplyForm(!showApplyForm);
          }}
          className="text-[11px] text-indigo-600 font-bold flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" />
          申込を追加
        </button>
      </div>

      {showApplyForm && (
        <form onSubmit={handleSubmit} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">枠</label>
            <select
              value={applySessionId}
              onChange={(e) => setApplySessionId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">枚数</label>
              <input
                type="number"
                min="1"
                max="4"
                value={applyCount}
                onChange={(e) => setApplyCount(parseInt(e.target.value) || 1)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">同行指定</label>
              <select
                value={applyPairUid}
                onChange={(e) => setApplyPairUid(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">指定なし</option>
                {members
                  .filter((m) => m.user_id !== currentUserId)
                  .map((m) => (
                    <option key={m.id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">支払い方法 (任意)</label>
            <select
              value={applyPaymentMethod}
              onChange={(e) => setApplyPaymentMethod(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <option value="">未指定</option>
              <option value="credit">クレジットカード</option>
              <option value="convenience">コンビニ決済</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowApplyForm(false)}
              className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg font-bold"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-bold"
            >
              {submitting ? '追加中...' : '登録'}
            </button>
          </div>
        </form>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-400">登録された申込はありません</div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => {
            const sessionName = sessions.find((s) => s.id === app.session_id)?.name || '';
            const applicantName = getMemberName(app.applicant_user_id);
            const pairName = app.pair_user_id ? getMemberName(app.pair_user_id) : null;

            // 支払い総計（単価×枚数 + 申込手数料 + 発券手数料×枚数）
            const totalCost = (event.ticket_price * app.ticket_count) + event.system_fee + (event.ticketing_fee * app.ticket_count);

            return (
              <div key={app.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                        {sessionName}
                      </span>
                      {app.payment_method === 'credit' && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 px-1.5 py-0.5 rounded">
                          クレカ
                        </span>
                      )}
                      {app.payment_method === 'convenience' && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded">
                          コンビニ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mt-1">
                      <span>{applicantName}（{app.ticket_count}枚）</span>
                      <span className="font-extrabold text-slate-900">¥{totalCost.toLocaleString()}</span>
                    </div>

                    {pairName && <div className="text-[10px] text-slate-400">同行: {pairName}</div>}
                  </div>

                  <div>
                    {app.status === 'won' && (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> 当選
                      </span>
                    )}
                    {app.status === 'lost' && (
                      <span className="flex items-center gap-1 text-rose-500 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded">
                        <XCircle className="w-3 h-3" /> 落選
                      </span>
                    )}
                    {app.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" /> 待機
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-1.5 border-t border-slate-200/60">
                  <button
                    onClick={() => onStatusChange(app.id, 'won')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold ${
                      app.status === 'won' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    当選
                  </button>
                  <button
                    onClick={() => onStatusChange(app.id, 'lost')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold ${
                      app.status === 'lost' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    落選
                  </button>
                  <button
                    onClick={() => onStatusChange(app.id, 'pending')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold ${
                      app.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    待機
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}