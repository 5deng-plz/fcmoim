import { createClient } from '@supabase/supabase-js';

const clubId = process.env.NEXT_PUBLIC_DEFAULT_CLUB_ID || '00000000-0000-0000-0000-000000000001';
const seasonId = '00000000-0000-0000-0000-000000000101';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

assertLocalOnly();

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const qaUsers = [
  { email: 'qa-admin@fcmoim.test', nickname: '김영수', role: 'admin', position: 'MF', ovr: 78, points: 132, stats: { attack: 76, defense: 75, stamina: 80, mentality: 81, speed: 74, manner: 82 }, height: 176, weight: 72, birth: '1988-03-14', residence: '서울 마포구', preferredFoot: 'right' },
  { email: 'qa-operator@fcmoim.test', nickname: '박영철', role: 'operator', position: 'DF', ovr: 76, points: 126, stats: { attack: 61, defense: 84, stamina: 77, mentality: 83, speed: 68, manner: 80 }, height: 181, weight: 78, birth: '1986-11-02', residence: '서울 송파구', preferredFoot: 'left' },
  { email: 'qa-member1@fcmoim.test', nickname: '이영식', role: 'member', position: 'FW', ovr: 81, points: 118, stats: { attack: 88, defense: 55, stamina: 78, mentality: 77, speed: 86, manner: 78 }, height: 174, weight: 70, birth: '1991-07-21', residence: '경기 성남시', preferredFoot: 'right' },
  { email: 'qa-member2@fcmoim.test', nickname: '최광수', role: 'member', position: 'MF', ovr: 74, points: 111, stats: { attack: 72, defense: 70, stamina: 84, mentality: 73, speed: 72, manner: 81 }, height: 178, weight: 74, birth: '1990-09-09', residence: '서울 강동구', preferredFoot: 'both' },
  { email: 'qa-member3@fcmoim.test', nickname: '정상철', role: 'member', position: 'DF', ovr: 71, points: 104, stats: { attack: 52, defense: 82, stamina: 72, mentality: 75, speed: 64, manner: 80 }, height: 183, weight: 80, birth: '1989-12-18', residence: '경기 하남시', preferredFoot: 'left' },
  { email: 'qa-member4@fcmoim.test', nickname: '한민수', role: 'member', position: 'MF', ovr: 69, points: 98, stats: { attack: 68, defense: 66, stamina: 73, mentality: 69, speed: 70, manner: 72 }, height: 172, weight: 68, birth: '1994-05-06', residence: '서울 광진구', preferredFoot: 'right' },
  { email: 'qa-new@fcmoim.test', nickname: '오현우', role: 'member', position: 'MF', ovr: 64, points: 100, stats: { attack: 61, defense: 60, stamina: 66, mentality: 63, speed: 65, manner: 69 }, height: 175, weight: 71, birth: '1996-01-27', residence: '서울 은평구', preferredFoot: 'right' },
];

const qaMembershipFixtures = [
  ...qaUsers
    .filter((qaUser) => qaUser.email !== 'qa-new@fcmoim.test')
    .map((qaUser) => ({ ...qaUser, clubId, status: 'approved' })),
];

await upsertClubsAndSeasons();
const usersByEmail = await fetchUsersByEmail();
const memberships = await upsertMemberships(usersByEmail);
const byEmail = Object.fromEntries(
  memberships
    .filter((membership) => membership.clubId === clubId)
    .map((membership) => [membership.email, membership]),
);

await upsertAnnouncements(byEmail['qa-admin@fcmoim.test'].id);
await upsertPolls(byEmail);
await upsertMatches(byEmail);
await upsertRewards(byEmail);

console.log('Seeded rich local demo data.');
console.log(`Club: ${clubId}`);
console.log(`Season: ${seasonId}`);
console.log(`Members: ${memberships.length}`);

function assertLocalOnly() {
  if (process.env.FC_RUN_LOCAL_SUPABASE_API_TESTS !== 'true') {
    throw new Error('FC_RUN_LOCAL_SUPABASE_API_TESTS=true is required for local demo seed.');
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost):54321\b/i.test(supabaseUrl)) {
    throw new Error(`Refusing to seed demo data outside local Supabase: ${supabaseUrl}`);
  }
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.');
  }
}

