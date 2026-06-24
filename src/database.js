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
    blacklist: {},
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

// ---------- Blacklist ----------

function addToBlacklist(nationId, reason, addedBy) {
  const data = loadData();
  data.blacklist[String(nationId)] = {
    nation_id: nationId,
    reason: reason || null,
    added_by: addedBy,
    added_at: new Date().toISOString(),
  };
  saveData(data);
}

function removeFromBlacklist(nationId) {
  const data = loadData();
  const existed = Boolean(data.blacklist[String(nationId)]);
  delete data.blacklist[String(nationId)];
  saveData(data);
  return existed;
}

function isBlacklisted(nationId) {
  const data = loadData();
  return Boolean(data.blacklist[String(nationId)]);
}

function getBlacklistEntry(nationId) {
  const data = loadData();
  return data.blacklist[String(nationId)] || null;
}

function getAllBlacklisted() {
  const data = loadData();
  return Object.values(data.blacklist);
}

// ---------- Stats ----------

function getStats() {
  const data = loadData();
  const recruits = Object.values(data.recruits);
  const mailLog = data.mailLog;

  const sentCount = mailLog.filter((m) => m.direction === 'outgoing').length;
  const byStage = {};
  for (const r of recruits) {
    byStage[r.stage] = (byStage[r.stage] || 0) + 1;
  }
  const joined = byStage['Joined'] || 0;
  const conversion = sentCount > 0 ? ((joined / sentCount) * 100).toFixed(1) : '0.0';

  return {
    totalRecruitsTracked: recruits.length,
    mailsSent: sentCount,
    byStage,
    joined,
    conversionRate: conversion,
  };
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
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted,
  getBlacklistEntry,
  getAllBlacklisted,
  getStats,
};
