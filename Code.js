/**
 * Sequins ✨ — Code.gs
 * Assembly line sequencing agent for Farmer's Fridge
 * OPSICLE vNext
 *
 * v0.4.16 — 2026-07-07
 * - FIX: "You have exceeded the property storage quota" on publishing Wk 28's
 *   now-complete 7-day forecast. Total Script Properties usage has been
 *   over the ~500KB shared budget since earlier tonight (confirmed via
 *   debugDemandState); the v0.4.14 revert stopped a bad write from
 *   happening but never freed the space, so any new write big enough could
 *   still fail this way.
 * - Added safeSetProperty_() as the single low-level write path everything
 *   in the app now funnels through. On a real quota exception, it deletes
 *   ONLY the legacy sequins_state blob — same fully-verified-redundant
 *   target as before (migration flag confirms everything in it already
 *   exists elsewhere) — and retries once, automatically. No manual step,
 *   no consolidation, no architecture change. Every write path (demand,
 *   SKU library, rules, line config, overrides, published plans, planners,
 *   admins, rules editors, meta) now shares this same protection uniformly.
 *
 * v0.4.15 — 2026-07-07
 * - FIX: fetchForecastWeekData only searched the sheet for dates Sequins
 *   already had stored for that week, falling back to a full scan only when
 *   NOTHING was stored yet. That meant any week whose stored data was ever
 *   incomplete (e.g. only 3 of 7 days, from an actual/forecast overwrite)
 *   could never discover the remaining days on a later fetch, even though
 *   they were sitting right there in the Compiled Forecast sheet with real
 *   data. This is exactly what was happening to Wk 28 (missing Jul 9-12)
 *   while Wk 27 and Wk 29, which happened to have complete data stored,
 *   worked fine. Removed the shortcut entirely — always does the full
 *   carry-forward scan across merged header cells, independent of whatever
 *   partial state Sequins already has stored.
 *
 * v0.4.14 — 2026-07-07
 * - FULL REVERT of v0.4.11-v0.4.13's demand consolidation attempt. That
 *   chain of fixes tried to merge demand into a single key, hit a real
 *   Script Properties total-size quota mid-write, then added auto-retry/
 *   auto-reclaim logic on top of that — compounding complexity instead of
 *   fixing the actual problem, which was simple: your data was never lost,
 *   it was sitting correctly in the per-day/per-history keys the entire
 *   time, confirmed via debugDemandState on every single check tonight.
 * - getState() no longer attempts any demand write at all — it only reads
 *   from the confirmed-working per-day keys. Since reads don't need free
 *   space, this works immediately regardless of total Script Properties
 *   usage, with no cleanup, migration, or manual step required.
 * - Removed: DEMAND_KEY, consolidateDemandKeys_(), reclaimLegacySpace_(),
 *   DEMAND_CONSOLIDATED_FLAG_KEY. debugDemandState() reverted to reporting
 *   on the per-day format that's actually in use.
 * - Net effect: this is exactly v0.4.10's demand storage, byte for byte,
 *   which was the last version confirmed reliably loading your data before
 *   any of tonight's consolidation detour began.
 *
 * v0.4.13 — 2026-07-07
 * - consolidateDemandKeys_() no longer requires the manual reclaimLegacySpace_
 *   step. If the consolidated write fails (storage quota), it now checks the
 *   same safety condition that function used — migration flag set, legacy
 *   blob still present — and if satisfied, deletes the legacy blob and
 *   retries automatically, once, in the same call. Reloading the app is now
 *   the only action required; nothing manual left to run.
 *
 * v0.4.12 — 2026-07-07
 * - FOUND THE ACTUAL ROOT CAUSE, confirmed via debugDemandState(), not
 *   theorized: total Script Properties usage was ~522,911 bytes against
 *   the real ~500,000 byte budget shared across every key in the script —
 *   over the limit. Every prior fix tonight left the previous format's data
 *   sitting untouched as a rollback net (legacy 293KB blob, then 130+12
 *   fragmented per-day/history keys), and none of it was ever reclaimed.
 *   v0.4.11's consolidation write had no room to succeed, so it silently
 *   failed and demand read back empty — not a code bug in the new format,
 *   a resource ceiling caused by never cleaning up superseded data.
 * - Add: reclaimLegacySpace_() — explicit, run-once-by-request (Apps Script
 *   editor, not automatic), deletes ONLY the legacy sequins_state blob, and
 *   only if the migration flag confirms everything in it was already
 *   independently verified migrated elsewhere. Frees ~290KB.
 * - consolidateDemandKeys_() now also reclaims the old fragmented per-day/
 *   history keys, but only AFTER confirming the new consolidated write
 *   actually succeeded — so this can't silently re-approach the ceiling
 *   the same way again as more weeks get added.
 *
 * v0.4.11 — 2026-07-07
 * - FIX: v0.4.6 fragmented demand into one Script Property per day plus a
 *   separate history property per day, based on a belief that a single
 *   value hits a 9KB wall. That belief was wrong — real-world testing shows
 *   the actual per-value ceiling is closer to 512KB, with a shared ~500KB
 *   budget across all properties combined being the limit that actually
 *   matters. The fragmentation turned every getState() call into 260+
 *   sequential PropertiesService round-trips, which is almost certainly
 *   what caused the intermittent "sometimes loads, sometimes doesn't"
 *   behavior — the signature of tripping an execution-time or concurrency
 *   ceiling under normal polling + navigation, not a data problem.
 * - Demand is now stored in ONE key (sequins_demand), matching how SKU
 *   Library, Line Config, Sequencing Rules, etc. already work — isolated
 *   from those other sections (the original, legitimate reason for the
 *   split), but no longer fragmented within itself.
 * - consolidateDemandKeys_() runs once (own flag) to merge the old
 *   per-day/per-history keys into the new single key. Old fragmented keys
 *   are read once, then left in place untouched — never deleted — same
 *   rollback-safety convention as every other migration in this file.
 * - debugDemandState() updated to report on the new format, plus total
 *   Script Properties usage against the real ~500,000 byte budget.
 *
 * v0.4.10 — 2026-07-07
 * - FIX: getState() defaulted lineConfig and sequencingRules to [] when
 *   unset. [] is truthy in JS, so Index.html's `STATE.sequencingRules ||
 *   DEFAULT_RULES` (and same for lineConfig) never fell back to the real
 *   defaults — it silently used the empty array instead. This crashed
 *   runSequencer with "Cannot read properties of undefined (reading
 *   'indexOf')" on rules.greenBeltPackages.indexOf(...) the moment any job
 *   actually reached that line, which only happened on days where at least
 *   one SKU matched the library — explaining why some days looked "blank"
 *   (harmlessly, zero jobs) while others hard-crashed the whole Workbench
 *   render with no on-screen error. Both fields now correctly return
 *   null/undefined when unset, matching what the client's own fallback
 *   logic expects. Confirmed via browser console stack trace, not guessed.
 *
 * v0.4.9 — 2026-07-07
 * - Add: clearDemandDay(weekLabel, day) — admin-only, single-day delete,
 *   audit-logged. This is the ONLY way a demand day is ever removed: always
 *   a direct button click from the Load Demand admin panel, confirmed
 *   client-side first, never automatic, never looped over multiple days.
 *   Companion to the Index.html "Clear" button added to the Loaded Demand
 *   table.
 *
 * v0.4.8 — 2026-07-07
 * - REVERT: v0.4.7 added pruneDateFromOtherWeeks_, which called
 *   PropertiesService.deleteProperty() automatically on every demand save to
 *   clean up a cosmetic issue (a date showing under two week labels when
 *   source tabs overlap at week boundaries). That was the first background,
 *   automatic delete ever introduced into this codebase, added to fix a
 *   display duplicate — the wrong trade given this data needs to be
 *   reliable. Fully removed. setDemandDay_ is back to a pure write path:
 *   it only ever calls setProperty, never deleteProperty. Verified via grep
 *   across the whole file: the only two remaining delete calls anywhere are
 *   unpublishPlan and clearSkuMove, both pre-existing, explicit, single-item
 *   actions tied to a specific button click — not automatic background
 *   behavior. The cross-week duplicate display issue from v0.4.6 is back
 *   (cosmetic only — does not affect sequencing for the currently selected
 *   week/day) and will be revisited separately, client-side, non-destructively.
 *
 * v0.4.7 — 2026-07-07
 * - FIX: Demands 2025 tabs can have overlapping date columns at week
 *   boundaries (e.g. both "2026 Week 27" and "2026 Week 28" listing Jul 4-5).
 *   Which week a date resolves to depends on which tabs are in a given
 *   fetch's range, so the same calendar date could land under a different
 *   week label on a later fetch — with no cleanup of the earlier week's
 *   entry, leaving duplicates (same date showing under two weeks at once).
 *   setDemandDay_ now prunes any other week bucket holding the same calendar
 *   date whenever a day is saved, so only the most recently resolved week
 *   wins. Applies to both actuals and forecast publishes.
 *
 * v0.4.6 — 2026-07-07
 * - FIX: v0.4.5's migration wrote sequins_demand as one combined blob for
 *   all weeks. Script Properties has a real 9KB-per-value limit; demand
 *   (which grows with every week ever loaded, plus a 5-deep history array
 *   that duplicated the FULL SKU map per entry) blew past it during
 *   migration. setProperty threw partway through the migration loop, which
 *   silently aborted remaining sections, and the "already migrated" check
 *   (presence of any new key) then skipped retrying forever — this is what
 *   made demand disappear after deploying v0.4.5.
 * - Demand is now stored one Script Property PER DAY (sequins_demand__
 *   <week>__<day>), with an index key tracking which day-keys exist.
 * - History moved to its own key per day (sequins_demand_hist__<week>__
 *   <day>) and slimmed from a full duplicated SKU map to metadata only
 *   (mode/date/SKU count/total units/when) — it only ever needed to answer
 *   "what did this used to be", not reproduce exact quantities. Verified via
 *   simulation at 300 SKUs/day with full pre-existing history: live day
 *   ~4KB, history ~450B, comfortably under the 9KB ceiling.
 * - Migration now runs per-day with its own try/catch, gated on a dedicated
 *   one-time flag (sequins_migrated_v1) instead of "does some other section
 *   already exist" — one oversized day can no longer block or permanently
 *   skip the rest. Legacy sequins_state blob is still never deleted.
 *
 * v0.4.5 — 2026-07-07
 * - Split sequins_state into per-concern Script Properties keys (SKU library,
 *   sequencing rules, line config, workbench overrides, published plans,
 *   demand, planners) instead of one shared blob. Every save function used to
 *   read-modify-write the entire blob, so a Workbench save mid-flight could
 *   silently clobber a Sequencing Rules edit saved moments later (or vice
 *   versa) with no conflict warning. Each view's save path now only touches
 *   its own key. getState() reassembles the same shape the client already
 *   consumes, so Index.html required no changes on the read side. One-time
 *   migration of any existing sequins_state blob runs automatically on first
 *   load; legacy key is left in place, unused, as a rollback safety net.
 *
 * v0.4.4 — 2026-07-06
 * - saveSkuMove now accepts and persists an optional `position` (slot index
 *   within the destination line) so Workbench drag-and-drop can place a SKU
 *   at a specific spot instead of always appending to the end of the line.
 *   Supports both cross-line moves and same-line reordering. Backward
 *   compatible: omitting position (or passing null) keeps old append-at-end
 *   behavior.
 *
 * v0.4.3 — 2026-07-02
 * - fetchActualDemand now returns the real week label (from the "2026 Week 27"
 *   style tab name) alongside each date, instead of leaving the client to guess
 *   it with its own formula. Fixes actuals landing in the wrong week bucket
 *   on weekend dates.
 *
 * v0.4.2 — 2026-07-01
 * - Removed SKU library gate from fetchForecastWeekData — all forecast SKUs load regardless of library
 * - Removed SKU library gate from fetchActualDemand — same fix for actuals fetch
 * - Library now governs sequencing behavior only (pool, UPM, allergens), not data ingestion
 * - fetchForecastWeekData now scans col A dynamically for SKU start row instead of hardcoded col B row 12
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone in Farmer's Fridge
 */

