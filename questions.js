const { PREFIX, titles, values, route } = require('../lib/sheets');

const SKIP = /^(total dimension score|score\s*%|actually ask question result)/i;
const clean = (s) => s.replace(/^question\s*[-–—]?\s*/i, '').replace(/[ \t]+/g, ' ').trim();

// Reads a position tab laid out like your interview sheet:
//   QID | Question - (A) Initial Screening   <- header row: becomes a section title
//   A-1 | Describe yourself in 2 minutes.    <- question row (optional 3rd column = max score)
//   ▶ STAGE 3A - ...                         <- stage row: also becomes a section title
// The older layout (Section | Question | Max score) still works.
function parse(v) {
  const legacy = v.length && /^section$/i.test((v[0][0] || '').trim());
  const out = [], used = new Set();
  let section = 'General';
  (legacy ? v.slice(1) : v).forEach((r) => {
    const a = (r[0] || '').trim(), b = (r[1] || '').trim();
    if (SKIP.test(a) || SKIP.test(b)) return;
    let qid = '', text = b;
    if (legacy) { if (!b) return; section = a || section; }
    else {
      if (/^qid$/i.test(a)) { section = clean(b) || section; return; }
      if (/^[▶►▸]/.test(a)) { section = clean(`${a.replace(/^[▶►▸]\s*/, '')} ${b}`) || section; return; }
      if (!b) return;
      qid = a;
    }
    const id = qid && !used.has(qid) ? qid : `q${out.length + 1}`;
    used.add(id);
    out.push({ id, qid, section, text, max: Number(r[2]) > 0 ? Number(r[2]) : 5 });
  });
  return out;
}

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
  if (!tab) return res.json({ tab: null, questions: [], error: `No tab named "${PREFIX}${req.query.position}" found. Create a tab with that name and put the questions in columns QID | Question.` });

  const questions = parse(await values(s, tab, 'A1:C600'));
  res.json({ tab, questions });
});
