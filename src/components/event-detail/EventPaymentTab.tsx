import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, CheckCircle2, Clock, CircleDollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EventItem, Application, MemberDemand, GroupMember, EventPayment } from '../../types/index';
import { calculateEventSettlement } from '../../utils/settlement';

interface Props {
  event: EventItem;
  applications: Application[];
  demands: MemberDemand[];
  members: GroupMember[];
  currentUserId?: string;
  isAdmin: boolean;
}

export function EventPaymentTab({
  event,
  applications,
  demands,
  members,
  currentUserId,
  isAdmin,
}: Props) {
  const [payments, setPayments] = useState<EventPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || '未登録';

  // 共通の精算計算ロジックを呼び出す（全イベント精算まとめと完全に一致）
  const { transfers } = useMemo(() => {
    return calculateEventSettlement(event, applications, demands, members);
  }, [event, applications, demands, members]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('event_payments')
        .select('*')
        .eq('event_id', event.id);

      if (error) throw error;
      setPayments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [event.id]);

  const handleTogglePaid = async (fromUserId: string, toUserId: string, amount: number) => {
    const existing = payments.find((p) => p.from_user_id === fromUserId && p.to_user_id === toUserId);
    const newStatus = existing ? !existing.is_paid : true;

    setUpdatingKey(`${fromUserId}_${toUserId}`);
    try {
      const { error } = await supabase
        .from('event_payments')
        .upsert(
          {
            event_id: event.id,
            from_user_id: fromUserId,
            to_user_id: toUserId,
            amount,
            is_paid: newStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,from_user_id,to_user_id' }
        );

      if (error) throw error;
      await fetchPayments();
    } catch (err: any) {
      alert(`更新に失敗しました: ${err.message}`);
    } finally {
      setUpdatingKey(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-xs text-slate-400">精算データを読み込み中...</div>;
  }

  if (transfers.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center space-y-1.5 font-['Noto_Sans_JP']">
        <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
        <div className="text-xs font-bold text-slate-700">精算が必要な送金はありません</div>
        <p className="text-[11px] text-slate-400">
          当選枠がない、または全員が自名義で参加しているため自己相殺されています。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-['Noto_Sans_JP']">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <CircleDollarSign className="w-3.5 h-3.5 text-indigo-600" />
          <span>メンバー間のチケット代精算</span>
        </span>
        <span className="text-[10px] text-slate-400">立替者へ直接送金</span>
      </div>

      <div className="space-y-2">
        {transfers.map((item, idx) => {
          const paymentRecord = payments.find(
            (p) => p.from_user_id === item.fromUserId && p.to_user_id === item.toUserId
          );
          const isPaid = paymentRecord?.is_paid || false;
          const isMyPayment = currentUserId === item.fromUserId;
          const isMyReceive = currentUserId === item.toUserId;
          const canOperate = isMyPayment || isMyReceive || isAdmin;
          const isUpdating = updatingKey === `${item.fromUserId}_${item.toUserId}`;

          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition ${
                isPaid ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {isMyPayment && (
                      <span className="bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded">
                        あなたの支払い
                      </span>
                    )}
                    {isMyReceive && (
                      <span className="bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded">
                        あなたの受け取り
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-800">{getMemberName(item.fromUserId)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-indigo-700">{getMemberName(item.toUserId)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900">
                      ¥{item.amount.toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canOperate || isUpdating}
                    onClick={() => handleTogglePaid(item.fromUserId, item.toUserId, item.amount)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      !canOperate
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                        : isPaid
                        ? 'bg-emerald-600 active:bg-emerald-700 text-white shadow-xs cursor-pointer'
                        : 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>精算済</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>未精算</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventPaymentTab;