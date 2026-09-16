import { useState } from 'react';
import { Plus, Trash2, CalendarPlus, X, Clock, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SESSION_PRESETS = [
  '昼の部',
  '夜の部',
  '1部',
  '2部',
  '3部',
  '4部',
  '（空欄・指定なし）',
];

interface Props {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventModal({ groupId, isOpen, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [lotteryResultDate, setLotteryResultDate] = useState('');
  const [ticketPrice, setTicketPrice] = useState('9800');
  const [systemFee, setSystemFee] = useState('880');
  const [ticketingFee, setTicketingFee] = useState('330');
  const [selectedSessions, setSelectedSessions] = useState<string[]>(['昼の部', '夜の部']);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const addSessionRow = () => {
    setSelectedSessions([...selectedSessions, '昼の部']);
  };

  const updateSessionRow = (index: number, val: string) => {
    const updated = [...selectedSessions];
    updated[index] = val;
    setSelectedSessions(updated);
  };

  const removeSessionRow = (index: number) => {
    if (selectedSessions.length <= 1) return;
    setSelectedSessions(selectedSessions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate || !groupId) return;

    setCreating(true);
    try {
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([{
          group_id: groupId,
          title,
          event_date: eventDate,
          application_deadline: applicationDeadline || null,
          lottery_result_date: lotteryResultDate || null,
          ticket_price: parseInt(ticketPrice) || 0,
          system_fee: parseInt(systemFee) || 0,
          ticketing_fee: parseInt(ticketingFee) || 0,
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      const validSessions = selectedSessions
        .map((s) => (s === '（空欄・指定なし）' ? '指定なし' : s.trim()))
        .filter(Boolean);

      const sessionInserts = validSessions.map((name) => ({
        event_id: newEvent.id,
        name,
      }));

      if (sessionInserts.length > 0) {
        const { error: sessionError } = await supabase.from('event_sessions').insert(sessionInserts);
        if (sessionError) throw sessionError;
      }

      // リセット & コールバック
      setTitle('');
      setEventDate('');
      setApplicationDeadline('');
      setLotteryResultDate('');
      setSelectedSessions(['昼の部', '夜の部']);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`イベント作成エラー: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (title.trim() || eventDate) {
        const confirmClose = window.confirm('入力内容を破棄して戻りますか？');
        if (!confirmClose) return;
      }
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-['Noto_Sans_JP']"
    >
      {/* エメラルドグリーンの外枠線とリング装飾 */}
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl border-2 border-emerald-500/80 ring-4 ring-emerald-500/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-4 border-b border-emerald-100/80 flex items-center justify-between shrink-0 bg-emerald-50/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm shadow-emerald-200">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase bg-emerald-100/80 px-2 py-0.5 rounded-full">
                New Event
              </span>
              <h3 className="text-sm font-bold text-slate-800 mt-0.5">イベント新規登録</h3>
            </div>
          </div>
          <button
            onClick={() => {
              if ((title.trim() || eventDate) && !window.confirm('入力内容を破棄して戻りますか？')) return;
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム入力エリア */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">イベント名 *</label>
              <input
                type="text"
                required
                placeholder="例: ライブツアー 東京公演"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">イベント開催日 *</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* 申込期限 & 当落発表（任意入力） */}
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  申込期限 <span className="text-[10px] text-slate-400 font-normal">(任意)</span>
                </label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  当落発表 <span className="text-[10px] text-slate-400 font-normal">(任意)</span>
                </label>
                <input
                  type="date"
                  value={lotteryResultDate}
                  onChange={(e) => setLotteryResultDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 公演枠選択 */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">公演枠（部）</label>
                <button
                  type="button"
                  onClick={addSessionRow}
                  className="text-[11px] text-emerald-700 font-bold flex items-center gap-0.5 hover:text-emerald-800"
                >
                  <Plus className="w-3 h-3" />
                  枠を追加
                </button>
              </div>

              {selectedSessions.map((sessionVal, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={sessionVal}
                    onChange={(e) => updateSessionRow(idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {SESSION_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>

                  {selectedSessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSessionRow(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 料金設定 */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">定価 (円/枚)</label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">申込手数料 (回)</label>
                <input
                  type="number"
                  value={systemFee}
                  onChange={(e) => setSystemFee(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">発券手数料 (枚)</label>
                <input
                  type="number"
                  value={ticketingFee}
                  onChange={(e) => setTicketingFee(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full mt-3 py-3 bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-200 transition"
            >
              {creating ? '登録中...' : 'この内容でイベントを作成'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}