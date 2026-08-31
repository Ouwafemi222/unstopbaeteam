const members = {
  "Miss Deborah": "missdeborah",
  "Mr Juwon": "mrjuwon",
  "Mr Femi": "mrfemi",
  "Mr Alex": "mralex",
  "Mr Samuel": "mrsamuel",
  "Mr Segun": "mrsegun",
  "Mr Tope": "mrtope",
  "Mr Lekan": "mrlekan",
  "Mr Clinton": "mrclinton",
};

const rows = [
  ["Miss Deborah", "mizzdeborah@outlook.com", "7536637617", "GB", "2026-07-03"],
  ["Mr Juwon", "juwonmummy805@gmail.com", "7436756489", "GB", "2026-05-08"],
  ["Mr Juwon", "ef7803471@gmail.com", "7774627932", "GB", "2026-05-08"],
  ["Mr Femi", "j2043736@gmail.com", "7351333963", "GB", "2026-05-08"],
  ["Mr Alex", "marknavz589@gmail.com", "7346593349", "GB", "2026-05-08"],
  ["Mr Samuel", "olajuwonade383@gmail.com", "7348252684", "GB", "2026-05-08"],
  ["Mr Juwon", "jumokebalu257@gmail.com", "7883835254", "GB", "2026-05-09"],
  ["Mr Samuel", "esueakelenlayinka108@gmail.com", "7788920405", "GB", "2026-05-26"],
  ["Mr Femi", "femigratitude@gmail.com", "447351404214", "GB", "2026-05-14"],
  ["Mr Femi", "richard6053899@gmail.com", "12344268624", "US", "2026-05-21"],
  ["Miss Deborah", "debbytella17@gmail.com", "12567173282", "US", "2026-05-21"],
  ["Mr Segun", "jamesjosh4576@gmail.com", "1269539783", "US", "2026-05-25"],
  ["Miss Deborah", "stephensara496@gmail.com", "13033592261", "US", "2026-05-25"],
  ["Mr Tope", "jf20002f5@gmail.com", "17073058396", "US", "2026-05-25"],
  ["Miss Deborah", "yinkawebel@outlook.com", "447723490867", "GB", "2026-06-18"],
  ["Miss Deborah", "starboy12958@outlook.com", "447478050628", "GB", "2026-06-18"],
  ["Mr Femi", "destinyfriend@outlook.com", "15094192352", "US", "2026-06-18"],
  ["Mr Femi", "donaldjame2075@gmail.com", "447529533927", "GB", "2026-06-19"],
  ["Miss Deborah", "estherjay2026@outlook.com", "7529427421", "GB", "2026-06-26"],
  ["Miss Deborah", "deborah671991@outlook.com", "7529626581", "GB", "2026-06-26"],
  ["Miss Deborah", "akinlolu61@outlook.com", "7536659443", "GB", "2026-06-26"],
  ["Mr Femi", "gratitude1906@outlook.com", "7529744838", "GB", "2026-06-26"],
  ["Mr Femi", "sundayleke37@gmail.com", "447529499347", "GB", "2026-06-28"],
  ["Mr Femi", "zadokudem@outlook.com", "447536641040", "GB", "2026-06-29"],
  ["Mr Femi", "cluadecode2026@outlook.com", "447529459268", "GB", "2026-06-29"],
  ["Mr Segun", "webelverconnect@outlook.com", "447529442763", "GB", "2026-06-01"],
  ["Miss Deborah", "jamestenil937@outlook.com", "447529530796", "GB", "2026-06-01"],
  ["Miss Deborah", "amafirst@outlook.com", "447529530796", "GB", "2026-06-01"],
  ["Mr Lekan", "umorenketie3@gmail.com", "3632053369", "US", "2026-05-25"],
  ["Mr Alex", "petersamx26@gmail.com", "13162543451", "US", "2026-05-26"],
  ["Mr Femi", "femiade656@gmail.com", "13524806014", "US", "2026-05-26"],
  ["Mr Femi", "labakebisolagabriel@gmail.com", "14642512437", "US", "2026-05-26"],
  ["Mr Samuel", "femigratitudeman@gmail.com", "08155835463", "NG", "2026-05-29"],
  ["Mr Femi", "lubkelly9768@gmail.com", "18034590363", "US", "2026-05-29"],
  ["Mr Lekan", "solomonamos783@gmail.com", "08130348824", "NG", "2026-05-29"],
  ["Mr Samuel", "sesughjenny4@gmail.com", "09050431312", "NG", "2026-06-05"],
  ["Mr Alex", "tergue33@gmail.com", "7282170852", "US", "2026-06-10"],
  ["Mr Alex", "peterabraham2580@gmail.com", "2316323318", "US", "2026-06-10"],
  ["Mr Femi", "femininereuerate@gmail.com", "18643101614", "US", "2026-06-10"],
  ["Mr Femi", "olayinkajohn149@gmail.com", "13102726030", "US", "2026-06-10"],
  ["Mr Femi", "natttersam754@gmail.com", "4237695293", "US", "2026-06-10"],
  ["Mr Alex", "oluwafemiolayinika1234@gmail.com", "19202261511", "US", "2026-06-11"],
  ["Mr Femi", "ghdvtvhss@gmail.com", "14052493590", "US", "2026-06-11"],
  ["Mr Tope", "topeaccount@gmail.com", "16573845048", "US", "2026-06-11"],
  ["Mr Clinton", "vibes18454@xbmotor.com", "16054077315", "US", "2026-08-12"],
  ["Mr Tope", "danielsamuel3639@gmail.com", "14059155204", "US", "2026-06-11"],
  ["Mr Tope", "bernardjohn5577@gmail.com", "15026743931", "US", "2026-06-11"],
  ["Mr Femi", "treasuresamcat@outlook.com", "13649148121", "US", "2026-06-14"],
  ["Miss Deborah", "emigrat-hope@outlook.com", "19796002162", "US", "2026-06-15"],
  ["Mr Femi", "adeyemipurpose@outlook.com", "447529737591", "GB", "2026-06-15"],
  ["Miss Deborah", "femigenz34@gmail.com", "447307064330", "GB", "2026-08-27"],
  ["Mr Femi", "genzfemi9@gmail.com", "447460288447", "GB", "2026-08-27"],
  ["Mr Lekan", "olamilekanmorr46@gmail.com", "447361402222", "GB", "2026-08-27"],
  ["Miss Deborah", "idowudeborahdee@gmail.com", "44734721850", "DE", "2026-08-27"],
  ["Miss Deborah", "williamsmatins78@gmail.com", "1793849485", "GB", "2026-08-28"],
  ["Mr Lekan", "morrgrace46@gmail.com", "7591392647", "GB", "2026-08-25"],
  ["Mr Lekan", "572591330@gmail.com", "7754908223", "GB", "2026-08-25"],
  ["Miss Deborah", "williamsmattins81@gmail.com", "7348461820", "GB", "2026-08-28"],
  ["Miss Deborah", "israeldebby60@gmail.com", "7738152722", "GB", "2026-08-28"],
];

