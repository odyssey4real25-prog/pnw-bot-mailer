// This file is the ONLY place in our bot that talks directly to the Politics & War API.
// Every other file asks THIS file to do things like "send a mail" or "look up a nation".
// Keeping it in one place makes it much easier to fix things later if PnW changes their API.
//
// IMPORTANT: PnW has TWO separate APIs that we use here:
// 1. The GraphQL API (for looking up nations, alliances, etc.)
// 2. A separate, older REST endpoint *specifically* for sending in-game mail.
//    Mail sending is NOT part of the GraphQL schema - it has its own endpoint.

const API_KEY = process.env.PNW_API_KEY;
const GRAPHQL_URL = `https://api.politicsandwar.com/graphql?api_key=${API_KEY}`;
const SEND_MESSAGE_URL = 'https://politicsandwar.com/api/send-message/';

/**
 * Sends a raw GraphQL request to Politics & War (used for read-only lookups).
 */
async function pnwRequest(query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    const message = json.errors.map((e) => e.message).join('; ');
    throw new Error(`PnW API error: ${message}`);
  }

  return json.data;
}

/**
 * Sends in-game mail to a nation using PnW's dedicated send-message endpoint.
 * This is a plain form POST, not GraphQL.
 */
async function sendMail(nationId, subject, message) {
  const body = new URLSearchParams({
    key: API_KEY,
    to: String(nationId),
    subject,
    message,
  });

  const response = await fetch(SEND_MESSAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = await response.json();

  if (!json.success) {
    const reason = Array.isArray(json.general_message)
      ? json.general_message.join(' ')
      : json.general_message || 'Unknown error from PnW.';
    throw new Error(reason);
  }

  return json;
}

/**
 * Fetches basic info for a single nation by ID.
 */
async function getNation(nationId) {
  const query = `
    query GetNation($id: [Int]) {
      nations(id: $id, first: 1) {
        data {
          id
          nation_name
          leader_name
          alliance_id
          score
          num_cities
          last_active
          discord
        }
      }
    }
  `;
  const data = await pnwRequest(query, { id: [nationId] });
  return data.nations.data[0] || null;
}

/**
 * Fetches a page of nations sorted by newest first.
 * Used by the new-nation scanner.
 */
async function getRecentNations(limit = 50) {
  const query = `
    query GetRecentNations($first: Int) {
      nations(first: $first, orderBy: { column: DATE, order: DESC }) {
        data {
          id
          nation_name
          leader_name
          alliance_id
          date
          discord
        }
      }
    }
  `;
  const data = await pnwRequest(query, { first: limit });
  return data.nations.data;
}

/**
 * Looks up a nation by name. Matching is done case-insensitively, so
 * "arrow kingdom", "Arrow Kingdom", and "ARROW KINGDOM" all work.
 */
async function getNationByName(name) {
  const query = `
    query GetNationByName($name: [String]) {
      nations(nation_name: $name, first: 5) {
        data {
          id
          nation_name
          leader_name
          alliance_id
          score
          num_cities
          last_active
          discord
        }
      }
    }
  `;
  const data = await pnwRequest(query, { name: [name] });
  const results = data.nations.data;

  if (results.length === 0) return null;

  // Prefer an exact case-insensitive match if one exists among the results.
  const lowerInput = name.toLowerCase();
  const exact = results.find((n) => n.nation_name.toLowerCase() === lowerInput);
  return exact || results[0];
}

/**
 * Same as getRecentNations, but only returns nations with NO alliance
 * (alliance_id of 0) - these are the actual recruitment targets, since
 * nations already in an alliance aren't worth mailing.
 */
async function getRecentUnalignedNations(limit = 50) {
  const nations = await getRecentNations(limit);
  return nations.filter((n) => Number(n.alliance_id) === 0);
}

/**
 * Fetches one page of nations sorted by score (so results are stable across pages),
 * with pagination info so callers can fetch further pages if needed.
 */
async function getNationsPage(page = 1, perPage = 100) {
  const query = `
    query GetNationsPage($page: Int, $first: Int) {
      nations(page: $page, first: $first, orderBy: { column: SCORE, order: ASC }) {
        paginatorInfo {
          currentPage
          hasMorePages
        }
        data {
          id
          nation_name
          leader_name
          alliance_id
          score
          num_cities
          last_active
          date
          discord
        }
      }
    }
  `;
  const data = await pnwRequest(query, { page, first: perPage });
  return data.nations;
}

/**
 * Pulls multiple pages of nations and filters them client-side by score range,
 * city count range, and whether they belong to an alliance. We filter client-side
 * (rather than asking PnW's API to do it) because their exact GraphQL filter
 * argument names for score/city ranges aren't reliably documented - this approach
 * only relies on fields we've already confirmed work.
 *
 * `maxPages` caps how much we fetch, so this never turns into a runaway scan.
 */
async function searchUnalignedNations({ scoreMin, scoreMax, citiesMin, citiesMax, maxPages = 10 } = {}) {
  const results = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages && page <= maxPages) {
    const pageData = await getNationsPage(page, 100);
    for (const nation of pageData.data) {
      if (Number(nation.alliance_id) !== 0) continue;
      if (scoreMin !== undefined && Number(nation.score) < scoreMin) continue;
      if (scoreMax !== undefined && Number(nation.score) > scoreMax) continue;
      if (citiesMin !== undefined && Number(nation.num_cities) < citiesMin) continue;
      if (citiesMax !== undefined && Number(nation.num_cities) > citiesMax) continue;
      results.push(nation);
    }
    hasMorePages = pageData.paginatorInfo.hasMorePages;
    page++;
  }

  return results;
}

module.exports = {
  pnwRequest,
  sendMail,
  getNation,
  getNationByName,
  getRecentNations,
  getRecentUnalignedNations,
  getNationsPage,
  searchUnalignedNations,
};