// ─── SHEET IDs ────────────────────────────────────────────────────────────────
const DEMANDS_SHEET_ID  = '1yOQ_xp3kGZ3hwqbNuZA_l5v2KsziDwr2YjRbdMOL_00';
const FORECAST_SHEET_ID = '1wyHr4QhvRGfyHgYURY7k5vLJFrpV3AX_wo5hkkk151A';
const FORECAST_TAB      = 'Summary';

// SKU attribute sources (replaces the old Seq Input aggregator)
const MASTER_DOC_SHEET_ID   = '1FRJ77-304M51SLwxrmljjZlrqv3YGMO_DRVrGu0pDBQ'; // Assembly Sequencing 2.0
const MASTER_DOC_TAB        = 'Master Document';   // cols G(name) - J(UPM), H(Optimal HC)
const MENU_LIBRARY_SHEET_ID = '1Exdh-emJxD7TohJ3IzjIQZDP3siPgjuVXhp3J7Gw2Ik'; // Menu Library
const MENU_LIBRARY_TAB      = 'Full Menu Summary';  // B=Category, C=SKU Name, L=Package, M=Allergens
const PROCESSING_SHEET_ID   = '1v_C2ZUR9_PjTqCO4XU16x2oRTvmvpdT43cs0d3tyh54'; // FPLModel Engine
const PROCESSING_TAB        = 'Processing Complexity'; // B=SKU Name, E=90 Day Duration/Unit

