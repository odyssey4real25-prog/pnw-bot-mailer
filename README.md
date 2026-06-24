# PnW Recruitment Bot — Phase 1 (Mail Bridge)

This is **Phase 1** of your bot. It can:
- Send in-game mail from Discord (`/mail send`)
- Log every mail sent into a dedicated thread per recruit
- Let staff reply to recruits from inside that thread (`/reply`)
- Show full mail history for a nation (`/mail history`)
- List all available commands at any time (`/help`) — this list always stays accurate automatically, even after future upgrades add new commands

It does NOT yet do auto-recruiting, bulk mailing, or the CRM stuff —
that's Phase 2+. This phase is the foundation everything else plugs into.

---

## STEP 1 — Install Node.js (one-time, only if you don't have it)

1. Go to https://nodejs.org
2. Download the "LTS" version (the recommended one)
3. Install it like any normal program (click Next, Next, Finish)
4. To check it worked: open a terminal (in VS Code: top menu → Terminal → New Terminal)
   and type:
   ```
   node -v
   ```
   You should see something like `v20.11.0`. If you see an error, restart your computer and try again.

---

## STEP 2 — Open this folder in VS Code

1. Unzip the file you downloaded.
2. Open VS Code.
3. File → Open Folder → select the unzipped `pnw-bot` folder.

---

## STEP 3 — Install the bot's dependencies

In VS Code's terminal (Terminal → New Terminal), type:

```
npm install
```

This downloads the small code libraries the bot needs (just Discord.js and a
couple of helpers) into a `node_modules` folder. This can take a minute.

> **Note:** This bot stores its data in a plain JSON file (`data/bot.json`),
> not a real database, so there's nothing extra to install or compile — no
> Visual Studio, no build tools, nothing. `npm install` should "just work"
> on any Windows/Mac/Linux machine.

---

## STEP 4 — Create your `.env` file (your secret settings)

1. In VS Code's file explorer (left side), find the file called `.env.example`
2. Right-click it → "Copy" → then right-click the folder → "Paste"
3. Rename the copy to exactly: `.env` (no extension after it)
4. Open `.env` and fill in each value:

| Setting | Where to find it |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Your App → "Bot" tab → click "Reset Token" or "Copy" |
| `DISCORD_CLIENT_ID` | Discord Developer Portal → Your App → "General Information" → "Application ID" |
| `DISCORD_GUILD_ID` | In Discord: enable Developer Mode (User Settings → Advanced → Developer Mode), then right-click your server icon → "Copy Server ID" |
| `PNW_API_KEY` | politicsandwar.com → Account → API Key. Click **"Allow Access"** on that key to turn on "Whitelisted Access" — required for sending mail (lookups work without it) |
| `MAIL_LOG_CHANNEL_ID` | In Discord: right-click the text channel you want mail logs posted in → "Copy Channel ID" |

⚠️ **Never share your `.env` file with anyone or post it publicly.** It contains your bot's password essentially.

---

## STEP 5 — Invite your bot to your server

If you haven't already:
1. Discord Developer Portal → Your App → "OAuth2" tab → "URL Generator"
2. Check the box: `bot`
3. Under "Bot Permissions" check: `Send Messages`, `Create Public Threads`, `Send Messages in Threads`, `Read Message History`, `View Channels`, `Use Slash Commands`
4. Copy the generated URL at the bottom, paste it into your browser, choose your server, click Authorize.

---

## STEP 6 — Register the slash commands

In VS Code's terminal:

```
node src/deployCommands.js
```

You should see `✅ Slash commands registered successfully.`
This step only needs to be re-run if you add or change commands later.

---

## STEP 7 — Start the bot

```
node src/index.js
```

You should see:
```
✅ Logged in as YourBotName#1234
✅ Bot is online in 1 server(s).
```

