const { values, titles, norm, candidatesTab, positionTabs, positionsFor, route } = require('../lib/sheets');

// Picks a column by header text. Optional env override: NAME_COLUMN / POSITION_COLUMN.
function pick(headers, envName, tests, avoid, fallback) {
  if (envName) { const i = headers.findIndex((h) => norm(h) === norm(envName)); if (i >= 0) return i; }
  for (const re of tests) {
    const i = headers.findIndex((h) => re.test(h || '') && !(avoid && avoid.test(h || '')));
    if (i >= 0) return i;
  }
  return fallback;
}
const BAD = /emergency|reference|employer|company|school|college|institute|manager|family|reporting|designation|father|mother|spouse/i;

// Returns the form data plus, for each candidate, the positions they applied for.
module.exports = route(async (req, res, s) => {
  const all = await titles(s);
  const tab = await candidatesTab(s, all);
  const v = await values(s, tab);
  const headers = (v[0] || []).map((h) => String(h || ''));
  const rows = v.slice(1).filter((r) => r.some((c) => c));
  const cols = {
    name: pick(headers, process.env.NAME_COLUMN, [/^\s*(full|candidate|applicant)\s*name\s*$/i, /^\s*name\s*$/i, /name/i], BAD, 1),
    pos: pick(headers, process.env.POSITION_COLUMN, [/position/i, /applied/i, /\brole\b/i, /\bpost\b/i, /\bjob\b/i], null, 2),
    ts: pick(headers, null, [/timestamp|टाइमस्टैम्प/i], null, 0),
    phone: pick(headers, null, [/contact\s*(no|number)/i, /mobile/i, /phone/i, /whatsapp/i], /emergency|reference|reporting|employer/i, -1),
  };
  const tabs = positionTabs(all, tab);
  const positions = rows.map((r) => positionsFor(r[cols.pos], tabs));
  res.json({ tab, headers, rows, cols, positions, positionTabs: tabs.map((t) => t.title) });
});