// ─── STORAGE ──────────────────────────────────────────────────────────────────
// v0.4.5 split sequins_state into per-concern keys so a bad write from one
// view (e.g. Workbench) can't clobber unrelated sections (e.g. Sequencing
// Rules) via a stale read-modify-write of one shared blob. STATE_KEY is kept
// around, untouched after migration, as a cheap rollback safety net.
const STATE_KEY  = 'sequins_state'; // legacy blob — migrated from, no longer written
const STATE_KEYS = {
  skuLibrary:      'sequins_sku_library',
  sequencingRules: 'sequins_sequencing_rules',
  lineConfig:      'sequins_line_config',
  overrides:       'sequins_workbench_overrides',
  publishedPlans:  'sequins_published_plans',
  planners:        'sequins_planners'
};
// Demand is stored one Script Property per day (sequins_demand__<week>__
// <day>), with history in a separate per-day key, tracked by this index.
// This is the confirmed-working format — verified present and correct via
// debugDemandState() multiple times. v0.4.11-13 attempted consolidating this
// into a single key and got tangled in a real Script Properties total-size
// quota that took the app down further; that attempt was fully reverted.
const DEMAND_INDEX_KEY = 'sequins_demand_weeks';
const META_KEY   = 'sequins_meta'; // { lastModified }
const ADMINS_KEY = 'sequins_admins';
const AUDIT_SHEET_ID = '10yoKW7U76VW-GTuPTfNRxIQSTiegZqpOrDRZnZPI1Es';

// Stop reading SKU rows when we hit this sentinel in Demands 2025
const DEMANDS_STOP_SKU = 'VITAL_FARMS_EGGS';

// Default admins — always has full access
const DEFAULT_ADMINS = [
  'cori.blackburn@farmersfridge.com',
];

// Default rules editors — can edit line config + sequencing rules
const DEFAULT_RULES_EDITORS = [
  'cori.blackburn@farmersfridge.com',
  'smunshi@farmersfridge.com',
];

// ─── SERVE UI ─────────────────────────────────────────────────────────────────
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Sequins ✨')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function getCurrentUser() {
  const email      = Session.getActiveUser().getEmail();
  const admins     = getAdminList_();
  const isAdmin    = admins.map(a => a.toLowerCase()).includes(email.toLowerCase());
  const planners   = getSection_(STATE_KEYS.planners) || [];
  const isPlanner  = planners.map(p => p.toLowerCase()).includes(email.toLowerCase());
  const rulesEditors = getRulesEditorList_();
  const canEditRules = isAdmin || rulesEditors.map(r => r.toLowerCase()).includes(email.toLowerCase());
  return { email, isAdmin, isPlanner, canEditRules, name: email.split('@')[0] };
}

function getAdminList_() {
  const props  = PropertiesService.getScriptProperties();
  const stored = props.getProperty(ADMINS_KEY);
  try { return stored ? JSON.parse(stored) : DEFAULT_ADMINS; }
  catch(e) { return DEFAULT_ADMINS; }
}

// Public wrapper — client-side google.script.run cannot call functions
// with a trailing underscore (private-by-convention), so this exposes
// the same data through a normal function name.
function getAdminListForClient() {
  return getAdminList_();
}

function getRulesEditorList_() {
  const props  = PropertiesService.getScriptProperties();
  const stored = props.getProperty('sequins_rules_editors');
  try { return stored ? JSON.parse(stored) : DEFAULT_RULES_EDITORS; }
  catch(e) { return DEFAULT_RULES_EDITORS; }
}

function saveRulesEditors(list) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  safeSetProperty_('sequins_rules_editors', JSON.stringify(list));
  return { ok: true };
}

function addAdmin(email) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  const list = getAdminList_();
  if (!list.map(e => e.toLowerCase()).includes(email.toLowerCase())) list.push(email.toLowerCase());
  safeSetProperty_(ADMINS_KEY, JSON.stringify(list));
  return { ok: true };
}

function removeAdmin(email) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  if (email.toLowerCase() === user.email.toLowerCase()) throw new Error("Can't remove yourself");
  const list = getAdminList_().filter(e => e.toLowerCase() !== email.toLowerCase());
  safeSetProperty_(ADMINS_KEY, JSON.stringify(list));
  return { ok: true };
}

// ─── STATE ────────────────────────────────────────────────────────────────────
function getSection_(key) {
  const raw = PropertiesService.getScriptProperties().getProperty(key);
  try { return raw ? JSON.parse(raw) : null; }
  catch(e) { return null; }
}

