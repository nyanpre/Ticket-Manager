import { useState, useEffect } from 'react';
import { Calendar, Edit2, X, Share2, Check } from 'lucide-react';
import { supabase, getOrCreateAnonymousUser } from '../lib/supabase';
import type { EventItem, EventSession, Application, MemberDemand, GroupMember } from '../types';
import { formatDateSlash } from './CalendarView';
import { EventEditForm } from './event-detail/EventEditForm';
import { EventSessionSection } from './event-detail/EventSessionSection';
import { EventApplicationSection } from './event-detail/EventApplicationSection';

interface Props {
  eventId: string;
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
  onEventDeleted?: () => void;
}

export function EventDetailModal({
  eventId,
  groupId,
  isOpen,
  onClose,
  onEventUpdated,
  onEventDeleted,
}: Props) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [demands, setDemands] = useState<MemberDemand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchDetail();
    }
  }, [isOpen, eventId]);

  const fetchDetail = async () => {
    setLoading(true);
    const user = await getOrCreateAnonymousUser();
    setCurrentUser(user);

    const { data: evData } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (evData) {
      setEvent(evData);
      const { data: sData } = await supabase.from('event_sessions').select('*').eq('event_id', eventId);
      setSessions(sData || []);

      const { data: mData } = await supabase.from('group_members').select('*').eq('group_id', evData.group_id);
      setMembers(mData || []);

      const { data: dData } = await supabase.from('member_demands').select('*').eq('event_id', eventId);
      setDemands(dData || []);

      const { data: aData } = await supabase.from('applications').select('*').eq('event_id', eventId);
      setApplications(aData || []);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const copyEventShareUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}#/group/${groupId}?eventId=${eventId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (isEditing && !window.confirm('編集内容を破棄して戻りますか？')) return;
      setIsEditing(false);
      onClose();
    }
  };

  const handleToggleDemand = async (sessionId: string) => {
    if (!currentUser || !eventId) return;
    const existing = demands.find((d) => d.user_id === currentUser.id && d.session_id === sessionId);

    if (existing) {
      await supabase.from('member_demands').delete().eq('id', existing.id);
      setDemands(demands.filter((d) => d.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('member_demands')
        .insert([{ event_id: eventId, user_id: currentUser.id, session_id: sessionId }])
        .select()
        .single();
      if (!error && data) setDemands([...demands, data]);
    }
  };

  const handleAddApplication = async (sessionId: string, ticketCount: number, pairUserId: string) => {
    if (!currentUser || !eventId) return;
    const { data, error } = await supabase
      .from('applications')
      .insert([{
        event_id: eventId,
        session_id: sessionId,
        applicant_user_id: currentUser.id,
        pair_user_id: pairUserId || null,
        ticket_count: ticketCount,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      alert(`登録失敗: ${error.message}`);
      return;
    }
    setApplications([...applications, data]);
  };

  const handleStatusChange = async (appId: string, newStatus: 'pending' | 'won' | 'lost') => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    if (!error) {
      setApplications(applications.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー操作バー */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 bg-slate-100 rounded-xl transition"
                >
                  <Edit2 className="w-3 h-3" />
                  編集
                </button>
                <button
                  onClick={copyEventShareUrl}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 px-2.5 py-1.5 bg-indigo-50 active:bg-indigo-100 rounded-xl transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Share2 className="w-3 h-3" />}
                  {copied ? 'URLコピー済' : 'URL共有'}
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => {
              if (isEditing && !window.confirm('編集内容を破棄して戻りますか？')) return;
              setIsEditing(false);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading || !event ? (
            <div className="py-8 text-center text-xs text-slate-400">読み込み中...</div>
          ) : isEditing ? (
            <EventEditForm
              event={event}
              onCancel={() => setIsEditing(false)}
              onSaved={() => {
                setIsEditing(false);
                fetchDetail();
                onEventUpdated();
              }}
              onDeleted={() => {
                onClose();
                if (onEventDeleted) onEventDeleted();
                else onEventUpdated();
              }}
            />
          ) : (
            <>
              <div>
                <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateSlash(event.event_date)}</span>
                </div>
                <h2 className="text-base font-bold text-slate-800 mt-0.5">{event.title}</h2>
              </div>

              {/* 料金サマリー */}
              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 flex items-center justify-around text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">単価</span>
                  <span className="font-bold text-slate-700">¥{event.ticket_price.toLocaleString()}</span>
                </div>
                <div className="h-5 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block">申込手数料</span>
                  <span className="font-bold text-slate-700">¥{event.system_fee.toLocaleString()}</span>
                </div>
                <div className="h-5 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block">発券手数料</span>
                  <span className="font-bold text-slate-700">¥{event.ticketing_fee.toLocaleString()}/枚</span>
                </div>
              </div>

              {/* 公演枠・需給照合 */}
              <EventSessionSection
                sessions={sessions}
                applications={applications}
                demands={demands}
                members={members}
                currentUserId={currentUser?.id}
                onToggleDemand={handleToggleDemand}
              />

              {/* 申込・当落明細 */}
              <EventApplicationSection
                applications={applications}
                sessions={sessions}
                members={members}
                currentUserId={currentUser?.id}
                onAddApplication={handleAddApplication}
                onStatusChange={handleStatusChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}