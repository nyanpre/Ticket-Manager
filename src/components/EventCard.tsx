import { Calendar, ChevronRight, CheckCircle2, Clock, Bell } from 'lucide-react';
import type { EventItem, EventSession, Application, MemberDemand } from '../types/index';

interface Props {
  event: EventItem;
  sessions?: EventSession[];
  applications?: Application[];
  demands?: MemberDemand[];
  onClick?: () => void;
}

export function EventCard({ event, sessions = [], applications = [], demands = [], onClick }: Props) {
  const totalFee = event.system_fee + event.ticketing_fee;
  const formattedDate = event.event_date ? event.event_date.replace(/-/g, '/') : '';

  const evSessions = sessions.filter((s) => s.event_id === event.id);
  const evApps = applications.filter((a) => a.event_id === event.id);
  const evDemands = demands.filter((d) => d.event_id === event.id);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5 active:bg-slate-50 transition cursor-pointer font-['Noto_Sans_JP']"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>

            {/* 申込期限バッジ */}
            {event.application_deadline && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                <Clock className="w-2.5 h-2.5" />
                締切: {event.application_deadline.replace(/-/g, '/')}
              </span>
            )}

            {/* 当落発表バッジ */}
            {event.lottery_result_date && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60">
                <Bell className="w-2.5 h-2.5" />
                発表: {event.lottery_result_date.replace(/-/g, '/')}
              </span>
            )}
          </div>

          <span className="text-sm font-bold text-slate-800 block leading-snug">{event.title}</span>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>単価 ¥{event.ticket_price.toLocaleString()}</span>
            <span>•</span>
            <span>手数料 ¥{totalFee.toLocaleString()}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
      </div>

      {/* 公演枠ごとの状況 */}
      {evSessions.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
          {evSessions.map((s) => {
            const won = evApps
              .filter((a) => a.session_id === s.id && a.status === 'won')
              .reduce((sum, a) => sum + a.ticket_count, 0);
            const pending = evApps
              .filter((a) => a.session_id === s.id && a.status === 'pending')
              .reduce((sum, a) => sum + a.ticket_count, 0);
            const demandCount = evDemands.filter((d) => d.session_id === s.id).length;

            return (
              <div
                key={s.id}
                className="bg-slate-50 border border-slate-200/70 rounded-xl px-2.5 py-1 text-[10px] flex items-center gap-2"
              >
                <span className="font-bold text-slate-700">{s.name}</span>
                <span className="text-slate-400">希望{demandCount}</span>
                {won > 0 && (
                  <span className="flex items-center text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3 h-3 mr-0.5" />
                    {won}枚
                  </span>
                )}
                {pending > 0 && (
                  <span className="flex items-center text-amber-600 font-semibold">
                    <Clock className="w-3 h-3 mr-0.5" />
                    {pending}枚
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}