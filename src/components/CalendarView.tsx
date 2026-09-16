import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Bell } from 'lucide-react';
import type { EventItem } from '../types/index';

interface Props {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

interface CalendarBadge {
  id: string;
  type: 'event' | 'deadline' | 'lottery';
  label: string;
  event: EventItem;
}

export const formatDateSlash = (dateStr?: string | null) => {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '/');
};

export function CalendarView({ events, onSelectEvent }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // 日付文字列（YYYY-MM-DD）ごとにイベント・締切・発表をマッピング
  const dateBadgesMap = useMemo(() => {
    const map = new Map<string, CalendarBadge[]>();

    const addBadge = (dateKey: string, badge: CalendarBadge) => {
      const existing = map.get(dateKey) || [];
      existing.push(badge);
      map.set(dateKey, existing);
    };

    events.forEach((ev) => {
      // 1. イベント当日
      if (ev.event_date) {
        addBadge(ev.event_date, {
          id: `ev-${ev.id}`,
          type: 'event',
          label: ev.title,
          event: ev,
        });
      }

      // 2. 申込締切
      if (ev.application_deadline) {
        addBadge(ev.application_deadline, {
          id: `dl-${ev.id}`,
          type: 'deadline',
          label: `締切: ${ev.title}`,
          event: ev,
        });
      }

      // 3. 当落発表
      if (ev.lottery_result_date) {
        addBadge(ev.lottery_result_date, {
          id: `lr-${ev.id}`,
          type: 'lottery',
          label: `発表: ${ev.title}`,
          event: ev,
        });
      }
    });

    return map;
  }, [events]);

  // カレンダーの日付グリッド配列を生成
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // 前月分
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // 今月分
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // 次月分（グリッドの端数を埋める）
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3 font-['Noto_Sans_JP']">
      {/* カレンダー上部コントロール */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">
            {year}年 {month + 1}月
          </h2>
          <button
            onClick={handleToday}
            className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg active:bg-indigo-100"
          >
            今日
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-xl transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-xl transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 凡例バー */}
      <div className="flex items-center gap-3 px-1 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold">
        <div className="flex items-center gap-1 text-indigo-700">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>イベント日</span>
        </div>
        <div className="flex items-center gap-1 text-amber-700">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>申込締切</span>
        </div>
        <div className="flex items-center gap-1 text-sky-700">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>当落発表</span>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-1.5">
        <span className="text-rose-500">日</span>
        <span>月</span>
        <span>火</span>
        <span>水</span>
        <span>木</span>
        <span>金</span>
        <span className="text-blue-500">土</span>
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const badges = dateBadgesMap.get(day.dateStr) || [];
          const isToday = day.dateStr === todayStr;

          return (
            <div
              key={idx}
              className={`min-h-[72px] p-1 rounded-xl border flex flex-col justify-start transition ${
                day.isCurrentMonth
                  ? isToday
                    ? 'bg-indigo-50/40 border-indigo-200'
                    : 'bg-white border-slate-100'
                  : 'bg-slate-50/60 border-transparent text-slate-300'
              }`}
            >
              {/* 日付数字 */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold px-1 rounded-md ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : day.isCurrentMonth
                      ? 'text-slate-700'
                      : 'text-slate-300'
                  }`}
                >
                  {day.dayNum}
                </span>
              </div>

              {/* ラベル一覧 */}
              <div className="flex flex-col gap-1 mt-1">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => onSelectEvent(badge.event)}
                    title={badge.label}
                    className={`w-full text-left px-1.5 py-0.5 rounded-md text-[9px] font-bold truncate transition flex items-center gap-0.5 ${
                      badge.type === 'event'
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200/60'
                        : badge.type === 'deadline'
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 active:bg-amber-200 border border-amber-200/60'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100 active:bg-sky-200 border border-sky-200/60'
                    }`}
                  >
                    {badge.type === 'deadline' && <Clock className="w-2.5 h-2.5 shrink-0 text-amber-600" />}
                    {badge.type === 'lottery' && <Bell className="w-2.5 h-2.5 shrink-0 text-sky-600" />}
                    <span className="truncate">{badge.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}