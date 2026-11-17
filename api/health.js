const { SHEET_ID, PREFIX, RESULTS, titles, isQTab, candidatesTab, credentials, route } = require('../lib/sheets');

// Connection check: shows which tabs the portal can see (no secrets).
module.exports = route(async (req, res, s) => {
  const tabs = await titles(s);
  res.json({ ok: true, sheetId: SHEET_ID, serviceAccount: credentials().email, tabs, candidatesTab: await candidatesTab(s, tabs), questionTabs: tabs.filter(isQTab), hasResults: tabs.includes(RESULTS), prefix: PREFIX });
});