async function upsertClubsAndSeasons() {
  const { error: clubError } = await supabase.from('clubs').upsert({
      id: clubId,
      name: 'FC Guppy',
      slug: 'fc-guppy',
      description: 'FC Guppy는 함께 뛰고 성장하는 풋살 팀입니다.',
      is_public: true,
      logo_url: null,
    });
  if (clubError) throw new Error(`Failed to seed clubs: ${clubError.message}`);

  const { error: seasonError } = await supabase.from('seasons').upsert({
      id: seasonId,
      club_id: clubId,
      name: '2026 Guppy 시즌',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: true,
    });
  if (seasonError) throw new Error(`Failed to seed seasons: ${seasonError.message}`);
}

async function fetchUsersByEmail() {
  const usersByEmail = new Map();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);

    for (const user of data.users) {
      if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
    }
    if (data.users.length < 1000) break;
  }

  for (const qaUser of qaUsers) {
    if (!usersByEmail.has(qaUser.email)) {
      throw new Error(`Missing QA auth user. Run npm run qa:seed-auth:local first: ${qaUser.email}`);
    }
  }

  return usersByEmail;
}

async function upsertMemberships(usersByEmail) {
  const { error: accountError } = await supabase.from('accounts').upsert(qaUsers.map((fixture) => ({
    id: usersByEmail.get(fixture.email).id,
    display_name: fixture.nickname,
  })));
  if (accountError) throw new Error(`Failed to sync demo account names: ${accountError.message}`);

  const rows = qaMembershipFixtures.map((fixture) => {
    const user = usersByEmail.get(fixture.email);
    return {
      account_id: user.id,
      club_id: fixture.clubId,
      profile_name: fixture.nickname,
      main_position: fixture.position,
      role: fixture.role,
      status: fixture.status,
      ovr: fixture.ovr,
      stats: fixture.stats,
      match_points: fixture.points,
      preferred_foot: fixture.preferredFoot,
      residence: fixture.residence,
      birth: fixture.birth,
      height: fixture.height,
      weight: fixture.weight,
    };
  });

  const { data, error } = await supabase
    .from('team_memberships')
    .upsert(rows, { onConflict: 'account_id,club_id' })
    .select('id, account_id, club_id, profile_name, role, status');
  if (error) throw new Error(`Failed to upsert demo memberships: ${error.message}`);

  return data.map((membership) => {
    const qaUser = qaUsers.find((candidate) => usersByEmail.get(candidate.email).id === membership.account_id);
    return {
      ...membership,
      clubId: membership.club_id,
      email: qaUser.email,
      nickname: qaUser.nickname,
    };
  });
}

async function upsertAnnouncements(authorMembershipId) {
  const { error } = await supabase.from('announcements').upsert([
    {
      id: '10000000-0000-0000-0000-000000000001',
      club_id: clubId,
      season_id: seasonId,
      title: 'Round 7 공지',
      content: '토요일 저녁 8시, 잠실 풋살장에서 Round 7을 진행합니다.',
      author_membership_id: authorMembershipId,
      is_pinned: true,
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      club_id: clubId,
      season_id: seasonId,
      title: '회비 정산 안내',
      content: '5월 회비 정산 내역을 확인해 주세요.',
      author_membership_id: authorMembershipId,
      is_pinned: false,
    },
  ]);
  if (error) throw new Error(`Failed to seed announcements: ${error.message}`);
}

