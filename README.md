# Interview Portal (Vercel + Google Sheets)

Position-wise interview portal. Google Form responses are the candidates, each position has its own question tab, and finished interviews are saved back to the same Google Sheet.

## Google Sheet layout
| Tab | Purpose |
|---|---|
| `Form Responses 1` | Google Form responses (needs a Name column and a Position column) |
| `Q_Accountant`, `Q_Sales`, `Q_Tele Sales`, ... | One tab per position, laid out like the interview sheet (see below) |
| `Interviews` | Results are saved here automatically |

A candidate whose Position is "Accountant" gets the questions from tab `Q_Accountant`. Add a new position by adding a new `Q_<Position>` tab and the same name to the form dropdown.

## Question tab layout
Column A = QID, column B = question, optional column C = max score (default 5).
- A row with `QID` in column A is a **section header**; column B is its title, e.g. `Question - (A) Initial Screening`.
- A row starting with `▶` in column A is a **stage header**, e.g. `▶ STAGE 3A - INDIAMART TRAPS`.
- Every other row with text in column B is a question. Rows like "Total Dimension Score" and "Score %" are ignored.

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
Open the site, enter the password, click **Set up sheet** once. It creates `Interviews` and starter `Q_Accountant`, `Q_Sales`, `Q_Tele Sales`, `Q_Data Entry` tabs. Edit those questions in Google Sheets any time.

Run locally: `npm i -g vercel`, copy `.env.example` to `.env.local`, then `npm install && vercel dev`.
