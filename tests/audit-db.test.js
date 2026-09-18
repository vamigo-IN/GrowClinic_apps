// Regression test for the Audit data layer on PostgreSQL.
//
// Calls every exported apps/audit/db.js function against a migrated database
// and asserts the row shapes the app (server.js, admin.html, CRM API consumers)
// relied on under mysql2 `dateStrings: true`:
//   • timestamps → 'YYYY-MM-DD HH:MM:SS' (UTC) strings, dates → 'YYYY-MM-DD'
//   • COUNT/SUM/BIGINT → numbers, 0/1 flags → numbers
//   • case-insensitive username / search matching (MySQL _ci collation)
//
// Run inside the audit image against a DISPOSABLE database — it writes and
// deletes rows. Never point it at production:
//   docker run --rm --network <net> -e DATABASE_URL=... -e DATA_DIR=/tmp \
//     -v "$PWD/tests:/tests:ro" growclinic-platform/audit:local node /tests/audit-db.test.js
'use strict';
const assert = require('node:assert/strict');

if (!process.env.ALLOW_DESTRUCTIVE_TEST_DB) {
  console.error('Refusing to run: set ALLOW_DESTRUCTIVE_TEST_DB=1 and point DATABASE_URL at a disposable database.');
  process.exit(2);
}

const db = require(process.env.AUDIT_DB_MODULE || '/app/db.js');

const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (e) {
    results.push(['FAIL', name, e]);
  }
}

(async () => {
  const sid = 'test' + Date.now().toString(36);
  const sid2 = sid + 'b';

  await step('init (schema check, settings cache, admin bootstrap/seed)', async () => {
    await db.init();
  });

  await step('settings: set/get/delete + cache', async () => {
    db.setSetting('TEST_KEY', 'value-1');
    assert.equal(db.getSetting('TEST_KEY'), 'value-1');
    await sleep(150);
    const { rows } = await db.query(`SELECT "keyValue", "updatedAt" FROM settings WHERE "keyName" = ?`, ['TEST_KEY']);
    assert.equal(rows[0].keyValue, 'value-1');
    assert.match(rows[0].updatedAt, DATETIME);
    db.setSetting('TEST_KEY', 'value-2');           // upsert path
    await sleep(150);
    const again = await db.query(`SELECT "keyValue" FROM settings WHERE "keyName" = ?`, ['TEST_KEY']);
    assert.equal(again.rows[0].keyValue, 'value-2');
    await db.deleteSettings(['TEST_KEY', 'NOPE']);
    assert.equal(db.getSetting('TEST_KEY', 'fallback'), 'fallback');
  });

  await step('leads: insert/list/count/findCompletedLeadByPhone', async () => {
    const r = await db.insertLead({ name: 'Dr A', clinicName: 'Smile Dental', phone: '+91 98765 43210', reportUrl: '/api/report/x', auditScore: 71 });
    assert.equal(typeof r.insertId, 'number');
    const all = await db.getAllLeads();
    assert.ok(all.length >= 1);
    assert.match(all[0].createdAt, DATETIME);
    assert.equal(typeof (await db.countLeads()), 'number');
    const found = await db.findCompletedLeadByPhone('9876543210');
    assert.equal(found.clinicName, 'Smile Dental');
  });

  await step('chat tracking: trackChatActivity insert + update + flags + phoneE164', async () => {
    db.trackChatActivity(sid, { clinicName: 'Glow Skin', userName: 'Priya', city: 'Pune', phone: '98765 11111', leadCaptured: 1, completed: 1, verified: true, source: 'growclinic-site', channel: 'direct' }, 'iphash', 'UA/1.0');
    await sleep(400);
    const row = await db.getChatSession(sid);
    assert.equal(row.clinicName, 'Glow Skin');
    assert.equal(row.leadCaptured, 1);
    assert.equal(row.verified, 1);                    // boolean true stored as 1
    assert.equal(row.phoneE164, '919876511111');
    assert.match(row.startedAt, DATETIME);
    assert.equal(typeof row.userMsgCount, 'number');
    db.trackChatActivity(sid, { userMsgCount: 3, aiMsgCount: 2 });
    await sleep(300);
    assert.equal((await db.getChatSession(sid)).userMsgCount, 3);
  });

  await step('chat: listChatSessions search (case-insensitive) / range / total', async () => {
    const rows = await db.listChatSessions({ search: 'glow skin', from: '2000-01-01 00:00:00', to: '2999-01-01 00:00:00' });
    assert.ok(rows.some((r) => r.sessionId === sid));
    assert.equal(typeof rows.total, 'number');
    const lead = await db.findLeadByPhone('+919876511111');
    assert.equal(lead.sessionId, sid);
  });

  let userId, user2Id;
  await step('users: create / case-insensitive lookup / list / roles / email / active / password / totp', async () => {
    const u = await db.createUser('Caller.One', 'password-123', 'caller', 'caller@example.com');
    userId = u.id;
    assert.equal(typeof userId, 'number');
    assert.equal((await db.getUserByUsername('caller.one')).id, userId);
    await assert.rejects(() => db.createUser('CALLER.ONE', 'password-123', 'caller'), /already exists/);
    const list = await db.listUsers();
    const me = list.find((x) => x.id === userId);
    assert.equal(me.pending, false);
    assert.equal(me.totpEnabled, false);
    assert.match(me.createdAt, DATETIME);
    await db.setUserRole(userId, 'manager');
    await db.setUserEmail(userId, 'mgr@example.com');
    await db.setUserTotpPending(userId, 'JBSWY3DPEHPK3PXP');
    await db.activateUserTotp(userId);
    assert.equal((await db.getUserById(userId)).totpEnabled, 1);
    await db.disableUserTotp(userId);
    await db.setUserPassword(userId, 'another-pass-1');
    assert.ok(db.verifyPassword('another-pass-1', (await db.getUserById(userId)).passwordHash));
    await db.touchUserLogin(userId);
    assert.equal(typeof (await db.countAdminsActive()), 'number');
    assert.ok((await db.listAssignableUsers()).some((x) => x.id === userId));
  });

  await step('invites: create / lookup by token (case-insensitive) / refresh / accept', async () => {
    const inv = await db.createInvitedUser('invitee', 'invitee@example.com', 'caller');
    user2Id = inv.id;
    assert.equal((await db.getUserByInviteToken(inv.inviteToken.toUpperCase())).id, user2Id);
    const fresh = await db.refreshInvite(user2Id);
    assert.equal(typeof fresh.inviteExpires, 'number');
    assert.equal((await db.acceptInvite(user2Id, 'invitee-pass-1')).changes, 1);
    assert.equal(await db.getUserByInviteToken(fresh.inviteToken), null);
  });

  await step('admin sessions: create / validate / disabled user rejected / login attempts', async () => {
    const s = await db.createAdminSession('iph', userId, 'manager');
    const v = await db.validateAdminSession(s.token);
    assert.equal(v.userId, userId);
    assert.equal(v.role, 'manager');
    db.recordLoginAttempt('iph', false);
    db.recordLoginAttempt('iph', false);
    await sleep(200);
    assert.ok((await db.recentFailedAttempts('iph', 15)) >= 2);
    await db.setUserActive(userId, false);
    assert.equal(await db.validateAdminSession(s.token), false);
    await db.setUserActive(userId, true);
    db.deleteAdminSession('nonexistent');
  });

  await step('CRM: updateChatCrm (legacy stage map, dates, deal) / remarks / AI summary / owner / gcal', async () => {
    const r = await db.updateChatCrm(sid, { status: 'won', notes: 'n', followUpAt: '2030-01-02T10:00:00Z', rating: 'hot', dealValue: '15000', lostReason: '', tags: 'vip,dental' });
    assert.equal(r.changes, 1);
    const row = await db.getChatSession(sid);
    assert.equal(row.crmStatus, 'onboarded');
    assert.equal(row.crmFollowUpAt, '2030-01-02 10:00:00');
    assert.equal(row.crmDealValue, 15000);
    await assert.rejects(() => db.updateChatCrm(sid, { status: 'bogus' }), /Invalid status/);
    assert.equal((await db.addChatRemark(sid, 'tester', 'called, interested')).changes, 1);
    assert.equal(JSON.parse((await db.getChatSession(sid)).crmRemarks).length, 1);
    assert.equal((await db.saveAiSummary(sid, { summary: 's' })).changes, 1);
    assert.equal((await db.setLeadOwner(sid, userId)).changes, 1);
    assert.match((await db.getChatSession(sid)).assignedAt, DATETIME);
    assert.equal((await db.setGcalEventId(sid, 'evt_1')).changes, 1);
    assert.ok((await db.listChatSessions({ ownerId: userId })).some((x) => x.sessionId === sid));
    await db.setLeadOwner(sid, null);
    assert.ok(Array.isArray(await db.listStaleLeads(5)));
  });

  await step('tasks + timeline', async () => {
    const t = await db.createTask({ sessionId: sid, title: 'Call back', dueAt: new Date(Date.now() - 3600e3).toISOString(), createdBy: 'tester' });
    assert.ok((await db.listTasks({ view: 'overdue' })).some((x) => x.id === t.id));
    assert.ok((await db.listTasks({ view: 'due' })).some((x) => x.id === t.id));
    assert.ok((await db.listTasks({ sessionId: sid })).length >= 1);
    assert.equal((await db.completeTask(t.id)).changes, 1);
    db.addLeadEvent(sid, 'update', 'status → onboarded', 'tester');
    await sleep(200);
    const ev = await db.listLeadEvents(sid);
    assert.equal(ev[0].type, 'update');
    assert.match(ev[0].at, DATETIME);
  });

  await step('insights / counts / stats', async () => {
    const ins = await db.getLeadInsights({ from: '2000-01-01 00:00:00', to: '2999-01-01 00:00:00' });
    assert.equal(typeof ins.funnel.visits, 'number');
    assert.ok(ins.funnel.leads >= 1);
    assert.ok(ins.funnel.verified >= 1);
    assert.ok(ins.byChannel.some((c) => c.channel === 'growclinic-site'));
    const cnt = await db.getChatCountsInRange('2000-01-01 00:00:00', null);
    assert.equal(typeof cnt.chats, 'number');
    const st = await db.getChatStats();
    assert.equal(typeof st.total, 'number');
    assert.ok(st.today >= 1);
    assert.match(st.last7[0].day, DATE);
    assert.equal(typeof st.last7[0].count, 'number');
    const sq = await db.sourceQualityStats();
    assert.equal(typeof sq[0].pipeline, 'number');
  });

  await step('automation rules + runs', async () => {
    const { id } = await db.createRule({ name: 'r1', trigger_: 'lead.created', conditions: { a: 1 }, actions: [{ t: 'x' }] });
    assert.equal((await db.getRule(id)).trigger_, 'lead.created');
    assert.equal((await db.updateRule(id, { enabled: false })).changes, 1);
    assert.equal((await db.getRule(id)).enabled, 0);
    db.logRun(id, sid, 'lead.created', 'ok', 1);
    await sleep(200);
    const runs = await db.listRuns({ ruleId: id });
    assert.equal(runs[0].ruleName, 'r1');
    assert.equal(runs[0].dryRun, 1);
    assert.ok((await db.listRules()).length >= 1);
  });

  await step('raw events', async () => {
    db.addRawEvent('meta', sid, { a: 1 }, 'error');
    await sleep(200);
    const list = await db.listRawEvents({ channel: 'meta' });
    const one = await db.getRawEvent(list[0].id);
    assert.equal(JSON.parse(one.payload).a, 1);
    const stats = await db.rawEventStats();
    const meta = stats.find((s) => s.channel === 'meta');
    assert.equal(typeof meta.count24h, 'number');
    assert.ok(meta.errors24h >= 1);
    assert.match(meta.lastAt, DATETIME);
  });

  await step('admin logs + popup leads + promote', async () => {
    db.logAdminAction('test_action', 'detail', 'iph');
    await sleep(200);
    assert.equal((await db.getAdminLogs(5))[0].action, 'test_action');
    const p = await db.insertPopupLead({ name: 'Pop', phone: '9999999999', source: 'exit_popup' });
    assert.equal(typeof p.insertId, 'number');
    assert.equal((await db.getPopupLeadById(p.insertId)).name, 'Pop');
    assert.ok((await db.getPopupLeads(10)).length >= 1);
    assert.equal(typeof (await db.countPopupLeads()), 'number');
    await db.createChatSessionFromPopup({ sessionId: sid2, userName: 'Pop', phone: '9999999999', source: 'website' });
    await db.markPopupLeadConverted(p.insertId);
    assert.equal((await db.getPopupLeadById(p.insertId)).converted, 1);
    assert.equal((await db.getChatSession(sid2)).leadCaptured, 1);
  });

  await step('API usage stats (day/week/month buckets) + provider health + keys', async () => {
    db.logApiUsage({ provider: 'gemini', model: 'gemini-2.5-flash', operation: 'chat', sessionId: sid, promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    db.logApiUsage({ provider: 'openai', model: 'gpt', success: false, error: 'boom' });
    await sleep(300);
    for (const groupBy of ['day', 'week', 'month']) {
      const u = await db.getUsageStats({ groupBy });
      assert.ok(u.series.length >= 1);
      if (groupBy === 'week') assert.match(u.series[0].bucket, /^\d{4}-W\d{2}$/);
      if (groupBy === 'month') assert.match(u.series[0].bucket, /^\d{4}-\d{2}$/);
      if (groupBy === 'day') assert.match(u.series[0].bucket, DATE);
      assert.equal(typeof u.today.calls, 'number');
    }
    assert.equal(typeof (await db.getUsageByModel({}))[0].totalTokens, 'number');
    const health = await db.getProviderHealth();
    assert.ok(health.find((h) => h.provider === 'openai').lastError);
    db.setApiKey('GEMINI_API_KEY', 'test-key-1234567890');
    assert.ok(db.listApiKeys().find((k) => k.name === 'GEMINI_API_KEY').set);
    await db.deleteApiKey('GEMINI_API_KEY');
  });

  await step('failed CRM event queue', async () => {
    await db.enqueueCrmEvent('lead.created', sid, 'n8n', { a: 1 }, 'timeout');
    const q = await db.listFailedCrmEvents(10);
    assert.match(q[0].nextRetryAt, DATETIME);
    await db.incrementCrmEventAttempt(q[0].id, new Date(Date.now() + 60e3), 'again');
    assert.equal((await db.listFailedCrmEvents(10))[0].attempts, 1);
    await db.deleteFailedCrmEvent(q[0].id);
  });

  await step('workspace: XP / check-ins (upsert) / streak / attendance / profile / stats', async () => {
    const a = await db.awardXp(userId, 'task_complete', 'ref-1');
    assert.equal(a.points, 10);
    assert.equal((await db.awardXp(userId, 'task_complete', 'ref-1')).duplicate, true);
    await db.saveCheckin(userId, 'morning', { plan: 'calls' });
    await db.saveCheckin(userId, 'morning', { plan: 'updated' });   // ON CONFLICT path
    const today = await db.getTodayCheckins(userId);
    assert.equal(today.morning.payload.plan, 'updated');
    assert.ok((await db.getCheckinStreak(userId)) >= 1);
    assert.equal(typeof (await db.getAttendancePct(userId, 30)), 'number');
    assert.ok((await db.getUserXp(userId)) >= 15);
    await db.updateWorkspaceProfile(userId, { displayName: 'Caller One', joinDate: '2024-05-06' });
    const prof = await db.getWorkspaceProfile(userId);
    assert.equal(prof.joinDate, '2024-05-06');
    assert.equal(prof.displayName, 'Caller One');
    const ws = await db.getWorkspaceStats(userId);
    assert.equal(typeof ws.ownedTotal, 'number');
  });

  await step('notification prefs matrix / upsert / recipients', async () => {
    const r = await db.setNotifPrefs([{ userId, notifKey: 'daily_digest', enabled: true }, { userId, notifKey: 'bogus', enabled: true }]);
    assert.equal(r.saved, 1);
    await db.setNotifPrefs([{ userId, notifKey: 'daily_digest', enabled: false }]);   // ON CONFLICT path
    const m = await db.getNotifPrefsMatrix();
    assert.equal(m.users.find((u) => u.id === userId).prefs.daily_digest, false);
    assert.ok(Array.isArray(await db.getNotifRecipients('new_lead')));
  });

  await step('cleanup + purge + delete paths (FK cascades)', async () => {
    assert.equal(typeof (await db.purgeEmptyChatSessions(1)).changes, 'number');
    assert.equal((await db.deleteChatSession(sid2)).changes, 1);
    await db.deleteUser(user2Id);
    await db.deleteUser(userId);                       // cascades xp/checkins/prefs, nulls owner
    const { rows } = await db.query(`SELECT COUNT(*) AS n FROM xp_ledger WHERE "userId" = ?`, [userId]);
    assert.equal(rows[0].n, 0);
    await db.rotateAdminPassword('rotated-password-1');
  });

  await db.pool.end();
  const failed = results.filter((r) => r[0] !== 'ok');
  for (const [status, name, err] of results) {
    console.log(`${status === 'ok' ? '✔' : '✘'} ${name}${err ? `\n    ${err.stack || err}` : ''}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
