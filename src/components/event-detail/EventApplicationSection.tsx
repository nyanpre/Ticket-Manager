import { useState } from 'react';
import { Plus, CheckCircle2, XCircle, Clock, Edit2, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Application, EventSession, GroupMember, EventItem } from '../../types/index';

interface Props {
  event: EventItem;
  applications: Application[];
  sessions: EventSession[];
  members: GroupMember[];
  currentUserId?: string;
  onAddApplication: (
    sessionId: string,
    ticketCount: number,
    pairUserId: string,
    paymentMethod?: string,
    applicantUserId?: string
  ) => Promise<void>;
  onStatusChange: (appId: string, status: 'pending' | 'won' | 'lost') => Promise<void>;
  onApplicationUpdated?: () => void;
}

export function EventApplicationSection({
  event,
  applications,
  sessions,
  members,
  currentUserId,
  onAddApplication,
  onStatusChange,
  onApplicationUpdated,
}: Props) {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applySessionId, setApplySessionId] = useState(sessions[0]?.id || '');
  const [applyApplicantUid, setApplyApplicantUid] = useState(currentUserId || '');
  const [applyCount, setApplyCount] = useState(2);
  const [applyPairUid, setApplyPairUid] = useState('');
  const [applyPaymentMethod, setApplyPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 編集用の状態
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editSessionId, setEditSessionId] = useState('');
  const [editApplicantUid, setEditApplicantUid] = useState('');
  const [editCount, setEditCount] = useState(2);
  const [editPairUid, setEditPairUid] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || '未登録';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applySessionId) return;
    setSubmitting(true);
    try {
      await onAddApplication(
        applySessionId,
        applyCount,
        applyPairUid,
        applyPaymentMethod || undefined,
        applyApplicantUid || currentUserId
      );
      setShowApplyForm(false);
      setApplyPairUid('');
      setApplyCount(2);
      setApplyPaymentMethod('');
      setApplyApplicantUid(currentUserId || '');
    } finally {
      setSubmitting(false);
    }
  };

  // 編集モードの開始
  const handleStartEdit = (app: Application) => {
    setEditingAppId(app.id);
    setEditSessionId(app.session_id);
    setEditApplicantUid(app.applicant_user_id);
    setEditCount(app.ticket_count);
    setEditPairUid(app.pair_user_id || '');
    setEditPaymentMethod(app.payment_method || '');
  };

  // 編集内容の保存
  const handleSaveEdit = async (appId: string) => {
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          session_id: editSessionId,
          applicant_user_id: editApplicantUid,
          ticket_count: Number(editCount),
          pair_user_id: editPairUid || null,
          payment_method: editPaymentMethod || null,
        })
        .eq('id', appId);

      if (error) throw error;

      setEditingAppId(null);
      if (onApplicationUpdated) {
        onApplicationUpdated();
      }
    } catch (err: any) {
      alert(`更新に失敗しました: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // 申込の削除（確認ポップアップ付き）
  const handleDelete = async (app: Application) => {
    const sessionName = sessions.find((s) => s.id === app.session_id)?.name || '';
    const applicantName = getMemberName(app.applicant_user_id);

    const confirmed = window.confirm(
      `この申込状況を削除しますか？\n\n・申込者: ${applicantName}\n・公演枠: ${sessionName}\n・枚数: ${app.ticket_count}枚`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('applications').delete().eq('id', app.id);
      if (error) throw error;

      if (onApplicationUpdated) {
        onApplicationUpdated();
      }
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 font-['Noto_Sans_JP']">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">申込状況</span>
        <button
          onClick={() => {
            if (!applySessionId && sessions.length > 0) setApplySessionId(sessions[0].id);
            if (!applyApplicantUid && currentUserId) setApplyApplicantUid(currentUserId);
            setShowApplyForm(!showApplyForm);
          }}
          className="text-[11px] text-indigo-600 font-bold flex items-center gap-0.5 hover:text-indigo-700"
        >
          <Plus className="w-3 h-3" />
          申込を追加
        </button>
      </div>

      {showApplyForm && (
        <form onSubmit={handleSubmit} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">申込者（名義）</label>
              <select
                value={applyApplicantUid}
                onChange={(e) => setApplyApplicantUid(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.user_id}>
                    {m.display_name} {m.user_id === currentUserId ? '(自分)' : m.is_guest ? '(ゲスト)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">公演枠</label>
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
              <label className="block text-[10px] font-bold text-slate-600 mb-1">同行指定（任意）</label>
              <select
                value={applyPairUid}
                onChange={(e) => setApplyPairUid(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">指定なし</option>
                {members
                  .filter((m) => m.user_id !== applyApplicantUid)
                  .map((m) => (
                    <option key={m.id} value={m.user_id}>
                      {m.display_name} {m.is_guest ? '(ゲスト)' : ''}
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
            const isEditing = editingAppId === app.id;
            const sessionName = sessions.find((s) => s.id === app.session_id)?.name || '';
            const applicantName = getMemberName(app.applicant_user_id);
            const pairName = app.pair_user_id ? getMemberName(app.pair_user_id) : null;
            const totalCost = (event.ticket_price * app.ticket_count) + event.system_fee + (event.ticketing_fee * app.ticket_count);

            if (isEditing) {
              return (
                <div key={app.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>申込状況の編集</span>
                    <button
                      type="button"
                      onClick={() => setEditingAppId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">申込者（名義）</label>
                      <select
                        value={editApplicantUid}
                        onChange={(e) => setEditApplicantUid(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.user_id}>
                            {m.display_name} {m.user_id === currentUserId ? '(自分)' : m.is_guest ? '(ゲスト)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">公演枠</label>
                      <select
                        value={editSessionId}
                        onChange={(e) => setEditSessionId(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">枚数</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={editCount}
                        onChange={(e) => setEditCount(parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">同行指定</label>
                      <select
                        value={editPairUid}
                        onChange={(e) => setEditPairUid(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="">指定なし</option>
                        {members
                          .filter((m) => m.user_id !== editApplicantUid)
                          .map((m) => (
                            <option key={m.id} value={m.user_id}>
                              {m.display_name} {m.is_guest ? '(ゲスト)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">支払い方法</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">未指定</option>
                      <option value="credit">クレジットカード</option>
                      <option value="convenience">コンビニ決済</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingAppId(null)}
                      className="flex-1 py-1.5 bg-slate-200 text-slate-600 text-xs rounded-lg font-bold"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={() => handleSaveEdit(app.id)}
                      className="flex-1 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-bold flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {savingEdit ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              );
            }

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

                  <div className="flex items-center gap-1.5">
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

                    {/* 編集・削除ボタン */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(app)}
                        title="申込内容を編集"
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(app)}
                        title="申込を削除"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-1.5 border-t border-slate-200/60">
                  <button
                    onClick={() => onStatusChange(app.id, 'won')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition ${
                      app.status === 'won' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    当選
                  </button>
                  <button
                    onClick={() => onStatusChange(app.id, 'lost')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition ${
                      app.status === 'lost' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    落選
                  </button>
                  <button
                    onClick={() => onStatusChange(app.id, 'pending')}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition ${
                      app.status === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
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

export default EventApplicationSection;