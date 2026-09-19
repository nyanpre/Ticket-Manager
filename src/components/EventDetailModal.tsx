import { useState, useEffect } from 'react';
import { Calendar, Edit2, X, Share2, Check, Clock, Bell, CircleDollarSign, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { EventItem, EventSession, Application, MemberDemand, GroupMember } from '../types/index';
import { formatDateSlash } from './CalendarView';
import { EventEditForm } from './event-detail/EventEditForm';
import { EventSessionSection } from './event-detail/EventSessionSection';
import { EventApplicationSection } from './event-detail/EventApplicationSection';
import { EventPaymentTab } from './event-detail/EventPaymentTab';

interface Props {
  eventId: string;
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
  onEventDeleted?: () => void;
  // 親コンポーネント（GroupDashboard）が既に持っているデータを引き渡すことで初期通信を0に削減
  initialEvent?: EventItem | null;
  initialSessions?: EventSession[];
  initialMembers?: GroupMember[];
  initialDemands?: MemberDemand[];
  initialApplications?: Application[];
}

export function EventDetailModal({
  eventId,
  groupId,
  isOpen,
  onClose,
  onEventUpdated,
  onEventDeleted,
  initialEvent,
  initialSessions,
  initialMembers,
  initialDemands,
  initialApplications,
}: Props) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [event, setEvent] = useState<EventItem | null>(initialEvent || null);
  const [sessions, setSessions] = useState<EventSession[]>(initialSessions || []);
  const [members, setMembers] = useState<GroupMember[]>(initialMembers || []);
  const [demands, setDemands] = useState<MemberDemand[]>(initialDemands || []);
  const [applications, setApplications] = useState<Application[]>(initialApplications || []);
  const [loading, setLoading] = useState(!initialEvent);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'payment'>('info');

  // 1. ローカルセッションから即時ユーザー取得（HTTP通信ゼロ）
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
  }, []);

  // 2. モーダルが開かれた時のデータ初期化
  useEffect(() => {
    if (isOpen && eventId) {
      setActiveTab('info');
      // 親から既存データが渡されている場合は即時表示（HTTP通信ゼロ）
      if (initialEvent && initialEvent.id === eventId) {
        setEvent(initialEvent);
        if (initialSessions) setSessions(initialSessions.filter((s) => s.event_id === eventId));
        if (initialMembers) setMembers(initialMembers);
        if (initialDemands) setDemands(initialDemands.filter((d) => d.event_id === eventId));
        if (initialApplications) setApplications(initialApplications.filter((a) => a.event_id === eventId));
        setLoading(false);
      } else {
        fetchDetail();
      }
    }
  }, [isOpen, eventId, initialEvent]);

  // 3. データ再フェッチ（更新時または初期データ未保持時）
  const fetchDetail = async () => {
    setLoading(true);

    const [evRes, mRes, sRes, dRes, aRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, group_id, title, event_date, ticket_price, system_fee, ticketing_fee, application_deadline, lottery_result_date, created_at')
        .eq('id', eventId)
        .single(),
      supabase
        .from('group_members')
        .select('id, group_id, user_id, display_name, role, is_guest, created_at')
        .eq('group_id', groupId),
      supabase
        .from('event_sessions')
        .select('id, event_id, name, created_at')
        .eq('event_id', eventId),
      supabase
        .from('member_demands')
        .select('id, event_id, user_id, session_id, created_at')
        .eq('event_id', eventId),
      supabase
        .from('applications')
        .select('id, event_id, session_id, applicant_user_id, pair_user_id, ticket_count, status, is_paid, payment_method, created_at')
        .eq('event_id', eventId),
    ]);

    if (evRes.data) {
      setEvent(evRes.data);
      setMembers(mRes.data || []);
      setSessions(sRes.data || []);
      setDemands(dRes.data || []);
      setApplications(aRes.data || []);
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

  // ゲストまたは自分の希望をトグル
  const handleToggleDemand = async (sessionId: string, targetUserId?: string) => {
    const uid = targetUserId || currentUser?.id;
    if (!uid || !eventId) return;
    const existing = demands.find((d) => d.user_id === uid && d.session_id === sessionId);

    if (existing) {
      await supabase.from('member_demands').delete().eq('id', existing.id);
      setDemands((prev) => prev.filter((d) => d.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('member_demands')
        .insert([{ event_id: eventId, user_id: uid, session_id: sessionId }])
        .select('id, event_id, user_id, session_id, created_at')
        .single();
      if (!error && data) {
        setDemands((prev) => [...prev, data]);
      }
    }
    onEventUpdated();
  };

  // ゲスト名義または自分名義で申込
  const handleAddApplication = async (
    sessionId: string,
    ticketCount: number,
    pairUserId: string,
    paymentMethod?: string,
    applicantUserId?: string
  ) => {
    const applicantId = applicantUserId || currentUser?.id;
    if (!applicantId || !eventId) return;

    const insertPayload: any = {
      event_id: eventId,
      session_id: sessionId,
      applicant_user_id: applicantId,
      pair_user_id: pairUserId || null,
      ticket_count: ticketCount,
      status: 'pending',
    };
    if (paymentMethod) {
      insertPayload.payment_method = paymentMethod;
    }

    const { data, error } = await supabase
      .from('applications')
      .insert([insertPayload])
      .select('id, event_id, session_id, applicant_user_id, pair_user_id, ticket_count, status, is_paid, payment_method, created_at')
      .single();

    if (error) {
      alert(`登録失敗: ${error.message}`);
      return;
    }
    setApplications((prev) => [...prev, data]);
    onEventUpdated();
  };

  const handleStatusChange = async (appId: string, newStatus: 'pending' | 'won' | 'lost') => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    if (!error) {
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
      onEventUpdated();
    }
  };

  const isAdmin = members.some((m) => m.user_id === currentUser?.id && m.role === 'admin');

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-['Noto_Sans_JP']"
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  編集
                </button>
                <button
                  onClick={copyEventShareUrl}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 px-2.5 py-1.5 bg-indigo-50 active:bg-indigo-100 rounded-xl transition cursor-pointer"
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
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* タブ切り替え（編集時以外） */}
        {!isEditing && !loading && event && (
          <div className="flex border-b border-slate-100 px-4 bg-white shrink-0">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>情報・申込</span>
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'payment'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <CircleDollarSign className="w-3.5 h-3.5" />
              <span>精算管理</span>
            </button>
          </div>
        )}

        {/* コンテンツ */}
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
          ) : activeTab === 'payment' ? (
            <EventPaymentTab
              event={event}
              applications={applications}
              demands={demands}
              members={members}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
            />
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDateSlash(event.event_date)}</span>
                  </div>

                  {event.application_deadline && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                      <Clock className="w-3 h-3" />
                      締切: {formatDateSlash(event.application_deadline)}
                    </span>
                  )}

                  {event.lottery_result_date && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                      <Bell className="w-3 h-3" />
                      発表: {formatDateSlash(event.lottery_result_date)}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-slate-800 mt-1">{event.title}</h2>
              </div>

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

              <EventSessionSection
                sessions={sessions}
                applications={applications}
                demands={demands}
                members={members}
                currentUserId={currentUser?.id}
                onToggleDemand={handleToggleDemand}
              />

              <EventApplicationSection
                event={event}
                applications={applications}
                sessions={sessions}
                members={members}
                currentUserId={currentUser?.id}
                onAddApplication={handleAddApplication}
                onStatusChange={handleStatusChange}
                onApplicationUpdated={() => {
                  fetchDetail();
                  onEventUpdated();
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetailModal;