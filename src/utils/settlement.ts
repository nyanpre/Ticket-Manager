import type { EventItem, Application, MemberDemand, GroupMember } from '../types/index';

export interface CalculatedTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * 単一イベントにおけるメンバーごとの純残高および最短送金ルートを算出する共通ロジック
 */
export function calculateEventSettlement(
  event: EventItem,
  applications: Application[],
  demands: MemberDemand[],
  members: GroupMember[]
): {
  balanceMap: Record<string, number>;
  transfers: CalculatedTransfer[];
} {
  const balanceMap: Record<string, number> = {};
  members.forEach((m) => {
    balanceMap[m.user_id] = 0;
  });

  const wonApps = applications.filter((a) => a.event_id === event.id && a.status === 'won');
  if (wonApps.length === 0) {
    return { balanceMap, transfers: [] };
  }

  // 1. 当選した立替者にプラス加算（チケット代 + 手数料）
  wonApps.forEach((app) => {
    const applicantId = app.applicant_user_id;
    if (!applicantId) return;
    const cost = (event.ticket_price * app.ticket_count) + event.system_fee + (event.ticketing_fee * app.ticket_count);
    balanceMap[applicantId] = (balanceMap[applicantId] || 0) + cost;
  });

  // 2. セッションごとに参加者へ負担を按分（立替総額と負担総額が完全に一致するよう端数按分）
  const sessionsInEvent = Array.from(new Set(wonApps.map((a) => a.session_id)));

  sessionsInEvent.forEach((sessId) => {
    const sessApps = wonApps.filter((a) => a.session_id === sessId);
    const sessDemands = demands.filter((d) => d.event_id === event.id && d.session_id === sessId);
    if (sessDemands.length === 0) return;

    const sessTotalCost = sessApps.reduce(
      (sum, a) => sum + (event.ticket_price * a.ticket_count) + event.system_fee + (event.ticketing_fee * a.ticket_count),
      0
    );

    const participantCount = sessDemands.length;
    const baseCost = Math.floor(sessTotalCost / participantCount);
    let remainder = sessTotalCost % participantCount;

    sessDemands.forEach((dem) => {
      const cost = baseCost + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      balanceMap[dem.user_id] = (balanceMap[dem.user_id] || 0) - cost;
    });
  });

  // 3. 純残高の相殺（貪欲法マッチング）
  const balances = members.map((m) => ({
    userId: m.user_id,
    amount: Math.round(balanceMap[m.user_id] || 0),
  }));

  const debtors = balances
    .filter((b) => b.amount < 0)
    .map((b) => ({ userId: b.userId, amount: -b.amount }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.amount > 0)
    .map((b) => ({ userId: b.userId, amount: b.amount }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: CalculatedTransfer[] = [];
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

  return { balanceMap, transfers };
}