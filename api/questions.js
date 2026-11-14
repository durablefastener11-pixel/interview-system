const { PREFIX, titles, values, route } = require('../lib/sheets');

// GET /api/questions?position=Accountant  -> reads tab "Q_Accountant".
// GET /api/questions                      -> lists available position tabs.
module.exports = route(async (req, res, s) => {
  const all = await titles(s);
  const qTabs = all.filter((t) => t.startsWith(PREFIX));
  const name = (t) => t.slice(PREFIX.length).trim();
  const pos = (req.query.position || '').trim().toLowerCase();
  if (!pos) return res.json({ positions: qTabs.map(name) });

  const tab = qTabs.find((t) => name(t).toLowerCase() === pos)
    || qTabs.find((t) => pos.includes(name(t).toLowerCase()) || name(t).toLowerCase().includes(pos));
  if (!tab) return res.json({ tab: null, questions: [], error: `No tab named "${PREFIX}${req.query.position}" found. Create it with columns: Section | Question | Max score.` });

  const v = await values(s, tab, 'A1:C500');
  const body = v.length && /^section$/i.test((v[0][0] || '').trim()) ? v.slice(1) : v;
  const questions = body
    .filter((r) => (r[1] || '').trim())
    .map((r, i) => ({ id: `q${i + 1}`, section: (r[0] || 'General').trim(), text: r[1].trim(), max: Number(r[2]) > 0 ? Number(r[2]) : 5 }));
  res.json({ tab, questions });
});
