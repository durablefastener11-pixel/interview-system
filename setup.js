const { SHEET_ID, PREFIX, RESULTS, quote, titles, route } = require('../lib/sheets');
const defaults = require('../lib/defaults');

// Converts [section, question] pairs into the QID layout used by the interview sheet.
function toLayout(qs) {
  const rows = []; let sec = '', n = 0;
  qs.forEach(([s, q]) => {
    const letter = s[0];
    if (s !== sec) { sec = s; n = 0; rows.push(['QID', `Question - (${letter}) ${s.slice(3)}`]); }
    n += 1; rows.push([`${letter}-${n}`, q]);
  });
  return rows;
}

// One-time setup: creates the results tab and starter Q_<Position> tabs if missing.
module.exports = route(async (req, res, s) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const have = await titles(s);
  const want = [
    { title: RESULTS, data: [['Saved at', 'Candidate', 'Position', 'Interviewer', 'Start', 'End', 'Minutes', 'Total score', 'Max (asked)', 'Score %', 'Questions asked', 'Decision', 'Notes', 'Scores JSON']] },
    ...Object.entries(defaults).map(([pos, qs]) => ({ title: PREFIX + pos, data: toLayout(qs) })),
  ].filter((t) => !have.includes(t.title));
  if (!want.length) return res.json({ created: [], note: 'Everything already exists.' });

  await s.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: want.map((t) => ({ addSheet: { properties: { title: t.title } } })) } });
  await s.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: want.map((t) => ({ range: `${quote(t.title)}!A1`, values: t.data })) },
  });
  res.json({ created: want.map((t) => t.title) });
});