const memberInserts = Object.entries(members)
  .map(([name, key]) => {
    const preferred = name.split(" ").slice(1).join(" ");
    return `('${name}', '${preferred}', '${key}', 'active', 'Team Member', 'Forecast import — awaiting registration via /join')`;
  })
  .join(",\n  ");

const accountVals = rows
  .map((r) => `('${members[r[0]]}', '${r[1]}', '${r[2]}', '${r[3]}', '${r[4]}')`)
  .join(",\n  ");

const sql = `-- Wipe mock data
DELETE FROM message_notes;
DELETE FROM account_notes;
DELETE FROM member_notes;
DELETE FROM account_services;
DELETE FROM messages;
DELETE FROM fiverr_accounts;
DELETE FROM team_members WHERE user_id IS NULL;

INSERT INTO team_members (full_name, preferred_name, registration_key, status, role_in_team, notes) VALUES
  ${memberInserts}
ON CONFLICT (registration_key) DO NOTHING;

INSERT INTO fiverr_accounts (team_member_id, username, email, phone, country_id, opening_date, status, source, notes)
SELECT tm.id, left(split_part(v.email, '@', 1), 40), v.email, v.phone, c.id, v.opening_date::date, 'new', 'forecast', 'Imported from forecast data'
FROM (VALUES
  ${accountVals}
) AS v(reg_key, email, phone, country, opening_date)
JOIN team_members tm ON tm.registration_key = v.reg_key
LEFT JOIN countries c ON c.code = v.country;
`;

console.log(`-- ${rows.length} accounts`);
console.log(sql);
