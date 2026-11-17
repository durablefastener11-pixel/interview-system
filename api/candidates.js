const { values, candidatesTab, route } = require('../lib/sheets');

// Returns the Google Form responses: header row + candidate rows.
module.exports = route(async (req, res, s) => {
  const tab = await candidatesTab(s);
  const v = await values(s, tab);
  res.json({ tab, headers: v[0] || [], rows: v.slice(1).filter((r) => r.some((c) => c)) });
});
