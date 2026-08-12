/**
 * Sequins ✨ — Code.js    v0.4.47 — 2026-08-12    (pairs with Index.html v0.5.95)
 * Full history: git log. Recent changes only, newest first.
 *
 * v0.4.47  pushedDemandTrigger + installPushedDemandTrigger/remove. Imports on a
 *          15-minute timer so an already-open tab fills in without a refresh:
 *          setDemandDay_ bumps lastModified, and the client's existing 8-second
 *          poll re-pulls state when it changes. No client change needed.
 *          Not installed by anything — run installPushedDemandTrigger() once.
 *
 * v0.4.46  Demand-tab dates read from DISPLAY values. Sheets coerces the pushed
 *          'yyyy-MM-dd' string into a Date at midnight in the SPREADSHEET's
 *          timezone; reformatting that in the SCRIPT's timezone moved it back a
 *          day, so the first real push (53 rows, 08-12) read back as 08-11. The
 *          actuals guard refused it, so nothing was written wrong.
 *          importPushedDemand() also runs from the editor now — getActiveUser()
 *          needs a scope the editor lacks, and editor access already outranks
 *          the admin list.
 *
 * v0.4.45  Pushed demand. The planner writes Assembly Summary A:C into a Demand
 *          tab in the archive Sheet; importPushedDemand() files those rows into
 *          the same per-day storage the manual fetch uses. Date -> week/day is
 *          resolved from the Compiled Forecast header, not recomputed, so the
 *          week label can't disagree with the manual path. Never overwrites an
 *          actual, never reaches into a loaded past day, and a re-push with an
 *          unchanged PushedAt is a no-op. previewPushedDemand() shows the plan
 *          without writing. Manual fetches untouched.
 *
 * v0.4.44  Actuals freeze is date-aware. A captured day is only frozen if it is
 *          in the PAST; today or later re-fetches and is returned in `refreshed`.
 *          The old test froze on membership alone, so tomorrow was as immutable
 *          as last month and a late order could never be picked up. Today is
 *          re-fetchable on purpose. Date comes from the script timezone, never
 *          the client. Past days are untouched — still never re-read.
 *
 * v0.4.43  previewArchiveOldDemand() + archiveOldDemand(). No arguments — the
 *          current week is derived from stored dates. Everything older is
 *          written to a Demand Archive tab (Environment = TEST) and only then
 *          removed from Script Properties, with a verify pass in between that
 *          refuses to delete if any day failed to land. A day already in the
 *          archive is not written twice, so a retry stays clean.
 *
 * v0.4.42  previewRetireDemandBefore(year, week) + retireDemandBefore(year, week).
 *          Demand day keys are ~3.5KB each and are the real budget consumer;
 *          history keys are ~175 bytes and pruning them alone is not enough.
 *          Retiring a PAST week is recoverable — actuals re-fetch from Demands
 *          2025, plans live in the archive. Refuses anything at or after the
 *          cutoff, requires an explicit cutoff, updates the demand index.
 *
 * v0.4.41  previewPruneDemandHistory() + pruneDemandHistory(). Manual, two-step,
 *          run from the editor only — no trigger, no button, nothing else calls
 *          them. Clears sequins_demand_hist__* (publish metadata, no SKU maps)
 *          to get back under the property quota that is currently blocking Load
 *          Demand. Refuses any key without the history prefix.
 *
 * v0.4.40  debugPropertySizes() — read-only breakdown of Script Properties usage
 *          by group, largest keys, and bytes per demand week. Deletes nothing;
 *          exists so pruning targets the right thing rather than the obvious one.
 *
 * v0.4.39  Sandboxes moved OUT of Script Properties into a Sandboxes tab in the
 *          archive spreadsheet — adding one hit the shared ~500KB property quota.
 *          Same move published plans made, same reason. Existing sandboxes are
 *          COPIED on first read; the old key is left alone until you explicitly
 *          run reclaimSandboxProperty(), which refuses unless every sandbox is
 *          verified present in the sheet. debugSandboxState() reports both.
 *
 * v0.4.38  getSandboxes() — small dedicated read. Sandboxes previously reached
 *          the client only as one field of getState()'s large payload; if that
 *          didn't land the view reported none over intact storage.
 *
 * v0.4.37  Sandboxes UPSERT instead of whole-list replace. saveSandboxes(list)
 *          is gone — it let any client with a stale or empty in-memory list
 *          destroy every stored sandbox. Now saveSandbox(one) merges by id and
 *          deleteSandboxById(id) is the only removal path. Both audited.
 *          debugSandboxState() reports what is actually stored.
 *
 * v0.4.36  Non-assembly match widened to ^(beverage|cpg|bev) — 9 older items
 *          carry a bare 'CPG' package that ^cpg_ missed.
 *
 * v0.4.35  Non-assembly SKUs (beverages, packaged CPG) excluded at the DOOR —
 *          both demand fetches skip them, so they never enter Sequins at all.
 *          Identified by Menu Library's Package column (Beverage_* / CPG_*),
 *          not a hardcoded list. Fails open: unreadable Menu Library excludes
 *          nothing rather than silently dropping demand. Both fetches return
 *          an `excluded` list for the status line.
 *
 * v0.4.34  syncAllergens_ skips SKUs flagged pending or locallyAuthored. They
 *          are absent from Menu Library by definition, so the sync would have
 *          overwritten hand-entered allergens and deactivated them overnight.
 *          Reported as `skipped` in the result.
 *
 * v0.4.33  Sandbox storage: sequins_sandboxes key, returned by getState,
 *          written by saveSandboxes (admin or rules-editor, capped at 20).
 *          Inputs only — sandbox runs are never stored, and nothing here
 *          touches SKU Library, Line Config, demand or the plan archive.
 *
 * v0.4.32  Break position archived in the SeqPos column and read back, so the
 *          published Line Sequence view shows breaks. buildLineCards places
 *          breaks by index; position was never written, so they were read back
 *          and silently dropped. Blank SeqPos (plans published before this) stays
 *          null, not 0 — no backfill, those plans keep showing no breaks.
 *          Break id restored from the label too, so 30m gets the lunch icon.
 *
 * v0.4.31  Finish goal read with NO timezone conversion (getUTCHours). A Sheets
 *          time-of-day is a timestamp on 1899-12-30 UTC, so the digits are
 *          already right; converting gave 9:30 AM and then 7:30 AM for 15:30.
 * v0.4.29  Active status follows Menu Library, GUARDED so a SKU with demand is
 *          never auto-deactivated. LabelVersion archive column, frozen at publish.
 * v0.4.28  Allergen sync from Menu Library (source of truth, overwrites). Blank
 *          and "No import" become NO ALLERGEN DATA; None/N/A/No Allergens kept.
 * v0.4.27  FinishBy stored as minutes, not 'HH:MM' — Sheets coerced the text to
 *          a time value and it read back as a Date.
 * v0.4.26  Finish-by storage + saveFinishBy + FinishBy archive column.
 * v0.4.25  Archive read: narrow index scan, version-keyed cache, block read
 *          instead of scanning the whole tab on every call.
 * v0.4.24  getPublishedPlan returns a JSON string with rounded clock values —
 *          the deep object graph was dying in transit, silently.
 * v0.4.23  Archive read restores the `pool` field it was dropping.
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
const LABEL_LOG_SHEET_ID    = '17rfAQdNYSki1ndD5QzA8MACUmClGotmje4GccXfBMws'; // Label Versions & Updates
const LABEL_LOG_TAB         = 'Label Version Log'; // A=SKU, B=SKU Name, C=Version Number, D=Label Number, E=Label File, F=Label Status
// Published-plan archive (v0.5.33 storage rework): published plans no longer
// live in Script Properties (that's what kept overflowing the ~500KB budget).
// They append here as flat rows — one per SKU/break/unplaced, per line, per
// publish — frozen at publish time, versioned per week/day. This is the
// durable record AND the planned-vs-actual fact table for Snowflake/Hex.
const PLAN_ARCHIVE_SHEET_ID = '1oB70aPTc2SkJYA-LEXgCm7tMWOHxDzFGt39pXIkR2L0';
const PLAN_ARCHIVE_TAB      = 'Published Plans';
const SANDBOX_TAB           = 'Sandboxes';  // same spreadsheet — see SANDBOXES below
const DEMAND_ARCHIVE_TAB    = 'Demand Archive';  // same spreadsheet — see ARCHIVE OLD DEMAND
const PLAN_ARCHIVE_HEADER   = ['PublishedAt','PublishedBy','Version','Week','Day','Date','Mode','Scenario','Line','Type','SeqPos','SKU','Qty','StartMin','EndMin','DurationMin','Allergens','USDA','Seed','PreProcessed','Overridden','OverrideBy','Note','HasAttrs','Blocking','FinishBy','LabelVersion'];

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
  finishBy:        'sequins_finish_by',
  planners:        'sequins_planners',
  breakOverrides:  'sequins_break_overrides',
  scenarios:       'sequins_scenarios',
  sandboxes:       'sequins_sandboxes',
  floorViewers:    'sequins_floor_viewers'
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
  const floorViewers = getSection_(STATE_KEYS.floorViewers) || [];
  const isFloorViewer = floorViewers.map(f => f.toLowerCase()).includes(email.toLowerCase());
  return { email, isAdmin, isPlanner, canEditRules, isFloorViewer, name: email.split('@')[0] };
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
    finishBy:        getSection_(STATE_KEYS.finishBy) || {},
    publishedPlans:  {}, // v0.5.33: published plans now live in the archive Sheet, not Script Properties. Client lazy-loads per day via getPublishedPlan(). Kept as {} so nothing downstream breaks.
    planners:        getSection_(STATE_KEYS.planners) || [],
    breakOverrides:  getSection_(STATE_KEYS.breakOverrides) || {},
    scenarios:       getSection_(STATE_KEYS.scenarios) || {},
    sandboxes:       getSection_(STATE_KEYS.sandboxes) || [],
    floorViewers:    getSection_(STATE_KEYS.floorViewers) || [],
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


// ─── NON-ASSEMBLY (CPG / BEVERAGE) EXCLUSION ─────────────────────────────────
// The Compiled Forecast and Demands 2025 both carry the FULL menu, including
// beverages and packaged CPG. Those are never built on a line — Pick Pack and
// procurement own them — so they must not enter Sequins' demand at all. They
// used to stay out only because the SKU Library was hand-curated; the moment
// "Pull attributes from source sheets" ran it created library rows for every SKU
// in the demand, and they started getting sequenced.
//
// Menu Library's Package column already answers this cleanly: Beverage_* and
// CPG_* are the non-assembly package types, everything else is a jar or a box.
// Verified against all 53 active menu items — 6 excluded, 0 false positives
// (the Snack items are Deep box / 4oz jar and DO get assembled).
//
// FAIL-OPEN on purpose: if Menu Library can't be read, this returns an empty set
// and nothing is excluded. Silently dropping demand because a lookup failed
// would be far worse than letting a few beverages through.
// ^cpg (not ^cpg_): Menu Library writes the package as bare 'CPG' on 9 older
// items and 'CPG_Product_*' on the rest. ^bev covers 'Bev' and 'Beverage_*'.
// Verified against 79 archived daily plans: nothing this matches has ever run
// on an assembly line, and nothing that has ever run matches it.
const NON_ASSEMBLY_PACKAGE_RE = /^(beverage|cpg|bev)/i;
function nonAssemblySkus_() {
  const set = {};
  try {
    const sheet = SpreadsheetApp.openById(MENU_LIBRARY_SHEET_ID).getSheetByName(MENU_LIBRARY_TAB);
    if (!sheet) { Logger.log('nonAssemblySkus_: Menu Library tab not found - excluding nothing.'); return set; }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return set;
    const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues(); // A:L
    data.forEach(function(row) {
      const name = String(row[2] || '').trim();          // col C  CMS_Back_End_Name
      const pkg  = String(row[11] || '').trim();         // col L  Package
      if (!name || !pkg) return;
      if (NON_ASSEMBLY_PACKAGE_RE.test(pkg)) set[normalizeSku_(name)] = pkg;
    });
    Logger.log('nonAssemblySkus_: ' + Object.keys(set).length + ' non-assembly SKUs identified.');
  } catch (e) {
    Logger.log('nonAssemblySkus_ failed (' + e.message + ') - excluding nothing.');
  }
  return set;
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
  // Non-assembly SKUs (beverages, packaged CPG) are excluded here, at the door —
  // the forecast carries the whole menu but Sequins only sequences what gets
  // built on a line.
  const nonAssembly = nonAssemblySkus_();
  const excluded = {};
  for (let r = 15; r < allData.length; r++) {
    const skuVal = allData[r][2];
    if (!skuVal) continue;
    const skuName = String(skuVal).trim();
    if (!skuName || skuName === 'SKU') continue;
    if (nonAssembly[normalizeSku_(skuName)]) { excluded[skuName] = nonAssembly[normalizeSku_(skuName)]; continue; }
    weekCols.forEach(function(wc) {
      const qty = Math.round(parseFloat(allData[r][wc.col]) || 0);
      if (qty <= 0) return;
      if (!skuData[wc.day]) skuData[wc.day] = {};
      skuData[wc.day][skuName] = qty;
    });
  }

  const excludedList = Object.keys(excluded).sort();
  if (excludedList.length) Logger.log('fetchForecastWeekData: excluded ' + excludedList.length + ' non-assembly SKUs - ' + excludedList.join(', '));
  return { weekLabel, skuData, dates, mode: 'forecast', excluded: excludedList };
}

// ─── DEMAND FETCH: ACTUALS (DEMANDS 2025) ─────────────────────────────────────
function fetchActualDemand(startDate, endDate, haveDates) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');

  const start = new Date(startDate + 'T12:00:00');
  const end   = new Date(endDate   + 'T12:00:00');
  const tz    = Session.getScriptTimeZone();
  const ss    = SpreadsheetApp.openById(DEMANDS_SHEET_ID);
  // Days already captured as actuals. A PAST day is frozen evidence — never
  // re-read or overwritten; what we saw that day is the record. A day that has
  // not happened yet is not evidence of anything: orders are still landing, so
  // re-fetching it is the whole point. v0.4.44 splits those two cases, which the
  // old membership-only test conflated — it froze tomorrow as hard as last month.
  // "Today" is deliberately re-fetchable: freezing it would reproduce this exact
  // block every morning for the day being corrected.
  // Computed from the script timezone, never the browser clock, so a wrong or
  // tampered client cannot unfreeze real history.
  const haveSet = {}; (haveDates || []).forEach(function(d){ haveSet[d] = true; });
  const todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  const allSheets  = ss.getSheets();
  const weekSheets = allSheets.filter(s => /\d{4}\s+Week\s+\d+/i.test(s.getName()));
  if (!weekSheets.length) throw new Error('No weekly tabs found in Demands 2025. Expected names like "2026 Week 27".');

  const nonAssembly = nonAssemblySkus_();
  const excludedA   = {};
  const skuData  = {};
  const byDate   = {};
  const skipped  = {}; // captured + past: frozen, not re-read
  const refreshed = {}; // captured + today/future: re-read, replacing stored values

  weekSheets.forEach(sheet => {
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();
    if (lastCol < 3 || lastRow < 4) return;

    const sheetName = sheet.getName();
    const wm = sheetName.match(/(\d{4})\s+Week\s+(\d+)/i);
    const sheetWeekLabel = wm ? ('Wk ' + wm[2] + ' · ' + wm[1]) : sheetName;

    // SKIP #1 (speed): if this tab's week can't overlap the requested range,
    // don't even read it. Approximate the week's dates from the tab name and
    // pad generously (±10 days) so boundary-overlap dates are never lost — we
    // still fully read any tab that could contain an in-range date.
    if (wm) {
      const approx = new Date(parseInt(wm[1], 10), 0, 1);
      approx.setDate(approx.getDate() + (parseInt(wm[2], 10) - 1) * 7);
      const winStart = new Date(approx); winStart.setDate(winStart.getDate() - 10);
      const winEnd   = new Date(approx); winEnd.setDate(winEnd.getDate() + 10);
      if (winEnd < start || winStart > end) return; // outside range — skip tab, no read
    }

    // Read just the date row (row 3) first — cheap — to decide which date
    // columns are in range AND not already captured. Only do the expensive
    // full-sheet read if this tab actually has NEW dates to fetch.
    const dateRow = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
    const dateCols = [];
    for (let ci = 2; ci <= 8 && ci < dateRow.length; ci++) {
      const cellVal = dateRow[ci];
      if (!cellVal) continue;
      const cellDate = cellVal instanceof Date ? new Date(cellVal) : new Date(cellVal);
      if (isNaN(cellDate.getTime())) continue;
      cellDate.setHours(12, 0, 0, 0);
      if (cellDate < start || cellDate > end) continue;
      const dateStr = Utilities.formatDate(cellDate, tz, 'yyyy-MM-dd');
      const dayStr  = Utilities.formatDate(cellDate, tz, 'EEEE');
      // SKIP #2 (freeze): already captured AND in the past — leave it frozen.
      // Captured but today or later falls through and is re-read, recorded in
      // `refreshed` so the client can state plainly that stored values were
      // replaced rather than doing it silently.
      if (haveSet[dateStr] && dateStr < todayStr) { skipped[dateStr] = dayStr; continue; }
      if (haveSet[dateStr]) refreshed[dateStr] = dayStr;
      dateCols.push({ col: ci, date: dateStr, day: dayStr });
      byDate[dateStr] = { day: dayStr, col: ci, weekLabel: sheetWeekLabel };
    }
    if (!dateCols.length) return; // nothing new in this tab — skip the full read

    const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    // Non-assembly SKUs excluded at the door, same as the forecast. Stop at sentinel.
    for (let r = 3; r < allData.length; r++) {
      const skuVal = allData[r][0];
      if (!skuVal) continue;
      const skuName = String(skuVal).trim();
      if (!skuName) continue;
      if (skuName.toUpperCase() === DEMANDS_STOP_SKU) break;
      if (nonAssembly[normalizeSku_(skuName)]) { excludedA[skuName] = true; continue; }
      dateCols.forEach(dc => {
        const qty = Math.round(parseFloat(allData[r][dc.col]) || 0);
        if (qty <= 0) return;
        const key = dc.day + '|' + dc.date;
        if (!skuData[key]) skuData[key] = {};
        skuData[key][skuName] = (skuData[key][skuName] || 0) + qty;
      });
    }
  });

  const skippedList = Object.keys(skipped).sort().map(function(d){ return { date: d, day: skipped[d] }; });
  const refreshedList = Object.keys(refreshed).sort().map(function(d){ return { date: d, day: refreshed[d] }; });
  if (!Object.keys(byDate).length) {
    if (skippedList.length) return { skuData: {}, byDate: {}, dates: [], mode: 'actual', skipped: skippedList, refreshed: refreshedList };
    throw new Error('No dates found between ' + startDate + ' and ' + endDate + ' in Demands 2025.');
  }

  const datesList = Object.entries(byDate)
    .map(([date, info]) => ({ date, day: info.day, col: info.col, weekLabel: info.weekLabel }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const excludedList = Object.keys(excludedA).sort();
  if (excludedList.length) Logger.log('fetchActualDemand: excluded ' + excludedList.length + ' non-assembly SKUs - ' + excludedList.join(', '));
  return { skuData, byDate, dates: datesList, mode: 'actual', skipped: skippedList, refreshed: refreshedList, excluded: excludedList };
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

// ─── PUSHED DEMAND (Demand tab in the archive Sheet) ─────────────────────────
// The Production Planner writes Assembly Summary A:C into a Demand tab on every
// CSV Automater run (SequinsDemandPush.gs on that side). This reads it.
//
// WHY THIS IS PULL-ON-OPEN, NOT A TRIGGER: Room Zoom feels automatic because
// getPlans() runs inside doGet — it re-reads on page load, no background job.
// Copying that shape means demand can never change underneath you mid-plan,
// which matters because Workbench recomputes live on every render. A time-driven
// trigger would have been able to move the plan while you were working it.
//
// The planner writes a DATE. Sequins keys on 'Wk 33 · 2026' + day name, built in
// fetchForecastWeekData from the Compiled Forecast header plus
// new Date().getFullYear(). Rather than reproduce that formula (and its quirk of
// using today's year rather than the labelled week's), the date -> week/day map
// is read from the same Compiled Forecast rows the manual fetch reads, so the
// two can't disagree about what a week is called.
const PUSHED_DEMAND_TAB = 'Demand';  // same spreadsheet as PLAN_ARCHIVE_SHEET_ID

// Resolves a Demand-tab date cell to 'yyyy-MM-dd'. Display value first (already
// correct in the spreadsheet's own timezone), then the raw Date as a last resort.
// A Date is read via its own component parts rather than Utilities.formatDate,
// because formatting in the script timezone is precisely what caused the
// off-by-one day.
function normalizePushedDate_(displayVal, rawVal, tz) {
  const s = String(displayVal || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);          // 8/12/2026
  if (m) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    return rawVal.getFullYear() + '-' +
           ('0' + (rawVal.getMonth() + 1)).slice(-2) + '-' +
           ('0' + rawVal.getDate()).slice(-2);
  }
  return '';
}

function forecastDateMap_() {
  const sheet = SpreadsheetApp.openById(FORECAST_SHEET_ID).getSheetByName(FORECAST_TAB);
  if (!sheet) throw new Error('Tab "' + FORECAST_TAB + '" not found in Compiled Forecast');

  const lastCol = sheet.getLastColumn();
  const rows    = sheet.getRange(1, 1, 3, lastCol).getValues();
  const tz      = Session.getScriptTimeZone();
  const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const map = {};
  let lastLabel = '';
  for (let ci = 0; ci < lastCol; ci++) {
    const cell = String(rows[0][ci] || '').trim();
    if (cell) lastLabel = cell;                       // carry forward across merged cells
    const wkMatch = lastLabel.match(/Week\s+(\d+)/i);
    if (!wkMatch) continue;
    const dayName = String(rows[1][ci] || '').trim();
    if (!DAYS.includes(dayName)) continue;
    const dateVal = rows[2][ci];
    if (!(dateVal instanceof Date)) continue;
    const dateStr = Utilities.formatDate(new Date(dateVal), tz, 'yyyy-MM-dd');
    map[dateStr] = {
      weekLabel: 'Wk ' + parseInt(wkMatch[1]) + ' \u00b7 ' + new Date().getFullYear(),
      day: dayName
    };
  }
  return map;
}

// Groups the Demand tab by date. Latest PushedAt per date wins, so a re-push
// that landed twice can't produce a half-merged day.
function readPushedDemandRows_() {
  const ss  = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  const tab = ss.getSheetByName(PUSHED_DEMAND_TAB);
  if (!tab) return { days: {}, missing: true };

  const lastRow = tab.getLastRow();
  if (lastRow < 2) return { days: {}, missing: false };

  const tz     = Session.getScriptTimeZone();
  const rng    = tab.getRange(2, 1, lastRow - 1, 8);
  const values = rng.getValues();
  // Dates come from DISPLAY values, not raw values (v0.4.46). The push writes
  // the string '2026-08-12'; Sheets coerces that to a Date at midnight in the
  // SPREADSHEET's timezone, and reformatting it in the SCRIPT's timezone then
  // shifts it a day. That is exactly what happened on the first real push — 53
  // rows written for 08-12 read back as 08-11, which the actuals guard caught.
  // The display value is whatever the cell shows, so it round-trips no matter
  // how the two timezones differ.
  const disp   = rng.getDisplayValues();

  // Same door as both manual fetches: beverages and packaged CPG never enter
  // Sequins. Fails open if Menu Library can't be read (nonAssemblySkus_ returns
  // {}), which excludes nothing rather than silently dropping real demand.
  const nonAssembly = nonAssemblySkus_();

  const days = {};
  let excluded = 0, skippedRows = 0;

  values.forEach(function(r, i) {
    const pushedAt = r[0] instanceof Date
      ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd HH:mm:ss') : String(r[0] || '').trim();
    const dateStr = normalizePushedDate_(disp[i][1], r[1], tz);
    const sku = String(r[5] || '').trim();
    const qty = Math.round(parseFloat(String(r[6] || '').replace(/,/g, '')) || 0);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !sku || qty <= 0) { skippedRows++; return; }
    if (nonAssembly[normalizeSku_(sku)]) { excluded++; return; }

    if (!days[dateStr]) days[dateStr] = { skus: {}, pushedAt: pushedAt, source: String(r[7] || '') };
    // A later push for the same date supersedes: reset rather than merge.
    if (pushedAt > days[dateStr].pushedAt) {
      days[dateStr] = { skus: {}, pushedAt: pushedAt, source: String(r[7] || '') };
    } else if (pushedAt < days[dateStr].pushedAt) {
      return;
    }
    days[dateStr].skus[sku] = qty;
  });

  return { days: days, missing: false, excluded: excluded, skippedRows: skippedRows };
}

// Decides, per pushed date, whether it should land — without writing anything.
// Both the preview and the importer run through this, so what you're shown and
// what happens can't drift apart.
function planPushedDemandImport_() {
  const pushed = readPushedDemandRows_();
  if (pushed.missing) return { missing: true, items: [] };

  const map   = forecastDateMap_();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const items = [];

  Object.keys(pushed.days).sort().forEach(function(dateStr) {
    const pd  = pushed.days[dateStr];
    const loc = map[dateStr];
    const skuCount = Object.keys(pd.skus).length;
    let units = 0;
    Object.keys(pd.skus).forEach(function(s) { units += pd.skus[s]; });

    const base = { date: dateStr, skuCount: skuCount, units: units, pushedAt: pd.pushedAt };

    if (!loc) {
      items.push(Object.assign({}, base, { action: 'skip',
        reason: 'date not found in Compiled Forecast — no week/day to file it under' }));
      return;
    }

    const existing = getDemandDay_(loc.weekLabel, loc.day);
    const item = Object.assign({}, base, { weekLabel: loc.weekLabel, day: loc.day });

    if (existing && existing.mode === 'actual') {
      // Same rule publishForecastWeek already enforces: a plan never overwrites
      // a captured actual.
      items.push(Object.assign({}, item, { action: 'skip', reason: 'day already captured as actual' }));
    } else if (existing && existing.pushedAt === pd.pushedAt) {
      items.push(Object.assign({}, item, { action: 'skip', reason: 'already imported (same push)' }));
    } else if (existing && dateStr < today) {
      // Past days are evidence. Nothing automatic reaches backwards.
      items.push(Object.assign({}, item, { action: 'skip', reason: 'past day already loaded — left alone' }));
    } else {
      items.push(Object.assign({}, item, {
        action: existing ? 'replace' : 'add',
        prevSkuCount: existing ? Object.keys(existing.skus || {}).length : 0
      }));
    }
  });

  return { missing: false, items: items, excluded: pushed.excluded, skippedRows: pushed.skippedRows };
}

// Read-only. Client calls this on load to find out whether anything is waiting.
function getPushedDemandStatus() {
  try {
    const plan = planPushedDemandImport_();
    if (plan.missing) return { ok: true, missing: true, pending: 0, items: [] };
    const pending = plan.items.filter(function(i) { return i.action !== 'skip'; });
    return { ok: true, missing: false, pending: pending.length, items: plan.items };
  } catch (err) {
    Logger.log('getPushedDemandStatus failed: ' + err.message);
    return { ok: false, error: err.message, pending: 0, items: [] };
  }
}

// Commits. Admin only, same as every other demand write. Returns the same item
// list the preview shows, with each one marked done or skipped.
// Who is doing this. From the web app, the normal admin gate applies. From the
// EDITOR, Session.getActiveUser() throws unless the manifest carries the
// userinfo.email scope — and anyone with editor access to this project is
// already more privileged than any admin list, so failing the gate there is
// pure friction. Falls back to the effective user and says so in the log.
function pushedDemandActor_() {
  try {
    const user = getCurrentUser();
    if (!user.isAdmin) throw new Error('Not authorized');
    return user;
  } catch (err) {
    if (String(err.message || '').indexOf('Not authorized') !== -1) throw err;
    let email = '';
    try { email = Session.getEffectiveUser().getEmail(); } catch (e2) { email = 'editor'; }
    Logger.log('pushedDemandActor_: running from the editor as ' + email +
               ' (Session.getActiveUser unavailable — admin gate skipped)');
    return { email: email, isAdmin: true, viaEditor: true };
  }
}

function importPushedDemand() {
  const user = pushedDemandActor_();

  const plan = planPushedDemandImport_();
  if (plan.missing) return { ok: true, missing: true, imported: 0, items: [] };

  let imported = 0;
  plan.items.forEach(function(item) {
    if (item.action === 'skip') return;
    const pushed = readPushedDemandRows_().days[item.date];
    if (!pushed) { item.action = 'skip'; item.reason = 'row vanished between plan and write'; return; }

    const existing = getDemandDay_(item.weekLabel, item.day);
    const newDay = {
      skus: pushed.skus,
      mode: 'forecast',           // deliberately NOT a new mode value — see below
      date: item.date,
      publishedBy: user.email,
      publishedAt: new Date().toISOString(),
      pushedAt: pushed.pushedAt,  // additive: how a re-import knows it's a no-op
      source: 'assembly_summary'  // additive: which fetch produced this day
    };
    // mode stays 'forecast' on purpose. A new mode string would have to be
    // taught to the mode badge CSS, the actual-vs-forecast guards in
    // publishForecastWeek/fetchActualDemand, and the archive's Mode column. The
    // source field carries the distinction without touching any of that.
    setDemandDay_(item.weekLabel, item.day, newDay, existing);
    imported++;
  });

  if (imported) {
    writeAuditLog_(user.email, 'import_pushed_demand', '', '', imported + ' days from Assembly Summary');
  }
  Logger.log('importPushedDemand: ' + imported + ' day(s) imported; ' +
             plan.items.filter(function(i) { return i.action === 'skip'; }).length + ' skipped');
  return { ok: true, missing: false, imported: imported, items: plan.items };
}

// Editor-dropdown preview. Writes nothing.
function previewPushedDemand() {
  const plan = planPushedDemandImport_();
  Logger.log('--- Pushed demand preview (nothing written) ---');
  if (plan.missing) {
    Logger.log('No "' + PUSHED_DEMAND_TAB + '" tab in the archive Sheet yet — nothing has been pushed.');
    return;
  }
  if (!plan.items.length) { Logger.log('Demand tab is present but empty.'); return; }
  plan.items.forEach(function(i) {
    Logger.log('  ' + i.date + '  ' + (i.weekLabel ? i.weekLabel + ' / ' + i.day : '(unmapped)') +
               '  ' + i.skuCount + ' SKUs, ' + i.units + ' units  ->  ' +
               i.action.toUpperCase() + (i.reason ? ' (' + i.reason + ')' : ''));
  });
  Logger.log('Excluded non-assembly rows: ' + (plan.excluded || 0) +
             '; unusable rows: ' + (plan.skippedRows || 0));
}

// ─── PUSHED DEMAND TRIGGER ────────────────────────────────────────────────────
// Runs importPushedDemand() on a timer so an ALREADY-OPEN tab fills in without a
// refresh. It works because setDemandDay_ -> setSection_ bumps sequins_meta's
// lastModified, and the client already polls getLastModified() every 8 seconds
// and re-pulls state when it changes. So the trigger writes, and every open
// session notices within 8s. No client change was needed for this.
//
// One consequence worth knowing: Workbench recomputes live on every render, so
// demand arriving mid-session can move an unpublished plan. Line Sequence is
// safe — it renders the published snapshot and never moves until you publish.
function pushedDemandTrigger() {
  try {
    const res = importPushedDemand();
    Logger.log('pushedDemandTrigger: imported ' + ((res && res.imported) || 0) + ' day(s)');
  } catch (err) {
    Logger.log('pushedDemandTrigger failed: ' + err.message);
  }
}

// Default every 15 minutes. Apps Script's Run button can't pass arguments, so
// the interval lives here — edit the constant and re-install to change it.
// Accepted values are 1, 5, 10, 15 and 30.
function installPushedDemandTrigger() {
  const EVERY_MINUTES = 15;
  const existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'pushedDemandTrigger';
  });
  if (existing.length) {
    Logger.log('pushedDemandTrigger already installed (' + existing.length + ') — no action taken. ' +
               'Run removePushedDemandTrigger() first if you want to change the interval.');
    return;
  }
  ScriptApp.newTrigger('pushedDemandTrigger').timeBased().everyMinutes(EVERY_MINUTES).create();
  Logger.log('Installed pushedDemandTrigger, every ' + EVERY_MINUTES + ' minutes.');
}

function removePushedDemandTrigger() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'pushedDemandTrigger') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Removed ' + n + ' pushedDemandTrigger(s).');
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

// ─── LABEL VERSION SYNC (from Label Versions & Updates sheet) ────────────────
/**
 * Syncs labelNumberVersion onto every SKU already sitting in the SKU
 * Library, from the "Label Versions & Updates" sheet's "Label Version Log"
 * tab — the real source of truth WH and QA both check before running a
 * line. Keyed by col A (SKU), filtered to rows whose col F (Label Status)
 * contains ACTIVE or NEW (anything else — retired, pending, etc. — is
 * treated as not currently valid). Stored value combines Version Number
 * (col C) + Label Number (col D), e.g. "R001 · 35804-001". SKUs in the
 * library with no matching ACTIVE/NEW row get "NO ACTIVE LABEL" so a
 * missing label can't quietly slip through on a busy screen. UI red-flag
 * rendering is a separate follow-up — this function only writes the data.
 *
 * Read-only against the source sheet. Only writes to Sequins' own SKU
 * Library section, via the normal setSection_ -> safeSetProperty_ path, so
 * it gets the same quota protection as every other write in the app.
 */
