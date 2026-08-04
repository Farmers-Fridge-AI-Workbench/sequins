/**
 * Sequins ✨ — Code.js    v0.4.32 — 2026-08-04    (pairs with Index.html v0.5.66)
 * Full history: git log. Recent changes only, newest first.
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
function fetchActualDemand(startDate, endDate, haveDates) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');

  const start = new Date(startDate + 'T12:00:00');
  const end   = new Date(endDate   + 'T12:00:00');
  const tz    = Session.getScriptTimeZone();
  const ss    = SpreadsheetApp.openById(DEMANDS_SHEET_ID);
  // Days already captured as actuals (frozen evidence — never re-read or
  // overwrite them; what we saw that day is the record). Passed from client.
  const haveSet = {}; (haveDates || []).forEach(function(d){ haveSet[d] = true; });

  const allSheets  = ss.getSheets();
  const weekSheets = allSheets.filter(s => /\d{4}\s+Week\s+\d+/i.test(s.getName()));
  if (!weekSheets.length) throw new Error('No weekly tabs found in Demands 2025. Expected names like "2026 Week 27".');

  const skuData  = {};
  const byDate   = {};
  const skipped  = {}; // dates in range we skipped because already captured

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
      // SKIP #2 (freeze): already captured as an actual — leave it frozen.
      if (haveSet[dateStr]) { skipped[dateStr] = dayStr; continue; }
      dateCols.push({ col: ci, date: dateStr, day: dayStr });
      byDate[dateStr] = { day: dayStr, col: ci, weekLabel: sheetWeekLabel };
    }
    if (!dateCols.length) return; // nothing new in this tab — skip the full read

    const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    // No library filter — load all SKUs from actuals as-is. Stop at sentinel.
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

  const skippedList = Object.keys(skipped).sort().map(function(d){ return { date: d, day: skipped[d] }; });
  if (!Object.keys(byDate).length) {
    if (skippedList.length) return { skuData: {}, byDate: {}, dates: [], mode: 'actual', skipped: skippedList };
    throw new Error('No dates found between ' + startDate + ' and ' + endDate + ' in Demands 2025.');
  }

  const datesList = Object.entries(byDate)
    .map(([date, info]) => ({ date, day: info.day, col: info.col, weekLabel: info.weekLabel }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { skuData, byDate, dates: datesList, mode: 'actual', skipped: skippedList };
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
  keys.forEach(function(key) {
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
    deactivatedList: deactivatedList, liveButUnlisted: liveButUnlisted };
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
