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

  const [showEventModal, setShowEventModal] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'table'>('list');

  // 過去イベントの展開状態フラグ
  const [showAllPastEvents, setShowAllPastEvents] = useState(false);

  useEffect(() => {
    const paramEventId = searchParams.get('eventId');
    if (paramEventId) {
      setSelectedEventId(paramEventId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (groupId) {
      saveJoinedGroupId(groupId);
      // 初回ロード（キャッシュがあれば優先利用）
      fetchGroupData(false);
    }
  }, [groupId]);

  // forceRefresh: 編集・追加時は true でキャッシュを破棄して最新取得
  const fetchGroupData = async (forceRefresh = false) => {
    if (!groupId) return;

    const cacheKey = `tm_cache_${groupId}`;
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // キャッシュの有効期限を5分間に設定
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

    const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
    const { data: membersData } = await supabase.from('group_members').select('*').eq('group_id', groupId);
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', groupId)
      .order('event_date', { ascending: true });

    let sessData: EventSession[] = [];
    let demData: MemberDemand[] = [];
    let appData: Application[] = [];

    if (eventsData && eventsData.length > 0) {
      const eventIds = eventsData.map((e) => e.id);
      const [sRes, dRes, aRes] = await Promise.all([
        supabase.from('event_sessions').select('*').in('event_id', eventIds),
        supabase.from('member_demands').select('*').in('event_id', eventIds),
        supabase.from('applications').select('*').in('event_id', eventIds),
      ]);

      sessData = sRes.data || [];
      demData = dRes.data || [];
      appData = aRes.data || [];
    }

    setGroup(groupData);
    setMembers(membersData || []);
    setEvents(eventsData || []);
    setSessions(sessData);
    setDemands(demData);
    setApplications(appData);

    // sessionStorage に保存して次回不要なリクエストを抑制
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        group: groupData,
        members: membersData || [],
        events: eventsData || [],
        sessions: sessData,
        demands: demData,
        applications: appData,
      })
    );
  };

  // 50件超過時の過去イベント自動折りたたみロジック
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
      // 50件超で「もっと見る」未押下時は直近の過去イベント10件のみ表示
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
          onOpenSettlement={() => setShowSettlement(true)}
          onOpenActivity={() => setShowActivity(true)}
          onMemberUpdated={() => fetchGroupData(true)}
        />

        {/* コントロールバー */}
        <div className="flex items-center justify-between px-1">
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              リスト
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              カレンダー
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              テーブル
            </button>
          </div>

          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            新規イベント
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
              {/* 過去イベント（50件超過時は折りたたみ表示） */}
              {visiblePastEvents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-400">終了したイベント</span>
                    {shouldFold && hiddenPastEventsCount > 0 && (
                      <button
                        onClick={() => setShowAllPastEvents(true)}
                        className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5 hover:text-indigo-700"
                      >
                        過去のイベントをもっと見る（+{hiddenPastEventsCount}件）
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                    {shouldFold && showAllPastEvents && (
                      <button
                        onClick={() => setShowAllPastEvents(false)}
                        className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5 hover:text-slate-600"
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

              {/* 今後開催予定のイベント */}
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
        />
      )}

      <MyPageModal
        isOpen={showMyPage}
        onClose={() => setShowMyPage(false)}
        events={events}
        demands={demands}
        applications={applications}
        onSelectEvent={(eventId) => setSelectedEventId(eventId)}
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