function syncLabelVersions_() {
  const library = getSection_(STATE_KEYS.skuLibrary) || {};
  const skuKeys = Object.keys(library);
  if (!skuKeys.length) {
    Logger.log('syncLabelVersions_: SKU Library is empty — nothing to sync.');
    return { ok: true, matched: 0, unmatched: 0 };
  }

  // normalized SKU -> "Version · LabelNumber"
  const labelMap = {};
  try {
    const sheet = SpreadsheetApp.openById(LABEL_LOG_SHEET_ID).getSheetByName(LABEL_LOG_TAB);
    if (!sheet) throw new Error('Tab "' + LABEL_LOG_TAB + '" not found in Label Versions & Updates');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues(); // cols A:F
      data.forEach(function(row) {
        const sku = String(row[0] || '').trim();
        if (!sku) return;
        const status = String(row[5] || '').toUpperCase(); // col F
        if (status.indexOf('ACTIVE') === -1 && status.indexOf('NEW') === -1) return;
        const versionNum = String(row[2] || '').trim(); // col C
        const labelNum    = String(row[3] || '').trim(); // col D
        let combined = '';
        if (versionNum && labelNum) combined = versionNum + ' · ' + labelNum;
        else combined = versionNum || labelNum;
        if (!combined) return;
        labelMap[normalizeSku_(sku)] = combined;
      });
    }
  } catch(e) {
    Logger.log('syncLabelVersions_ failed to read Label Version Log: ' + e.message);
    return { ok: false, error: e.message };
  }

  let matched = 0, unmatched = 0;
  skuKeys.forEach(function(key) {
    const norm = normalizeSku_(key);
    if (labelMap[norm]) {
      library[key].labelNumberVersion = labelMap[norm];
      matched++;
    } else {
      library[key].labelNumberVersion = 'NO ACTIVE LABEL';
      unmatched++;
    }
  });

  setSection_(STATE_KEYS.skuLibrary, library);
  Logger.log('syncLabelVersions_ complete — matched ' + matched + ', unmatched (NO ACTIVE LABEL) ' + unmatched + '.');
  return { ok: true, matched: matched, unmatched: unmatched };
}

// Trigger handler — installed via installLabelVersionSyncTrigger() below,
// runs once daily. Wrapped in its own try/catch since a time-driven trigger
// has no client to surface an error to; a failure just needs to be visible
// in Executions/Logs, not thrown into the void.
function labelVersionSyncTrigger() {
  try {
    const result = syncLabelVersions_();
    Logger.log('labelVersionSyncTrigger: ' + JSON.stringify(result));
  } catch(e) {
    Logger.log('labelVersionSyncTrigger failed: ' + e.message);
  }
}

// Run ONCE from the Apps Script editor (function dropdown -> select this ->
// Run) to install the daily trigger. Safe to re-run — checks for an
// existing trigger on this handler first, so it can never create duplicates.
function installLabelVersionSyncTrigger() {
  const existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'labelVersionSyncTrigger';
  });
  if (existing.length) {
    Logger.log('labelVersionSyncTrigger already installed (' + existing.length + ' trigger(s)) — no action taken.');
    return;
  }
  ScriptApp.newTrigger('labelVersionSyncTrigger')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  Logger.log('Installed daily labelVersionSyncTrigger (~3am script timezone).');
}

// Admin-callable manual resync — same logic as the daily trigger, for
// testing now or an on-demand refresh without waiting for the next 3am run.
function runLabelVersionSyncNow() {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  const result = syncLabelVersions_();
  writeAuditLog_(user.email, 'sync_label_versions', '', '', JSON.stringify(result));
  return result;
}

// ─── ALLERGEN SYNC (from Menu Library "Full Menu Summary") ──────────────────
/**
 * Menu Library is THE source of truth for allergens — it overwrites Sequins'
 * value outright, no merge. Reads col A (Status), col C (SKU) and col M
 * (allergens), keeping only rows whose Status is Active.
 *
 * Stored RAW, deliberately unparsed. The real values are messy free text —
 * "Milk & Soy", "Wheat, Soy, Milk" (unordered), "Milk, Tree Nuts (Walnuts), &
 * Wheat", "Soy, Tree Nuts (Almond & Cashew). Contains Sulfites." — and cleaning
 * them here would mean deciding, in code, what a label says.
 *
 * The one transformation: anything meaning "nobody entered this" becomes the
 * sentinel NO ALLERGEN DATA. Menu Library writes allergen-free three ways
 * ("None", "N/A", "No Allergens") and all three are kept verbatim, because they
 * are real answers. Blank and the literal "No import" are NOT answers and must
 * never read as allergen-free. Index.html treats the sentinel as worst-case
 * (all six allergens), so such a SKU can never seed a food-contact chain.
 */
const ALLERGEN_SENTINEL = 'NO ALLERGEN DATA';
function allergenIsUnknown_(v) {
  const lo = String(v == null ? '' : v).trim().toLowerCase();
  return !lo || lo === 'no import' || lo === 'unknown' || lo === 'tbd';
}
// Every SKU with real demand in any stored week/day. The guard below needs this:
// deactivating a SKU removes it from sequencing entirely, so a SKU that is
// missing from Menu Library but HAS demand must never be auto-deactivated —
// that would silently drop units out of the plan.
function demandedSkus_() {
  const idx = getSection_(DEMAND_INDEX_KEY) || {};
  const out = {};
  Object.keys(idx).forEach(function(week) {
    (idx[week] || []).forEach(function(day) {
      const d = getDemandDay_(week, day);
      const skus = (d && d.skus) || {};
      Object.keys(skus).forEach(function(sku) {
        if ((skus[sku] || 0) > 0) out[normalizeSku_(sku)] = true;
      });
    });
  });
  return out;
}

function syncAllergens_() {
  const library = getSection_(STATE_KEYS.skuLibrary) || {};
  const keys = Object.keys(library);
  if (!keys.length) {
    Logger.log('syncAllergens_: SKU Library is empty - nothing to sync.');
    return { ok: true, matched: 0, unknown: 0, notFound: 0, notFoundList: [] };
  }
  const menuMap = {};
  const sheet = SpreadsheetApp.openById(MENU_LIBRARY_SHEET_ID).getSheetByName(MENU_LIBRARY_TAB);
  if (!sheet) throw new Error('Tab "' + MENU_LIBRARY_TAB + '" not found in Menu Library');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues(); // cols A:M
    data.forEach(function(row) {
      if (String(row[0] || '').trim().toLowerCase() !== 'active') return; // col A
      const name = String(row[2] || '').trim();                          // col C
      if (!name) return;
      menuMap[normalizeSku_(name)] = String(row[12] || '').trim();       // col M
    });
  }
  let matched = 0, unknown = 0, notFound = 0, deactivated = 0, reactivated = 0;
  const notFoundList = [], deactivatedList = [], liveButUnlisted = [];
  const demanded = demandedSkus_();
  let skipped = 0; const skippedList = [];
  keys.forEach(function(key) {
    // LOCALLY AUTHORED (v0.4.34): a SKU staged in Sequins before Menu Library
    // knows about it. It is absent from the Active list by definition, so the
    // block below would stamp NO ALLERGEN DATA over hand-entered allergens and
    // then deactivate it — destroying the staging work overnight. Left entirely
    // alone until someone clears the flag, at which point Menu Library resumes
    // ownership as normal. Pending rows are always exempt for the same reason.
    if (library[key].pending || library[key].locallyAuthored) {
      skipped++; if (skippedList.length < 40) skippedList.push(key);
      return;
    }
    const norm = normalizeSku_(key);
    if (!Object.prototype.hasOwnProperty.call(menuMap, norm)) {
      // Absent from Menu Library's Active list. Menu Library owns Active status,
      // so this SKU should drop out of Sequins WITHOUT anyone maintaining a
      // second list by hand.
      // THE GUARD: unless it has demand. Deactivating a SKU removes it from
      // sequencing, so auto-deactivating something that's actually scheduled
      // would quietly delete units from the plan. Those stay active and get
      // named loudly instead — that's a data problem upstream, not a reason to
      // drop production.
      library[key].allergens = ALLERGEN_SENTINEL;
      notFound++; if (notFoundList.length < 25) notFoundList.push(key);
      if (demanded[norm]) {
        if (liveButUnlisted.length < 25) liveButUnlisted.push(key);
      } else if (library[key].active !== false) {
        library[key].active = false;   // flag flipped only; nothing is deleted
        deactivated++; if (deactivatedList.length < 40) deactivatedList.push(key);
      }
      return;
    }
    // On Menu Library's Active list — so it is active here too, even if someone
    // had switched it off locally.
    if (library[key].active === false) { library[key].active = true; reactivated++; }
    const raw = menuMap[norm];
    if (allergenIsUnknown_(raw)) { library[key].allergens = ALLERGEN_SENTINEL; unknown++; }
    else { library[key].allergens = raw; matched++; }
  });
  safeSetProperty_(STATE_KEYS.skuLibrary, JSON.stringify(library));
  const result = { ok: true, matched: matched, unknown: unknown, notFound: notFound,
    notFoundList: notFoundList, deactivated: deactivated, reactivated: reactivated,
    deactivatedList: deactivatedList, liveButUnlisted: liveButUnlisted,
    skipped: skipped, skippedList: skippedList };
  Logger.log('syncAllergens_ complete - ' + JSON.stringify(result));
  return result;
}
// Daily handler. Own try/catch: a time-driven run has no client to throw to, so
// a failure needs to land in Executions rather than vanish.
function allergenSyncTrigger() {
  try { Logger.log('allergenSyncTrigger: ' + JSON.stringify(syncAllergens_())); }
  catch(e) { Logger.log('allergenSyncTrigger failed: ' + e.message); }
}
// Run ONCE from the editor. Idempotent - checks first, so it cannot duplicate.
function installAllergenSyncTrigger() {
  const existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'allergenSyncTrigger';
  });
  if (existing.length) {
    Logger.log('allergenSyncTrigger already installed (' + existing.length + ') - no action taken.');
    return;
  }
  ScriptApp.newTrigger('allergenSyncTrigger').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Installed daily allergenSyncTrigger (~3am script timezone).');
}
function runAllergenSyncNow() {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  const result = syncAllergens_();
  writeAuditLog_(user.email, 'sync_allergens', '', '', JSON.stringify(result));
  return result;
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

// ─── BREAK OVERRIDES (per week/day, per line) ─────────────────────────────────
// Breaks are computed client-side per line/day from that day's real
// sequenced runtime (see Index.html applyLineBreaks) — this section only
// stores the day-level EXCEPTIONS to that computation: a specific line's
// break toggled on/off or moved for one day, or the whole day running with
// a floating team so breaks don't block line time. Gated identically to
// Line Config (Admin + Rules Editor) since this is the same tier of
// consequential, floor-affecting change. Stored separately from demand so
// it's untouched by demand reloads/clears.
function saveBreakOverride(weekLabel, day, lineId, brk, field, val) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  const overrides = getSection_(STATE_KEYS.breakOverrides) || {};
  if (!overrides[weekLabel]) overrides[weekLabel] = {};
  if (!overrides[weekLabel][day]) overrides[weekLabel][day] = { lines: {} };
  if (!overrides[weekLabel][day].lines) overrides[weekLabel][day].lines = {};
  if (!overrides[weekLabel][day].lines[lineId]) overrides[weekLabel][day].lines[lineId] = {};
  if (!overrides[weekLabel][day].lines[lineId][brk]) overrides[weekLabel][day].lines[lineId][brk] = {};
  overrides[weekLabel][day].lines[lineId][brk][field] = val;
  setSection_(STATE_KEYS.breakOverrides, overrides);
  writeAuditLog_(user.email, 'save_break_override', weekLabel, day, lineId + ' ' + brk + '.' + field + '=' + val);
  return { ok: true };
}

function setDayFloatingTeam(weekLabel, day, val) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  const overrides = getSection_(STATE_KEYS.breakOverrides) || {};
  if (!overrides[weekLabel]) overrides[weekLabel] = {};
  if (!overrides[weekLabel][day]) overrides[weekLabel][day] = { lines: {} };
  overrides[weekLabel][day].floatingTeam = !!val;
  setSection_(STATE_KEYS.breakOverrides, overrides);
  writeAuditLog_(user.email, 'set_floating_team', weekLabel, day, String(!!val));
  return { ok: true };
}

// ─── PLANNER MANAGEMENT ───────────────────────────────────────────────────────
function savePlanners(planners) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  setSection_(STATE_KEYS.planners, planners);
  return { ok: true };
}

// ─── FLOOR VIEWER MANAGEMENT (My Line tablet access) ──────────────────────────
// No line is pinned to a person here on purpose — anyone on this list can log
// into any tablet and pick which line they're looking at (see Index.html's
// My Line picker). That's deliberate: if a tablet dies, whoever grabs the
// spare just picks their line, no reassignment needed.
function saveFloorViewers(list) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  setSection_(STATE_KEYS.floorViewers, list);
  return { ok: true };
}