async function upsertPolls(byEmail) {
  const pollId = '20000000-0000-0000-0000-000000000001';
  const option1 = '20000000-0000-0000-0000-000000000101';
  const option2 = '20000000-0000-0000-0000-000000000102';
  const mayPollId = '20000000-0000-0000-0000-000000000011';
  const mayOption1 = '20000000-0000-0000-0000-000000000111';
  const mayOption2 = '20000000-0000-0000-0000-000000000112';

  const { error: pollError } = await supabase.from('schedule_polls').upsert([
    {
      id: pollId,
      club_id: clubId,
      season_id: seasonId,
      title: '6월 친선전 일정 투표',
      status: 'open',
      common_time: '20:00',
      location: '잠실 풋살파크',
      memo: '참석 가능한 날짜를 모두 선택해 주세요.',
      created_by: byEmail['qa-operator@fcmoim.test'].id,
    },
    {
      id: mayPollId,
      club_id: clubId,
      season_id: seasonId,
      title: '5월 운영진 평가전 일정 투표',
      status: 'open',
      common_time: '21:00',
      location: '상암 풋살장',
      memo: '5월 캘린더 표시 확인용 투표입니다.',
      created_by: byEmail['qa-operator@fcmoim.test'].id,
    },
  ]);
  if (pollError) throw new Error(`Failed to seed schedule poll: ${pollError.message}`);

  const { error: optionError } = await supabase.from('schedule_poll_options').upsert([
    { id: option1, poll_id: pollId, option_date: '2026-06-06', sort_order: 0 },
    { id: option2, poll_id: pollId, option_date: '2026-06-07', sort_order: 1 },
    { id: mayOption1, poll_id: mayPollId, option_date: '2026-05-22', sort_order: 0 },
    { id: mayOption2, poll_id: mayPollId, option_date: '2026-05-23', sort_order: 1 },
  ]);
  if (optionError) throw new Error(`Failed to seed schedule poll options: ${optionError.message}`);

  const voteRows = [
    ['qa-admin@fcmoim.test', option1],
    ['qa-operator@fcmoim.test', option1],
    ['qa-member1@fcmoim.test', option1],
    ['qa-member2@fcmoim.test', option2],
    ['qa-member3@fcmoim.test', option2],
    ['qa-member4@fcmoim.test', option1],
    ['qa-admin@fcmoim.test', mayOption1],
    ['qa-member1@fcmoim.test', mayOption1],
    ['qa-member2@fcmoim.test', mayOption2],
  ].map(([email, optionId], index) => ({
    id: `20000000-0000-0000-0000-0000000002${String(index).padStart(2, '0')}`,
    poll_id: optionId === mayOption1 || optionId === mayOption2 ? mayPollId : pollId,
    option_id: optionId,
    membership_id: byEmail[email].id,
    is_available: true,
  }));

  const { error: voteError } = await supabase
    .from('schedule_poll_votes')
    .upsert(voteRows, { onConflict: 'option_id,membership_id' });
  if (voteError) throw new Error(`Failed to seed schedule poll votes: ${voteError.message}`);
}

async function upsertMatches(byEmail) {
  const matches = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      round: 1,
      title: 'Round 5',
      date: '2026-05-02T11:00:00.000Z',
      location: '잠실 풋살파크',
      status: 'finished',
      our_score: 5,
      opp_score: 3,
      tactics_completed: true,
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      round: 2,
      title: 'Round 6',
      date: '2026-05-09T11:00:00.000Z',
      location: '상암 풋살장',
      status: 'finished',
      our_score: 2,
      opp_score: 2,
      tactics_completed: true,
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      round: 3,
      title: 'Round 7',
      date: '2026-06-06T11:00:00.000Z',
      location: '잠실 풋살파크',
      status: 'scheduled',
      our_score: null,
      opp_score: null,
      tactics_completed: false,
    },
    {
      id: '30000000-0000-0000-0000-000000000013',
      round: 13,
      title: '5월 야간 풋살',
      date: '2026-05-20T12:00:00.000Z',
      location: '잠실 풋살파크',
      type: 'match',
      status: 'scheduled',
      our_score: null,
      opp_score: null,
      tactics_completed: false,
    },
    {
      id: '30000000-0000-0000-0000-000000000014',
      round: 14,
      title: '5월 전지훈련',
      date: '2026-05-21T12:00:00.000Z',
      location: '하남 훈련장',
      type: 'training',
      status: 'scheduled',
      our_score: null,
      opp_score: null,
      tactics_completed: false,
    },
    {
      id: '30000000-0000-0000-0000-000000000015',
      round: 15,
      title: '5월 정신교육',
      date: '2026-05-24T10:00:00.000Z',
      location: '클럽하우스',
      type: 'seminar',
      status: 'scheduled',
      our_score: null,
      opp_score: null,
      tactics_completed: false,
    },
    {
      id: '30000000-0000-0000-0000-000000000016',
      round: 16,
      title: '5월 장비 점검',
      date: '2026-05-25T10:00:00.000Z',
      location: '잠실 풋살파크',
      type: 'etc',
      status: 'scheduled',
      our_score: null,
      opp_score: null,
      tactics_completed: false,
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      round: 4,
      title: '우천 취소 경기',
      date: '2026-06-13T11:00:00.000Z',
      location: '용산 풋살장',
      status: 'cancelled',
      our_score: null,
      opp_score: null,
      tactics_completed: false,
      cancellation_reason: '우천으로 인한 구장 폐쇄',
      cancelled_at: '2026-06-12T09:00:00.000Z',
    },
  ];

  const { error: matchError } = await supabase.from('matches').upsert(matches.map((match) => ({
    ...match,
    club_id: clubId,
    season_id: seasonId,
    type: match.type ?? 'match',
    memo: 'local demo seed',
    created_by: byEmail['qa-operator@fcmoim.test'].id,
  })));
  if (matchError) throw new Error(`Failed to seed matches: ${matchError.message}`);

  await seedMatchParticipation(byEmail, matches[0].id, [
    ['qa-admin@fcmoim.test', 1, true, 'MF', 1, 0, true],
    ['qa-operator@fcmoim.test', 2, true, 'DF', 0, 1, false],
    ['qa-member1@fcmoim.test', 1, false, 'FW', 3, 0, false],
    ['qa-member2@fcmoim.test', 2, false, 'MF', 1, 2, false],
    ['qa-member3@fcmoim.test', 2, false, 'DF', 0, 0, false],
    ['qa-member4@fcmoim.test', 1, false, 'MF', 0, 1, false],
  ]);
  await seedMatchParticipation(byEmail, matches[1].id, [
    ['qa-admin@fcmoim.test', 1, true, 'MF', 1, 1, false],
    ['qa-operator@fcmoim.test', 2, true, 'DF', 0, 0, false],
    ['qa-member1@fcmoim.test', 1, false, 'FW', 1, 0, true],
    ['qa-member2@fcmoim.test', 2, false, 'MF', 0, 1, false],
  ]);
  await seedMatchParticipation(byEmail, matches[2].id, [
    ['qa-admin@fcmoim.test', 1, true, 'MF', 0, 0, false],
    ['qa-operator@fcmoim.test', 2, true, 'DF', 0, 0, false],
    ['qa-member1@fcmoim.test', 1, false, 'FW', 0, 0, false],
    ['qa-member2@fcmoim.test', 2, false, 'MF', 0, 0, false],
  ]);
}

