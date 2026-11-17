# Interview Portal (Vercel + Google Sheets)

Position-wise interview portal. Google Form responses are the candidates, each position has its own question tab, and finished interviews are saved back to the same Google Sheet.

## Portal pages
- **Overview:** totals, pending, average score, and a per-position table.
- **Pending:** candidates from the form who have no saved interview, grouped by application date. Filter by position, date range and name. "Start interview" opens the interview screen for that candidate.
- **Completed:** every saved interview with filters (position, decision, date range, name) and sorting. Click a row for the full question-wise marks, section totals, notes and form details. Print / Save as PDF and CSV download are included.
- **Interview:** pick a position and candidate, score the questions, save.

## Google Sheet layout
| Tab | Purpose |
|---|---|
| Form data tab (`form details` or `Form Responses 1`) | Google Form answers. Needs a name column and a position column (found automatically from the headers). |
| One tab **named exactly like each position** (`Accountant`, `HR Manager`, `Tele-Sales Executive`, ...) | The questions for that position, in your interview-sheet layout. |
| `Interviews` | Results. Created automatically on the first save. |

**Candidates.** Read straight from the form data tab, so the TRANSPOSE/FILTER formulas in position tabs are optional. A form answer with several positions ("Data Research Assistant, Graphics Designer") makes the candidate appear under each one, and each is interviewed separately.

**Questions.** In the position tab the portal finds the first row with `QID` in one of the first 3 columns and reads downward:
- a `QID` row = section header (title is the `Question - (A) ...` cell on that row)
- a row with a QID like `A-1` / `Q05` / `12` and question text to its right = question (score cells and other numbers are ignored)
- a `▶ STAGE ...` row, a `B. SECTION NAME` row or a 🧪 row = section header
- `Total Dimension Score`, `Score %`, `Actually ASK Question Result` rows are ignored
Everything above the first `QID` row (candidate form data) is ignored.

Optional Vercel variables: `CANDIDATES_TAB` (form tab name), `POSITION_TABS` (comma list of position tab names), `EXCLUDE_TABS` (helper tabs to hide), `NAME_COLUMN` / `POSITION_COLUMN` (exact header text).

## 1. Google Cloud (service account)
1. Go to console.cloud.google.com and create a project.
2. APIs & Services > Library > enable **Google Sheets API**.
3. IAM & Admin > Service Accounts > Create. Open it > Keys > Add key > JSON. A file downloads.
4. Open your Google Sheet > Share > paste the service account email (`client_email` in the JSON) > **Editor**.

## 2. Push to GitHub
Upload this folder to a new GitHub repository.

## 3. Deploy on Vercel
1. vercel.com > Add New > Project > import the repository. No framework or build settings are needed.
2. Settings > Environment Variables, add:
   - `SHEET_ID` = id from the sheet URL
   - `GOOGLE_CLIENT_EMAIL` = `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY` = `private_key` from the JSON (paste the whole value including the `\n` characters)
   - `CANDIDATES_TAB` = `Form Responses 1` (your form tab name)
   - `APP_PASSWORD` = password for interviewers
3. Deploy (or Redeploy after adding variables).

## 4. First use
Open the site, enter the password, click **Set up sheet** once. It creates the `Interviews` tab (this also happens automatically on the first save).

Run locally: `npm i -g vercel`, copy `.env.example` to `.env.local`, then `npm install && vercel dev`.