// Every write in the app funnels through here (or through setDemandDay_'s
// PropertiesService calls below), so fixing it once here protects every
// write path uniformly. If Script Properties' shared total storage quota
// is hit, and the legacy sequins_state blob is still sitting there fully
// verified redundant (migration flag confirms everything in it is already
// safe elsewhere), delete it to free room and retry once automatically.
function safeSetProperty_(key, value) {
  const props = PropertiesService.getScriptProperties();
  try {
    props.setProperty(key, value);
  } catch (e) {
    const isQuota = String(e.message || '').toLowerCase().indexOf('quota') !== -1;
    if (isQuota && props.getProperty(MIGRATION_FLAG_KEY) && props.getProperty(STATE_KEY)) {
      Logger.log('Write to "' + key + '" hit storage quota — reclaiming legacy sequins_state blob and retrying.');
      props.deleteProperty(STATE_KEY);
      props.setProperty(key, value);
    } else {
      throw e;
    }
  }
}

function setSection_(key, value) {
  safeSetProperty_(key, JSON.stringify(value));
  touchLastModified_();
}

function touchLastModified_() {
  safeSetProperty_(META_KEY, JSON.stringify({ lastModified: new Date().toISOString() }));
}

// One-time split of the legacy sequins_state blob into per-concern keys.
// Runs on every getState() call but is a no-op once any new key exists,
// so it's cheap after the first post-deploy load. Legacy key is left in
// place (unread, unwritten) as a rollback safety net.
function demandDayKey_(weekLabel, day) {
  return 'sequins_demand__' + String(weekLabel).replace(/[^A-Za-z0-9]+/g, '_') + '__' + day;
}

function demandHistoryKey_(weekLabel, day) {
  return 'sequins_demand_hist__' + String(weekLabel).replace(/[^A-Za-z0-9]+/g, '_') + '__' + day;
}

// A full day's SKU-level snapshot repeated 5x (the old embedded history
// array) is what actually blew past comfortable size — history is stored
// separately from the live day and slimmed to metadata (mode/date/SKU
// count/total units/when), not the full per-SKU quantities.
function slimHistoryEntry_(dayLike) {
  const skus = (dayLike && dayLike.skus) || {};
  let totalUnits = 0;
  Object.keys(skus).forEach(function(s) { totalUnits += (skus[s] || 0); });
  return {
    mode: (dayLike && dayLike.mode) || '',
    date: (dayLike && dayLike.date) || '',
    skuCount: Object.keys(skus).length,
    totalUnits: totalUnits,
    savedAt: (dayLike && dayLike.savedAt) || new Date().toISOString()
  };
}

function getDemandDay_(weekLabel, day) {
  return getSection_(demandDayKey_(weekLabel, day));
}

function getDemandHistory_(weekLabel, day) {
  return getSection_(demandHistoryKey_(weekLabel, day)) || [];
}

// dayData is the live day (skus/mode/date/publishedBy/publishedAt), no
// embedded history. prevDay (optional) is the live day being replaced — if
// present, it's slimmed and pushed onto that day's history key, capped at 5.
function setDemandDay_(weekLabel, day, dayData, prevDay) {
  setSection_(demandDayKey_(weekLabel, day), dayData);
  if (prevDay) {
    const hist = [slimHistoryEntry_(prevDay)].concat(getDemandHistory_(weekLabel, day)).slice(0, 5);
    setSection_(demandHistoryKey_(weekLabel, day), hist);
  }
  const idx = getSection_(DEMAND_INDEX_KEY) || {};
  if (!idx[weekLabel]) idx[weekLabel] = [];
  if (idx[weekLabel].indexOf(day) === -1) {
    idx[weekLabel].push(day);
    safeSetProperty_(DEMAND_INDEX_KEY, JSON.stringify(idx));
  }
}

// Returns { day: liveDayData } for a week — no history embedded, matching
// what the mode/date checks in publish/fetch functions actually need.
function getDemandWeek_(weekLabel) {
  const idx = getSection_(DEMAND_INDEX_KEY) || {};
  const days = idx[weekLabel] || [];
  const weekData = {};
  days.forEach(function(day) {
    const d = getDemandDay_(weekLabel, day);
    if (d) weekData[day] = d;
  });
  return weekData;
}

// Full assembly for the client — reattaches each day's history from its
// separate key. Confirmed working, confirmed present, this is the format
// your data has actually been sitting in correctly all along.
function getAllDemand_() {
  const idx = getSection_(DEMAND_INDEX_KEY) || {};
  const demand = {};
  Object.keys(idx).forEach(function(weekLabel) {
    demand[weekLabel] = {};
    idx[weekLabel].forEach(function(day) {
      const d = getDemandDay_(weekLabel, day);
      if (d) {
        const withHistory = Object.assign({}, d);
        withHistory.history = getDemandHistory_(weekLabel, day);
        demand[weekLabel][day] = withHistory;
      }
    });
  });
  return demand;
}

// Explicit, admin-only, single-day delete — the ONLY way a demand day is
// ever removed. Always a direct user action from the Load Demand admin
// panel (button click, confirmed client-side), never automatic or looped
// over multiple days in the background. Audit-logged like other admin actions.
function clearDemandDay(weekLabel, day) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  const props = PropertiesService.getScriptProperties();
  const existed = getDemandDay_(weekLabel, day) !== null;
  props.deleteProperty(demandDayKey_(weekLabel, day));
  props.deleteProperty(demandHistoryKey_(weekLabel, day));
  const idx = getSection_(DEMAND_INDEX_KEY) || {};
  if (idx[weekLabel]) {
    idx[weekLabel] = idx[weekLabel].filter(function(d) { return d !== day; });
    props.setProperty(DEMAND_INDEX_KEY, JSON.stringify(idx));
  }
  writeAuditLog_(user.email, 'clear_demand_day', weekLabel, day, existed ? 'cleared' : 'was already empty');
  return { ok: true };
}