async function seedMatchParticipation(byEmail, matchId, rows) {
  const attendances = rows.map(([email]) => ({
    match_id: matchId,
    membership_id: byEmail[email].id,
    status: 'attend',
  }));
  const teams = rows.map(([email, teamNumber, isLeader, position]) => ({
    match_id: matchId,
    membership_id: byEmail[email].id,
    team_number: teamNumber,
    is_leader: isLeader,
    position,
  }));
  const stats = rows.map(([email, , , , goals, assists, isMom]) => ({
    match_id: matchId,
    membership_id: byEmail[email].id,
    goals,
    assists,
    is_mom: isMom,
    ai_rating: goals || assists || isMom ? 8.2 : 6.8,
  }));

  const { error: attendanceError } = await supabase.from('attendances').upsert(attendances, { onConflict: 'match_id,membership_id' });
  if (attendanceError) throw new Error(`Failed to seed attendances: ${attendanceError.message}`);
  const { error: teamError } = await supabase.from('match_teams').upsert(teams, { onConflict: 'match_id,membership_id' });
  if (teamError) throw new Error(`Failed to seed match teams: ${teamError.message}`);
  const { error: statError } = await supabase.from('player_stats').upsert(stats, { onConflict: 'match_id,membership_id' });
  if (statError) throw new Error(`Failed to seed player stats: ${statError.message}`);

  await supabase.from('point_ledger').delete().eq('source_id', matchId);
  const { error: ledgerError } = await supabase.from('point_ledger').insert(rows.map(([email, , , , goals, assists, isMom]) => ({
    membership_id: byEmail[email].id,
    amount: 3 + goals + assists + (isMom ? 2 : 0),
    reason: 'local demo match reward',
    source_type: 'match',
    source_id: matchId,
  })));
  if (ledgerError) throw new Error(`Failed to seed point ledger: ${ledgerError.message}`);
}

async function upsertRewards(byEmail) {
  const badgeId = '40000000-0000-0000-0000-000000000001';
  const { error: badgeError } = await supabase.from('reward_badges').upsert({
    id: badgeId,
    club_id: clubId,
    code: 'first-mom',
    name: '첫 MOM',
    description: '첫 번째 MOM에 선정된 멤버',
  });
  if (badgeError) throw new Error(`Failed to seed reward badge: ${badgeError.message}`);

  const { error: awardError } = await supabase.from('membership_badges').upsert({
    membership_id: byEmail['qa-member1@fcmoim.test'].id,
    badge_id: badgeId,
  }, { onConflict: 'membership_id,badge_id' });
  if (awardError) throw new Error(`Failed to seed membership badge: ${awardError.message}`);
}
