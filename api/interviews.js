const { RESULTS, quote, SHEET_ID, values, ensureResults, route } = require('../lib/sheets');

// GET  -> saved interviews;  POST -> append one finished interview.
module.exports = route(async (req, res, s) => {
  if (req.method === 'GET') {
    let v = [];
    try { v = await values(s, RESULTS, 'A1:O3000'); } catch (e) { /* tab not created yet */ }
    return res.json({ headers: v[0] || [], rows: v.slice(1) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  const row = [
    b.savedAt, b.candidate, b.position, b.interviewer, b.start, b.end, b.minutes,
    b.total, b.maxAsked, b.percent, b.asked, b.decision, b.notes, JSON.stringify(b.scores || {}),
  ].map((x) => (x === undefined || x === null ? '' : x));
  await ensureResults(s);
  await s.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${quote(RESULTS)}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  res.json({ ok: true });
});
