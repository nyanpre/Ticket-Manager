import { useState, useEffect, useMemo } from 'react';
import { User, CheckCircle2, Clock, Calendar, ArrowUpRight, ArrowDownLeft, X, ChevronRight, XCircle } from 'lucide-react';
import { getOrCreateAnonymousUser } from '../lib/supabase';
import type { EventItem, Application, MemberDemand } from '../types';
import { formatDateSlash } from './CalendarView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  demands: MemberDemand[];
  applications: Application[];
  onSelectEvent: (eventId: string) => void;
}

type FilterType = 'all' | 'receive' | 'pay' | 'won' | 'lost' | 'pending';

export function MyPageModal({
  isOpen,
  onClose,
  events,
  demands,
  applications,
  onSelectEvent,
}: Props) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (isOpen) {
      getOrCreateAnonymousUser().then(setCurrentUser);
      setFilter('all');
    }
  }, [isOpen]);

  const summary = useMemo(() => {
    if (!currentUser) {
      return { toPay: 0, toReceive: 0, wonCount: 0, lostCount: 0, pendingCount: 0, myApps: [], myDemands: [] };
    }

    const uid = currentUser.id;
    const myApps = applications.filter((a) => a.applicant_user_id === uid);
    const wonApps = myApps.filter((a) => a.status === 'won');
    const lostApps = myApps.filter((a) => a.status === 'lost');
    const pendingApps = myApps.filter((a) => a.status === 'pending');
    const myDemands = demands.filter((d) => d.user_id === uid);

    let toReceive = 0;
    let toPay = 0;

    // 1. 各イベント・セッションごとに「自己相殺」を考慮して計算
    events.forEach((ev) => {
      // 当該イベントにおける自分の当選申込
      const myWonInEvent = wonApps.filter((a) => a.event_id === ev.id);
      // 当該イベントにおける自分の参加希望
      const myDemandsInEvent = myDemands.filter((d) => d.event_id === ev.id);

      // イベント全体の当選申込（他人が当選させた枠を自分が使うケース用）
      const allWonInEvent = applications.filter((a) => a.event_id === ev.id && a.status === 'won');

      // (A) 自名義当選枠の回収額計算
      myWonInEvent.forEach((app) => {
        const totalPaidForApp = (ev.ticket_price * app.ticket_count) + ev.system_fee + (ev.ticketing_fee * app.ticket_count);
        
        // 自分がこのセッションに参加希望を出しているか？
        const iAmAttending = myDemandsInEvent.some((d) => d.session_id === app.session_id);

        if (iAmAttending) {
          // 自参加の場合: 自分の1枚分（チケット代 + 発券手数料 + 手数料按分）は相殺して「要回収」から除外
          const myOwnShare = ev.ticket_price + ev.ticketing_fee + Math.floor(ev.system_fee / (app.ticket_count || 1));
          toReceive += Math.max(0, totalPaidForApp - myOwnShare);
        } else {
          // 自分は不参加（他人に全額立て替えただけ）: 全額を要回収に計上
          toReceive += totalPaidForApp;
        }
      });

      // (B) 自分の参加希望枠に対する支払額計算
      myDemandsInEvent.forEach((dem) => {
        // このセッションで誰かが当選しているか？
        const wonApp = allWonInEvent.find((a) => a.session_id === dem.session_id);
        if (!wonApp) return;

        // ★ 自名義で当選したセッションであれば、(A)で既に1枚分自己相殺しているので支払い不要 (toPayに加算しない)
        const isMyOwnWonSession = myWonInEvent.some((a) => a.session_id === dem.session_id);
        if (isMyOwnWonSession) {
          return;
        }

        // 他人が立て替えてくれたセッションの場合のみ、支払義務として計上
        toPay += ev.ticket_price + ev.ticketing_fee + Math.floor(ev.system_fee / (wonApp.ticket_count || 2));
      });
    });

    return {
      toPay,
      toReceive,
      wonCount: wonApps.reduce((acc, a) => acc + a.ticket_count, 0),
      lostCount: lostApps.reduce((acc, a) => acc + a.ticket_count, 0),
      pendingCount: pendingApps.reduce((acc, a) => acc + a.ticket_count, 0),
      myApps,
      myDemands,
    };
  }, [currentUser, applications, demands, events]);

  const displayedEvents = useMemo(() => {
    if (!currentUser) return [];

    return events.filter((ev) => {
      const myAppsInEv = summary.myApps.filter((a) => a.event_id === ev.id);
      const myDemandsInEv = summary.myDemands.filter((d) => d.event_id === ev.id);

      if (filter === 'all') {
        return myAppsInEv.length > 0 || myDemandsInEv.length > 0;
      }
      if (filter === 'receive') {
        // 立て替え回収額が存在するイベントのみ
        return myAppsInEv.some((a) => a.status === 'won');
      }
      if (filter === 'pay') {
        // 他人名義で当選しており、自分が支払うべきイベント
        return myDemandsInEv.some((dem) => {
          const wonByOthers = applications.some(
            (a) => a.session_id === dem.session_id && a.status === 'won' && a.applicant_user_id !== currentUser.id
          );
          return wonByOthers;
        });
      }
      if (filter === 'won') {
        return myAppsInEv.some((a) => a.status === 'won');
      }
      if (filter === 'lost') {
        return myAppsInEv.some((a) => a.status === 'lost');
      }
      if (filter === 'pending') {
        return myAppsInEv.some((a) => a.status === 'pending');
      }
      return false;
    });
  }, [events, filter, summary, currentUser, applications]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-['Noto_Sans_JP']"
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">マイページ（当落・精算）</h2>
              <p className="text-[10px] text-slate-400">カードをタップすると一覧を絞り込めます</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 金額サマリーボタン */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setFilter(filter === 'receive' ? 'all' : 'receive')}
              className={`text-left rounded-2xl p-3.5 space-y-1 transition border ${
                filter === 'receive'
                  ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
                  : 'bg-emerald-50/70 border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>立替・要回収</span>
              </div>
              <div className="text-lg font-black text-emerald-800">
                ¥{summary.toReceive.toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-600/80 leading-tight">他人のために立て替えている金額</p>
            </button>

            <button
              type="button"
              onClick={() => setFilter(filter === 'pay' ? 'all' : 'pay')}
              className={`text-left rounded-2xl p-3.5 space-y-1 transition border ${
                filter === 'pay'
                  ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                  : 'bg-rose-50/70 border-rose-100 hover:bg-rose-50'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>要支払い (概算)</span>
              </div>
              <div className="text-lg font-black text-rose-800">
                ¥{summary.toPay.toLocaleString()}
              </div>
              <p className="text-[10px] text-rose-600/80 leading-tight">他人に支払うべきチケット代</p>
            </button>
          </div>

          {/* 枚数サマリーボタン（当選 / 落選 / 待機） */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 flex items-center justify-around text-center gap-1">
            <button
              type="button"
              onClick={() => setFilter(filter === 'won' ? 'all' : 'won')}
              className={`flex-1 py-1.5 rounded-xl transition ${
                filter === 'won' ? 'bg-white shadow-xs font-bold' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-bold block">自名義 当選</span>
              <span className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {summary.wonCount}枚
              </span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => setFilter(filter === 'lost' ? 'all' : 'lost')}
              className={`flex-1 py-1.5 rounded-xl transition ${
                filter === 'lost' ? 'bg-white shadow-xs font-bold' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-bold block">自名義 落選</span>
              <span className="text-xs font-black text-rose-500 flex items-center justify-center gap-1 mt-0.5">
                <XCircle className="w-3.5 h-3.5" /> {summary.lostCount}枚
              </span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
              className={`flex-1 py-1.5 rounded-xl transition ${
                filter === 'pending' ? 'bg-white shadow-xs font-bold' : 'hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-bold block">当落待ち</span>
              <span className="text-xs font-black text-amber-600 flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> {summary.pendingCount}枚
              </span>
            </button>
          </div>

          {/* 該当イベント一覧 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold text-slate-800">
                {filter === 'receive' && '他人に立替中のイベント'}
                {filter === 'pay' && '他人に支払いが必要なイベント'}
                {filter === 'won' && '自名義が当選したイベント'}
                {filter === 'lost' && '自名義が落選したイベント'}
                {filter === 'pending' && '当落待ちのイベント'}
                {filter === 'all' && '全関連イベント'}
              </span>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-[11px] text-indigo-600 font-medium"
                >
                  絞り込み解除
                </button>
              )}
            </div>

            {displayedEvents.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                該当するイベントはありません
              </div>
            ) : (
              <div className="space-y-2">
                {displayedEvents.map((ev) => {
                  const myApps = summary.myApps.filter((a) => a.event_id === ev.id);
                  const isDemanded = summary.myDemands.some((d) => d.event_id === ev.id);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        onClose();
                        onSelectEvent(ev.id);
                      }}
                      className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDateSlash(ev.event_date)}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-800">{ev.title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {myApps.map((app) => (
                            <span
                              key={app.id}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                app.status === 'won'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : app.status === 'lost'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {app.status === 'won' && `当選 (${app.ticket_count}枚)`}
                              {app.status === 'lost' && `落選 (${app.ticket_count}枚)`}
                              {app.status === 'pending' && `待機 (${app.ticket_count}枚)`}
                            </span>
                          ))}
                          {isDemanded && (
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                              希望あり
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyPageModal;