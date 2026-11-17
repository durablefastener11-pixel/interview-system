const { titles, values, norm, candidatesTab, positionTabs, route } = require('../lib/sheets');

const SKIP = /^(total dimension score|score\s*%|actually ask question result)/i;
const clean = (s) => String(s || '').replace(/^question\s*[-–—]?\s*/i, '').replace(/[ \t]+/g, ' ').trim();
const isText = (c) => { c = String(c ?? '').trim(); return c.length >= 5 && !/^[\d.\s%\-–]+$/.test(c) && !/^score/i.test(c); };
const STAGE = /^\s*[▶►▸]/;

function parseLegacy(v) {            // Section | Question | Max score
  const out = []; const used = new Set(); let section = 'General';
  v.forEach((r) => {
    const a = String(r[0] || '').trim(), b = String(r[1] || '').trim();
    if (!b || SKIP.test(b)) return;
    section = a || section;
    out.push({ id: `q${out.length + 1}`, qid: '', section, text: b, max: Number(r[2]) > 0 ? Number(r[2]) : 5 });
  });
  return out;
}

// Reads a position tab laid out like your interview sheet. It looks for the first row that has
// "QID" in one of the first 3 columns, then reads downward:
//   QID | ... | Question - (A) Initial Screening      -> section header
//   A-1 | scores... | Describe yourself in 2 minutes. -> question (text = first real text cell right of the QID)
//   ▶ STAGE 3A - ...                                  -> stage header
// Everything above the first QID row (candidate form data) is ignored.
function parse(v) {
  if (v.length && /^section$/i.test(String((v[0] || [])[0] || '').trim())) return parseLegacy(v.slice(1));
  let q = -1, start = 0;
  for (let i = 0; i < v.length && q < 0; i++) {
    for (let c = 0; c < 3; c++) if (/^qid$/i.test(String((v[i] || [])[c] || '').trim())) { q = c; start = i; break; }
  }
  if (q < 0) { q = 0; start = 0; }
  const out = [], used = new Set();
  let section = 'General';
  for (let i = start; i < v.length; i++) {
    const r = v[i] || [];
    const a = String(r[q] ?? '').trim();
    const rest = r.slice(q + 1);
    const ti = rest.findIndex(isText);
    const text = ti >= 0 ? String(rest[ti]).trim() : '';
    const stage = [a, ...rest].find((c) => STAGE.test(String(c || '')));
    if (stage) { section = clean(String(stage).replace(STAGE, '')) || section; continue; }
    if (/^qid$/i.test(a)) { section = clean(rest.find((c) => /^question/i.test(String(c || '').trim())) || text) || section; continue; }
    if (SKIP.test(a) || SKIP.test(text)) continue;
    if (!a) {
      if (text && (/^[A-F]\.\s+\S/.test(text) || /^\p{Extended_Pictographic}/u.test(text))) section = clean(text.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '')) || section;
      continue;
    }
    if (!text) continue;
    const max = ti === 0 && Number(rest[1]) > 0 && Number(rest[1]) <= 100 ? Number(rest[1]) : 5;
    const id = !used.has(a) ? a : `q${out.length + 1}`;
    used.add(id);
    out.push({ id, qid: a, section, text, max });
  }
  return out;
}

// GET /api/questions?position=Accountant -> questions from the tab named like the position.
module.exports = route(async (req, res, s) => {
  const all = await titles(s);
  const ctab = await candidatesTab(s, all).catch(() => '');
  const tabs = positionTabs(all, ctab);
  const pos = norm(req.query.position || '');
  if (!pos) return res.json({ positions: tabs.map((t) => t.name) });

  const t = tabs.find((x) => x.n === pos)
    || tabs.find((x) => pos.includes(x.n) && x.n.length > 2)
    || tabs.find((x) => x.n.includes(pos) && pos.length > 2);
  if (!t) return res.json({ tab: null, questions: [], error: `No tab named "${req.query.position}" found. Create a tab with exactly that name and put the QID and questions in it. Tabs I can see: ${tabs.map((x) => x.title).join(', ') || 'none'}.` });

  const questions = parse(await values(s, t.title, 'A1:BZ800'));
  res.json({ tab: t.title, questions });
});
module.exports.parse = parse;
