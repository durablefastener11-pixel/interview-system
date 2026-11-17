const { google } = require('googleapis');

const strip = (s) => String(s || '').trim().replace(/^["']+|["']+$/g, '').trim();
// Accepts a plain sheet ID or a full Google Sheets URL.
const idFrom = (s) => { const v = strip(s); const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : v; };

const SHEET_ID = idFrom(process.env.SHEET_ID);
const CAND_TAB = strip(process.env.CANDIDATES_TAB) || 'Form Responses 1';
const PREFIX = strip(process.env.QUESTION_PREFIX) || 'Q_';
const RESULTS = strip(process.env.RESULTS_TAB) || 'Interviews';
const RESULT_HEADER = ['Saved at', 'Candidate', 'Position', 'Interviewer', 'Start', 'End', 'Minutes', 'Total score', 'Max (asked)', 'Score %', 'Questions asked', 'Decision', 'Notes', 'Scores JSON'];

// Works with: separate email + key variables, a key with literal \n, a quoted key,
// or the whole service-account JSON pasted into GOOGLE_PRIVATE_KEY / GOOGLE_SERVICE_ACCOUNT_JSON.
function credentials() {
  let email = strip(process.env.GOOGLE_CLIENT_EMAIL);
  let key = strip(process.env.GOOGLE_PRIVATE_KEY);
  const tryJson = (txt) => { try { const o = JSON.parse(txt); if (o.private_key) { key = o.private_key; email = email || o.client_email; } } catch (e) { /* not JSON */ } };
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) tryJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (key.startsWith('{')) tryJson(key);
  key = key.replace(/\\n/g, '\n');
  return { email, key };
}

function client() {
  const { email, key } = credentials();
  if (!email) throw new Error('GOOGLE_CLIENT_EMAIL is missing in Vercel environment variables.');
  if (!key.includes('BEGIN PRIVATE KEY')) throw new Error('GOOGLE_PRIVATE_KEY is missing or wrong. It must start with -----BEGIN PRIVATE KEY----- (copy "private_key" from the JSON key file).');
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

const quote = (t) => `'${String(t).replace(/'/g, "''")}'`;

async function titles(s) {
  const r = await s.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' });
  return r.data.sheets.map((x) => x.properties.title);
}

async function values(s, tab, range = 'A1:AZ3000') {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${quote(tab)}!${range}` });
  return r.data.values || [];
}

const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const SYSTEM = /^(sheet\d*|form[ _-]?(details?|responses?.*)|.*responses?.*|interviews?|results?|summary|dashboard|config|settings|instructions|readme|template.*|master|data)$/i;
const EXTRA = (process.env.EXCLUDE_TABS || '').split(',').map(norm).filter(Boolean);

// Finds the tab that holds the Google Form data (e.g. "Form Responses 1" or "form details").
async function candidatesTab(s, all) {
  all = all || (await titles(s));
  const hit = all.find((t) => t === CAND_TAB)
    || all.find((t) => t.toLowerCase() === CAND_TAB.toLowerCase())
    || all.find((t) => /^form[ _-]?(details?|responses?)/i.test(t))
    || all.find((t) => /responses?/i.test(t));
  if (!hit) throw new Error(`Could not find the form data tab. Set CANDIDATES_TAB in Vercel to its exact name. Tabs found: ${all.join(', ')}`);
  return hit;
}

// Position tabs = tabs named after a position (e.g. "Accountant", "HR Manager").
// Set POSITION_TABS=Tab1,Tab2 to list them explicitly, or EXCLUDE_TABS=Tab3 to hide helper tabs.
function positionTabs(all, candTab) {
  const forced = (process.env.POSITION_TABS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const list = forced.length ? all.filter((t) => forced.some((f) => norm(f) === norm(t)))
    : all.filter((t) => t !== candTab && t !== RESULTS && !SYSTEM.test(t.trim()) && !EXTRA.includes(norm(t)));
  return list.map((t) => {
    const name = t.toLowerCase().startsWith(PREFIX.toLowerCase()) ? t.slice(PREFIX.length).trim() : t.trim();
    return { title: t, name, n: norm(name) };
  }).filter((x) => x.n);
}

// Maps a form answer such as "Data Research Assistant, Graphics Designer" to position names.
function positionsFor(answer, tabs) {
  const out = new Set();
  String(answer || '').split(/[,;\n|]+/).map((x) => x.trim()).filter(Boolean).forEach((tk) => {
    const nt = norm(tk);
    const t = tabs.find((x) => x.n === nt) || tabs.find((x) => x.n.length > 2 && nt.includes(x.n)) || tabs.find((x) => nt.length > 2 && x.n.includes(nt));
    out.add(t ? t.name : tk);
  });
  return [...out];
}

// Creates the results tab (with header) if it does not exist yet.
async function ensureResults(s) {
  const all = await titles(s);
  if (all.includes(RESULTS)) return;
  await s.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: RESULTS } } }] } });
  await s.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `${quote(RESULTS)}!A1`, valueInputOption: 'RAW', requestBody: { values: [RESULT_HEADER] } });
}

function route(handler) {
  return async (req, res) => {
    const pw = strip(process.env.APP_PASSWORD);
    if (pw && req.headers['x-app-password'] !== pw) return res.status(401).json({ error: 'Wrong password' });
    try {
      if (!SHEET_ID) throw new Error('SHEET_ID is missing in Vercel environment variables.');
      await handler(req, res, client());
    } catch (e) {
      let msg = (e && e.errors && e.errors[0] && e.errors[0].message) || e.message || 'Server error';
      if (/permission|caller does not have|forbidden/i.test(msg)) msg += ` Share the Google Sheet with ${credentials().email} as Editor.`;
      if (/DECODER|PEM|unsupported|invalid_grant/i.test(msg)) msg = 'GOOGLE_PRIVATE_KEY is invalid. Copy the full "private_key" value from the JSON key file.';
      res.status(500).json({ error: msg });
    }
  };
}

module.exports = { SHEET_ID, CAND_TAB, PREFIX, RESULTS, RESULT_HEADER, quote, titles, values, norm, candidatesTab, positionTabs, positionsFor, ensureResults, credentials, route };
