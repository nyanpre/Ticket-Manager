import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventItem } from '../types';

interface Props {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

// YYYY-MM-DD や ISO文字列を YYYY/MM/DD にフォーマット
export const formatDateSlash = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
};

export function CalendarView({ events, onSelectEvent }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // カレンダーマトリクスの算出
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= lastDay; i++) {
    days.push(i);
  }

  // イベント日付マッピング (YYYY/MM/DD)
  const eventMap = events.reduce((acc, ev) => {
    const key = formatDateSlash(ev.event_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, EventItem[]>);

  const handleDateClick = (day: number) => {
    const formatted = `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    setSelectedDateStr(selectedDateStr === formatted ? null : formatted);
  };

  const filteredEvents = selectedDateStr
    ? eventMap[selectedDateStr] || []
    : events.filter((ev) => {
        const d = new Date(ev.event_date);
        return d.getFullYear() === year && d.getMonth() === month;
      });

  return (
    <div className="space-y-3">
      {/* 月切り替えバー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm font-bold text-slate-800">
            {year}年 {month + 1}月
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 mb-1">
          <span className="text-rose-400">日</span>
          <span>月</span>
          <span>火</span>
          <span>水</span>
          <span>木</span>
          <span>金</span>
          <span className="text-indigo-400">土</span>
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-9" />;
            }

            const currentStr = `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            const dayEvents = eventMap[currentStr] || [];
            const isSelected = selectedDateStr === currentStr;
            const hasEvent = dayEvents.length > 0;

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`h-9 rounded-xl flex flex-col items-center justify-center relative transition text-xs font-medium ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold'
                    : hasEvent
                    ? 'bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{day}</span>
                {hasEvent && !isSelected && (
                  <span className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日のイベント一覧 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500">
            {selectedDateStr ? `${selectedDateStr} の予定` : `${month + 1}月の予定一覧`}
          </span>
          {selectedDateStr && (
            <button
              onClick={() => setSelectedDateStr(null)}
              className="text-[11px] text-indigo-600 font-medium"
            >
              すべて表示
            </button>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 text-xs text-slate-400">
            この期間のイベントはありません
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between active:bg-slate-50 transition cursor-pointer"
            >
              <div>
                <span className="text-[11px] font-bold text-indigo-600 block">
                  {formatDateSlash(ev.event_date)}
                </span>
                <span className="text-xs font-bold text-slate-800">{ev.title}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                ¥{ev.ticket_price.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}