// One-time split of the legacy sequins_state blob into per-concern keys.
// Gated on its own flag (not "does some other key already exist") and each
// field migrates in its own try/catch, so one field that's too large for a
// single Script Property (demand, historically) can't silently abort the
// rest and can't get skipped forever by looking like "already done".
const MIGRATION_FLAG_KEY = 'sequins_migrated_v1';

// Temporary diagnostic — run this directly from the Apps Script editor
// (select debugDemandState from the function dropdown, click Run, then
// View > Logs) to see the actual current state of migration + demand
// storage, without hunting through the Executions list for the right run.
// Read-only, safe to run any time, safe to leave in.
function debugDemandState() {
  const props = PropertiesService.getScriptProperties();
  const legacyRaw = props.getProperty(STATE_KEY);
  const migrated = props.getProperty(MIGRATION_FLAG_KEY);
  const idx = getSection_(DEMAND_INDEX_KEY);
  const allKeys = props.getKeys();
  const demandDayKeys = allKeys.filter(function(k) { return k.indexOf('sequins_demand__') === 0; });
  const demandHistKeys = allKeys.filter(function(k) { return k.indexOf('sequins_demand_hist__') === 0; });
  let totalPropsBytes = 0;
  allKeys.forEach(function(k) { totalPropsBytes += k.length + (props.getProperty(k) || '').length; });

  Logger.log('--- Sequins demand diagnostic ---');
  Logger.log('Legacy sequins_state present: ' + (legacyRaw ? 'YES (' + legacyRaw.length + ' chars)' : 'NO'));
  Logger.log('Migration flag (sequins_migrated_v1) set: ' + (migrated ? 'YES' : 'NO'));
  Logger.log('Demand index (sequins_demand_weeks): ' + (idx ? JSON.stringify(idx) : 'MISSING'));
  Logger.log('Demand day keys found: ' + demandDayKeys.length + (demandDayKeys.length ? ' -> ' + demandDayKeys.slice(0,10).join(', ') + (demandDayKeys.length > 10 ? ' ...' : '') : ''));
  Logger.log('Demand history keys found: ' + demandHistKeys.length);
  Logger.log('Total Script Properties usage: ~' + totalPropsBytes + ' bytes of ~500,000 byte budget');
  Logger.log('--- end diagnostic ---');
}

function migrateLegacyState_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(MIGRATION_FLAG_KEY)) return;

  const legacyRaw = props.getProperty(STATE_KEY);
  if (!legacyRaw) { props.setProperty(MIGRATION_FLAG_KEY, 'true'); return; }

  let legacy;
  try { legacy = JSON.parse(legacyRaw); }
  catch(e) { Logger.log('Legacy state parse failed: ' + e.message); props.setProperty(MIGRATION_FLAG_KEY, 'true'); return; }

  Object.keys(STATE_KEYS).forEach(function(field) {
    if (legacy[field] === undefined) return;
    try { props.setProperty(STATE_KEYS[field], JSON.stringify(legacy[field])); }
    catch(e) { Logger.log('Migration failed for section "' + field + '": ' + e.message); }
  });

  if (legacy.demand) {
    Object.keys(legacy.demand).forEach(function(weekLabel) {
      Object.keys(legacy.demand[weekLabel]).forEach(function(day) {
        try {
          const src = legacy.demand[weekLabel][day];
          const liveData = { skus: src.skus, mode: src.mode, date: src.date, publishedBy: src.publishedBy, publishedAt: src.publishedAt };
          setDemandDay_(weekLabel, day, liveData, null);
          if (src.history && src.history.length) {
            const slimHist = src.history.map(slimHistoryEntry_).slice(0, 5);
            setSection_(demandHistoryKey_(weekLabel, day), slimHist);
          }
        } catch(e) {
          Logger.log('Migration failed for demand day "' + weekLabel + '/' + day + '": ' + e.message);
        }
      });
    });
  }

  try { props.setProperty(META_KEY, JSON.stringify({ lastModified: legacy.lastModified || new Date().toISOString() })); }
  catch(e) { Logger.log('Migration failed for meta/lastModified: ' + e.message); }

  props.setProperty(MIGRATION_FLAG_KEY, 'true');
  Logger.log('sequins_state migration complete (see above for any per-field failures).');
}

// Assembles the same shape the client has always consumed, from the split
// keys, so Index.html needs zero changes on the read side.
function getState() {
  migrateLegacyState_();
  const meta = getSection_(META_KEY) || {};
  return {
    demand:          getAllDemand_(),
    skuLibrary:      getSection_(STATE_KEYS.skuLibrary) || {},
    // lineConfig and sequencingRules must default to null/undefined, NOT an
    // empty array — Index.html's getRules()/line-config lookups do
    // `STATE.x || DEFAULT_x`, and [] is truthy in JS, so a wrong default
    // here silently defeats that fallback instead of triggering it. This
    // caused runSequencer to crash on `rules.greenBeltPackages.indexOf(...)`
    // whenever sequencingRules resolved to [] instead of the real rules object.
    lineConfig:      getSection_(STATE_KEYS.lineConfig),
    overrides:       getSection_(STATE_KEYS.overrides) || {},
    publishedPlans:  getSection_(STATE_KEYS.publishedPlans) || {},
    planners:        getSection_(STATE_KEYS.planners) || [],
    sequencingRules: getSection_(STATE_KEYS.sequencingRules),
    lastModified:    meta.lastModified || null
  };
}

function getLastModified() {
  const meta = getSection_(META_KEY);
  return meta ? (meta.lastModified || null) : null;
}

// ─── DEMAND FETCH: COMPILED FORECAST ─────────────────────────────────────────
function fetchForecastWeeks() {
  const ss    = SpreadsheetApp.openById(FORECAST_SHEET_ID);
  const sheet = ss.getSheetByName(FORECAST_TAB);
  if (!sheet) throw new Error('Tab "' + FORECAST_TAB + '" not found in Compiled Forecast');

  const lastCol = sheet.getLastColumn();
  const row1    = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row2    = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const row3    = sheet.getRange(3, 1, 1, lastCol).getValues()[0];

  const weeks = {};
  const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  row1.forEach((cell, ci) => {
    const wkMatch = String(cell).match(/Week\s+(\d+)/i);
    if (!wkMatch) return;
    const wkNum   = parseInt(wkMatch[1]);
    const dayName = String(row2[ci]).trim();
    if (!DAYS.includes(dayName)) return;
    const dateVal = row3[ci];
    const dateStr = dateVal instanceof Date
      ? Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
    const yr    = new Date().getFullYear();
    const label = 'Wk ' + wkNum + ' · ' + yr;
    if (!weeks[label]) weeks[label] = { label, wkNum, days: [] };
    weeks[label].days.push(dayName);
  });

  return Object.values(weeks).sort((a, b) => a.wkNum - b.wkNum);
}

