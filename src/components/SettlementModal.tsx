import { useMemo } from 'react';
import { CircleDollarSign, ArrowRight, X, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GroupMember, EventItem, Application, MemberDemand } from '../types/index';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: GroupMember[];
  events: EventItem[];
  applications: Application[];
  demands: MemberDemand[];
}

interface TransferInstruction {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export function SettlementModal({ isOpen, onClose, members, events, applications, demands }: Props) {
  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || '未登録';

  // 全イベント横断の純残高と最適送金指示の計算
  const { balances, transfers } = useMemo(() => {
    // メンバーごとの純残高（+は受け取り、-は支払い）
    const balanceMap: Record<string, number> = {};
    members.forEach((m) => {
      balanceMap[m.user_id] = 0;
    });

    // 各イベントごとに立替額と負担額を算出して合算
    events.forEach((ev) => {
      // 当選した申込
      const wonApps = applications.filter((a) => a.event_id === ev.id && a.status === 'won');
      if (wonApps.length === 0) return;

      // 1. 立替者へのプラス加算（チケット単価×枚数 + 申込手数料 + 発券手数料×枚数）
      wonApps.forEach((app) => {
        const applicantId = app.applicant_user_id;
        if (!applicantId) return;
        const cost = (ev.ticket_price * app.ticket_count) + ev.system_fee + (ev.ticketing_fee * app.ticket_count);
        balanceMap[applicantId] = (balanceMap[applicantId] || 0) + cost;
      });

      // 2. セッションごとに参加者へ負担を按分（合計が立替総額と完全に一致するよう端数を調整）
      const sessionsInEvent = Array.from(new Set(wonApps.map((a) => a.session_id)));

      sessionsInEvent.forEach((sessId) => {
        const sessApps = wonApps.filter((a) => a.session_id === sessId);
        const sessDemands = demands.filter((d) => d.event_id === ev.id && d.session_id === sessId);
        if (sessDemands.length === 0) return;

        // 当該セッションの総コスト
        const sessTotalCost = sessApps.reduce(
          (sum, a) => sum + (ev.ticket_price * a.ticket_count) + ev.system_fee + (ev.ticketing_fee * a.ticket_count),
          0
        );

        const participantCount = sessDemands.length;
        const baseCost = Math.floor(sessTotalCost / participantCount);
        let remainder = sessTotalCost % participantCount;

        // 参加者から按分負担をマイナス減算（端数も漏れなく按分して全員の合計を±0に維持）
        sessDemands.forEach((dem) => {
          const cost = baseCost + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          balanceMap[dem.user_id] = (balanceMap[dem.user_id] || 0) - cost;
        });
      });
    });

    // 各人の純残高一覧（四捨五入して整数化）
    const balances = members.map((m) => ({
      userId: m.user_id,
      name: m.display_name,
      isGuest: m.is_guest || m.user_id.startsWith('guest_'),
      amount: Math.round(balanceMap[m.user_id] || 0),
    }));

    // 送金指示の最小化アルゴリズム（純残高の貪欲法相殺）
    // 支払う側（マイナス）と受け取る側（プラス）に分類
    const debtors = balances
      .filter((b) => b.amount < 0)
      .map((b) => ({ userId: b.userId, amount: -b.amount }))
      .sort((a, b) => b.amount - a.amount); // 金額が大きい順

    const creditors = balances
      .filter((b) => b.amount > 0)
      .map((b) => ({ userId: b.userId, amount: b.amount }))
      .sort((a, b) => b.amount - a.amount); // 金額が大きい順

    const transfers: TransferInstruction[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0) {
        transfers.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: settleAmount,
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount === 0) dIdx++;
      if (creditor.amount === 0) cIdx++;
    }

    return { balances, transfers };
  }, [members, events, applications, demands]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-['Noto_Sans_JP']"
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CircleDollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">全イベント精算まとめ</h2>
              <p className="text-[10px] text-slate-400">相殺後の最短送金ルート（最小送金回数）</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 送金手順 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">送金・精算の手順</span>

            {transfers.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800">未精算の支払いはありません</p>
                <p className="text-[10px] text-emerald-600/80">全員の立替と負担が相殺されています</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transfers.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                        {getMemberName(t.fromUserId)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        {getMemberName(t.toUserId)}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-800">
                      ¥{t.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* メンバー別差額一覧 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 block">メンバー別 差額一覧</span>
            <div className="space-y-1.5">
              {balances.map((b) => {
                const isPositive = b.amount > 0;
                const isNegative = b.amount < 0;

                return (
                  <div
                    key={b.userId}
                    className="p-2.5 bg-white border border-slate-200/70 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">{b.name}</span>
                      {b.isGuest && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 rounded">
                          ゲスト
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-bold">
                      {isPositive && (
                        <span className="flex items-center text-emerald-600">
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                          +¥{b.amount.toLocaleString()} (受取)
                        </span>
                      )}
                      {isNegative && (
                        <span className="flex items-center text-rose-600">
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                          -¥{Math.abs(b.amount).toLocaleString()} (支払)
                        </span>
                      )}
                      {!isPositive && !isNegative && (
                        <span className="text-slate-400">¥0</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettlementModal;