// One-off maintenance: remove duplicate-lead spam from the CRM timeline and
// remarks. Run inside the audit container:
//   docker compose exec audit node cleanup_spam.js
// Uses the same DATABASE_URL / DB_SCHEMA as the app (PostgreSQL).
//
// PostgreSQL port note: the MySQL version referenced lead_events.description
// and remark.remark, which do not exist (the columns are lead_events.detail and
// crmRemarks[].text — see db.js addLeadEvent / addChatRemark), so it could not
// have run. The patterns below match what the app actually writes:
//   addLeadEvent(..., `duplicate from ${channel} suppressed`)
//   addChatRemark(..., `Duplicate ${channel} lead received — merged`)
const db = require('./db');

async function clean() {
    try {
        console.log('Cleaning lead_events...');
        const res = await db.query(`DELETE FROM lead_events WHERE detail LIKE 'duplicate from %'`);
        console.log(`Deleted ${res.rowCount} spam events from lead_events.`);

        console.log('Cleaning chat_sessions crmRemarks...');
        const { rows } = await db.query(
            `SELECT "sessionId", "crmRemarks" FROM chat_sessions WHERE "crmRemarks" LIKE '%Duplicate % lead received — merged%'`);
        let updated = 0;
        for (const row of rows) {
            try {
                const remarks = JSON.parse(row.crmRemarks || '[]');
                // Filter out all duplicate spam remarks
                const filtered = remarks.filter(r => {
                    const text = String((r && (r.text ?? r.remark)) || '');
                    return !(text.includes('Duplicate ') && text.includes('lead received — merged'));
                });
                if (filtered.length !== remarks.length) {
                    await db.query(`UPDATE chat_sessions SET "crmRemarks" = ? WHERE "sessionId" = ?`,
                        [JSON.stringify(filtered), row.sessionId]);
                    updated++;
                }
            } catch (e) {
                console.warn('Error parsing JSON for', row.sessionId);
            }
        }
        console.log(`Cleaned crmRemarks for ${updated} sessions.`);
    } catch (e) {
        console.error('Error:', e);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
}

clean();