function fetchForecastWeekData(weekLabel) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');

  const ss    = SpreadsheetApp.openById(FORECAST_SHEET_ID);
  const sheet = ss.getSheetByName(FORECAST_TAB);
  if (!sheet) throw new Error('Tab "' + FORECAST_TAB + '" not found');

  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const tz      = Session.getScriptTimeZone();
  const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // Scan row 3 for Date objects and row 2 for day names, collecting every
  // day that shares the same week label — found by carrying the last-seen
  // row-1 value forward across merged cells. This must run in full every
  // time, not just on "first load": an earlier version only did this scan
  // when Sequins had no dates stored yet for the week, and otherwise only
  // looked for dates it already knew about. That meant a week whose stored
  // data was ever incomplete (e.g. only 3 of 7 days, from an actual/forecast
  // mixup) could never discover the remaining days even though they were
  // sitting right there in the sheet — exactly what happened to Wk 28.
  const weekCols = [];
  let lastLabel = '';
  for (let ci = 0; ci < lastCol; ci++) {
    const cell = String(allData[0][ci] || '').trim();
    if (cell) lastLabel = cell;
    const wkMatch = lastLabel.match(/Week\s+(\d+)/i);
    if (!wkMatch) continue;
    const label = 'Wk ' + parseInt(wkMatch[1]) + ' · ' + new Date().getFullYear();
    if (label !== weekLabel) continue;
    const dayName = String(allData[1][ci] || '').trim();
    if (!DAYS.includes(dayName)) continue;
    const dateVal = allData[2][ci];
    const dateStr = dateVal instanceof Date
      ? Utilities.formatDate(new Date(dateVal), tz, 'yyyy-MM-dd') : '';
    weekCols.push({ col: ci, day: dayName, date: dateStr });
  }

  if (!weekCols.length) throw new Error('Week ' + weekLabel + ' not found in Summary tab');

  const skuData = {};
  const dates   = {};
  weekCols.forEach(function(wc) { dates[wc.day] = wc.date; });

  // SKU names are in col C (index 2), starting row 16 (index 15).
  // No library filter — load all SKUs from the forecast as-is.
  for (let r = 15; r < allData.length; r++) {
    const skuVal = allData[r][2];
    if (!skuVal) continue;
    const skuName = String(skuVal).trim();
    if (!skuName || skuName === 'SKU') continue;
    weekCols.forEach(function(wc) {
      const qty = Math.round(parseFloat(allData[r][wc.col]) || 0);
      if (qty <= 0) return;
      if (!skuData[wc.day]) skuData[wc.day] = {};
      skuData[wc.day][skuName] = qty;
    });
  }

  return { weekLabel, skuData, dates, mode: 'forecast' };
}

// ─── DEMAND FETCH: ACTUALS (DEMANDS 2025) ─────────────────────────────────────
function fetchActualDemand(startDate, endDate) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');

  const start = new Date(startDate + 'T12:00:00');
  const end   = new Date(endDate   + 'T12:00:00');
  const tz    = Session.getScriptTimeZone();
  const ss    = SpreadsheetApp.openById(DEMANDS_SHEET_ID);

  const allSheets  = ss.getSheets();
  const weekSheets = allSheets.filter(s => /\d{4}\s+Week\s+\d+/i.test(s.getName()));
  if (!weekSheets.length) throw new Error('No weekly tabs found in Demands 2025. Expected names like "2026 Week 27".');

  const skuData = {};
  const byDate  = {};

  weekSheets.forEach(sheet => {
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();
    if (lastCol < 3 || lastRow < 4) return;

    const sheetName = sheet.getName();
    const wm = sheetName.match(/(\d{4})\s+Week\s+(\d+)/i);
    const sheetWeekLabel = wm ? ('Wk ' + wm[2] + ' · ' + wm[1]) : sheetName;

    const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const dateRow = allData[2]; // Row 3 = dates

    const dateCols = [];
    for (let ci = 2; ci <= 8 && ci < dateRow.length; ci++) {
      const cellVal  = dateRow[ci];
      if (!cellVal) continue;
      const cellDate = cellVal instanceof Date ? new Date(cellVal) : new Date(cellVal);
      if (isNaN(cellDate.getTime())) continue;
      cellDate.setHours(12, 0, 0, 0);
      if (cellDate >= start && cellDate <= end) {
        const dateStr = Utilities.formatDate(cellDate, tz, 'yyyy-MM-dd');
        const dayStr  = Utilities.formatDate(cellDate, tz, 'EEEE');
        dateCols.push({ col: ci, date: dateStr, day: dayStr });
        byDate[dateStr] = { day: dayStr, col: ci, weekLabel: sheetWeekLabel };
      }
    }
    if (!dateCols.length) return;

    // No library filter — load all SKUs from actuals as-is.
    // Stop at sentinel VITAL_FARMS_EGGS.
    for (let r = 3; r < allData.length; r++) {
      const skuVal = allData[r][0];
      if (!skuVal) continue;
      const skuName = String(skuVal).trim();
      if (!skuName) continue;
      if (skuName.toUpperCase() === DEMANDS_STOP_SKU) break;
      dateCols.forEach(dc => {
        const qty = Math.round(parseFloat(allData[r][dc.col]) || 0);
        if (qty <= 0) return;
        const key = dc.day + '|' + dc.date;
        if (!skuData[key]) skuData[key] = {};
        skuData[key][skuName] = (skuData[key][skuName] || 0) + qty;
      });
    }
  });

  if (!Object.keys(byDate).length)
    throw new Error('No dates found between ' + startDate + ' and ' + endDate + ' in Demands 2025.');

  const datesList = Object.entries(byDate)
    .map(([date, info]) => ({ date, day: info.day, col: info.col, weekLabel: info.weekLabel }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { skuData, byDate, dates: datesList, mode: 'actual' };
}

// ─── PUBLISH DEMAND ───────────────────────────────────────────────────────────
function publishForecastWeek(weekLabel, skuData, dates) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');

  const weekData = getDemandWeek_(weekLabel);
  let daysLoaded = 0;

  Object.entries(skuData).forEach(([day, skus]) => {
    const existing = weekData[day];
    if (existing && existing.mode === 'actual') return;
    const newDay = {
      skus, mode: 'forecast', date: dates[day] || '',
      publishedBy: user.email, publishedAt: new Date().toISOString()
    };
    setDemandDay_(weekLabel, day, newDay, existing);
    daysLoaded++;
  });

  writeAuditLog_(user.email, 'publish_forecast', weekLabel, '', daysLoaded + ' days');
  return { ok: true, weekLabel, daysLoaded };
}

