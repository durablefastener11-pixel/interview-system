const { CAND_TAB, values, route } = require('../lib/sheets');

// Returns the Google Form responses: header row + candidate rows.
module.exports = route(async (req, res, s) => {
  const v = await values(s, CAND_TAB);
  const headers = v[0] || [];
  const rows = v.slice(1).filter((r) => r.some((c) => c));
  res.json({ tab: CAND_TAB, headers, rows });
});