Leave this terminal window running — closing it turns the bot off.
(Later, when we move to Railway, it'll run 24/7 without your computer being on.)

---

## STEP 8 — Try it out in Discord

In the channel you set as `MAIL_LOG_CHANNEL_ID`, type:

```
/mail send nation:12345 subject:"Join Union of Nations" message:"Hello commander, we'd love to have you!"
```

You can put any of these in the `nation` field — the bot figures out which one you mean:
- A nation ID: `12345`
- A nation name (any capitalization): `arrow kingdom`
- A full profile link: `https://politicsandwar.com/nation/id=12345`

The bot will:
1. Send the actual in-game mail via the PnW API
2. Create a thread like `recruit-12345-nation-name`
3. Post the log inside that thread

To reply later, **go into that thread** and type:
```
/reply message:"Thanks for your interest!"
```

To see the full conversation:
```
/mail history nation:12345
```

---

## Troubleshooting

- **"Missing or unfilled setting"** → you forgot to fill in a value in `.env`, or didn't rename it from `.env.example`
- **Mail fails to send / permissions error** → go to politicsandwar.com → Account → API Key, and click "Allow Access" to turn ON Whitelisted Access for your key
- **Slash commands don't show up in Discord** → re-run `node src/deployCommands.js`, then fully close and reopen Discord
- **"Cannot find module..."** → run `npm install` again
- **npm install errors about "node-gyp", "Visual Studio", or "EPERM"** → this was from an old version of this bot that used a database requiring compiling. Make sure you're using the latest zip I gave you (no `better-sqlite3` in package.json) — delete your `node_modules` folder and `package-lock.json`, then run `npm install` again.

---

## What's next (Phase 2)

Once this is working for you, tell me and I'll build:
- Automatic detection + mailing of brand-new nations
- Rate-limiting / duplicate-mail protection (Module 13)
- Randomized recruitment templates (Module 2)

Then later phases add bulk recruiting, the CRM, blacklist, dashboards, etc.

---

# PHASE 2 — Automatic Recruitment

This phase adds:
- **Background scanner** that checks every 5 minutes for brand-new, unaligned nations
- **Recruitment templates** you write and manage from Discord
- **Random template rotation** — different new nations get different wording, so it doesn't look like spam
- **Duplicate protection** — the bot remembers every nation it has ever seen, so it will never auto-mail the same one twice
- **A safety cap** — at most 15 mails per 5-minute scan, with a 2-second pause between each, so PnW's servers (and your account) never get hammered

### New setup steps for Phase 2

1. Replace your project files with the new zip (or copy over: `src/database.js`, `src/pnwApi.js`, `src/index.js`, `package.json`, and add the new files `src/commands/recruit.js` and `src/scheduler/newNationScanner.js`)
2. Run `npm install` again (this adds the `node-cron` scheduling library)
3. Run `node src/deployCommands.js` again (registers the new `/recruit` command)
4. Start the bot: `node src/index.js`

### How to use it

**Step 1 — Create at least one template:**
```
/recruit template create id:friendly1 subject:"Join Union of Nations!" body:"Hi {leader_name} of {nation_name}, we'd love to have you join our alliance!"
```
You can create several — the bot picks one at random each time, so use `{nation_name}` and `{leader_name}` as placeholders; the bot fills them in automatically.

**Step 2 — Check your templates:**
```
/recruit template list
```

**Step 3 — Turn auto-recruit ON:**
```
/recruit auto state:on
```

**Step 4 — Check status anytime:**
```
/recruit status
```

That's it. Every 5 minutes, the bot checks for new nations with no alliance, and mails each one a random template — logging everything into that nation's thread, just like a manual `/mail send` would.

**To turn it off:**
```
/recruit auto state:off
```

**To delete a template:**
```
/recruit template delete id:friendly1
```

### Important notes

- ⚠️ **The very first scan after turning auto-recruit on will mark roughly the 50 most recent unaligned nations as "known" — but it will only mail them if you had auto-recruit ON *before* that scan ran.** If you want to test safely, create a template, turn auto-recruit on, then just watch your Discord log channel for the next 5-10 minutes.
- The scanner only looks at nations with **no alliance** (`alliance_id` of 0) — nations already in an alliance are skipped automatically.
- If you ever stop the bot for a long time, the next scan will only process new nations since you turned auto-recruit off — it won't dump a huge backlog of recruits all at once (capped at 15 per run).

### What's next (Phase 3)

Tell me when this is working and I'll build:
- Bulk recruiting commands (mail everyone matching a filter, e.g. score/city range)
- Recruitment pipeline stages (New → Interested → Joined, etc.)
- Recruit CRM profiles with notes and staff assignment

---

# PHASE 3 — Bulk Recruiting, Pipeline Tracking, CRM & Blacklist

This phase adds:
- **`/blacklist add/remove/list`** — nations the bot should never recruit (hostile players, trolls, spies)
- **`/recruit stage`** — track each recruit through a pipeline: New → Interested → Interviewing → Invited → Joined → Rejected → Blacklisted
- **`/recruit profile`** — a full CRM-style snapshot of any recruit: score, cities, stage, assigned staff, mail count, notes
- **`/recruit assign`** — assign a recruit to a specific staff member
- **`/recruit note`** — save free-text notes on a recruit
- **`/recruit stats`** — a dashboard of total mails sent, recruits by stage, and conversion rate
- **`/recruit bulk`** — mail many unaligned nations at once, filtered by score/city range, with a **dry-run by default** so you see exactly what would happen before anything is sent

### New setup steps for Phase 3

1. Replace your project files with the new zip (or unzip fresh, as before)
2. Run `npm install` (no new packages this time, but safe to run anyway)
3. Run `node src/deployCommands.js` (registers the new `/blacklist` command and the new `/recruit` subcommands)
4. Start the bot: `node src/index.js`

### How to use it

**Track a recruit's progress:**
```
/recruit stage nation:arrow kingdom stage:Interested
```

**See everything about a recruit:**
```
/recruit profile nation:arrow kingdom
```

**Assign a recruit to a staff member:**
```
/recruit assign nation:arrow kingdom staff:@Joe
```

**Add a note:**
```
/recruit note nation:arrow kingdom text:"Said they might join after talking to their alliance"
```

**Check your dashboard:**
```
/recruit stats
```

**Blacklist a troublesome nation:**
```
/blacklist add nation:troll kingdom reason:"Spammed hostile messages"
```

**Bulk recruit (the big one) — always test with a dry-run first:**
```
/recruit bulk score-min:50 score-max:300 cities-min:1 cities-max:10
```
This shows you how many nations match **without sending anything**. When you're happy with the numbers, re-run the exact same command with `confirm:true` added:
```
/recruit bulk score-min:50 score-max:300 cities-min:1 cities-max:10 confirm:true
```

### Built-in safety limits (Module 13)

- **Max 30 mails per bulk-send command** — if more nations match, the rest are simply left for your next run, so you can never accidentally blast hundreds of nations at once
- **2-second pause between each mail** sent during a bulk run
- **7-day cooldown** — any nation mailed (manually, automatically, or in bulk) within the last 7 days is automatically skipped in future bulk runs
- **Blacklisted nations are always skipped** in bulk runs, and manual `/mail send` will warn you and refuse unless you remove them from the blacklist first

### A technical honesty note

PnW doesn't publicly document the exact filter arguments their API accepts for things like score/city ranges, so `/recruit bulk` works by fetching pages of nations (sorted by score) and filtering them in our own code — using only the data fields we've already confirmed work reliably (`score`, `num_cities`, `alliance_id`). This is slightly slower than a server-side filter would be, but far more reliable, since it doesn't depend on guessing undocumented API behavior.

### What's next (Phase 4)

Once this is solid, tell me and I can add things like: cooldown-aware automatic follow-up campaigns (Day 3 / Day 7 / Day 14 reminders), A/B testing between templates to see which converts best, and a join-attribution system to track which recruiter/campaign brought in each new member.

---

# PHASE 4 — Follow-Up Campaigns, A/B Testing & Join Attribution

This phase adds:
- **Automatic follow-ups** at ~3, ~7, and ~14 days after first contact, but only to recruits still sitting at the "New" stage (our best proxy for "hasn't replied," since PnW's API has no inbox-reading capability)
- **Template types** — templates are now tagged `initial`, `followup1`, `followup2`, or `followup3`, so the bot knows which message to send at which point
- **A/B testing report** (`/recruit template stats`) — shows how many recruits each template first-contacted, and how many of those eventually joined
- **Join attribution** (`/recruit attribution`) — for every nation currently at "Joined" stage, shows exactly which template and which sender (staff member or the automated system) first reached them

### New setup steps for Phase 4

1. Replace your project files with the new zip
2. `npm install` (no new packages needed, but safe to run)
3. `node src/deployCommands.js` (registers the new `template stats` and `attribution` subcommands, plus the new `type` option on `template create`)
4. `node src/index.js`

### How to use it

**Create a follow-up template** (same command as before, with a new `type` option):
```
/recruit template create id:gentle-nudge type:followup1 subject:"Still there?" body:"Hi {leader_name}, just checking in - still interested in {nation_name} joining us?"
```

Without follow-up templates created, the bot simply won't send any follow-ups (it never sends a generic fallback) - so this is entirely opt-in. Your existing `initial`-type templates from Phase 2/3 keep working exactly as before with no changes needed.

**See which templates are converting best:**
```
/recruit template stats
```

**See who brought in your recent joins:**
```
/recruit attribution
```
(Remember to actually move recruits to "Joined" with `/recruit stage` as they join your alliance in-game — this report is only as accurate as your stage-tracking.)

### Important honesty notes

- **"No reply" is inferred, not detected.** Since PnW's API can't read your inbox, the bot treats "still at stage New" as a stand-in for "hasn't responded yet." If staff manually move a recruit to **any** other stage (Interested, Interviewing, Invited, Rejected, even just adding them somewhere), follow-ups stop for that recruit. Make a habit of updating stages as you talk to people, or the bot will keep following up with someone you're already in conversation with.
- **The scan runs once daily**, not continuously, so a recruit who crosses the 3-day mark might get their follow-up anywhere within that day's check rather than the exact moment they hit 72 hours.
- Follow-ups respect the blacklist, just like everything else.

### What's next (Phase 5 and beyond)

At this point, all the "high-end" features from the original spec (Module 16) are covered except multi-alliance support and recruit scoring. Let me know if you want either of those, or if you'd like to revisit/polish anything from earlier phases instead (e.g. the staff-assignment alert system, or a proper applicant-detection module for when someone applies directly to your alliance).
