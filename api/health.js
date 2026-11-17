const { SHEET_ID, RESULTS, titles, candidatesTab, positionTabs, credentials, route } = require('../lib/sheets');

// Connection check: shows which tabs the portal can see (no secrets).
module.exports = route(async (req, res, s) => {
  const tabs = await titles(s);
  const ct = await candidatesTab(s, tabs).catch((e) => `(not found: ${e.message})`);
  res.json({ ok: true, sheetId: SHEET_ID, serviceAccount: credentials().email, tabs, candidatesTab: ct, positionTabs: positionTabs(tabs, ct).map((t) => t.title), hasResults: tabs.includes(RESULTS) });
});
