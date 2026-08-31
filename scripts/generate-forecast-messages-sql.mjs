import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse FORECAST_MESSAGES from TS file (simple eval of array)
const src = readFileSync(resolve(__dirname, "../src/data/forecast-messages.ts"), "utf8");
const match = src.match(/export const FORECAST_MESSAGES[^=]*=\s*(\[[\s\S]*?\]);/);
if (!match) throw new Error("Could not parse FORECAST_MESSAGES");
const rows = eval(match[1]);

const TITLE_MAP = { mr: "Mr", mrs: "Mrs", miss: "Miss", ms: "Ms" };
const NAME_ALIASES = { "Mr Sam": "Mr Samuel", "Mr Seyun": "Mr Segun", "Mr Jaxon": "Mr Jason" };

function normalize(name) {
  const parts = name.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length === 1) return normalize(`Mr ${parts[0]}`);
  const titleKey = parts[0].toLowerCase();
  parts[0] = TITLE_MAP[titleKey] ?? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
  if (parts[1].toLowerCase() === "debby") parts[1] = "Deborah";
  const result = parts.join(" ");
  return NAME_ALIASES[result] ?? result;
}

function toKey(name) {
  return normalize(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const expanded = [];
for (const row of rows) {
  const count = row.count ?? 1;
  for (let i = 0; i < count; i++) {
    const notes = row.notes
      ? count > 1
        ? `${row.notes} (${i + 1}/${count})`
        : row.notes
      : count > 1
        ? `Forecast import (${i + 1}/${count})`
        : "Imported from forecast data";
    expanded.push({
      key: toKey(row.member),
      date: row.received_date,
      gig: row.service.replace(/'/g, "''"),
      notes: notes.replace(/'/g, "''"),
    });
  }
}

const uniqueMembers = [...new Set(rows.map((r) => normalize(r.member)))];
const memberInserts = uniqueMembers
  .map((name) => {
    const key = toKey(name);
    const preferred = name.split(" ").slice(1).join(" ");
    return `('${name}', '${preferred}', '${key}', 'active', 'Team Member', 'Forecast import - awaiting registration via /join')`;
  })
  .join(",\n  ");

const msgVals = expanded
  .map((r) => `('${r.key}', '${r.date}', '${r.gig}', '${r.notes}')`)
  .join(",\n  ");

console.log(`-- ${expanded.length} message records, ${uniqueMembers.length} members`);
console.log(`DELETE FROM message_notes;
DELETE FROM messages;

INSERT INTO team_members (full_name, preferred_name, registration_key, status, role_in_team, notes) VALUES
  ${memberInserts}
ON CONFLICT (registration_key) DO NOTHING;

INSERT INTO messages (team_member_id, received_date, gig_name, message_source, status, notes)
SELECT tm.id, v.received_date::date, v.gig_name, 'forecast', 'new', v.notes
FROM (VALUES
  ${msgVals}
) AS v(reg_key, received_date, gig_name, notes)
JOIN team_members tm ON tm.registration_key = v.reg_key;`);