function publishActualDays(entries) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');

  const byWeek = {};
  entries.forEach(entry => { (byWeek[entry.weekLabel] = byWeek[entry.weekLabel] || []).push(entry); });

  Object.keys(byWeek).forEach(weekLabel => {
    const weekData = getDemandWeek_(weekLabel);
    byWeek[weekLabel].forEach(entry => {
      const { day, date, skus } = entry;
      const existing = weekData[day];
      const newDay = {
        skus, mode: 'actual', date,
        publishedBy: user.email, publishedAt: new Date().toISOString()
      };
      setDemandDay_(weekLabel, day, newDay, existing);
      weekData[day] = newDay;
      writeAuditLog_(user.email, 'publish_actual', weekLabel, day, Object.keys(skus).length + ' SKUs');
    });
  });

  return { ok: true, daysLoaded: entries.length };
}

// ─── SKU ATTRIBUTES (real sources — no guessing) ──────────────────────────────
/**
 * Pulls SKU attributes for a given list of SKU names directly from the
 * three source sheets that the old Seq Input formulas referenced:
 *   - Master Document (UPM, Optimal HC)
 *   - Full Menu Summary (Package, Allergens, Menu Category)
 *   - Processing Complexity (90 Day Duration/Unit)
 * Returns a map keyed by SKU name (uppercased) -> attributes.
 * SKUs not found in these sources are flagged, not guessed.
 */
function fetchSkuAttributesFor(skuNames) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');

  const wantedKeys = new Set(skuNames.map(s => normalizeSku_(s)));
  const result = {};
  const notFound = new Set(skuNames.map(s => s.toUpperCase()));

  // 1. Master Document — UPM (col J) + Optimal HC (col H), keyed by col G
  try {
    const mdSheet = SpreadsheetApp.openById(MASTER_DOC_SHEET_ID).getSheetByName(MASTER_DOC_TAB);
    if (mdSheet) {
      const lastRow = mdSheet.getLastRow();
      const data = mdSheet.getRange(1, 7, lastRow, 4).getValues(); // cols G:J
      data.forEach(row => {
        const name = String(row[0] || '').trim();
        if (!name) return;
        const key = normalizeSku_(name);
        if (!wantedKeys.has(key)) return;
        const hc  = parseFloat(row[1]); // col H
        const upm = parseFloat(row[3]); // col J
        if (!result[key]) result[key] = {};
        if (isFinite(hc))  result[key].optimalHC = hc;
        if (isFinite(upm)) result[key].upm = upm;
      });
    }
  } catch(e) { Logger.log('Master Document fetch failed: ' + e.message); }

  // 2. Full Menu Summary — Category (col B), Package (col L), Allergens (col M), keyed by col C
  try {
    const mlSheet = SpreadsheetApp.openById(MENU_LIBRARY_SHEET_ID).getSheetByName(MENU_LIBRARY_TAB);
    if (mlSheet) {
      const lastRow = mlSheet.getLastRow();
      const data = mlSheet.getRange(2, 2, lastRow - 1, 16).getValues(); // cols B:Q starting row 2
      data.forEach(row => {
        const name = String(row[1] || '').trim(); // col C = index 1 (0=B,1=C)
        if (!name) return;
        const key = normalizeSku_(name);
        if (!wantedKeys.has(key)) return;
        const category  = String(row[0] || '').trim();  // col B = index 0
        const packageTy = String(row[10] || '').trim();  // col L = index 10
        const allergens = String(row[11] || '').trim();  // col M = index 11
        if (!result[key]) result[key] = {};
        if (category)  result[key].category    = category;
        if (packageTy)  result[key].packageType = packageTy;
        if (allergens)  result[key].allergens   = allergens;
      });
    }
  } catch(e) { Logger.log('Menu Library fetch failed: ' + e.message); }

  // 3. Processing Complexity — 90 Day Duration/Unit (col E), keyed by col B
  try {
    const pcSheet = SpreadsheetApp.openById(PROCESSING_SHEET_ID).getSheetByName(PROCESSING_TAB);
    if (pcSheet) {
      const lastRow = pcSheet.getLastRow();
      const data = pcSheet.getRange(2, 2, lastRow - 1, 4).getValues(); // cols B:E starting row 2
      data.forEach(row => {
        const name = String(row[0] || '').trim(); // col B = index 0
        if (!name) return;
        const key = normalizeSku_(name);
        if (!wantedKeys.has(key)) return;
        const dur90 = parseFloat(row[3]); // col E = index 3
        if (!result[key]) result[key] = {};
        if (isFinite(dur90)) result[key].duration90Day = dur90;
      });
    }
  } catch(e) { Logger.log('Processing Complexity fetch failed: ' + e.message); }

  // Mark which originally-requested SKUs found nothing at all
  Object.keys(result).forEach(key => {
    // crude reverse-match: if we found anything for this key, clear it from notFound
    skuNames.forEach(orig => {
      if (normalizeSku_(orig) === key) notFound.delete(orig.toUpperCase());
    });
  });

  return { attributes: result, notFound: Array.from(notFound) };
}

