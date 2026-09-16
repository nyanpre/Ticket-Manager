import { useMemo } from 'react';
import { Activity, X, CalendarPlus, Ticket, Heart } from 'lucide-react';import type { EventItem, EventSession, Application, MemberDemand, GroupMember } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: GroupMember[];
  events: EventItem[];
  sessions: EventSession[];
  applications: Application[];
  demands: MemberDemand[];
  onSelectEvent: (eventId: string) => void;
}

interface ActivityItem {
  id: string;
  type: 'event_created' | 'application_added' | 'demand_added';
  timestamp: string;
  eventId: string;
  text: string;
  subText?: string;
  badge?: { label: string; color: string };
}

export function ActivityModal({
  isOpen,
  onClose,
  members,
  events,
  sessions,
  applications,
  demands,
  onSelectEvent,
}: Props) {
  const getMemberName = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || 'メンバー';
  const getEventTitle = (evId: string) => events.find((e) => e.id === evId)?.title || '削除されたイベント';
  const getSessionName = (sessId: string) => sessions.find((s) => s.id === sessId)?.name || '公演枠';

  // 各エンティティの created_at を統合して時系列に並べる
  const activities = useMemo(() => {
    const list: ActivityItem[] = [];

    // イベント追加
    events.forEach((ev) => {
      list.push({
        id: `ev-${ev.id}`,
        type: 'event_created',
        timestamp: ev.created_at,
        eventId: ev.id,
        text: `「${ev.title}」が作成されました`,
        subText: `開催日: ${ev.event_date.replace(/-/g, '/')}`,
      });
    });

    // 申込追加
    applications.forEach((app) => {
      const applicantName = getMemberName(app.applicant_user_id);
      const evTitle = getEventTitle(app.event_id);
      const sessName = getSessionName(app.session_id);

      let badgeColor = 'bg-amber-50 text-amber-700';
      let badgeLabel = '当落待ち';
      if (app.status === 'won') {
        badgeColor = 'bg-emerald-50 text-emerald-700';
        badgeLabel = '当選';
      } else if (app.status === 'lost') {
        badgeColor = 'bg-rose-50 text-rose-700';
        badgeLabel = '落選';
      }

      list.push({
        id: `app-${app.id}`,
        type: 'application_added',
        timestamp: app.created_at,
        eventId: app.event_id,
        text: `${applicantName} が「${evTitle}」に申込（${app.ticket_count}枚）`,
        subText: sessName,
        badge: { label: badgeLabel, color: badgeColor },
      });
    });

    // 希望追加
    demands.forEach((dem) => {
      const userName = getMemberName(dem.user_id);
      const evTitle = getEventTitle(dem.event_id);
      const sessName = getSessionName(dem.session_id);

      list.push({
        id: `dem-${dem.id}`,
        type: 'demand_added',
        timestamp: dem.created_at,
        eventId: dem.event_id,
        text: `${userName} が希望を表明`,
        subText: `${evTitle} - ${sessName}`,
      });
    });

    // 新しい順（降順）にソート
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, applications, demands, members, sessions]);

  if (!isOpen) return null;

  const formatActivityTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const date = d.getDate();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${date} ${h}:${min}`;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">グループのアクティビティ</h2>
              <p className="text-[10px] text-slate-400">直近の作成・申込・希望表明履歴</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">まだ活動履歴はありません</div>
          ) : (
            <div className="space-y-2">
              {activities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    onClose();
                    onSelectEvent(act.eventId);
                  }}
                  className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-3 hover:bg-slate-100 active:bg-slate-200/70 transition cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shrink-0 text-slate-600 mt-0.5">
                    {act.type === 'event_created' && <CalendarPlus className="w-3.5 h-3.5 text-indigo-600" />}
                    {act.type === 'application_added' && <Ticket className="w-3.5 h-3.5 text-emerald-600" />}
                    {act.type === 'demand_added' && <Heart className="w-3.5 h-3.5 text-rose-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate">{act.text}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                        {formatActivityTime(act.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      {act.subText && (
                        <span className="text-[11px] text-slate-500 truncate">{act.subText}</span>
                      )}
                      {act.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${act.badge.color}`}>
                          {act.badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}