const { google } = require('googleapis');

const SHEET_ID = process.env.SHEET_ID;
const CAND_TAB = process.env.CANDIDATES_TAB || 'Form Responses 1';
const PREFIX = process.env.QUESTION_PREFIX || 'Q_';
const RESULTS = process.env.RESULTS_TAB || 'Interviews';

function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
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

// Wraps a handler: password check, error handling, JSON responses.
function route(handler) {
  return async (req, res) => {
    const pw = process.env.APP_PASSWORD;
    if (pw && req.headers['x-app-password'] !== pw) return res.status(401).json({ error: 'Wrong password' });
    try {
      if (!SHEET_ID || !process.env.GOOGLE_CLIENT_EMAIL) throw new Error('Server is missing SHEET_ID or Google credentials (see README).');
      await handler(req, res, client());
    } catch (e) {
      const msg = (e && e.errors && e.errors[0] && e.errors[0].message) || e.message || 'Server error';
      res.status(500).json({ error: msg });
    }
  };
}

module.exports = { SHEET_ID, CAND_TAB, PREFIX, RESULTS, quote, titles, values, route };