// ─── STAFFING SCENARIOS (per week/day) ────────────────────────────────────────
// A scenario is just a named subset of that day's normally-available lines
// (list of excluded lineIds) — lets a planner preview "what if Line-6 is
// down" against the same demand before deciding what to publish. Whole
// day's scenario object (list + which one's currently selected) is replaced
// on every save, same shape client sends. Gated same tier as publish/
// Workbench overrides since this is exploratory planning, not admin config.
function saveScenarios(weekLabel, day, dayScenarios) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const scenarios = getSection_(STATE_KEYS.scenarios) || {};
  if (!scenarios[weekLabel]) scenarios[weekLabel] = {};
  scenarios[weekLabel][day] = dayScenarios;
  setSection_(STATE_KEYS.scenarios, scenarios);
  writeAuditLog_(user.email, 'save_scenarios', weekLabel, day, (dayScenarios.list || []).length + ' scenarios');
  return { ok: true };
}

// ─── SANDBOXES (what-if modelling) ────────────────────────────────────────────
// A sandbox is a saved what-if: a baseline week + days, a swap list, stub
// attributes for incoming SKUs, a volume basis, and optional line exclusions.
// Deliberately NOT called a "scenario" — that word already means a staffing
// subset elsewhere in this file.
//
// v0.4.39 — STORED IN A SHEET, NOT SCRIPT PROPERTIES. Script Properties has a
// shared ~500KB budget across every key in the script, and adding a sandbox
// started failing with "exceeded the property storage quota". Sandboxes are tiny
// (under 1KB each), so they were never the cause — they were just the write that
// tipped an already-full budget over. Published plans were moved out for exactly
// this reason; this follows that precedent. Sandboxes now live as rows in the
// archive spreadsheet, which has no such ceiling and grows freely.
//
// One row per sandbox: Id | Name | Week | UpdatedBy | UpdatedAt | JSON.
// Upsert by id, never a whole-list write, so a client with a stale view cannot
// flatten storage (kept from v0.4.37).
const MAX_SANDBOXES = 100;   // sheet-backed now; the old cap of 20 was a quota guard
function sandboxSheet_() {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(SANDBOX_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SANDBOX_TAB);
    sheet.getRange(1, 1, 1, 6).setValues([['Id', 'Name', 'Week', 'UpdatedBy', 'UpdatedAt', 'JSON']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function readSandboxRows_() {
  const sheet = sandboxSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { sheet: sheet, rows: [], list: [] };
  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const list = [];
  rows.forEach(function(r, i) {
    const id = String(r[0] || '').trim();
    if (!id) return;
    try {
      const sb = JSON.parse(r[5]);
      if (sb && sb.id) { sb.__row = i + 2; list.push(sb); }
    } catch (e) {
      Logger.log('readSandboxRows_: row ' + (i + 2) + ' (' + id + ') has unparseable JSON - skipped, not deleted.');
    }
  });
  return { sheet: sheet, rows: rows, list: list };
}
// One-time lift of anything still in the old Script Property into the sheet.
// COPIES ONLY — the property is left exactly as it is. Freeing that space is a
// deletion, so it needs an explicit run of reclaimSandboxProperty() below rather
// than happening quietly here.
function migrateSandboxesToSheet_() {
  const legacy = getSection_(STATE_KEYS.sandboxes);
  if (!Array.isArray(legacy) || !legacy.length) return 0;
  const cur = readSandboxRows_();
  const have = {};
  cur.list.forEach(function(x) { have[x.id] = true; });
  const toAdd = legacy.filter(function(x) { return x && x.id && !have[x.id]; });
  if (!toAdd.length) return 0;
  const rows = toAdd.map(function(sb) {
    return [sb.id, sb.name || '', sb.week || '', sb.createdBy || '', new Date().toISOString(), JSON.stringify(sb)];
  });
  cur.sheet.getRange(cur.sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  Logger.log('migrateSandboxesToSheet_: copied ' + rows.length + ' sandbox(es) from Script Properties. Property left untouched.');
  return rows.length;
}
function getSandboxes() {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  migrateSandboxesToSheet_();
  const list = readSandboxRows_().list.map(function(sb) { delete sb.__row; return sb; });
  Logger.log('getSandboxes: returning ' + list.length);
  return list;
}
function saveSandbox(sb) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  if (!sb || !sb.id) throw new Error('Sandbox needs an id');
  migrateSandboxesToSheet_();
  const cur = readSandboxRows_();
  const row = [sb.id, sb.name || '', sb.week || '', user.email, new Date().toISOString(), JSON.stringify(sb)];
  let existing = null;
  cur.list.forEach(function(x) { if (x.id === sb.id) existing = x; });
  if (existing) {
    cur.sheet.getRange(existing.__row, 1, 1, 6).setValues([row]);
  } else {
    if (cur.list.length >= MAX_SANDBOXES) throw new Error('Sandbox limit is ' + MAX_SANDBOXES + ' — delete one first');
    cur.sheet.getRange(cur.sheet.getLastRow() + 1, 1, 1, 6).setValues([row]);
  }
  const list = readSandboxRows_().list.map(function(x) { delete x.__row; return x; });
  writeAuditLog_(user.email, existing ? 'update_sandbox' : 'create_sandbox', '', '', sb.id + ' / ' + (sb.name || ''));
  return { ok: true, count: list.length, sandboxes: list };
}
// The ONLY path that removes a sandbox. Named id, one row, audited.
function deleteSandboxById(id) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  if (!id) throw new Error('No sandbox id given');
  const cur = readSandboxRows_();
  let target = null;
  cur.list.forEach(function(x) { if (x.id === id) target = x; });
  if (!target) {
    const list = cur.list.map(function(x) { delete x.__row; return x; });
    return { ok: true, count: list.length, sandboxes: list, notFound: true };
  }
  cur.sheet.deleteRow(target.__row);
  const list = readSandboxRows_().list.map(function(x) { delete x.__row; return x; });
  writeAuditLog_(user.email, 'delete_sandbox', '', '', id);
  return { ok: true, count: list.length, sandboxes: list };
}
// Read-only. Reports what is ACTUALLY stored, in both places, plus how much
// Script Properties space the legacy key is still holding.
function debugSandboxState() {
  const raw = PropertiesService.getScriptProperties().getProperty(STATE_KEYS.sandboxes);
  const sheetList = readSandboxRows_().list;
  const out = {
    sheetTab: SANDBOX_TAB,
    inSheet: sheetList.length,
    sandboxes: sheetList.map(function(x) {
      return { id: x.id, name: x.name, week: x.week, days: x.days || [],
               swaps: (x.swaps || []).length, stubs: Object.keys(x.stubs || {}).length,
               volume: (x.volume && x.volume.mode) || 'none', row: x.__row };
    }),
    legacyPropertyExists: raw !== null,
    legacyPropertyBytes: raw ? raw.length : 0,
    note: raw ? 'Legacy Script Property still present. Once the sheet copies look right, run reclaimSandboxProperty() to free that space.' : 'No legacy property.'
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
// EXPLICIT, MANUAL deletion of the legacy Script Property, to free quota. Run
// from the editor, never automatically, and only after the sheet holds every
// sandbox — it verifies that itself and refuses otherwise.
// ─── DEMAND HISTORY PRUNE ─────────────────────────────────────────────────────
// sequins_demand_hist__<week>__<day> holds publish METADATA only — mode, date,
// publishedBy, publishedAt — capped at 5 entries per day. No SKU maps, so nothing
// here is demand and nothing here feeds the sequencer. It is a convenience audit
// trail, and for anything actually published the archive spreadsheet holds the
// same facts permanently.
//
// These keys are ~27% of the Script Properties budget, which is currently over
// 100% and failing every write including Load Demand. Clearing them is the
// cheapest way back to a working tool.
//
// TWO STEPS ON PURPOSE. preview first, then the delete, and the delete is never
// called by anything else in this file — no trigger, no UI button, no automatic
// path. It also refuses to touch any key that does not carry the history prefix,
// so a mistake here cannot reach demand.
const DEMAND_HIST_PREFIX = 'sequins_demand_hist__';
function previewPruneDemandHistory() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const keys = Object.keys(props).filter(function(k) { return k.indexOf(DEMAND_HIST_PREFIX) === 0; });
  let bytes = 0;
  keys.forEach(function(k) { bytes += (props[k] || '').length + k.length; });
  let total = 0;
  Object.keys(props).forEach(function(k) { total += (props[k] || '').length + k.length; });
  const out = {
    wouldDelete: keys.length,
    wouldFreeBytes: bytes,
    totalNow: total,
    totalAfter: total - bytes,
    budget: 500000,
    pctNow: Math.round(total / 5000),
    pctAfter: Math.round((total - bytes) / 5000),
    sample: keys.slice(0, 8),
    demandDayKeysUntouched: Object.keys(props).filter(function(k) {
      return k.indexOf('sequins_demand__') === 0;
    }).length
  };
  Logger.log('--- prune preview (NOTHING DELETED) ---');
  Logger.log('History keys: ' + out.wouldDelete + ' — ' + out.wouldFreeBytes + ' bytes');
  Logger.log('Budget: ' + out.totalNow + ' (' + out.pctNow + '%) -> ' + out.totalAfter + ' (' + out.pctAfter + '%)');
  Logger.log('Demand day keys that will NOT be touched: ' + out.demandDayKeysUntouched);
  Logger.log('Sample: ' + out.sample.join(', '));
  Logger.log('If that looks right, run pruneDemandHistory().');
  return out;
}
function pruneDemandHistory() {
  const sp = PropertiesService.getScriptProperties();
  const props = sp.getProperties();
  const keys = Object.keys(props).filter(function(k) { return k.indexOf(DEMAND_HIST_PREFIX) === 0; });
  if (!keys.length) { Logger.log('pruneDemandHistory: nothing to prune.'); return { ok: true, deleted: 0, freed: 0 }; }
  let freed = 0, deleted = 0;
  keys.forEach(function(k) {
    // Belt and braces: a key must carry the history prefix to be removable here.
    if (k.indexOf(DEMAND_HIST_PREFIX) !== 0) return;
    freed += (props[k] || '').length + k.length;
    sp.deleteProperty(k);
    deleted++;
  });
  const after = sp.getProperties();
  let total = 0;
  Object.keys(after).forEach(function(k) { total += (after[k] || '').length + k.length; });
  Logger.log('pruneDemandHistory: deleted ' + deleted + ' history key(s), freed ' + freed + ' bytes.');
  Logger.log('Script Properties now ~' + total + ' bytes of ~500,000 (' + Math.round(total / 5000) + '%).');
  Logger.log('Demand day keys remaining: ' + Object.keys(after).filter(function(k) { return k.indexOf('sequins_demand__') === 0; }).length);
  try { writeAuditLog_(Session.getActiveUser().getEmail(), 'prune_demand_history', '', '', deleted + ' keys / ' + freed + ' bytes'); } catch (e) {}
  return { ok: true, deleted: deleted, freed: freed, totalAfter: total };
}

// ─── ARCHIVE OLD DEMAND ───────────────────────────────────────────────────────
// Sequins keeps the CURRENT week in Script Properties and nothing older. Earlier
// weeks are written to a Demand Archive tab in the archive spreadsheet first,
// then removed from properties — archive-then-delete, verified in between, never
// the other way round.
//
// Rows carry an Environment column. Everything archived now is TEST: the rules
// and algorithms are still being settled, so this demand was never a production
// plan and should never be read as one. Later rows can be written PROD without
// changing the shape.
//
// This is the same move published plans and sandboxes already made. It also
// leaves demand somewhere Hex can query directly, which a Script Properties blob
// never could — so it's a step toward planned-vs-actual rather than a detour
// around a quota.
//
// Manual, two-step, and nothing else in this file calls them.
function demandArchiveSheet_() {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(DEMAND_ARCHIVE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(DEMAND_ARCHIVE_TAB);
    sheet.getRange(1, 1, 1, 11).setValues([['Week', 'Day', 'Date', 'Mode', 'Environment',
      'SKUs', 'Units', 'PublishedBy', 'PublishedAt', 'ArchivedAt', 'JSON']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
// Which week is "now"? Week numbers come from the source sheets rather than being
// computed, so the honest signal is the dates already stored: the current week is
// the one whose date span contains today. Falls back to the latest week that has
// already started, and returns null rather than guessing if neither holds.
function currentDemandWeek_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const spans = {};
  Object.keys(props).forEach(function(k) {
    const m = k.match(/^sequins_demand__Wk_(\d+)_(\d+)__(.+)$/);
    if (!m) return;
    let d = null;
    try { d = JSON.parse(props[k]); } catch (e) { return; }
    const dt = d && d.date ? String(d.date).slice(0, 10) : '';
    if (!dt) return;
    const label = 'Wk ' + Number(m[1]) + ' \u00b7 ' + Number(m[2]);
    if (!spans[label]) spans[label] = { label: label, wk: Number(m[1]), yr: Number(m[2]), min: dt, max: dt };
    if (dt < spans[label].min) spans[label].min = dt;
    if (dt > spans[label].max) spans[label].max = dt;
  });
  const labels = Object.keys(spans);
  if (!labels.length) return null;
  let hit = null;
  labels.forEach(function(l) {
    const sp = spans[l];
    if (sp.min <= today && today <= sp.max) hit = sp;
  });
  if (hit) return hit;
  labels.forEach(function(l) {
    const sp = spans[l];
    if (sp.min <= today && (!hit || sp.min > hit.min)) hit = sp;
  });
  return hit;
}
function collectArchivable_(props, cutoff) {
  const hit = [];
  Object.keys(props).forEach(function(k) {
    const m = k.match(/^sequins_demand(_hist)?__Wk_(\d+)_(\d+)__(.+)$/);
    if (!m) return;
    const wk = Number(m[2]), yr = Number(m[3]);
    if (weekRank_(wk, yr) >= cutoff) return;
    hit.push({ key: k, isHist: !!m[1], week: wk, year: yr, day: m[4],
               label: 'Wk ' + wk + ' \u00b7 ' + yr, bytes: (props[k] || '').length + k.length });
  });
  return hit;
}
function previewArchiveOldDemand() {
  const cur = currentDemandWeek_();
  if (!cur) { Logger.log('previewArchiveOldDemand: could not identify the current week from stored dates.'); return { ok: false }; }
  const props = PropertiesService.getScriptProperties().getProperties();
  const hit = collectArchivable_(props, weekRank_(cur.wk, cur.yr));
  const byWeek = {};
  let bytes = 0, days = 0;
  hit.forEach(function(h) {
    byWeek[h.label] = byWeek[h.label] || { bytes: 0, days: 0 };
    byWeek[h.label].bytes += h.bytes;
    if (!h.isHist) { byWeek[h.label].days++; days++; }
    bytes += h.bytes;
  });
  let total = 0;
  Object.keys(props).forEach(function(k) { total += (props[k] || '').length + k.length; });
  Logger.log('--- archive preview (NOTHING WRITTEN OR DELETED) ---');
  Logger.log('Current week, kept: ' + cur.label + '  (' + cur.min + ' to ' + cur.max + ')');
  Logger.log('Would archive ' + days + ' day(s) across ' + Object.keys(byWeek).length + ' week(s), then free ' + bytes + ' bytes:');
  Object.keys(byWeek).sort().forEach(function(w) {
    Logger.log('  ' + w + ': ' + byWeek[w].days + ' days, ' + byWeek[w].bytes + ' bytes');
  });
  Logger.log('Budget: ' + total + ' (' + Math.round(total / 5000) + '%) -> ' + (total - bytes) + ' (' + Math.round((total - bytes) / 5000) + '%)');
  Logger.log('Archived to tab "' + DEMAND_ARCHIVE_TAB + '", Environment = TEST.');
  Logger.log('If that looks right, run archiveOldDemand().');
  return { ok: true, currentWeek: cur.label, days: days, bytes: bytes, byWeek: byWeek, totalAfter: total - bytes };
}
function archiveOldDemand(environment) {
  const env = environment || 'TEST';
  const cur = currentDemandWeek_();
  if (!cur) throw new Error('Could not identify the current week from stored dates — aborting rather than guessing.');
  const sp = PropertiesService.getScriptProperties();
  const props = sp.getProperties();
  const cutoff = weekRank_(cur.wk, cur.yr);
  const hit = collectArchivable_(props, cutoff);
  const dayKeys = hit.filter(function(h) { return !h.isHist; });
  if (!dayKeys.length) { Logger.log('archiveOldDemand: nothing older than ' + cur.label + '.'); return { ok: true, archived: 0, deleted: 0, freed: 0 }; }

  const sheet = demandArchiveSheet_();
  // Days already in the archive are skipped rather than written twice — a retry
  // after a refused run would otherwise leave duplicate rows behind. Their
  // properties still get removed below, because the data is already safe.
  const already = {};
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().forEach(function(r) {
      already[String(r[0]) + '||' + String(r[1])] = true;
    });
  }
  const toWrite = dayKeys.filter(function(h) { return !already[h.label + '||' + h.day]; });
  const skipped = dayKeys.length - toWrite.length;
  const now = new Date().toISOString();
  const rows = toWrite.map(function(h) {
    let d = {};
    try { d = JSON.parse(props[h.key]) || {}; } catch (e) { d = {}; }
    const skus = d.skus || {};
    let units = 0;
    Object.keys(skus).forEach(function(k) { units += Number(skus[k]) || 0; });
    return [h.label, h.day, d.date || '', d.mode || '', env, Object.keys(skus).length, units,
            d.publishedBy || '', d.publishedAt || '', now, props[h.key]];
  });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 11).setValues(rows);
    SpreadsheetApp.flush();
  }
  if (skipped) Logger.log('archiveOldDemand: ' + skipped + ' day(s) were already archived — not written again.');

  // VERIFY BEFORE DELETING. Re-read the tab and confirm every week/day landed;
  // if even one is missing, nothing is removed from properties.
  const lastRow = sheet.getLastRow();
  const check = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const present = {};
  check.forEach(function(r) { present[String(r[0]) + '||' + String(r[1])] = true; });
  const missing = dayKeys.filter(function(h) { return !present[h.label + '||' + h.day]; });
  if (missing.length) {
    Logger.log('archiveOldDemand: REFUSED to delete — ' + missing.length + ' day(s) did not land in the archive: ' +
               missing.slice(0, 10).map(function(h) { return h.label + ' ' + h.day; }).join(', '));
    return { ok: false, refused: true, archived: rows.length, missing: missing.length };
  }

  let freed = 0, deleted = 0;
  hit.forEach(function(h) {
    if (weekRank_(h.week, h.year) >= cutoff) return;   // re-check per key
    sp.deleteProperty(h.key); freed += h.bytes; deleted++;
  });
  let idx = {};
  try { idx = JSON.parse(props['sequins_demand_weeks'] || '{}'); } catch (e) { idx = {}; }
  const keptIdx = {}, dropped = [];
  Object.keys(idx).forEach(function(w) {
    const m = w.match(/Wk\s*(\d+).*?(\d{4})/);
    if (m && weekRank_(m[1], m[2]) < cutoff) { dropped.push(w); return; }
    keptIdx[w] = idx[w];
  });
  sp.setProperty('sequins_demand_weeks', JSON.stringify(keptIdx));
  const after = sp.getProperties();
  let total = 0;
  Object.keys(after).forEach(function(k) { total += (after[k] || '').length + k.length; });
  Logger.log('archiveOldDemand: archived ' + rows.length + ' new day(s) as ' + env +
             (skipped ? ' (' + skipped + ' already present)' : '') +
             ', then deleted ' + deleted + ' key(s), freed ' + freed + ' bytes.');
  Logger.log('Weeks removed: ' + (dropped.join(', ') || 'none'));
  Logger.log('Weeks remaining: ' + Object.keys(keptIdx).sort().join(', '));
  Logger.log('Script Properties now ~' + total + ' bytes of ~500,000 (' + Math.round(total / 5000) + '%).');
  try { writeAuditLog_(Session.getActiveUser().getEmail(), 'archive_demand', '', '', rows.length + ' days as ' + env + ', freed ' + freed); } catch (e) {}
  return { ok: true, archived: rows.length, deleted: deleted, freed: freed, totalAfter: total, droppedWeeks: dropped };
}

// ─── RETIRE OLD DEMAND WEEKS ──────────────────────────────────────────────────
// Demand day keys are ~3.5KB each and there are 140 of them — they ARE the
// budget. History keys turned out to be ~175 bytes each, so pruning those alone
// does not get under the ceiling.
//
// Retiring a past week removes its stored demand from Script Properties. That is
// recoverable, which is the only reason this is acceptable: actuals live in
// Demands 2025 and can be re-fetched for any date range, and published plans are
// already in the archive spreadsheet. Nothing unique is lost.
//
// Guards, because this deletes real demand:
//   - refuses any week at or after the cutoff, so today and the future are safe
//   - cutoff must be supplied explicitly; there is no default and no "clean up
//     anything old" behaviour
//   - preview first, and nothing else in this file calls either function
//   - the demand index is updated in the same pass, so the UI cannot offer a week
//     whose days no longer exist
const DEMAND_KEY_RE = /^sequins_demand(_hist)?__Wk_(\d+)_(\d+)__(.+)$/;
function weekRank_(week, year) { return Number(year) * 100 + Number(week); }
function collectRetirable_(props, cutoffYear, cutoffWeek) {
  const cutoff = weekRank_(cutoffWeek, cutoffYear);
  const hit = [];
  Object.keys(props).forEach(function(k) {
    const m = k.match(DEMAND_KEY_RE);
    if (!m) return;
    const wk = Number(m[2]), yr = Number(m[3]);
    if (weekRank_(wk, yr) >= cutoff) return;   // at or after cutoff — untouched
    hit.push({ key: k, week: wk, year: yr, label: 'Wk ' + wk + ' \u00b7 ' + yr,
               bytes: (props[k] || '').length + k.length });
  });
  return hit;
}
function previewRetireDemandBefore(cutoffYear, cutoffWeek) {
  if (!cutoffYear || !cutoffWeek) throw new Error('Give a cutoff, e.g. previewRetireDemandBefore(2026, 32)');
  const props = PropertiesService.getScriptProperties().getProperties();
  const hit = collectRetirable_(props, cutoffYear, cutoffWeek);
  const byWeek = {};
  let bytes = 0;
  hit.forEach(function(h) { byWeek[h.label] = (byWeek[h.label] || 0) + h.bytes; bytes += h.bytes; });
  let total = 0;
  Object.keys(props).forEach(function(k) { total += (props[k] || '').length + k.length; });
  Logger.log('--- retire preview (NOTHING DELETED) ---');
  Logger.log('Cutoff: anything before Wk ' + cutoffWeek + ' \u00b7 ' + cutoffYear);
  Logger.log('Keys: ' + hit.length + ' — ' + bytes + ' bytes');
  Object.keys(byWeek).sort().forEach(function(w) { Logger.log('  ' + w + ': ' + byWeek[w] + ' bytes'); });
  Logger.log('Budget: ' + total + ' (' + Math.round(total / 5000) + '%) -> ' +
             (total - bytes) + ' (' + Math.round((total - bytes) / 5000) + '%)');
  Logger.log('Weeks kept: ' + Object.keys(JSON.parse(props['sequins_demand_weeks'] || '{}')).filter(function(w) {
    const m = w.match(/Wk (\d+).*?(\d{4})/); return m ? weekRank_(m[1], m[2]) >= weekRank_(cutoffWeek, cutoffYear) : true;
  }).join(', '));
  Logger.log('If that looks right, run retireDemandBefore(' + cutoffYear + ', ' + cutoffWeek + ').');
  return { keys: hit.length, bytes: bytes, byWeek: byWeek, totalNow: total, totalAfter: total - bytes };
}
function retireDemandBefore(cutoffYear, cutoffWeek) {
  if (!cutoffYear || !cutoffWeek) throw new Error('Give a cutoff, e.g. retireDemandBefore(2026, 32)');
  const sp = PropertiesService.getScriptProperties();
  const props = sp.getProperties();
  const hit = collectRetirable_(props, cutoffYear, cutoffWeek);
  if (!hit.length) { Logger.log('retireDemandBefore: nothing older than the cutoff.'); return { ok: true, deleted: 0, freed: 0 }; }
  const cutoff = weekRank_(cutoffWeek, cutoffYear);
  let freed = 0, deleted = 0;
  hit.forEach(function(h) {
    // Re-check the cutoff per key rather than trusting the collected list.
    if (weekRank_(h.week, h.year) >= cutoff) return;
    sp.deleteProperty(h.key); freed += h.bytes; deleted++;
  });
  // Keep the index honest — a week listed with no day keys behind it is worse
  // than a week that is simply gone.
  let idx = {};
  try { idx = JSON.parse(props['sequins_demand_weeks'] || '{}'); } catch (e) { idx = {}; }
  const keptIdx = {}, droppedWeeks = [];
  Object.keys(idx).forEach(function(w) {
    const m = w.match(/Wk\s*(\d+).*?(\d{4})/);
    if (m && weekRank_(m[1], m[2]) < cutoff) { droppedWeeks.push(w); return; }
    keptIdx[w] = idx[w];
  });
  sp.setProperty('sequins_demand_weeks', JSON.stringify(keptIdx));
  const after = sp.getProperties();
  let total = 0;
  Object.keys(after).forEach(function(k) { total += (after[k] || '').length + k.length; });
  Logger.log('retireDemandBefore: deleted ' + deleted + ' key(s), freed ' + freed + ' bytes.');
  Logger.log('Weeks removed from the index: ' + (droppedWeeks.join(', ') || 'none'));
  Logger.log('Weeks remaining: ' + Object.keys(keptIdx).sort().join(', '));
  Logger.log('Script Properties now ~' + total + ' bytes of ~500,000 (' + Math.round(total / 5000) + '%).');
  Logger.log('These weeks can be re-fetched from Demands 2025 if ever needed.');
  try { writeAuditLog_(Session.getActiveUser().getEmail(), 'retire_demand', '', '', 'before Wk ' + cutoffWeek + '/' + cutoffYear + ': ' + deleted + ' keys, ' + freed + ' bytes'); } catch (e) {}
  return { ok: true, deleted: deleted, freed: freed, totalAfter: total, droppedWeeks: droppedWeeks };
}

// ─── PROPERTY SIZE BREAKDOWN ──────────────────────────────────────────────────
// Read-only. debugDemandState() reports the TOTAL against the budget; this says
// where the bytes actually are, so pruning targets the right thing instead of the
// most obvious thing. Groups by key prefix, biggest first, and lists the largest
// individual keys.
function debugPropertySizes() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const keys = Object.keys(props);
  const groups = {};
  const each = [];
  keys.forEach(function(k) {
    const bytes = (props[k] || '').length + k.length;
    each.push({ key: k, bytes: bytes });
    let g;
    if (k.indexOf('sequins_demand_hist__') === 0) g = 'demand history';
    else if (k.indexOf('sequins_demand__') === 0) g = 'demand days';
    else if (k === 'sequins_demand_weeks') g = 'demand index';
    else if (k === STATE_KEYS.skuLibrary) g = 'SKU library';
    else if (k === STATE_KEYS.publishedPlans) g = 'published plans (legacy key)';
    else if (k === STATE_KEYS.overrides) g = 'workbench overrides';
    else if (k === STATE_KEYS.sandboxes) g = 'sandboxes (legacy key)';
    else if (k === STATE_KEYS.lineConfig || k === STATE_KEYS.sequencingRules) g = 'config + rules';
    else g = 'other';
    if (!groups[g]) groups[g] = { bytes: 0, count: 0 };
    groups[g].bytes += bytes; groups[g].count++;
  });
  let total = 0;
  Object.keys(groups).forEach(function(g) { total += groups[g].bytes; });
  const ranked = Object.keys(groups).map(function(g) {
    return { group: g, count: groups[g].count, bytes: groups[g].bytes,
             pct: total ? Math.round(groups[g].bytes / total * 1000) / 10 : 0 };
  }).sort(function(a, b) { return b.bytes - a.bytes; });
  each.sort(function(a, b) { return b.bytes - a.bytes; });

  // Per-week demand totals, so retiring old weeks can be costed before doing it.
  const byWeek = {};
  keys.forEach(function(k) {
    const m = k.match(/^sequins_demand(?:_hist)?__(Wk_\d+_\d+)__/);
    if (!m) return;
    if (!byWeek[m[1]]) byWeek[m[1]] = 0;
    byWeek[m[1]] += (props[k] || '').length + k.length;
  });
  const weeks = Object.keys(byWeek).sort().map(function(w) { return { week: w, bytes: byWeek[w] }; });

  Logger.log('--- Script Properties size breakdown ---');
  Logger.log('Total: ' + total + ' bytes of ~500,000 (' + Math.round(total / 5000) + '% of budget)');
  Logger.log('Keys: ' + keys.length);
  ranked.forEach(function(r) {
    Logger.log('  ' + r.group + ': ' + r.bytes + ' bytes across ' + r.count + ' key(s) — ' + r.pct + '%');
  });
  Logger.log('Largest single keys:');
  each.slice(0, 12).forEach(function(e) { Logger.log('  ' + e.key + ': ' + e.bytes); });
  Logger.log('Demand bytes per week (day + history keys):');
  weeks.forEach(function(w) { Logger.log('  ' + w.week + ': ' + w.bytes); });
  Logger.log('--- end breakdown ---');
  return { total: total, budget: 500000, keys: keys.length, groups: ranked, largest: each.slice(0, 12), weeks: weeks };
}
function reclaimSandboxProperty() {
  const raw = PropertiesService.getScriptProperties().getProperty(STATE_KEYS.sandboxes);
  if (raw === null) { Logger.log('reclaimSandboxProperty: nothing to reclaim.'); return { ok: true, freed: 0 }; }
  let legacy = [];
  try { legacy = JSON.parse(raw) || []; } catch (e) { legacy = []; }
  const inSheet = {};
  readSandboxRows_().list.forEach(function(x) { inSheet[x.id] = true; });
  const missing = legacy.filter(function(x) { return x && x.id && !inSheet[x.id]; }).map(function(x) { return x.id; });
  if (missing.length) {
    Logger.log('reclaimSandboxProperty: REFUSED. Not yet in the sheet: ' + missing.join(', ') +
               '. Open the Sandbox view once to migrate, then run this again.');
    return { ok: false, refused: true, missing: missing };
  }
  PropertiesService.getScriptProperties().deleteProperty(STATE_KEYS.sandboxes);
  Logger.log('reclaimSandboxProperty: deleted legacy key, freed ' + raw.length + ' bytes. ' +
             legacy.length + ' sandbox(es) verified present in the sheet first.');
  return { ok: true, freed: raw.length, verified: legacy.length };
}

// ─── FINISH-BY (CURFEW) ──────────────────────────────────────
// Per week/day: { enabled: bool, time: 'HH:MM' }. Warning-only on the client —
// nothing here affects sequencing. Whole day's object replaces on save, same
// pattern as break overrides and scenarios.
function saveFinishBy(weekLabel, day, obj) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner && !user.canEditRules) throw new Error('Not authorized');
  const all = getSection_(STATE_KEYS.finishBy) || {};
  if (!all[weekLabel]) all[weekLabel] = {};
  all[weekLabel][day] = { enabled: !!(obj && obj.enabled), time: (obj && obj.time) || '' };
  setSection_(STATE_KEYS.finishBy, all);
  writeAuditLog_(user.email, 'save_finish_by', weekLabel, day, all[weekLabel][day].enabled ? all[weekLabel][day].time : 'off');
  return { ok: true };
}

