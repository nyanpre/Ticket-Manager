import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Ticket, Plus, List, Calendar as CalendarIcon, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Group, GroupMember, EventItem, EventSession, Application, MemberDemand } from '../types/index';
import { GroupHeader } from '../components/GroupHeader';
import { EventCard } from '../components/EventCard';
import { CreateEventModal } from '../components/CreateEventModal';
import { CalendarView } from '../components/CalendarView';
import { TableView } from '../components/TableView';
import { EventDetailModal } from '../components/EventDetailModal';
import { MyPageModal } from '../components/MyPageModal';
import { SettlementModal } from '../components/SettlementModal';
import { ActivityModal } from '../components/ActivityModal';
import { ProfileModal } from '../components/ProfileModal';
import { saveJoinedGroupId } from '../utils/storage';

export function GroupDashboard() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [demands, setDemands] = useState<MemberDemand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'table'>('list');

  const [showAllPastEvents, setShowAllPastEvents] = useState(false);

  // 1. ユーザーセッションをローカルキャッシュから即座に取得（HTTP通信ゼロ）
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const paramEventId = searchParams.get('eventId');
    if (paramEventId) {
      setSelectedEventId(paramEventId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (groupId) {
      saveJoinedGroupId(groupId);
      fetchGroupData(false);
    }
  }, [groupId]);

  // ログインユーザーが未参加の場合のみ登録を実行（所属済なら通信ゼロ）
  const ensureUserJoined = async (user: any, currentMembers: GroupMember[]) => {
    if (!groupId || !user) return;
    const isJoined = currentMembers.some((m) => m.user_id === user.id);
    if (isJoined) return;

    const displayName =
      user.user_metadata?.display_name || user.email?.split('@')[0] || 'メンバー';

    const { data } = await supabase
      .from('group_members')
      .insert([
        {
          group_id: groupId,
          user_id: user.id,
          display_name: displayName,
          role: 'member',
        },
      ])
      .select('id, group_id, user_id, display_name, role, is_guest, created_at')
      .single();

    if (data) {
      setMembers((prev) => [...prev, data]);
    }
  };

  const fetchGroupData = async (forceRefresh = false) => {
    if (!groupId) return;

    const cacheKey = `tm_cache_${groupId}`;
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // キャッシュが5分以内の場合は通信を行わずに即時復元
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setGroup(parsed.group);
            setMembers(parsed.members);
            setEvents(parsed.events);
            setSessions(parsed.sessions);
            setDemands(parsed.demands);
            setApplications(parsed.applications);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 結合クエリを活用し、グループ情報・メンバー・イベント・関連データを最小の2クエリで取得
    const [groupRes, eventsRes] = await Promise.all([
      supabase
        .from('groups')
        .select(`
          id, name, invite_token, created_at,
          group_members (id, group_id, user_id, display_name, role, is_guest, created_at)
        `)
        .eq('id', groupId)
        .single(),
      supabase
        .from('events')
        .select(`
          id, group_id, title, event_date, ticket_price, system_fee, ticketing_fee, application_deadline, lottery_result_date, created_at,
          event_sessions (id, event_id, name, created_at),
          member_demands (id, event_id, user_id, session_id, created_at),
          applications (id, event_id, session_id, applicant_user_id, pair_user_id, ticket_count, status, is_paid, payment_method, created_at)
        `)
        .eq('group_id', groupId)
        .order('event_date', { ascending: true }),
    ]);

    const groupRaw = groupRes.data;
    const membersData: GroupMember[] = groupRaw?.group_members || [];
    const groupData: Group | null = groupRaw
      ? {
          id: groupRaw.id,
          name: groupRaw.name,
          invite_token: groupRaw.invite_token,
          created_at: groupRaw.created_at,
        }
      : null;

    const rawEvents = eventsRes.data || [];

    const parsedEvents: EventItem[] = [];
    const parsedSessions: EventSession[] = [];
    const parsedDemands: MemberDemand[] = [];
    const parsedApps: Application[] = [];

    rawEvents.forEach((ev: any) => {
      if (ev.event_sessions) parsedSessions.push(...ev.event_sessions);
      if (ev.member_demands) parsedDemands.push(...ev.member_demands);
      if (ev.applications) parsedApps.push(...ev.applications);

      parsedEvents.push({
        id: ev.id,
        group_id: ev.group_id,
        title: ev.title,
        event_date: ev.event_date,
        ticket_price: ev.ticket_price,
        system_fee: ev.system_fee,
        ticketing_fee: ev.ticketing_fee,
        application_deadline: ev.application_deadline,
        lottery_result_date: ev.lottery_result_date,
        created_at: ev.created_at,
      });
    });

    setGroup(groupData);
    setMembers(membersData);
    setEvents(parsedEvents);
    setSessions(parsedSessions);
    setDemands(parsedDemands);
    setApplications(parsedApps);

    // キャッシュ保存
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        group: groupData,
        members: membersData,
        events: parsedEvents,
        sessions: parsedSessions,
        demands: parsedDemands,
        applications: parsedApps,
      })
    );

    // セッションキャッシュからユーザーを取り出して参加確認
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await ensureUserJoined(session.user, membersData);
    }
  };

  const handleProfileUpdated = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
    }
    fetchGroupData(true);
  };

  const { upcomingEvents, visiblePastEvents, hiddenPastEventsCount, shouldFold } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming: EventItem[] = [];
    const past: EventItem[] = [];

    events.forEach((ev) => {
      if (ev.event_date >= today) {
        upcoming.push(ev);
      } else {
        past.push(ev);
      }
    });

    const isLargeList = events.length > 50;

    if (isLargeList && !showAllPastEvents) {
      const visiblePast = past.slice(-10);
      return {
        upcomingEvents: upcoming,
        visiblePastEvents: visiblePast,
        hiddenPastEventsCount: past.length - visiblePast.length,
        shouldFold: true,
      };
    }

    return {
      upcomingEvents: upcoming,
      visiblePastEvents: past,
      hiddenPastEventsCount: 0,
      shouldFold: isLargeList,
    };
  }, [events, showAllPastEvents]);

  if (!group) return <div className="p-8 text-center text-xs text-slate-400">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pt-safe pb-safe font-['Noto_Sans_JP']">
      <div className="max-w-md w-full mx-auto px-4 py-4 space-y-4 flex-1">
        <GroupHeader
          group={group}
          members={members}
          onOpenMyPage={() => setShowMyPage(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSettlement={() => setShowSettlement(true)}
          onOpenActivity={() => setShowActivity(true)}
          onMemberUpdated={() => fetchGroupData(true)}
        />

        {/* コントロールバー */}
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center gap-0.5 min-w-0">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-3 h-3 shrink-0" />
              <span>リスト</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarIcon className="w-3 h-3 shrink-0" />
              <span>カレンダー</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="w-3 h-3 shrink-0" />
              <span>テーブル</span>
            </button>
          </div>

          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-1 px-2.5 py-2 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>新規イベント</span>
          </button>
        </div>

        {/* 画面ビュー表示 */}
        {viewMode === 'list' && (
          events.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-2">
              <Ticket className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-500">予定されているイベントはありません</p>
              <p className="text-[11px] text-slate-400">右上の「新規イベント」から登録してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visiblePastEvents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-400">終了したイベント</span>
                    {shouldFold && hiddenPastEventsCount > 0 && (
                      <button
                        onClick={() => setShowAllPastEvents(true)}
                        className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5 hover:text-indigo-700 cursor-pointer"
                      >
                        過去のイベントをもっと見る（+{hiddenPastEventsCount}件）
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                    {shouldFold && showAllPastEvents && (
                      <button
                        onClick={() => setShowAllPastEvents(false)}
                        className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5 hover:text-slate-600 cursor-pointer"
                      >
                        一部を折りたたむ
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 opacity-80">
                    {visiblePastEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        sessions={sessions}
                        applications={applications}
                        demands={demands}
                        onClick={() => setSelectedEventId(ev.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-indigo-600 px-1">今後のイベント予定</span>
                <div className="space-y-2.5">
                  {upcomingEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-5 text-center text-xs text-slate-400 border border-slate-200/80">
                      直近の開催予定イベントはありません
                    </div>
                  ) : (
                    upcomingEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        sessions={sessions}
                        applications={applications}
                        demands={demands}
                        onClick={() => setSelectedEventId(ev.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            events={events}
            onSelectEvent={(ev) => setSelectedEventId(ev.id)}
          />
        )}

        {viewMode === 'table' && (
          <TableView
            events={events}
            sessions={sessions}
            demands={demands}
            applications={applications}
            onSelectEvent={(ev: EventItem) => setSelectedEventId(ev.id)}
          />
        )}
      </div>

      {groupId && (
        <CreateEventModal
          groupId={groupId}
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSuccess={() => fetchGroupData(true)}
        />
      )}

      {selectedEventId && groupId && (
        <EventDetailModal
          eventId={selectedEventId}
          groupId={groupId}
          isOpen={Boolean(selectedEventId)}
          onClose={() => setSelectedEventId(null)}
          onEventUpdated={() => fetchGroupData(true)}
          onEventDeleted={() => fetchGroupData(true)}
          initialEvent={events.find((e) => e.id === selectedEventId) || null}
          initialSessions={sessions.filter((s) => s.event_id === selectedEventId)}
          initialMembers={members}
          initialDemands={demands.filter((d) => d.event_id === selectedEventId)}
          initialApplications={applications.filter((a) => a.event_id === selectedEventId)}
        />
      )}

      {/* 精算状況・自分のチケット確認モーダル */}
      <MyPageModal
        isOpen={showMyPage}
        onClose={() => setShowMyPage(false)}
        events={events}
        demands={demands}
        applications={applications}
        members={members}
        onSelectEvent={(eventId) => setSelectedEventId(eventId)}
      />

      {/* プロフィール設定モーダル */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onProfileUpdated={handleProfileUpdated}
      />

      <SettlementModal
        isOpen={showSettlement}
        onClose={() => setShowSettlement(false)}
        members={members}
        events={events}
        applications={applications}
        demands={demands}
      />

      <ActivityModal
        isOpen={showActivity}
        onClose={() => setShowActivity(false)}
        members={members}
        events={events}
        sessions={sessions}
        applications={applications}
        demands={demands}
        onSelectEvent={(eventId) => setSelectedEventId(eventId)}
      />
    </div>
  );
}

export default GroupDashboard;