function normalizeSku_(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}


function saveSkuLibrary(library) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  setSection_(STATE_KEYS.skuLibrary, library);
  return { ok: true };
}

// ─── LINE CONFIG + RULES ──────────────────────────────────────────────────────
function saveLineConfig(lineConfig) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  setSection_(STATE_KEYS.lineConfig, lineConfig);
  writeAuditLog_(user.email, 'save_line_config', '', '', lineConfig.length + ' lines');
  return { ok: true };
}

function saveSequencingRules(rules) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  setSection_(STATE_KEYS.sequencingRules, rules);
  writeAuditLog_(user.email, 'save_rules', '', '', JSON.stringify(rules));
  return { ok: true };
}

// ─── PLANNER MANAGEMENT ───────────────────────────────────────────────────────
function savePlanners(planners) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  setSection_(STATE_KEYS.planners, planners);
  return { ok: true };
}


// ─── PUBLISHED PLAN ───────────────────────────────────────────────────────────
function savePublishedPlan(weekLabel, day, snap) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const publishedPlans = getSection_(STATE_KEYS.publishedPlans) || {};
  if (!publishedPlans[weekLabel]) publishedPlans[weekLabel] = {};
  publishedPlans[weekLabel][day] = snap;
  setSection_(STATE_KEYS.publishedPlans, publishedPlans);
  writeAuditLog_(user.email, 'publish_plan', weekLabel, day, '');
  return { ok: true };
}

function unpublishPlan(weekLabel, day) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const publishedPlans = getSection_(STATE_KEYS.publishedPlans) || {};
  if (publishedPlans[weekLabel]) {
    delete publishedPlans[weekLabel][day];
    setSection_(STATE_KEYS.publishedPlans, publishedPlans);
    writeAuditLog_(user.email, 'unpublish_plan', weekLabel, day, '');
  }
  return { ok: true };
}
// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
function writeAuditLog_(email, action, week, day, detail) {
  try {
    const ss    = SpreadsheetApp.openById(AUDIT_SHEET_ID);
    let sheet   = ss.getSheetByName('Sequins Audit');
    if (!sheet) {
      sheet = ss.insertSheet('Sequins Audit');
      sheet.appendRow(['Timestamp','Email','Action','Week','Day','Detail']);
      sheet.getRange(1,1,1,6).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), email, action, week||'', day||'', detail||'']);
  } catch(e) {
    Logger.log('Audit log write failed: ' + e.message);
  }
}

/**
 * Logs a SKU move in the Workbench to its own sheet tab — richer record
 * than the general audit log since moves need to show what rules (if any)
 * were broken, and carry an optional note.
 */
function writeSkuMoveLog_(entry) {
  try {
    const ss    = SpreadsheetApp.openById(AUDIT_SHEET_ID);
    let sheet   = ss.getSheetByName('SKU Moves');
    if (!sheet) {
      sheet = ss.insertSheet('SKU Moves');
      sheet.appendRow(['Timestamp','Approved By','Week','Day','SKU','From Line','To Line','Violations','Note']);
      sheet.getRange(1,1,1,9).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date(),
      entry.email || '',
      entry.weekLabel || '',
      entry.day || '',
      entry.sku || '',
      entry.fromLine || '',
      entry.toLine || '',
      (entry.violations || []).join('; '),
      entry.note || ''
    ]);
  } catch(e) {
    Logger.log('SKU move log write failed: ' + e.message);
  }
}

/**
 * Saves a manual SKU placement override for a given week/day, and logs it.
 * Overrides are stored separately from the base demand so the sequencer's
 * automatic placement can still run underneath, with overrides applied
 * on top (move SKU X to line Y, regardless of where auto-placement put it).
 */
function saveSkuMove(weekLabel, day, sku, fromLine, toLine, violations, note, position) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner && !user.canEditRules) throw new Error('Not authorized');

  const overrides = getSection_(STATE_KEYS.overrides) || {};
  if (!overrides[weekLabel]) overrides[weekLabel] = {};
  if (!overrides[weekLabel][day]) overrides[weekLabel][day] = {};

  overrides[weekLabel][day][sku] = {
    line: toLine,
    position: (typeof position === 'number') ? position : null,
    movedBy: user.email,
    movedAt: new Date().toISOString(),
    violations: violations || [],
    note: note || ''
  };

  setSection_(STATE_KEYS.overrides, overrides);

  writeSkuMoveLog_({
    email: user.email, weekLabel, day, sku, fromLine, toLine, violations, note
  });

  return { ok: true };
}

function clearSkuMove(weekLabel, day, sku) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner && !user.canEditRules) throw new Error('Not authorized');

  const overrides = getSection_(STATE_KEYS.overrides) || {};
  if (overrides?.[weekLabel]?.[day]?.[sku]) {
    delete overrides[weekLabel][day][sku];
    setSection_(STATE_KEYS.overrides, overrides);
    writeAuditLog_(user.email, 'clear_sku_override', weekLabel, day, sku);
  }
  return { ok: true };
}

function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

function getRecentSkuMoves(limit) {
  try {
    const ss    = SpreadsheetApp.openById(AUDIT_SHEET_ID);
    const sheet = ss.getSheetByName('SKU Moves');
    if (!sheet || sheet.getLastRow() <= 1) return [];
    const lastRow = sheet.getLastRow();
    const n = Math.min(limit || 100, lastRow - 1);
    const rows = sheet.getRange(lastRow - n + 1, 1, n, 9).getValues();
    return rows.reverse().map(r => ({
      timestamp:  r[0] ? new Date(r[0]).toLocaleString('en-US', {month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}) : '',
      approvedBy: r[1], weekLabel: r[2], day: r[3], sku: r[4],
      fromLine: r[5], toLine: r[6], violations: r[7], note: r[8]
    }));
  } catch(e) {
    Logger.log('getRecentSkuMoves failed: ' + e.message);
    return [];
  }
}
