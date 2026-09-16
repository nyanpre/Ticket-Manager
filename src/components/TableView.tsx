import { useState, useMemo } from 'react';
import type { EventItem, EventSession, Application, MemberDemand } from '../types';
import { formatDateSlash } from './CalendarView';

interface Props {
  events: EventItem[];
  sessions: EventSession[];
  demands: MemberDemand[];
  applications: Application[];
  onSelectEvent: (event: EventItem) => void;
}

export function TableView({ events, sessions, demands, applications, onSelectEvent }: Props) {
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.event_date) {
        set.add(ev.event_date.substring(0, 7));
      }
    });
    return Array.from(set).sort();
  }, [events]);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    if (selectedMonth === 'all') return events;
    return events.filter((ev) => ev.event_date.startsWith(selectedMonth));
  }, [events, selectedMonth]);

  return (
    <div className="space-y-3">
      {/* 期間絞り込みフィルター */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80">
        <span className="text-xs font-bold text-slate-700">期間絞り込み</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
        >
          <option value="all">全期間を表示</option>
          {availableMonths.map((m) => {
            const [y, mon] = m.split('-');
            return (
              <option key={m} value={m}>
                {y}年 {parseInt(mon)}月
              </option>
            );
          })}
        </select>
      </div>

      {/* テーブル本体 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px]">
                <th className="py-2.5 px-3 whitespace-nowrap font-bold">日にち</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-bold">イベント名</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-bold">公演枠</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-bold">希望人数</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-bold">申込・当落結果</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-bold text-right">単価</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    対象のイベントはありません
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const evSessions = sessions.filter((s) => s.event_id === ev.id);
                  const evDemands = demands.filter((d) => d.event_id === ev.id);
                  const evApps = applications.filter((a) => a.event_id === ev.id);

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className="hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                    >
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-indigo-600 align-top">
                        {formatDateSlash(ev.event_date)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap max-w-[140px] truncate align-top">
                        {ev.title}
                      </td>

                      {/* 公演枠名一覧 */}
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-1.5">
                          {evSessions.map((s) => (
                            <span key={s.id} className="text-[11px] font-semibold text-slate-700">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 公演枠ごとの希望数 */}
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-1.5">
                          {evSessions.map((s) => {
                            const demandCount = evDemands.filter((d) => d.session_id === s.id).length;
                            return (
                              <span key={s.id} className="text-[11px] text-slate-600">
                                {demandCount}人
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* 公演枠ごとの申込結果 */}
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-1.5">
                          {evSessions.map((s) => {
                            const won = evApps
                              .filter((a) => a.session_id === s.id && a.status === 'won')
                              .reduce((sum, a) => sum + a.ticket_count, 0);
                            const pending = evApps
                              .filter((a) => a.session_id === s.id && a.status === 'pending')
                              .reduce((sum, a) => sum + a.ticket_count, 0);

                            return (
                              <div key={s.id} className="flex items-center gap-1 text-[11px]">
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                  won > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  当選 {won}枚
                                </span>
                                {pending > 0 && (
                                  <span className="bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.2 rounded text-[10px]">
                                    待機 {pending}枚
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-right font-bold text-slate-700 align-top">
                        ¥{ev.ticket_price.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}