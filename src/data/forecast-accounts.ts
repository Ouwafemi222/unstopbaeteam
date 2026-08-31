/**
 * Forecast Fiverr account data transcribed from handwritten records.
 * Each row = one Fiverr ACCOUNT (not a message).
 * `member` = team member who owns the account.
 */
export interface ForecastAccountRow {
  member: string;
  email: string;
  phone: string;
  country: "GB" | "US" | "NG" | "DE";
  opening_date: string;
}

export const FORECAST_ACCOUNTS: ForecastAccountRow[] = [
  // Sheet 1
  { member: "Miss Deborah", email: "mizzdeborah@outlook.com", phone: "7536637617", country: "GB", opening_date: "2026-07-03" },
  { member: "Mr Juwon", email: "juwonmummy805@gmail.com", phone: "7436756489", country: "GB", opening_date: "2026-05-08" },
  { member: "Mr Juwon", email: "ef7803471@gmail.com", phone: "7774627932", country: "GB", opening_date: "2026-05-08" },
  { member: "Mr Femi", email: "j2043736@gmail.com", phone: "7351333963", country: "GB", opening_date: "2026-05-08" },
  { member: "Mr Alex", email: "marknavz589@gmail.com", phone: "7346593349", country: "GB", opening_date: "2026-05-08" },
  { member: "Mr Samuel", email: "olajuwonade383@gmail.com", phone: "7348252684", country: "GB", opening_date: "2026-05-08" },
  { member: "Mr Juwon", email: "jumokebalu257@gmail.com", phone: "7883835254", country: "GB", opening_date: "2026-05-09" },
  { member: "Mr Samuel", email: "esueakelenlayinka108@gmail.com", phone: "7788920405", country: "GB", opening_date: "2026-05-26" },
  { member: "Mr Femi", email: "femigratitude@gmail.com", phone: "447351404214", country: "GB", opening_date: "2026-05-14" },
  { member: "Mr Femi", email: "richard6053899@gmail.com", phone: "12344268624", country: "US", opening_date: "2026-05-21" },
  { member: "Miss Deborah", email: "debbytella17@gmail.com", phone: "12567173282", country: "US", opening_date: "2026-05-21" },
  { member: "Mr Segun", email: "jamesjosh4576@gmail.com", phone: "1269539783", country: "US", opening_date: "2026-05-25" },
  { member: "Miss Deborah", email: "stephensara496@gmail.com", phone: "13033592261", country: "US", opening_date: "2026-05-25" },
  { member: "Mr Tope", email: "jf20002f5@gmail.com", phone: "17073058396", country: "US", opening_date: "2026-05-25" },
  // Sheet 2
  { member: "Miss Deborah", email: "yinkawebel@outlook.com", phone: "447723490867", country: "GB", opening_date: "2026-06-18" },
  { member: "Miss Deborah", email: "starboy12958@outlook.com", phone: "447478050628", country: "GB", opening_date: "2026-06-18" },
  { member: "Mr Femi", email: "destinyfriend@outlook.com", phone: "15094192352", country: "US", opening_date: "2026-06-18" },
  { member: "Mr Femi", email: "donaldjame2075@gmail.com", phone: "447529533927", country: "GB", opening_date: "2026-06-19" },
  { member: "Miss Deborah", email: "estherjay2026@outlook.com", phone: "7529427421", country: "GB", opening_date: "2026-06-26" },
  { member: "Miss Deborah", email: "deborah671991@outlook.com", phone: "7529626581", country: "GB", opening_date: "2026-06-26" },
  { member: "Miss Deborah", email: "akinlolu61@outlook.com", phone: "7536659443", country: "GB", opening_date: "2026-06-26" },
  { member: "Mr Femi", email: "gratitude1906@outlook.com", phone: "7529744838", country: "GB", opening_date: "2026-06-26" },
  { member: "Mr Femi", email: "sundayleke37@gmail.com", phone: "447529499347", country: "GB", opening_date: "2026-06-28" },
  { member: "Mr Femi", email: "zadokudem@outlook.com", phone: "447536641040", country: "GB", opening_date: "2026-06-29" },
  { member: "Mr Femi", email: "cluadecode2026@outlook.com", phone: "447529459268", country: "GB", opening_date: "2026-06-29" },
  { member: "Mr Segun", email: "webelverconnect@outlook.com", phone: "447529442763", country: "GB", opening_date: "2026-06-01" },
  { member: "Miss Deborah", email: "jamestenil937@outlook.com", phone: "447529530796", country: "GB", opening_date: "2026-06-01" },
  { member: "Miss Deborah", email: "amafirst@outlook.com", phone: "447529530796", country: "GB", opening_date: "2026-06-01" },
  // Sheet 3
  { member: "Mr Lekan", email: "umorenketie3@gmail.com", phone: "3632053369", country: "US", opening_date: "2026-05-25" },
  { member: "Mr Alex", email: "petersamx26@gmail.com", phone: "13162543451", country: "US", opening_date: "2026-05-26" },
  { member: "Mr Femi", email: "femiade656@gmail.com", phone: "13524806014", country: "US", opening_date: "2026-05-26" },
  { member: "Mr Femi", email: "labakebisolagabriel@gmail.com", phone: "14642512437", country: "US", opening_date: "2026-05-26" },
  { member: "Mr Samuel", email: "femigratitudeman@gmail.com", phone: "08155835463", country: "NG", opening_date: "2026-05-29" },
  { member: "Mr Femi", email: "lubkelly9768@gmail.com", phone: "18034590363", country: "US", opening_date: "2026-05-29" },
  { member: "Mr Lekan", email: "solomonamos783@gmail.com", phone: "08130348824", country: "NG", opening_date: "2026-05-29" },
  { member: "Mr Samuel", email: "sesughjenny4@gmail.com", phone: "09050431312", country: "NG", opening_date: "2026-06-05" },
  { member: "Mr Alex", email: "tergue33@gmail.com", phone: "7282170852", country: "US", opening_date: "2026-06-10" },
  { member: "Mr Alex", email: "peterabraham2580@gmail.com", phone: "2316323318", country: "US", opening_date: "2026-06-10" },
  { member: "Mr Femi", email: "femininereuerate@gmail.com", phone: "18643101614", country: "US", opening_date: "2026-06-10" },
  { member: "Mr Femi", email: "olayinkajohn149@gmail.com", phone: "13102726030", country: "US", opening_date: "2026-06-10" },
  { member: "Mr Femi", email: "natttersam754@gmail.com", phone: "4237695293", country: "US", opening_date: "2026-06-10" },
  { member: "Mr Alex", email: "oluwafemiolayinika1234@gmail.com", phone: "19202261511", country: "US", opening_date: "2026-06-11" },
  { member: "Mr Femi", email: "ghdvtvhss@gmail.com", phone: "14052493590", country: "US", opening_date: "2026-06-11" },
  { member: "Mr Tope", email: "topeaccount@gmail.com", phone: "16573845048", country: "US", opening_date: "2026-06-11" },
  // Sheet 4
  { member: "Mr Clinton", email: "vibes18454@xbmotor.com", phone: "16054077315", country: "US", opening_date: "2026-08-12" },
  { member: "Mr Tope", email: "danielsamuel3639@gmail.com", phone: "14059155204", country: "US", opening_date: "2026-06-11" },
  { member: "Mr Tope", email: "bernardjohn5577@gmail.com", phone: "15026743931", country: "US", opening_date: "2026-06-11" },
  { member: "Mr Femi", email: "treasuresamcat@outlook.com", phone: "13649148121", country: "US", opening_date: "2026-06-14" },
  { member: "Miss Deborah", email: "emigrat-hope@outlook.com", phone: "19796002162", country: "US", opening_date: "2026-06-15" },
  { member: "Mr Femi", email: "adeyemipurpose@outlook.com", phone: "447529737591", country: "GB", opening_date: "2026-06-15" },
  { member: "Miss Deborah", email: "femigenz34@gmail.com", phone: "447307064330", country: "GB", opening_date: "2026-08-27" },
  { member: "Mr Femi", email: "genzfemi9@gmail.com", phone: "447460288447", country: "GB", opening_date: "2026-08-27" },
  { member: "Mr Lekan", email: "olamilekanmorr46@gmail.com", phone: "447361402222", country: "GB", opening_date: "2026-08-27" },
  { member: "Miss Deborah", email: "idowudeborahdee@gmail.com", phone: "44734721850", country: "DE", opening_date: "2026-08-27" },
  { member: "Miss Deborah", email: "williamsmatins78@gmail.com", phone: "1793849485", country: "GB", opening_date: "2026-08-28" },
  { member: "Mr Lekan", email: "morrgrace46@gmail.com", phone: "7591392647", country: "GB", opening_date: "2026-08-25" },
  { member: "Mr Lekan", email: "572591330@gmail.com", phone: "7754908223", country: "GB", opening_date: "2026-08-25" },
  { member: "Miss Deborah", email: "williamsmattins81@gmail.com", phone: "7348461820", country: "GB", opening_date: "2026-08-28" },
  { member: "Miss Deborah", email: "israeldebby60@gmail.com", phone: "7738152722", country: "GB", opening_date: "2026-08-28" },
];

const TITLE_MAP: Record<string, string> = { mr: "Mr", mrs: "Mrs", miss: "Miss", ms: "Ms" };

export function normalizeMemberName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");

  if (parts.length === 1) {
    return normalizeMemberName(`Mr ${parts[0]}`);
  }

  const titleKey = parts[0].toLowerCase();
  parts[0] = TITLE_MAP[titleKey] ?? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();

  if (parts[1].toLowerCase() === "debby") {
    parts[1] = "Deborah";
  }

  return parts.join(" ");
}

export function toRegistrationKey(name: string): string {
  return normalizeMemberName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}