// ─── PUBLISHED PLAN ───────────────────────────────────────────────────────────
// ─── PUBLISHED-PLAN ARCHIVE (flat, append-only, in a Google Sheet) ──────────
function r2_(n) { const v = Number(n); return isNaN(v) ? 0 : Math.round(v * 100) / 100; }
// Sheets coerces '16:00' into a real time value on write, so it reads back as a
// Date (1899-12-30T16:00) — String() on that yields a long date string and any
// HH:MM parse fails, silently killing the curfew on every published view.
// Normalise every shape to MINUTES FROM MIDNIGHT, which nothing can coerce:
//   Date -> h*60+m | 0<n<1 (Sheets day fraction) -> n*1440 | n -> minutes
//   'HH:MM' anywhere in a string -> parsed | blank -> ''
function _finishByMin_(v) {
  if (v === '' || v === null || v === undefined) return '';
  // LEGACY ROWS (written by v0.4.26 as the text '15:30', which Sheets coerced to
  // a real time-of-day). Reading that back with getHours() converts into the
  // SCRIPT's timezone — and this archive Sheet was created programmatically, so
  // it sits in UTC while the script runs America/Chicago. A 3:30 PM goal came
  // back as 9:30 AM: exactly six hours out, silently. Format in the SHEET's own
  // timezone instead, which is the timezone the value was written in.
  // A Sheets time-of-day is a fraction of a day, which Apps Script materializes
  // as a timestamp on 1899-12-30 UTC. '15:30' is therefore 1899-12-30T15:30:00Z,
  // and the digits are already correct — so read them with NO conversion.
  // getHours() applied Chicago (gave 9:30) and formatDate applied the sheet's
  // timezone (gave 7:30); both were wrong for the same reason. getUTC* is right.
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes();
  if (typeof v === 'number') { if (v > 0 && v < 1) return Math.round(v * 1440); return Math.round(v); }
  const str = String(v).trim();
  const m = str.match(/(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  if (/^\d{1,4}$/.test(str)) return parseInt(str, 10);  // plain-text minutes
  return '';
}
// Sheets silently coerces date-looking strings on write, so these columns come
// back as Date objects. Flatten to plain text before it leaves the server.
function _asText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v);
}
function planArchiveSheet_() {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(PLAN_ARCHIVE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(PLAN_ARCHIVE_TAB);
    sheet.getRange(1, 1, 1, PLAN_ARCHIVE_HEADER.length).setValues([PLAN_ARCHIVE_HEADER]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
  // FinishBy and LabelVersion are stored as plain text/numbers and must never be
  // re-interpreted as dates or times — that coercion is what produced the
  // six-hour timezone shift above. Pin the format once, cheaply.
  try {
    const w = PLAN_ARCHIVE_HEADER.length;
    sheet.getRange(1, w - 1, sheet.getMaxRows(), 2).setNumberFormat('@');
  } catch (e) { Logger.log('planArchiveSheet_: could not pin trailing column format: ' + e.message); }

}
// Next version number for a given week+day (your "count on the end" convention,
// as a column). Scans the Week/Day/Version columns once.
function nextPlanVersion_(sheet, weekLabel, day) {
  const last = sheet.getLastRow();
  if (last < 2) return 1;
  const vals = sheet.getRange(2, 3, last - 1, 3).getValues(); // C=Version, D=Week, E=Day
  let max = 0;
  vals.forEach(function(r) {
    if (String(r[1]) === String(weekLabel) && String(r[2]) === String(day)) {
      const v = parseInt(r[0], 10) || 0;
      if (v > max) max = v;
    }
  });
  return max + 1;
}
// Append one publish's worth of flat rows. The snapshot is the slim client
// snapshot (lineState/lines/jobs/unplaced/meta).
function savePublishedPlan(weekLabel, day, snap) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const sheet = planArchiveSheet_();
  const version = nextPlanVersion_(sheet, weekLabel, day);
  const pubAt = snap.publishedAt || new Date().toISOString();
  const pubBy = snap.publishedBy || user.email;
  const scen  = snap.scenarioName || 'Baseline';
  const mode  = snap.mode || '';
  const date  = snap.date || '';
  const hasAttrsBySku = {};
  (snap.jobs || []).forEach(function(j) { hasAttrsBySku[j.sku] = j.hasAttrs !== false; });
  const rows = [];
  function base(line, type, seqPos, sku, qty) {
    return [pubAt, pubBy, version, weekLabel, day, date, mode, scen, line, type, seqPos, sku, qty];
  }
  const finishBy = _finishByMin_(snap.finishBy); // stored as minutes, never a time value
  // Label version is FROZEN into the row at publish time. It used to be read
  // live from the SKU Library at render time, which meant the daily label sync
  // silently changed the label number shown on an ALREADY-PUBLISHED plan — wrong
  // for a QA-facing view, where the whole point is what was current at publish.
  const pubLib = getSection_(STATE_KEYS.skuLibrary) || {};
  function labelFor(sku) {
    const m = pubLib[String(sku || '').toUpperCase()];
    return (m && m.labelNumberVersion) || '';
  }
  function tailSku(arr) { return tail(arr, labelFor(arr[11])); }  // index 11 = SKU
  function tail(arr, labelVer) { // pad, then stamp the two trailing columns
    while (arr.length < PLAN_ARCHIVE_HEADER.length - 2) arr.push('');
    arr.push(finishBy); arr.push(labelVer || ''); return arr;
  }
  const ls = snap.lineState || {};
  Object.keys(ls).forEach(function(lineId) {
    const line = ls[lineId];
    (line.slots || []).forEach(function(s, i) {
      rows.push(tailSku(base(lineId, 'SKU', i + 1, s.sku, s.qty)
        .concat([s.startClockMin, s.endClockMin, '', (s.allergenSet || []).join(', '),
          !!s.isUSDA, !!s.isSeed, !!s.isPreProcessed, !!s.overridden, s.overrideMovedBy || '',
          s.overrideNote || '', hasAttrsBySku[s.sku] !== false, ''])));
    });
    (line.breaks || []).forEach(function(b) {
      // v0.4.32: break position goes in SeqPos (was ''). buildLineCards places
      // breaks by index, so without it the published view dropped them silently.
      rows.push(tail(base(lineId, 'BREAK', (b.position != null ? b.position : ''), b.label, '')
        .concat([b.startClockMin, b.endClockMin, b.durationMin, '', false, false, false, false, '', '', '', !!b.blocking])));
    });
  });
  (snap.unplaced || []).forEach(function(u) {
    rows.push(tailSku(base('', 'UNPLACED', '', u.sku, u.qty)
      .concat(['', '', '', '', false, false, false, false, '', u.unplacedReason || '', hasAttrsBySku[u.sku] !== false, ''])));
  });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, PLAN_ARCHIVE_HEADER.length).setValues(rows);
  }
  writeAuditLog_(user.email, 'publish_plan', weekLabel, day, 'v' + version + ' · ' + rows.length + ' rows');
  return { ok: true, version: version };
}
// Unpublish = append a tombstone version (append-only; history preserved).
function unpublishPlan(weekLabel, day) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const sheet = planArchiveSheet_();
  const version = nextPlanVersion_(sheet, weekLabel, day);
  const row = [new Date().toISOString(), user.email, version, weekLabel, day, '', '', '', '', 'UNPUBLISHED', '', '', '', '', '', '', '', false, false, false, false, '', '', '', '', '', ''];
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, PLAN_ARCHIVE_HEADER.length).setValues([row]);
  writeAuditLog_(user.email, 'unpublish_plan', weekLabel, day, 'v' + version);
  return { ok: true };
}
// Read the latest published plan for a week/day back from the archive and
// rebuild the snapshot shape the client views expect. null if never published
// (or latest version is a tombstone).
function getPublishedPlan(weekLabel, day) {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  const sheet = ss.getSheetByName(PLAN_ARCHIVE_TAB);
  const last = sheet ? sheet.getLastRow() : 0;
  if (!sheet || last < 2) return null;
  const H = {}; PLAN_ARCHIVE_HEADER.forEach(function(h, i){ H[h] = i; });
  // STEP 1 — narrow index scan. Read only Version/Week/Day (cols C:E) to find
  // the latest version for this day and the row span it occupies. The archive
  // is append-only, so reading all 25 columns of every row (what this used to
  // do) got steadily slower with every publish, forever.
  const idx = sheet.getRange(2, 3, last - 1, 3).getValues();
  let maxV = 0;
  for (let i = 0; i < idx.length; i++) {
    if (String(idx[i][1]) === String(weekLabel) && String(idx[i][2]) === String(day)) {
      const v = parseInt(idx[i][0], 10) || 0;
      if (v > maxV) maxV = v;
    }
  }
  if (!maxV) return null;
  let firstRow = -1, lastRow = -1;
  for (let i = 0; i < idx.length; i++) {
    if (String(idx[i][1]) === String(weekLabel) && String(idx[i][2]) === String(day) &&
        (parseInt(idx[i][0], 10) || 0) === maxV) {
      const rowNum = i + 2;
      if (firstRow < 0) firstRow = rowNum;
      lastRow = rowNum;
    }
  }
  if (firstRow < 0) return null;
  // STEP 2 — cached rebuild. Keyed on week|day|version, so a new publish bumps
  // the version and invalidates it automatically; nothing stale can be served.
  // CacheService only (expires on its own, holds no source of truth, deletes
  // nothing) — the archive Sheet remains the sole record.
  const ck = 'plan|v2|' + weekLabel + '|' + day + '|' + maxV; // v2 = finishBy-as-minutes
  const cache = CacheService.getScriptCache();
  let hit = null; try { hit = cache.get(ck); } catch (e) { hit = null; }
  if (hit) return hit;
  // STEP 3 — read only that block, not the whole tab.
  const rows = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, PLAN_ARCHIVE_HEADER.length).getValues()
    .filter(function(r){ return String(r[H.Week]) === String(weekLabel) && String(r[H.Day]) === String(day) &&
      (parseInt(r[H.Version], 10) || 0) === maxV; });
  if (!rows.length) return null;
  if (rows.length === 1 && rows[0][H.Type] === 'UNPUBLISHED') return null;
  const B = function(v){ return v === true || v === 'TRUE' || v === 'true'; };
  const lineConfig = getSection_(STATE_KEYS.lineConfig) || [];
  const cfgById = {}; lineConfig.forEach(function(l){ cfgById[l.id] = l; });
  const lineState = {}, jobs = [], unplaced = [], lineSeen = {};
  function ensureLine(id) {
    if (!lineState[id]) { const c = cfgById[id] || {}; lineState[id] = { slots: [], breaks: [], totalMin: 0, totalUnits: 0, hc: c.hc || 0, startMin: 0 }; lineSeen[id] = true; }
    return lineState[id];
  }
  rows.forEach(function(r) {
    const type = r[H.Type];
    if (type === 'SKU') {
      const lss = ensureLine(r[H.Line]);
      const allerg = String(r[H.Allergens] || '').split(',').map(function(s){ return s.trim(); }).filter(function(s){ return !!s; });
      lss.slots.push({ sku: r[H.SKU], qty: Number(r[H.Qty]) || 0, pool: '', labelVersion: String(r[H.LabelVersion] || ''), startClockMin: Number(r[H.StartMin]) || 0, endClockMin: Number(r[H.EndMin]) || 0, allergenSet: allerg, isUSDA: B(r[H.USDA]), isSeed: B(r[H.Seed]), isPreProcessed: B(r[H.PreProcessed]), overridden: B(r[H.Overridden]), overrideMovedBy: r[H.OverrideBy] || '', overrideNote: r[H.Note] || '' });
      jobs.push({ sku: r[H.SKU], qty: Number(r[H.Qty]) || 0, hasAttrs: B(r[H.HasAttrs]) });
    } else if (type === 'BREAK') {
      const lsb = ensureLine(r[H.Line]);
      // v0.4.32: position comes back from SeqPos. Blank means a plan published
      // before v0.4.32 — leave it null rather than coercing to 0, or every old
      // break would render at the TOP of its line. Null keeps the old behaviour
      // (not shown) for those plans; no backfill.
      const bpos = String(r[H.SeqPos] == null ? '' : r[H.SeqPos]).trim();
      const bpn = (bpos === '' || isNaN(Number(bpos))) ? null : Number(bpos);
      lsb.breaks.push({ id: (String(r[H.SKU] || '').indexOf('30') !== -1 ? 'b30' : 'b15'), label: r[H.SKU], durationMin: Number(r[H.DurationMin]) || 0, startClockMin: Number(r[H.StartMin]) || 0, endClockMin: Number(r[H.EndMin]) || 0, blocking: B(r[H.Blocking]), position: bpn, enabled: true });
    } else if (type === 'UNPLACED') {
      unplaced.push({ sku: r[H.SKU], qty: Number(r[H.Qty]) || 0, pool: '', unplacedReason: r[H.Note] || '' });
      jobs.push({ sku: r[H.SKU], qty: Number(r[H.Qty]) || 0, hasAttrs: B(r[H.HasAttrs]) });
    }
  });
  Object.keys(lineState).forEach(function(id) {
    const lsx = lineState[id], c = cfgById[id] || {};
    const p = String(c.startTime || '06:00').split(':'); lsx.startMin = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    lsx.slots.sort(function(a, b){ return a.startClockMin - b.startClockMin; });
    lsx.totalUnits = lsx.slots.reduce(function(s, j){ return s + j.qty; }, 0);
    let maxEnd = lsx.startMin;
    lsx.slots.forEach(function(j){ if (j.endClockMin > maxEnd) maxEnd = j.endClockMin; });
    lsx.breaks.forEach(function(b){ if (b.endClockMin > maxEnd) maxEnd = b.endClockMin; });
    lsx.totalMin = maxEnd - lsx.startMin;
  });
  const lines = Object.keys(lineSeen).map(function(id){ const c = cfgById[id] || {}; return { id: id, label: c.label || id, startTime: c.startTime || '', hc: c.hc || 0, type: c.type || 'day' }; });
  const first = rows[0];
  // Round every minute value to 2dp. The sequencer produces raw floats like
  // 656.8597087378641 and the archive stored them verbatim — 17 chars where 6
  // will do, on every start/end of every slot and break on every line. That
  // bloat is what pushed the response past what google.script.run would carry.
  Object.keys(lineState).forEach(function(id) {
    const L = lineState[id];
    L.totalMin = r2_(L.totalMin); L.startMin = r2_(L.startMin);
    L.slots.forEach(function(s){ s.startClockMin = r2_(s.startClockMin); s.endClockMin = r2_(s.endClockMin); });
    L.breaks.forEach(function(b){ b.startClockMin = r2_(b.startClockMin); b.endClockMin = r2_(b.endClockMin); b.durationMin = r2_(b.durationMin); });
  });
  // Return a JSON STRING, not an object. Sheets hands back real Date objects
  // for the Date/PublishedAt columns, and a deep object graph containing them
  // has to go through the framework's own serializer to reach the browser —
  // which is where a large response can die silently (server logs Completed,
  // the client's success AND failure handlers both never fire, so the view sits
  // on "no published plan" forever). A plain string can't hit that path.
  const out = JSON.stringify({ lineState: lineState, lines: lines, jobs: jobs, unplaced: unplaced,
    publishedBy: String(first[H.PublishedBy] || ''), publishedAt: _asText_(first[H.PublishedAt]),
    scenarioName: String(first[H.Scenario] || 'Baseline'), mode: String(first[H.Mode] || ''),
    date: _asText_(first[H.Date]), finishBy: _finishByMin_(first[H.FinishBy]), version: maxV });
  // 6h TTL. Silently skipped if the payload exceeds CacheService's 100KB cap —
  // a miss just means the read above runs again, never a wrong answer.
  try { cache.put(ck, out, 21600); } catch (e) { Logger.log('plan cache skip: ' + e.message); }
  return out;
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
