import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EventItem } from '../../types';

interface Props {
  event: EventItem;
  onCancel: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EventEditForm({ event, onCancel, onSaved, onDeleted }: Props) {
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(event.event_date);
  const [editTicketPrice, setEditTicketPrice] = useState(event.ticket_price);
  const [editSystemFee, setEditSystemFee] = useState(event.system_fee);
  const [editTicketingFee, setEditTicketingFee] = useState(event.ticketing_fee);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!editTitle.trim() || !editDate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editTitle,
          event_date: editDate,
          ticket_price: editTicketPrice,
          system_fee: editSystemFee,
          ticketing_fee: editTicketingFee,
        })
        .eq('id', event.id);

      if (error) throw error;
      onSaved();
    } catch (err: any) {
      alert(`保存エラー: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`イベント「${event.title}」を削除しますか？\n紐づく申込や希望データも完全に削除されます。`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      onDeleted();
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">イベント名</label>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">開催日</label>
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">定価 (円)</label>
          <input
            type="number"
            value={editTicketPrice}
            onChange={(e) => setEditTicketPrice(parseInt(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">申込手数料</label>
          <input
            type="number"
            value={editSystemFee}
            onChange={(e) => setEditSystemFee(parseInt(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">発券手数料</label>
          <input
            type="number"
            value={editTicketingFee}
            onChange={(e) => setEditTicketingFee(parseInt(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-1 py-2 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? '保存中...' : '変更を保存'}
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? '削除中...' : 'このイベントを削除する'}
        </button>
      </div>
    </div>
  );
}