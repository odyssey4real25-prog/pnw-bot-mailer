// This is our database. Instead of SQLite (which needs a C++ compiler on Windows),
// we use a plain JSON file on disk. It's simpler, has zero install headaches,
// and is more than fast enough for a recruitment bot's amount of data.
//
// The file lives at data/bot.json. Don't edit it by hand while the bot is running.

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'bot.json');

function defaultData() {
  return {
    recruits: {},
    mailLog: [],
    knownNationIds: {},
    templates: {},
    settings: {
      autoRecruitEnabled: false,
    },
  };
}

function loadData() {
  if (!fs.existsSync(dbPath)) {
    const initial = defaultData();
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(dbPath, 'utf8');
  const parsed = JSON.parse(raw);
  // Fill in any new fields that didn't exist in older versions of the data file.
  return { ...defaultData(), ...parsed };
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ---------- Recruits ----------

function getRecruit(nationId) {
  const data = loadData();
  return data.recruits[String(nationId)] || null;
}

function getAllRecruits() {
  const data = loadData();
  return Object.values(data.recruits);
}

/**
 * Creates the recruit record if it doesn't exist, or updates the given fields if it does.
 */
function upsertRecruit(nationId, fields) {
  const data = loadData();
  const key = String(nationId);
  const existing = data.recruits[key] || {
    nation_id: nationId,
    nation_name: null,
    discord_thread_id: null,
    stage: 'New',
    assigned_staff_id: null,
    notes: null,
    last_contacted_at: null,
    created_at: new Date().toISOString(),
  };
  data.recruits[key] = { ...existing, ...fields };
  saveData(data);
  return data.recruits[key];
}

function setRecruitThread(nationId, threadId) {
  return upsertRecruit(nationId, { discord_thread_id: threadId });
}

function touchLastContacted(nationId) {
  return upsertRecruit(nationId, { last_contacted_at: new Date().toISOString() });
}

// ---------- Mail log ----------

function addMailLog({ nationId, direction, subject, message, sentBy }) {
  const data = loadData();
  data.mailLog.push({
    id: data.mailLog.length + 1,
    nation_id: nationId,
    direction, // 'outgoing' or 'incoming'
    subject,
    message,
    sent_by: sentBy,
    created_at: new Date().toISOString(),
  });
  saveData(data);
}

function getMailLog(nationId) {
  const data = loadData();
  return data.mailLog
    .filter((row) => row.nation_id === nationId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// ---------- Known nation IDs (so the scanner never mails the same new nation twice) ----------

function isKnownNation(nationId) {
  const data = loadData();
  return Boolean(data.knownNationIds[String(nationId)]);
}

function markNationKnown(nationId) {
  const data = loadData();
  data.knownNationIds[String(nationId)] = new Date().toISOString();
  saveData(data);
}

// ---------- Recruitment templates ----------

function addTemplate(id, { name, subject, body }) {
  const data = loadData();
  data.templates[id] = { id, name, subject, body, created_at: new Date().toISOString() };
  saveData(data);
  return data.templates[id];
}

function getTemplate(id) {
  const data = loadData();
  return data.templates[id] || null;
}

function getAllTemplates() {
  const data = loadData();
  return Object.values(data.templates);
}

function deleteTemplate(id) {
  const data = loadData();
  const existed = Boolean(data.templates[id]);
  delete data.templates[id];
  saveData(data);
  return existed;
}

/**
 * Picks a random template out of all saved templates. Returns null if none exist.
 */
function getRandomTemplate() {
  const data = loadData();
  const all = Object.values(data.templates);
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}

// ---------- Settings ----------

function getSetting(key) {
  const data = loadData();
  return data.settings[key];
}

function setSetting(key, value) {
  const data = loadData();
  data.settings[key] = value;
  saveData(data);
}

module.exports = {
  getRecruit,
  getAllRecruits,
  upsertRecruit,
  setRecruitThread,
  touchLastContacted,
  addMailLog,
  getMailLog,
  isKnownNation,
  markNationKnown,
  addTemplate,
  getTemplate,
  getAllTemplates,
  deleteTemplate,
  getRandomTemplate,
  getSetting,
  setSetting,
};
