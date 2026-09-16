import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase, getOrCreateAnonymousUser } from '../lib/supabase';
import type { EventItem, EventSession, Application, MemberDemand, GroupMember } from '../types';
import { formatDateSlash } from '../components/CalendarView';

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [demands, setDemands] = useState<MemberDemand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // 申込追加フォームモーダル
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applySessionId, setApplySessionId] = useState('');
  const [applyCount, setApplyCount] = useState(2);
  const [applyPairUid, setApplyPairUid] = useState<string>('');
  const [submittingApply, setSubmittingApply] = useState(false);

  useEffect(() => {
    initData();
  }, [eventId]);

  const initData = async () => {
    if (!eventId) return;
    setLoading(true);

    const user = await getOrCreateAnonymousUser();
    setCurrentUser(user);

    // 1. イベント情報取得
    const { data: evData } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (!evData) {
      setLoading(false);
      return;
    }
    setEvent(evData);

    // 2. セッション一覧
    const { data: sessionData } = await supabase.from('event_sessions').select('*').eq('event_id', eventId);
    setSessions(sessionData || []);
    if (sessionData && sessionData.length > 0) {
      setApplySessionId(sessionData[0].id);
    }

    // 3. グループメンバー一覧
    const { data: memberData } = await supabase.from('group_members').select('*').eq('group_id', evData.group_id);
    setMembers(memberData || []);

    // 4. 参加希望一覧
    const { data: demandData } = await supabase.from('member_demands').select('*').eq('event_id', eventId);
    setDemands(demandData || []);

    // 5. 申込状況一覧
    const { data: appData } = await supabase.from('applications').select('*').eq('event_id', eventId);
    setApplications(appData || []);

    setLoading(false);
  };

  // 参加希望のトグル
  const handleToggleDemand = async (sessionId: string) => {
    if (!currentUser || !eventId) return;

    const existing = demands.find((d) => d.user_id === currentUser.id && d.session_id === sessionId);

    if (existing) {
      await supabase.from('member_demands').delete().eq('id', existing.id);
      setDemands(demands.filter((d) => d.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('member_demands')
        .insert([{
          event_id: eventId,
          user_id: currentUser.id,
          session_id: sessionId
        }])
        .select()
        .single();

      if (!error && data) {
        setDemands([...demands, data]);
      }
    }
  };

  // 申込の新規登録
  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !eventId || !applySessionId) return;

    setSubmittingApply(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([{
          event_id: eventId,
          session_id: applySessionId,
          applicant_user_id: currentUser.id,
          pair_user_id: applyPairUid || null,
          ticket_count: applyCount,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      setApplications([...applications, data]);
      setShowApplyModal(false);
    } catch (err: any) {
      alert(`登録に失敗しました: ${err.message}`);
    } finally {
      setSubmittingApply(false);
    }
  };

  // 当落ステータスの切り替え
  const handleStatusChange = async (appId: string, newStatus: 'pending' | 'won' | 'lost') => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    if (!error) {
      setApplications(applications.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
    }
  };

  const getMemberName = (uid: string) => {
    return members.find((m) => m.user_id === uid)?.display_name || '未登録';
  };

  if (loading) return <div className="p-8 text-center text-xs text-slate-400">イベント情報を読み込み中...</div>;
  if (!event) return <div className="p-8 text-center text-xs text-rose-500">イベントが見つかりません</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pt-safe pb-safe">
      <div className="max-w-md w-full mx-auto px-4 py-4 space-y-4 flex-1">
        {/* ナビゲーションバー */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 active:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
              <Calendar className="w-3 h-3" />
              <span>{formatDateSlash(event.event_date)}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">{event.title}</h1>
          </div>
        </div>

        {/* 料金・基本情報チップス */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-around text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">チケット単価</span>
            <span className="font-bold text-slate-700">¥{event.ticket_price.toLocaleString()}</span>
          </div>
          <div className="h-6 w-px bg-slate-100" />
          <div>
            <span className="text-[10px] text-slate-400 block">申込手数料</span>
            <span className="font-bold text-slate-700">¥{event.system_fee.toLocaleString()}</span>
          </div>
          <div className="h-6 w-px bg-slate-100" />
          <div>
            <span className="text-[10px] text-slate-400 block">発券手数料</span>
            <span className="font-bold text-slate-700">¥{event.ticketing_fee.toLocaleString()}/枚</span>
          </div>
        </div>

        {/* 公演枠サマリー＆希望表明カード */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-800 block">参加希望と過不足状況</span>

          <div className="space-y-2.5">
            {sessions.map((sess) => {
              const sessionDemands = demands.filter((d) => d.session_id === sess.id);
              const wonTickets = applications
                .filter((a) => a.session_id === sess.id && a.status === 'won')
                .reduce((sum, a) => sum + a.ticket_count, 0);

              const isMyDemand = demands.some((d) => d.session_id === sess.id && d.user_id === currentUser?.id);
              const diff = wonTickets - sessionDemands.length;

              return (
                <div key={sess.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{sess.name}</span>
                    <button
                      onClick={() => handleToggleDemand(sess.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                        isMyDemand
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {isMyDemand ? '✓ 希望中' : '参加を希望する'}
                    </button>
                  </div>

                  {/* サマリーバー */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">
                      希望: <strong className="text-slate-700">{sessionDemands.length}人</strong> / 当選:{' '}
                      <strong className="text-indigo-600">{wonTickets}枚</strong>
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                        diff === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : diff > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {diff === 0 ? '過不足なし' : diff > 0 ? `${diff}枚 余り` : `${Math.abs(diff)}枚 不足`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 申込・当落一覧セクション */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-700">申込状況・当落結果</h2>
            <button
              onClick={() => setShowApplyModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              申込を追加
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 text-xs text-slate-400">
              まだ申込データはありません。「申込を追加」から登録してください。
            </div>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => {
                const sessionName = sessions.find((s) => s.id === app.session_id)?.name || '';
                const applicantName = getMemberName(app.applicant_user_id);
                const pairName = app.pair_user_id ? getMemberName(app.pair_user_id) : null;

                return (
                  <div key={app.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                          {sessionName}
                        </span>
                        <div className="text-xs font-bold text-slate-800 mt-1">
                          {applicantName} 名義（{app.ticket_count}連番）
                        </div>
                        {pairName && <div className="text-[10px] text-slate-400">同行指定: {pairName}</div>}
                      </div>

                      {/* ステータスバッジ */}
                      <div>
                        {app.status === 'won' && (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 当選
                          </span>
                        )}
                        {app.status === 'lost' && (
                          <span className="flex items-center gap-1 text-rose-500 text-xs font-bold bg-rose-50 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-3.5 h-3.5" /> 落選
                          </span>
                        )}
                        {app.status === 'pending' && (
                          <span className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" /> 結果待ち
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 当落切り替えボタン */}
                    <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleStatusChange(app.id, 'won')}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition ${
                          app.status === 'won'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        当選
                      </button>
                      <button
                        onClick={() => handleStatusChange(app.id, 'lost')}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition ${
                          app.status === 'lost'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        落選
                      </button>
                      <button
                        onClick={() => handleStatusChange(app.id, 'pending')}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition ${
                          app.status === 'pending'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        待機中
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 申込追加モーダル */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end backdrop-blur-[2px]">
          <div className="bg-white rounded-t-[32px] p-6 pb-safe space-y-4 max-w-md w-full mx-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">申込内容の登録</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 text-xs px-2 py-1">
                閉じる
              </button>
            </div>

            <form onSubmit={handleAddApplication} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">対象の公演枠</label>
                <select
                  value={applySessionId}
                  onChange={(e) => setApplySessionId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">連番枚数</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={applyCount}
                  onChange={(e) => setApplyCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">同行予定者（任意）</label>
                <select
                  value={applyPairUid}
                  onChange={(e) => setApplyPairUid(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="">指定なし</option>
                  {members
                    .filter((m) => m.user_id !== currentUser?.id)
                    .map((m) => (
                      <option key={m.id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingApply}
                className="w-full mt-2 py-3 bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md transition"
              >
                {submittingApply ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}