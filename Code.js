/**
 * Sequins ✨ — Code.js    v0.4.127 — 2026-09-04    (pairs with Index.html v0.5.195)
 * Full history: git log. This header carries the LATEST change only.
 *
 * v0.4.127 capperLast90From_ reports LINE-6 vs other lines and no longer implies
 *          the capper was running whenever LINE-6 was.
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
// Observed throughput. The analytics team drops one row per production run into
// this tab overnight - date, line, start, end, SKU, units - so units divided by
// elapsed time is a MEASURED units-per-minute, per SKU, on real days. Sequins
// otherwise plans every run from a single hand-entered UPM per SKU that is the
// same on every line and never changes.
const DATA_DROP_SHEET_ID    = '1GUVv-2suadVxGaVoQKU815l1_Oqu8hYAgwiStWEwrjI'; // Standard (Labor Planning) v/s Actual UPLH DoD
const DATA_DROP_TAB         = 'Data Drop';
const OBSERVED_UPM_DAYS     = 90;
const LABEL_LOG_SHEET_ID    = '17rfAQdNYSki1ndD5QzA8MACUmClGotmje4GccXfBMws'; // Label Versions & Updates
const LABEL_LOG_TAB         = 'Label Version Log'; // A=SKU, B=SKU Name, C=Version Number, D=Label Number, E=Label File, F=Label Status
// Published-plan archive (v0.5.33 storage rework): published plans no longer
// live in Script Properties (that's what kept overflowing the ~500KB budget).
// They append here as flat rows — one per SKU/break/unplaced, per line, per
// publish — frozen at publish time, versioned per week/day. This is the
// durable record AND the planned-vs-actual fact table for Snowflake/Hex.
const PLAN_ARCHIVE_SHEET_ID = '1oB70aPTc2SkJYA-LEXgCm7tMWOHxDzFGt39pXIkR2L0';
// War Room Metrics Database — the plant-wide metrics book other teams read.
// Row 91 of New Ops. Metrics is 'Assembly $ / unit plan'; row 1 is a date
// header, one column per calendar day, maintained ~2 weeks ahead by another
// team. Row 3 carries the weekday, which is what lets a typo'd date cell be
// caught rather than written into blindly.
const WAR_ROOM_SHEET_ID   = '1zwYuaxcIVjSixea0s2JfxWlClr4xLjeSn3aOPj6Kqlk';
const WAR_ROOM_TAB        = 'New Ops. Metrics';
const WAR_ROOM_COST_ROW   = 91;
const WAR_ROOM_DATE_ROW   = 1;
const WAR_ROOM_DOW_ROW    = 3;
// Assembly Sequencing 2.0 — the Google Sheets tool Sequins replaces. Publishing
// drops the plan into a dated copy of its template tab as a fallback: if Sequins
// is ever unavailable, the old tool still has the day's sequence and computes
// everything else off its own formulas. Sequins writes only the two input
// columns — SKU and Units — plus the date and each line's start time.
const ASM20_SHEET_ID      = '1FRJ77-304M51SLwxrmljjZlrqv3YGMO_DRVrGu0pDBQ';
const ASM20_TEMPLATE_TAB  = 'Main Sequencing Sheet';
const ASM20_COL_SLOT = 3, ASM20_COL_SKU = 4, ASM20_COL_UNITS = 5, ASM20_COL_START = 12;
const ASM20_DATE_CELL     = 'E4';
// Sequins line ids → the block labels used in that sheet.
const ASM20_LINE_ALIASES  = { 'NIGHT-1': 'NIGHT SHIFT LINE-1', 'NIGHT-2': 'NIGHT SHIFT LINE-2' };
const PLAN_ARCHIVE_TAB      = 'Published Plans';
const RUN_ACTUALS_TAB       = 'Run Sheet Actuals';  // same spreadsheet as PLAN_ARCHIVE_SHEET_ID
const RUN_SHIFT_TAB         = 'Run Sheet Shift';    // same spreadsheet as PLAN_ARCHIVE_SHEET_ID
const SANDBOX_TAB           = 'Sandboxes';  // same spreadsheet — see SANDBOXES below
// ─── CONFIG MIRROR (v0.4.64) ─────────────────────────────────────────────────
// SKU Library and Line Config are the only Sequins data that lived nowhere but
// Script Properties — the storage with a hard ceiling that fails silently. Every
// save now also writes a flat copy here, so the ruleset is readable outside the
// tool, survives a properties loss, and is joinable in Snowflake alongside the
// published plans.
//
// SNAPSHOT, not history: each write replaces the tab's contents, so what you
// read is always current. Signed off explicitly — this is the one place the
// no-automatic-deletion rule is waived, and only because these tabs are a
// derived mirror, never the record. The record is still Script Properties, and
// the audit log still says who saved when.
const SKU_LIB_MIRROR_TAB    = 'SKU Library';   // same spreadsheet
const LINE_CFG_MIRROR_TAB   = 'Line Config';   // same spreadsheet
// v0.4.84: rules were the third thing living only in Script Properties, and the
// one that decides behaviour nobody can see — greenBeltPackages, homeLines and
// lineSeeds are all in here, and none of them appear in any view. Key/value
// rather than one column per rule, so a new rule needs no schema change.
const RULES_MIRROR_TAB      = 'Sequencing Rules';
const RULES_MIRROR_HEADER   = ['Key','Value','UpdatedAt','UpdatedLocal','UpdatedBy'];
const SKU_LIB_MIRROR_HEADER = ['SKU','Active','Pending','Category','FcClass','PackageType','UnitsPerTote','UPM','OptimalHC','Allergens','LabelNumberVersion','LinesSunTh','LinesFriSat','FriSatOverride','UsdaPairedSku','Capper','NightShift','PreProcessed','UpdatedAt','UpdatedLocal','UpdatedBy'];
const LINE_CFG_MIRROR_HEADER = ['LineId','Label','Type','Room','HC','LineLead','Pool','StartTime','SandboxOnly','CapCapper','CapSmallCup','CapUsdaApproved','CapNight','Mon','Tue','Wed','Thu','Fri','Sat','Sun','UpdatedAt','UpdatedLocal','UpdatedBy'];
const DEMAND_ARCHIVE_TAB    = 'Demand Archive';  // same spreadsheet — see ARCHIVE OLD DEMAND
const DEMAND_STORE_TAB     = 'Demand Store';    // same spreadsheet — see DEMAND STORE below
const DEMAND_STORE_HEADER  = ['Week','Day','Payload','History','UpdatedAt'];
const STATE_STORE_TAB      = 'State Store';     // same spreadsheet — see STATE STORE below
const STATE_STORE_HEADER   = ['Name','Week','Day','Payload','UpdatedAt'];
// The date-keyed state that used to live in Script Properties. Anything keyed
// by week/day belongs here, not there — properties are for config sized by the
// menu and the staff list, never by the calendar.
const STATE_STORE_NAMES    = ['overrides','finishBy','breakOverrides','scenarios'];
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
  // A token in the URL routes to the external read-only page instead of the
  // app. That page is rendered server-side with the week's plans already
  // embedded — it makes no google.script.run calls at all. That matters:
  // opening web app access up to ANYONE makes every server function reachable
  // from this URL, and getState() is not role-gated. A page with no callbacks
  // has no reach back into Sequins, so the surface does not widen.
  const token = e && e.parameter ? String(e.parameter.token || '').trim() : '';
  if (token) {
    return HtmlService.createHtmlOutput(buildExternalViewPage_(token))
      .setTitle('Sequins ✨ — Assembly Plan')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Sequins ✨')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── EXTERNAL VIEWERS (v0.4.53) ──────────────────────────────────────
// People outside farmersfridge.com — the on-site USDA counterpart, for
// instance. Google returns no email for a non-domain account, so they cannot
// be identified the way every other role is; a token in the URL is the only
// mechanism available. The email on the record is the label, the audit trail
// and the revoke handle, not an authentication factor.
//
// A token is a URL. Anyone it is forwarded to has the same view, and nothing
// can tell them apart. That is why these are labelled, logged on every use,
// and revocable one at a time.
const EXTERNAL_LINK_KEY = 'sequins_external_link';

// One shared link, not one per person. The people who need it — the USDA
// inspectors on site — already receive the daily plan email, so the link rides
// in that email and they click through. Per-person tokens were the safer
// design on paper and the wrong one in practice: nobody is going to maintain a
// roster to hand out URLs.
//
// The trade is explicit: this link works for anyone who has it, and the audit
// log can only record that it was opened, never by whom. Regenerate kills the
// old one instantly; that is the only control, and it is enough because the
// page is read-only and shows a production schedule, not anything sensitive.
function getExternalLink_() {
  const raw = PropertiesService.getScriptProperties().getProperty(EXTERNAL_LINK_KEY);
  try { return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function getExternalLink() {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const rec = getExternalLink_();
  if (!rec || !rec.token) return { enabled: false };
  return { enabled: true, token: rec.token, url: getPublicWebAppUrl() + '?token=' + rec.token,
           createdBy: rec.createdBy || '', createdAt: rec.createdAt || '',
           uses: rec.uses || 0, lastSeenAt: rec.lastSeenAt || '' };
}
function regenerateExternalLink() {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  // Utilities.getUuid, not Math.random — this string is the only thing between
  // a URL and the plan.
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().split('-')[0];
  const rec = { token: token, createdBy: user.email, createdAt: new Date().toISOString(),
                uses: 0, lastSeenAt: '' };
  safeSetProperty_(EXTERNAL_LINK_KEY, JSON.stringify(rec));
  writeAuditLog_(user.email, 'external_link_new', '', '', 'previous link revoked');
  return { ok: true, token: token, url: getPublicWebAppUrl() + '?token=' + token };
}
function disableExternalLink() {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  safeSetProperty_(EXTERNAL_LINK_KEY, JSON.stringify({}));
  writeAuditLog_(user.email, 'external_link_off', '', '', 'external viewing turned off');
  return { ok: true };
}
// Returns true and records the hit, or false. An invalid token gets the same
// flat refusal regardless of why it failed.
function _resolveExternalToken_(token) {
  const t = String(token || '').trim();
  if (t.length < 20) return false;
  const rec = getExternalLink_();
  if (!rec || !rec.token || String(rec.token) !== t) return false;
  rec.uses = (rec.uses || 0) + 1;
  rec.lastSeenAt = new Date().toISOString();
  try { safeSetProperty_(EXTERNAL_LINK_KEY, JSON.stringify(rec)); } catch (e) {}
  try { writeAuditLog_('(external link)', 'external_view', '', '', 'plan opened'); } catch (e) {}
  return true;
}

function _extEsc_(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function _extClock_(m) {
  const v = Number(m);
  if (!isFinite(v)) return '—';
  let h = Math.floor(v / 60) % 24, mm = Math.round(v % 60);
  if (mm === 60) { mm = 0; h = (h + 1) % 24; }
  const ap = h >= 12 ? 'PM' : 'AM', h12 = (h % 12) || 12;
  return h12 + ':' + ('0' + mm).slice(-2) + ' ' + ap;
}
function buildExternalViewPage_(token) {
  if (!_resolveExternalToken_(token)) {
    return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<div style="font-family:system-ui,sans-serif;max-width:520px;margin:14vh auto;padding:0 24px;' +
      'text-align:center;color:#333"><div style="font-size:40px">🔒</div>' +
      '<h2 style="font-weight:600">This link is not valid</h2>' +
      '<p style="color:#666;line-height:1.6">It may have been revoked, or the address may be incomplete. ' +
      'Ask whoever sent it to issue a new one.</p></div>';
  }

  const wk = currentDemandWeek_();
  const days = [];
  if (wk) {
    ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(function(day) {
      let snap = null;
      try { snap = getPublishedPlan(wk.label, day); } catch (e) { snap = null; }
      if (!snap) return;
      const parsed = (typeof snap === 'string') ? JSON.parse(snap) : snap;
      if (!parsed || !parsed.lineState) return;
      const lines = [];
      (parsed.lines || []).forEach(function(line) {
        const ls = parsed.lineState[line.id];
        if (!ls || !(ls.slots || []).length) return;
        lines.push({
          label: line.label || line.id,
          start: _extClock_(ls.startMin),
          end: _extClock_((ls.startMin || 0) + (ls.totalMin || 0)),
          units: ls.totalUnits || 0,
          slots: (ls.slots || []).map(function(j) {
            return { sku: j.sku, qty: j.qty,
                     start: _extClock_(j.startClockMin), end: _extClock_(j.endClockMin),
                     usda: !!j.isUSDA,
                     label: j.labelVersion || '',
                     allergens: (j.allergenSet || []).join(', '),
                     unknown: !!j.allergenUnknown };
          }),
          breaks: (ls.breaks || []).map(function(b) {
            return { label: b.label, start: _extClock_(b.startClockMin), end: _extClock_(b.endClockMin) };
          })
        });
      });
      if (lines.length) days.push({ day: day, date: parsed.date || '', lines: lines });
    });
  }

  const payload = JSON.stringify({ week: wk ? wk.label : '', days: days })
    .replace(/</g, '\\u003c');   // never let plan text close the script tag

  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Sequins \u2728 \u2014 Assembly Plan</title><style>' +
    'body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f6f7f9;color:#1c1f23}' +
    '.wrap{max-width:1080px;margin:0 auto;padding:18px 16px 60px}' +
    'h1{font-size:17px;margin:0 0 2px}.sub{color:#6b7280;font-size:12px;margin-bottom:16px}' +
    '.days{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}' +
    '.day{border:1px solid #d7dae0;background:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;' +
    'font-size:13px;line-height:1.3;text-align:center;min-width:82px}' +
    '.day.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
    '.day small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.75}' +
    '.line{background:#fff;border:1px solid #e3e5e9;border-radius:10px;margin-bottom:14px;overflow:hidden}' +
    '.lh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 14px;' +
    'background:#f0f2f5;border-bottom:1px solid #e3e5e9;font-weight:600;font-size:14px;flex-wrap:wrap}' +
    '.lh span{font-weight:400;color:#6b7280;font-size:12px}' +
    'table{width:100%;border-collapse:collapse}td{padding:7px 14px;border-top:1px solid #eef0f3;font-size:13px;vertical-align:top}' +
    '.q{text-align:right;white-space:nowrap;color:#374151}.t{white-space:nowrap;color:#6b7280;font-size:12px}' +
    '.tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;background:#e0e7ff;color:#3730a3;margin-left:6px}' +
    '.al{color:#6b7280;font-size:11px;display:block;margin-top:2px}' +
    '.no{color:#b91c1c;font-size:11px;display:block;margin-top:2px;font-weight:600}' +
    '.br{background:#fffbeb;color:#92400e;font-size:12px}' +
    '.empty{background:#fff;border:1px dashed #d7dae0;border-radius:10px;padding:38px;text-align:center;color:#6b7280}' +
    '</style></head><body><div class="wrap">' +
    '<h1>Assembly Plan</h1>' +
    '<div class="sub">Read-only' + (wk ? ' \u00b7 ' + _extEsc_(wk.label) : '') +
    ' \u00b7 published plans only</div>' +
    '<div class="days" id="days"></div><div id="body"></div>' +
    '<div class="sub" style="margin-top:24px">Reload the page to pick up newly published days.</div>' +
    '</div><script>var D=' + payload + ';' +
    'function esc(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}' +
    'function draw(i){' +
    'var ds=document.getElementById("days"),b=document.getElementById("body");' +
    'ds.innerHTML=D.days.map(function(d,n){return \'<div class="day\'+(n===i?" on":"")+\'" onclick="draw(\'+n+\')">\'' +
    '+"<small>"+esc(d.day)+"</small>"+esc(d.date||"")+"</div>";}).join("");' +
    'if(!D.days.length){b.innerHTML=\'<div class="empty">No published plans for this week yet.</div>\';return;}' +
    'var d=D.days[i];b.innerHTML=d.lines.map(function(L){' +
    'var rows=L.slots.map(function(s){return "<tr><td>"+esc(s.sku)+(s.usda?\'<span class="tag">USDA</span>\':"")' +
    '+(s.unknown?\'<span class="no">NO ALLERGEN DATA</span>\':(s.allergens?\'<span class="al">\'+esc(s.allergens)+"</span>":""))+(s.label==="NO ACTIVE LABEL"?\'<span class="no">NO ACTIVE LABEL</span>\':(s.label?\'<span class="al">Label \'+esc(s.label)+"</span>":""))' +
    '+\'</td><td class="q">\'+Number(s.qty||0).toLocaleString()+\'</td><td class="t">\'+esc(s.start)+" \\u2013 "+esc(s.end)+"</td></tr>";}).join("");' +
    'var brs=(L.breaks||[]).map(function(x){return \'<tr class="br"><td>\'+esc(x.label)+\'</td><td class="q"></td><td class="t">\'+esc(x.start)+" \\u2013 "+esc(x.end)+"</td></tr>";}).join("");' +
    'return \'<div class="line"><div class="lh"><div>\'+esc(L.label)+"</div><span>"+esc(L.start)+" \\u2013 "+esc(L.end)' +
    '+" \\u00b7 "+Number(L.units||0).toLocaleString()+\' units</span></div><table>\'+rows+brs+"</table></div>";}).join("");}' +
    'draw(0);<\/script></body></html>';
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

// ─── DEMAND STORE ──────────────────────────────────────────────
// Demand is Sheet rows, not Script Properties. One row per week/day in the
// 'Demand Store' tab of the archive spreadsheet. There is no ceiling here,
// nothing to prune, and nothing to run on a schedule. Published plans made
// this same move and stopped being a source of failures the day they did.
function demandStoreSheet_() {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(DEMAND_STORE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(DEMAND_STORE_TAB);
    sheet.getRange(1, 1, 1, DEMAND_STORE_HEADER.length).setValues([DEMAND_STORE_HEADER]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Per-execution cache. getState() calls getAllDemand_ once and the fetch and
// publish paths call getDemandWeek_/getDemandDay_ repeatedly, so this is one
// getValues() per execution rather than one per lookup. Cleared on every write.
var DEMAND_STORE_CACHE_ = null;

function demandStoreRead_() {
  if (DEMAND_STORE_CACHE_) return DEMAND_STORE_CACHE_;
  const sheet = demandStoreSheet_();
  const last = sheet.getLastRow();
  const map = {};
  if (last > 1) {
    const vals = sheet.getRange(2, 1, last - 1, DEMAND_STORE_HEADER.length).getValues();
    for (let i = 0; i < vals.length; i++) {
      const wk = String(vals[i][0] || ''), day = String(vals[i][1] || '');
      if (!wk || !day) continue;
      map[demandStoreKey_(wk, day)] = { row: i + 2, payload: vals[i][2], history: vals[i][3] };
    }
  }
  DEMAND_STORE_CACHE_ = map;
  return map;
}

function demandStoreKey_(weekLabel, day) { return String(weekLabel) + '\u0000' + String(day); }

function demandStoreParse_(cell) {
  if (!cell) return null;
  try { return JSON.parse(cell); } catch (e) { return null; }
}

// Upsert one row. Returns the parsed-back payload so callers can verify.
function demandStoreWrite_(weekLabel, day, dayData, history) {
  const sheet = demandStoreSheet_();
  const map = demandStoreRead_();
  const k = demandStoreKey_(weekLabel, day);
  const row = [weekLabel, day, JSON.stringify(dayData), JSON.stringify(history || []), new Date().toISOString()];
  if (map[k]) sheet.getRange(map[k].row, 1, 1, row.length).setValues([row]);
  else        sheet.appendRow(row);
  DEMAND_STORE_CACHE_ = null;
  return true;
}

// Sheet first, legacy property second. The fallback is what makes this
// deployable before the migration has been run — a day that has not moved
// yet still reads correctly.
function getDemandDay_(weekLabel, day) {
  const hit = demandStoreRead_()[demandStoreKey_(weekLabel, day)];
  if (hit) {
    const parsed = demandStoreParse_(hit.payload);
    if (parsed) return parsed;
  }
  return getSection_(demandDayKey_(weekLabel, day));
}

function getDemandHistory_(weekLabel, day) {
  const hit = demandStoreRead_()[demandStoreKey_(weekLabel, day)];
  if (hit) return demandStoreParse_(hit.history) || [];
  return getSection_(demandHistoryKey_(weekLabel, day)) || [];
}

// ─── STATE STORE ───────────────────────────────────────────────
// overrides / finishBy / breakOverrides / scenarios. All four are [week][day]
// shaped and none was ever pruned, so in properties they only grew. One row
// per name/week/day here instead.
function stateStoreSheet_() {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(STATE_STORE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(STATE_STORE_TAB);
    sheet.getRange(1, 1, 1, STATE_STORE_HEADER.length).setValues([STATE_STORE_HEADER]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

var STATE_STORE_CACHE_ = null;

function stateStoreRead_() {
  if (STATE_STORE_CACHE_) return STATE_STORE_CACHE_;
  const sheet = stateStoreSheet_();
  const last = sheet.getLastRow();
  const map = {};
  if (last > 1) {
    const vals = sheet.getRange(2, 1, last - 1, STATE_STORE_HEADER.length).getValues();
    for (let i = 0; i < vals.length; i++) {
      const name = String(vals[i][0] || ''), wk = String(vals[i][1] || ''), day = String(vals[i][2] || '');
      if (!name || !wk || !day) continue;
      let payload = null;
      try { payload = JSON.parse(vals[i][3]); } catch (e) { continue; }
      if (!map[name]) map[name] = {};
      if (!map[name][wk]) map[name][wk] = {};
      map[name][wk][day] = { row: i + 2, payload: payload };
    }
  }
  STATE_STORE_CACHE_ = map;
  return map;
}

// Legacy property first, Sheet on top. Same fallback shape demand uses, so this
// is correct before, during and after migration.
function stateStoreGet_(name) {
  const out = {};
  const legacy = getSection_(STATE_KEYS[name]) || {};
  Object.keys(legacy).forEach(function(wk) {
    out[wk] = {};
    Object.keys(legacy[wk] || {}).forEach(function(d) { out[wk][d] = legacy[wk][d]; });
  });
  const rows = stateStoreRead_()[name] || {};
  Object.keys(rows).forEach(function(wk) {
    if (!out[wk]) out[wk] = {};
    Object.keys(rows[wk]).forEach(function(d) { out[wk][d] = rows[wk][d].payload; });
  });
  return out;
}

function stateStorePut_(name, weekLabel, day, payload) {
  const sheet = stateStoreSheet_();
  const hit = (stateStoreRead_()[name] || {})[weekLabel];
  const cell = hit && hit[day];
  const row = [name, weekLabel, day, JSON.stringify(payload), new Date().toISOString()];
  if (cell) sheet.getRange(cell.row, 1, 1, row.length).setValues([row]);
  else      sheet.appendRow(row);
  STATE_STORE_CACHE_ = null;
  try { touchLastModified_(); }
  catch (e) { Logger.log('lastModified bump failed after ' + name + ' write (non-fatal, data is in the Sheet): ' + e.message); }
}

function stateStoreDelete_(name, weekLabel, day) {
  const hit = (stateStoreRead_()[name] || {})[weekLabel];
  const cell = hit && hit[day];
  if (!cell) return false;
  stateStoreSheet_().deleteRow(cell.row);
  STATE_STORE_CACHE_ = null;
  return true;
}

function parseWeekLabel_(label) {
  const m = String(label || '').match(/Wk\s*(\d+)\s*\u00b7\s*(\d+)/);
  return m ? { wk: Number(m[1]), yr: Number(m[2]) } : null;
}

// Workbench overrides are kept for the current and upcoming weeks only. This is
// safe to drop rather than archive because writeSkuMoveLog_ has appended every
// single move to the 'SKU Moves' tab since day one, and published plans bake
// Overridden/OverrideBy into the archive rows — so the permanent record of what
// was moved and what shipped both survive. What is dropped is only the live pin
// for a week already in the past, which nothing re-renders.
// Runs as housekeeping inside a move the user just made. Never on a timer.
function pruneOverridesBeforeCurrentWeek_() {
  const cur = currentDemandWeek_();
  if (!cur) return 0;
  const cutoff = weekRank_(cur.wk, cur.yr);
  const rows = stateStoreRead_()['overrides'] || {};
  const doomed = [];
  Object.keys(rows).forEach(function(wk) {
    const parsed = parseWeekLabel_(wk);
    if (!parsed || weekRank_(parsed.wk, parsed.yr) >= cutoff) return;
    Object.keys(rows[wk]).forEach(function(d) { doomed.push({ row: rows[wk][d].row, label: wk + ' / ' + d }); });
  });
  if (!doomed.length) return 0;
  const sheet = stateStoreSheet_();
  // Bottom-up: deleting a row shifts every row beneath it.
  doomed.sort(function(a, b) { return b.row - a.row; });
  doomed.forEach(function(x) { sheet.deleteRow(x.row); });
  STATE_STORE_CACHE_ = null;
  Logger.log('Pruned ' + doomed.length + ' override row(s) older than ' + cur.label + ': ' +
             doomed.map(function(x) { return x.label; }).join(', '));
  return doomed.length;
}

// Union of what is in the Sheet and what is still in the legacy index, so
// the day list is complete mid-migration.
function demandIndex_() {
  const idx = {};
  const map = demandStoreRead_();
  Object.keys(map).forEach(function(k) {
    const parts = k.split('\u0000');
    if (!idx[parts[0]]) idx[parts[0]] = [];
    if (idx[parts[0]].indexOf(parts[1]) === -1) idx[parts[0]].push(parts[1]);
  });
  const legacy = getSection_(DEMAND_INDEX_KEY) || {};
  Object.keys(legacy).forEach(function(wk) {
    if (!idx[wk]) idx[wk] = [];
    (legacy[wk] || []).forEach(function(d) { if (idx[wk].indexOf(d) === -1) idx[wk].push(d); });
  });
  return idx;
}

// dayData is the live day (skus/mode/date/publishedBy/publishedAt), no
// embedded history. prevDay (optional) is the live day being replaced — if
// present, it's slimmed and pushed onto that day's history key, capped at 5.
function setDemandDay_(weekLabel, day, dayData, prevDay) {
  let hist = getDemandHistory_(weekLabel, day);
  if (prevDay) hist = [slimHistoryEntry_(prevDay)].concat(hist).slice(0, 5);
  demandStoreWrite_(weekLabel, day, dayData, hist);
  // Bumps sequins_meta so the client's 8-second poll notices. Deliberately
  // non-fatal: the demand is already committed to the Sheet, and a full
  // property store must never again be able to fail a demand write. If this
  // is the line that throws, the data is safe and the tab is one refresh
  // behind — which is a nuisance, not a data loss.
  try {
    touchLastModified_();
  } catch (e) {
    Logger.log('lastModified bump failed after demand write (non-fatal, data is in the Sheet): ' + e.message);
  }
}

// Returns { day: liveDayData } for a week — no history embedded, matching
// what the mode/date checks in publish/fetch functions actually need.
function getDemandWeek_(weekLabel) {
  const idx = demandIndex_();
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
  const idx = demandIndex_();
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
  // Sheet row first, then the legacy keys if this day never migrated.
  const hit = demandStoreRead_()[demandStoreKey_(weekLabel, day)];
  if (hit) {
    demandStoreSheet_().deleteRow(hit.row);
    DEMAND_STORE_CACHE_ = null;
  }
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
    overrides:       stateStoreGet_('overrides'),
    finishBy:        stateStoreGet_('finishBy'),
    publishedPlans:  {}, // v0.5.33: published plans now live in the archive Sheet, not Script Properties. Client lazy-loads per day via getPublishedPlan(). Kept as {} so nothing downstream breaks.
    planners:        getSection_(STATE_KEYS.planners) || [],
    breakOverrides:  stateStoreGet_('breakOverrides'),
    scenarios:       stateStoreGet_('scenarios'),
    planEmail:       planEmailAll_(),
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
// v0.4.105: the year in the label used to be new Date().getFullYear(), so every
// week was stamped with the CURRENT year whichever year it actually belonged to.
// Week 1 of next year came back as 'Wk 1 · 2026' and sat at the top of the
// dropdown above Wk 33 — and the label is the storage key everywhere in Sequins,
// so that was wrong data and not merely wrong order. Row 3 carries the real
// dates; the year now comes from those.
//
// Taken from the LAST day of the week, not the first and not the ISO week-year.
// This sheet numbers weeks by planning year: its Week 1 is the one containing
// Jan 1, which for 2027 runs Dec 28 - Jan 3. First-day would call that 2026. So
// would ISO, which counts it week 53 of 2026 because its Thursday is Dec 31 —
// right by the standard, wrong for this source. The last day lands in January in
// every straddling case, and any week that does not straddle New Year has all
// seven days in one year anyway.
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
    if (!weeks[wkNum]) weeks[wkNum] = { wkNum, days: [], last: null };
    weeks[wkNum].days.push(dayName);
    if (dateVal instanceof Date && (!weeks[wkNum].last || dateVal > weeks[wkNum].last)) {
      weeks[wkNum].last = dateVal;
    }
  });

  const thisYear = new Date().getFullYear();
  const out = Object.keys(weeks).map(k => {
    const w = weeks[k];
    const year = w.last ? w.last.getFullYear() : thisYear;
    if (w.days.length > 7) {
      Logger.log('fetchForecastWeeks: week ' + w.wkNum + ' has ' + w.days.length +
        ' day columns - the same week number may appear twice and they have been merged under ' + year);
    }
    return { label: 'Wk ' + w.wkNum + ' · ' + year, wkNum: w.wkNum, year, days: w.days };
  });
  return out.sort((a, b) => a.year - b.year || a.wkNum - b.wkNum);
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
// Stamped onto every day this importer writes. It is what separates a pushed
// day from a Demands 2025 actual now that both carry mode 'actual'.
const PUSHED_SOURCE     = 'assembly_summary';

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

// True when two per-SKU demand maps are the same set of SKUs at the same
// quantities. Order-independent; quantities compared as rounded numbers because
// the pushed side is rounded on read and the stored side may have been written
// by a different fetch.
function sameDemandSkus_(a, b) {
  a = a || {}; b = b || {};
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    const k = ka[i];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (Math.round(Number(a[k]) || 0) !== Math.round(Number(b[k]) || 0)) return false;
  }
  return true;
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

    if (existing && existing.mode === 'actual' && existing.source !== PUSHED_SOURCE) {
      // A Demands 2025 actual is the floor's own record and outranks a push.
      // A pushed day is itself stored as an actual now, so the test is the
      // SOURCE, not the mode — otherwise the first push would lock the day
      // against every push after it.
      items.push(Object.assign({}, item, { action: 'skip', reason: 'day already captured as a Demands 2025 actual' }));
    } else if (existing && dateStr < today) {
      // Past days are evidence. Nothing automatic reaches backwards.
      items.push(Object.assign({}, item, { action: 'skip', reason: 'past day already loaded — left alone' }));
    } else if (existing && sameDemandSkus_(existing.skus, pd.skus) &&
               existing.mode === 'actual' && existing.source === PUSHED_SOURCE) {
      // Idempotency is decided by the DATA, not by the PushedAt stamp. The stamp
      // only says a push happened; it says nothing about whether what is stored
      // matches it, so a mismatch could sit there reported as "already
      // imported" with the old numbers still on screen. Comparing the per-SKU
      // quantities converges instead: different means replace, and it stops
      // replacing the moment the two agree.
      // The mode/source test is part of "nothing to do", not decoration. A day
      // imported by an older build carries the same quantities but mode
      // 'forecast', and a quantities-only test skipped it as identical — which
      // left the badge stuck on forecast with no way to ever correct it. Any
      // stored day that does not already look like a pushed day gets rewritten
      // even when the numbers match.
      items.push(Object.assign({}, item, { action: 'skip', reason: 'identical to what is already loaded' }));
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
      mode: 'actual',             // v0.4.56 — see below
      date: item.date,
      publishedBy: user.email,
      publishedAt: new Date().toISOString(),
      pushedAt: pushed.pushedAt,  // which push produced this day
      source: PUSHED_SOURCE       // which fetch produced this day
    };
    // mode is 'actual' as of v0.4.56. The planner push IS the committed build
    // quantity, not a projection, and storing it as 'forecast' meant the floor
    // read a committed number wearing a forecast badge with nothing on the row
    // to say otherwise. Two consequences, both wanted: publishForecastWeek now
    // leaves these days alone (it skips actuals), so a Compiled Forecast pull
    // cannot walk back a pushed day; and publishActualDays still overwrites
    // freely, so the real Demands 2025 numbers replace this once the day has
    // actually run.
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

// ─── OBSERVED THROUGHPUT (v0.4.109) ───────────────────────────────
/**
 * Average units-per-minute per SKU, measured from the analytics team's Data Drop.
 *
 * Weighted, not a mean of means: total units / total minutes. A 3,000-unit run
 * and a 90-unit run are not equally informative about the rate a line holds, and
 * averaging their two UPMs would treat them as if they were.
 *
 * Window is the last `days` (default 90) counted back from today. A SKU with
 * less history than that simply contributes what it has - `days` is a ceiling,
 * not a requirement - so a SKU three weeks old still gets a number, with runs
 * and dayCount returned so the caller can see how thin it is.
 *
 * Rows carrying 'Units per Minute Flag' = Y are EXCLUDED. On the sample I could
 * read, flagged rows are a tenth of the data with a median rate near three times
 * the unflagged population, which reads as the analytics team marking anomalies.
 * That is inference, not documentation: `flagged` is returned per SKU so the
 * exclusion is visible, and if the team says Y means something else this is the
 * one line to change.
 */
function fetchObservedUpm(days) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  const window = Number(days) > 0 ? Number(days) : OBSERVED_UPM_DAYS;

  const sheet = SpreadsheetApp.openById(DATA_DROP_SHEET_ID).getSheetByName(DATA_DROP_TAB);
  if (!sheet) throw new Error('Tab "' + DATA_DROP_TAB + '" not found in the Data Drop workbook.');
  const lastRow = sheet.getLastRow(), lastCol = Math.min(sheet.getLastColumn(), 40);
  if (lastRow < 2) return { skus: {}, rows: 0, used: 0, window: window };

  const all = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const head = all[0].map(function(h) { return String(h || '').trim(); });
  const col = function(name) { return head.indexOf(name); };
  const iDate = col('Date'), iLine = col('Line'), iSku = col('Item Sku'),
        iStart = col('Second of Chicago Start Time'), iEnd = col('Second of Chicago End Time'),
        iUnits = col('Units Produced'), iFlag = col('Units per Minute Flag'),
        // Crew size per run. Present in the drop, which makes observed UPLH
        // possible alongside UPM - and UPLH is the number that actually compares
        // to Menu's optimal headcount.
        iPop = col('Line Population');
  if (iSku < 0 || iStart < 0 || iEnd < 0 || iUnits < 0) {
    throw new Error('Data Drop columns moved - expected Item Sku / start / end / Units Produced, got: ' + head.join(', '));
  }

  const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - window);

  // v0.4.111: day keys are built by arithmetic, not Utilities.formatDate, and
  // the timezone is read ONCE. The first cut called both — plus
  // Session.getScriptTimeZone() — inside a loop over ~10,800 rows, which is
  // roughly 21,000 Apps Script service calls and took minutes rather than
  // seconds. The cells already come out of the sheet in script time, so
  // reading their own components is both free and more correct than
  // re-formatting them through a timezone.
  const dayKey = function(ms) {
    const x = new Date(ms);
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
  };

  // Cells may arrive as Dates or as text depending on how the drop wrote them.
  const asTime = function(v) {
    if (v instanceof Date) return v.getTime();
    const t = Date.parse(String(v || ''));
    return isNaN(t) ? null : t;
  };

  const out = {};
  let used = 0, skippedFlag = 0, skippedTime = 0, skippedOld = 0;
  for (let r = 1; r < all.length; r++) {
    const row = all[r];
    // v0.4.111: raw uppercased name, NOT normalizeSku_. That helper strips every
    // non-alphanumeric character, so CHICKEN_CAESAR_SALAD becomes
    // CHICKENCAESARSALAD - which matches nothing, because the SKU Library is
    // keyed on name.toUpperCase() with the underscores intact. Keyed that way
    // the comparison showed a blank library UPM for every single SKU.
    const sku = String(row[iSku] || '').trim().toUpperCase();
    if (!sku) continue;

    const d = asTime(row[iDate]);
    if (d !== null && d < cutoff.getTime()) { skippedOld++; continue; }

    const units = parseFloat(String(row[iUnits] || '').replace(/,/g, ''));
    const a = asTime(row[iStart]), b = asTime(row[iEnd]);
    if (a === null || b === null || !isFinite(units) || units <= 0) { skippedTime++; continue; }
    let mins = (b - a) / 60000;
    if (mins < 0) mins += 1440;                 // run crossed midnight
    if (!(mins > 0) || mins > 720) { skippedTime++; continue; }   // 12h+ is not one run

    if (!out[sku]) out[sku] = { units: 0, minutes: 0, runs: 0, flagged: 0, days: {}, lines: {},
                                personMin: 0, popMin: 0, first: null, last: null };
    const o = out[sku];

    if (iFlag >= 0 && /^y$/i.test(String(row[iFlag] || '').trim())) { o.flagged++; skippedFlag++; continue; }

    o.units += units; o.minutes += mins; o.runs++;
    // Weighted by minutes, not a flat mean: a crew of 11 for two hours should
    // count for more than a crew of 8 for twenty minutes.
    if (iPop >= 0) {
      const pop = parseFloat(String(row[iPop] || '').replace(/,/g, ''));
      if (isFinite(pop) && pop > 0) { o.personMin += pop * mins; o.popMin += mins; }
    }
    if (iLine >= 0) o.lines[String(row[iLine] || '').trim()] = true;
    if (d !== null) {
      o.days[dayKey(d)] = true;
      if (o.first === null || d < o.first) o.first = d;
      if (o.last === null || d > o.last) o.last = d;
    }
    used++;
  }

  const skus = {};
  Object.keys(out).forEach(function(k) {
    const o = out[k];
    if (!(o.minutes > 0) || !o.runs) return;
    skus[k] = {
      upm: Math.round((o.units / o.minutes) * 10) / 10,
      hc:  o.popMin > 0 ? Math.round((o.personMin / o.popMin) * 10) / 10 : null,
      uplh: o.personMin > 0 ? Math.round(o.units / (o.personMin / 60)) : null,
      runs: o.runs, flagged: o.flagged,
      dayCount: Object.keys(o.days).length,
      lineCount: Object.keys(o.lines).length,
      units: Math.round(o.units),
      first: o.first ? dayKey(o.first) : '',
      last:  o.last  ? dayKey(o.last)  : ''
    };
  });

  Logger.log('fetchObservedUpm: ' + Object.keys(skus).length + ' SKUs from ' + used + ' runs in the last ' +
    window + ' days (skipped ' + skippedOld + ' older, ' + skippedFlag + ' flagged, ' + skippedTime + ' unusable times).');
  return { skus: skus, rows: all.length - 1, used: used, window: window,
           skippedFlag: skippedFlag, skippedTime: skippedTime, skippedOld: skippedOld };
}

// Writes the observed-vs-library comparison to its own tab so it can be shared
// with people who do not use Sequins. Cori: "can you grab me a comparison by SKU
// (in a spreadsheet) what we have in Sequins now and what the 90 day is... I want
// to show it to Samad & Matt before I just update the UPMs".
//
// Writes to the archive workbook, never to the Data Drop or any source sheet,
// and touches nothing in the SKU Library itself. Adopting a value stays a
// separate, human decision - this only lays the two numbers side by side.
const UPM_COMPARE_TAB = 'UPM Comparison';
// v0.4.112: three columns. The first cut wrote sixteen - delta, crew, UPLH,
// runs, days, lines, units, first seen, last seen, notes - and Cori's reaction
// to opening it was the correct one: "who is going to read all of this???"
// She asked for what Sequins has and what 90 days of production says, per SKU.
// This sheet exists to be put in front of two people who do not use the app, so
// anything they would have to skip past is working against it. The detail all
// still exists on screen in SKU Library for whoever wants it.
const UPM_COMPARE_HEADER = ['SKU', 'Sequins UPM', '90-Day Actual UPM'];

function exportUpmComparison(days) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');

  const obs = fetchObservedUpm(days);
  const lib = getSection_(STATE_KEYS.skuLibrary) || {};
  const libByNorm = {};
  Object.keys(lib).forEach(function(k) { libByNorm[normalizeSku_(k)] = k; });

  // Only SKUs with BOTH numbers. A row with one side blank is not a comparison,
  // and thirty of them buried the rows that are.
  //
  // What is left out is reported, but only for SKUs Sequins ACTUALLY SEQUENCES.
  // Cori, on the first cut: "You have a bunch of stuff you know we don't use in
  // Sequins and you're telling me there's no runs in the window -- I mean no
  // sh*t sherlock". Beverages and CPG never touch a line, so saying they had no
  // production is noise that hides the only version of that sentence worth
  // reading: an assembly SKU that should have run and did not. Same package
  // test the sequencer itself uses, and pending/inactive are excluded too.
  const sequenced = function(m) {
    return !!m && m.active !== false && !m.pending && !NON_ASSEMBLY_PACKAGE_RE.test(String(m.packageType || '').trim());
  };
  let noLibUpm = 0;
  const missing = [];
  const rows = [];
  Object.keys(obs.skus).sort().forEach(function(k) {
    let m = lib[k];
    if (!m) { const alt = libByNorm[normalizeSku_(k)]; if (alt) m = lib[alt]; }
    const cur = m ? parseFloat(m.upm) : NaN;
    if (!isFinite(cur) || cur <= 0) { noLibUpm++; return; }
    rows.push([k, Math.round(cur * 10) / 10, obs.skus[k].upm]);
  });
  const obsByNorm = {};
  Object.keys(obs.skus).forEach(function(k) { obsByNorm[normalizeSku_(k)] = true; });
  Object.keys(lib).sort().forEach(function(k) {
    if (!sequenced(lib[k])) return;
    if (obs.skus[k] || obsByNorm[normalizeSku_(k)]) return;
    missing.push(k);
  });

  writeConfigMirror_(UPM_COMPARE_TAB, UPM_COMPARE_HEADER, rows);
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  const sheet = ss.getSheetByName(UPM_COMPARE_TAB);

  Logger.log('exportUpmComparison: ' + rows.length + ' comparable SKUs; ' + missing.length +
    ' sequenced SKUs with no production in window' + (missing.length ? ' (' + missing.join(', ') + ')' : '') +
    '; ' + noLibUpm + ' with no UPM in Sequins.');
  return { ok: true, rows: rows.length, window: obs.window, used: obs.used,
           missing: missing, noLibUpm: noLibUpm,
           url: ss.getUrl() + '#gid=' + (sheet ? sheet.getSheetId() : '') };
}

// ─── SKU ATTRIBUTES (real sources — no guessing) ─────────────────────────────
// ─── DATA DROP HEALTH + WEEKLY UPM UPDATE (v0.4.113) ────────────────────────
// Samad signed off on adopting the 90-day average and refreshing it weekly.
// Cori: "I want to install a flag here tho - if for some reason we are not
// collecting data correctly from that spreadsheet I need Sequins to throw a flag
// at anyone with admin access who opens Sequins."
//
// That flag is the whole safety story. An automatic weekly write into the SKU
// Library is only safe while the thing it reads is healthy, and the failure that
// matters is SILENT: the drop stops arriving, the tab gets renamed, a column
// moves. Nothing breaks loudly — Sequins just keeps planning off an average that
// is quietly ageing. So the same check gates the weekly job AND warns admins.
const UPM_AUTO_KEY = 'sequins_upm_auto_status';        // one small bounded blob
const UPM_UPDATE_HEADER = ['At','By','SKU','Old UPM','New UPM','Runs','Days','Window Days'];
const DATA_DROP_MAX_AGE_DAYS = 3;   // it lands daily; 3 covers a weekend plus slack

function dataDropHealth() {
  const out = { ok: false, lastDate: '', ageDays: null, rows: 0, message: '' };
  let sheet;
  try { sheet = SpreadsheetApp.openById(DATA_DROP_SHEET_ID).getSheetByName(DATA_DROP_TAB); }
  catch (e) { out.message = 'Cannot open the Data Drop workbook — ' + e.message; return out; }
  if (!sheet) { out.message = 'Tab "' + DATA_DROP_TAB + '" is gone from the Data Drop workbook.'; return out; }

  const lastRow = sheet.getLastRow();
  out.rows = Math.max(0, lastRow - 1);
  if (lastRow < 2) { out.message = 'The Data Drop tab is empty.'; return out; }

  const head = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), 40)).getValues()[0]
                    .map(function(h) { return String(h || '').trim(); });
  const need = ['Date','Item Sku','Second of Chicago Start Time','Second of Chicago End Time','Units Produced'];
  const gone = need.filter(function(n) { return head.indexOf(n) < 0; });
  if (gone.length) { out.message = 'Data Drop columns moved or were renamed — missing: ' + gone.join(', '); return out; }

  // Newest date anywhere in the column, not just the last row: the drop appends,
  // but assuming order would let one stray row read as an all-clear.
  const dates = sheet.getRange(2, head.indexOf('Date') + 1, lastRow - 1, 1).getValues();
  let newest = null;
  for (let i = 0; i < dates.length; i++) {
    const v = dates[i][0];
    const t = (v instanceof Date) ? v.getTime() : Date.parse(String(v || ''));
    if (!isNaN(t) && (newest === null || t > newest)) newest = t;
  }
  if (newest === null) { out.message = 'No readable dates in the Data Drop.'; return out; }

  const d = new Date(newest);
  out.lastDate = d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
  const today = new Date(); today.setHours(0,0,0,0);
  out.ageDays = Math.round((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (out.ageDays > DATA_DROP_MAX_AGE_DAYS) {
    out.message = 'The Data Drop has not updated since ' + out.lastDate + ' (' + out.ageDays +
                  ' days ago). UPMs are no longer being refreshed from current production.';
    return out;
  }
  out.ok = true;
  return out;
}

// What the admin banner reads. Live health AND how the last weekly run went — a
// job that failed on Sunday is exactly as invisible as a feed that stopped.
function getUpmAutoStatus() {
  const user = getCurrentUser();
  if (!user.isAdmin) return { admin: false };
  let last = null;
  try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty(UPM_AUTO_KEY) || 'null'); } catch (e) {}
  // Ensuring it here means an admin opening Sequins is enough to heal it.
  const trig = ensureWeeklyUpmTrigger_();
  return { admin: true, health: dataDropHealth(), last: last,
           weeklyOn: trig.ok, triggerError: trig.ok ? '' : trig.error };
}

// Internal so the trigger can run without a user session. actor is recorded
// either way, so the audit log tells a person apart from the weekly job.
function applyObservedUpm_(days, actor) {
  const health = dataDropHealth();
  const stamp = { at: new Date().toISOString(), actor: actor, ok: false, changed: 0, checked: 0, message: '' };
  if (!health.ok) {
    // Refuse rather than write an average built on a feed already known to be bad.
    stamp.message = 'Skipped — ' + health.message;
    PropertiesService.getScriptProperties().setProperty(UPM_AUTO_KEY, JSON.stringify(stamp));
    Logger.log('applyObservedUpm_: ' + stamp.message);
    return { ok: false, changed: 0, checked: 0, message: stamp.message, health: health };
  }

  const obs = fetchObservedUpm(days);
  const lib = getSection_(STATE_KEYS.skuLibrary) || {};
  const libByNorm = {};
  Object.keys(lib).forEach(function(k) { libByNorm[normalizeSku_(k)] = k; });

  const changes = [];
  Object.keys(obs.skus).forEach(function(k) {
    const key = lib[k] ? k : libByNorm[normalizeSku_(k)];
    if (!key) return;
    const m = lib[key];
    if (!m || m.active === false || m.pending) return;
    if (NON_ASSEMBLY_PACKAGE_RE.test(String(m.packageType || '').trim())) return;
    const before = parseFloat(m.upm), after = obs.skus[k].upm;
    if (!isFinite(after) || after <= 0) return;
    if (isFinite(before) && Math.round(before * 10) === Math.round(after * 10)) return;
    m.upm = after;
    changes.push([new Date().toISOString(), actor, key, isFinite(before) ? before : '', after,
                  obs.skus[k].runs, obs.skus[k].dayCount, obs.window]);
  });

  if (changes.length) {
    setSection_(STATE_KEYS.skuLibrary, lib);
    mirrorConfigSafely_('sku', lib, actor);
    // Append-only history, so a week that moved something the wrong way can be
    // found and reversed rather than merely noticed.
    const tab = runSheetTab_('UPM Updates', UPM_UPDATE_HEADER);
    tab.getRange(tab.getLastRow() + 1, 1, changes.length, UPM_UPDATE_HEADER.length).setValues(changes);
  }

  stamp.ok = true; stamp.changed = changes.length; stamp.checked = Object.keys(obs.skus).length;
  stamp.message = changes.length + ' UPM(s) updated from ' + obs.used + ' runs over ' + obs.window + ' days.';
  PropertiesService.getScriptProperties().setProperty(UPM_AUTO_KEY, JSON.stringify(stamp));
  writeAuditLog_(actor, 'apply_observed_upm', '', '', stamp.message);
  Logger.log('applyObservedUpm_: ' + stamp.message);
  return { ok: true, changed: changes.length, checked: stamp.checked, message: stamp.message, health: health };
}

// ─── DATA DROP ANALYSIS (v0.4.122) ──────────────────────────────────────────
// One read, several questions. The drop is ~10,900 rows and getValues on it is
// the expensive part, so the parse happens once and each analysis consumes the
// same array. Doing otherwise meant reading the sheet twice in a single call.
const CAPPER_LINE = 'LINE-6';

function readDataDropRuns_() {
  const sheet = SpreadsheetApp.openById(DATA_DROP_SHEET_ID).getSheetByName(DATA_DROP_TAB);
  if (!sheet) throw new Error('Tab "' + DATA_DROP_TAB + '" not found.');
  const lastRow = sheet.getLastRow(), lastCol = Math.min(sheet.getLastColumn(), 40);
  if (lastRow < 2) return [];

  const all = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const head = all[0].map(function(h) { return String(h || '').trim(); });
  const iDate = head.indexOf('Date'), iLine = head.indexOf('Line'), iSku = head.indexOf('Item Sku'),
        iStart = head.indexOf('Second of Chicago Start Time'), iEnd = head.indexOf('Second of Chicago End Time'),
        iUnits = head.indexOf('Units Produced'), iFlag = head.indexOf('Units per Minute Flag'),
        iPop = head.indexOf('Line Population');
  if (iSku < 0 || iStart < 0 || iEnd < 0 || iUnits < 0 || iDate < 0) throw new Error('Data Drop columns moved.');

  const asTime = function(v) {
    if (v instanceof Date) return v.getTime();
    const t = Date.parse(String(v || '')); return isNaN(t) ? null : t;
  };

  const runs = [];
  for (let r = 1; r < all.length; r++) {
    const row = all[r];
    const sku = String(row[iSku] || '').trim().toUpperCase();
    if (!sku) continue;
    if (iFlag >= 0 && /^y$/i.test(String(row[iFlag] || '').trim())) continue;   // flagged as anomalous
    const d = asTime(row[iDate]); if (d === null) continue;
    const units = parseFloat(String(row[iUnits] || '').replace(/,/g, ''));
    const a = asTime(row[iStart]), b = asTime(row[iEnd]);
    if (a === null || b === null || !isFinite(units) || units <= 0) continue;
    let mins = (b - a) / 60000;
    if (mins < 0) mins += 1440;
    if (!(mins > 0) || mins > 720) continue;
    const pop = iPop >= 0 ? parseFloat(String(row[iPop] || '').replace(/,/g, '')) : NaN;
    runs.push({ d: d, sku: sku, line: String(row[iLine] || '').trim().toUpperCase(),
                units: units, mins: mins, pop: isFinite(pop) && pop > 0 ? pop : 0 });
  }
  return runs;
}

function bucket_() { return { u: 0, m: 0, pm: 0, days: {} }; }
function addRun_(b, r) {
  b.u += r.units; b.m += r.mins; if (r.pop) b.pm += r.pop * r.mins;
  const dt = new Date(r.d);
  b.days[dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate()] = true;
}
function finish_(b) {
  const dc = Object.keys(b.days).length;
  if (!(b.m > 0) || !dc) return null;
  return { upm: Math.round(b.u / b.m * 10) / 10,
           uplh: b.pm > 0 ? Math.round(b.u / (b.pm / 60)) : null,
           days: dc,
           // Units per week from production DAYS, not calendar weeks: a SKU running
           // three days a week and one running seven are not comparable on
           // calendar time.
           perWeek: Math.round(b.u * 7 / dc) };
}

// A quarter against the previous quarter: the last 90 days versus the 90 before
// them. `days` is the length of ONE quarter, so the span read is twice that.
function upmHalvesFrom_(runs, window) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = today.getTime() - 2 * window * 86400000;
  const mid   = today.getTime() - window * 86400000;
  const out = {};
  runs.forEach(function(r) {
    if (r.d < start) return;
    const half = (r.d < mid) ? 'early' : 'late';
    if (!out[r.sku]) out[r.sku] = { early: bucket_(), late: bucket_() };
    addRun_(out[r.sku][half], r);
  });
  const skus = {};
  Object.keys(out).forEach(function(k) {
    skus[k] = { early: finish_(out[k].early), late: finish_(out[k].late) };
  });
  return skus;
}

// Capper recipes, last 90 days, as they are. Cori: "this isn't making any sense.
// Let's reboot this and just report last 90 days of capper recipes data instead."
//
// The before/after version is gone rather than patched. It rested on a move date
// INFERRED from the first run on LINE-6, and the Data Drop cannot confirm that —
// it records which line ran, not whether the capper was running on it. Two
// rounds of fixes made the arithmetic right and left the foundation guessed,
// which is the wrong thing to keep polishing.
//
// This reports measurements instead: what each capper recipe actually did over
// the window. Nothing here depends on knowing when anything moved.
function capperLast90From_(runs, window) {
  const lib = getSection_(STATE_KEYS.skuLibrary) || {};
  const libByNorm = {};
  Object.keys(lib).forEach(function(k) { libByNorm[normalizeSku_(k)] = k; });
  const isCapperSku = function(sku) {
    let m = lib[sku];
    if (!m) { const alt = libByNorm[normalizeSku_(sku)]; if (alt) m = lib[alt]; }
    return !!(m && m.capper);
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = today.getTime() - window * 86400000;

  const out = {};
  runs.forEach(function(r) {
    if (r.d < start) return;
    if (!isCapperSku(r.sku)) return;
    if (!out[r.sku]) out[r.sku] = { onLine6: bucket_(), offLine6: bucket_() };
    const o = out[r.sku];
    if (r.line === CAPPER_LINE) addRun_(o.onLine6, r);
    else addRun_(o.offLine6, r);
  });

  const rows = [];
  Object.keys(out).sort().forEach(function(k) {
    const o = out[k];
    const on = finish_(o.onLine6), off = finish_(o.offLine6);
    if (!on && !off) return;
    rows.push({ sku: k,
                // LINE-6, not 'the capper'. Cori, twice: "just because it runs on
                // line 6 doesn't mean the capper ran". The drop records the line and
                // nothing about whether the machine was in use, so the field names
                // say line. A share-of-runs-on-the-capper figure was the same claim
                // in percentage form and is gone.
                l6Upm:    on  ? on.upm  : null,  l6Uplh:    on  ? on.uplh  : null,  l6Days:    on  ? on.days  : 0,
                otherUpm: off ? off.upm : null,  otherUplh: off ? off.uplh : null,  otherDays: off ? off.days : 0,
                perWeek: (on ? on.perWeek : 0) + (off ? off.perWeek : 0) });
  });
  return rows;
}

function getUpmMovers(days) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  const w = Number(days) > 0 ? Number(days) : OBSERVED_UPM_DAYS;
  const runs = readDataDropRuns_();

  const halves = upmHalvesFrom_(runs, w);
  const moved = [];
  Object.keys(halves).forEach(function(k) {
    const a = halves[k].early, b = halves[k].late;
    if (!a || !b || !(a.upm > 0)) return;
    // Volume rides along because it is usually the explanation. A rate that fell
    // because the runs got shorter is not a line that got slower.
    moved.push({ sku: k, from: a.upm, to: b.upm, pct: Math.round((b.upm - a.upm) / a.upm * 100),
                 fromWk: a.perWeek, toWk: b.perWeek, fromDays: a.days, toDays: b.days,
                 fromUplh: a.uplh, toUplh: b.uplh });
  });
  moved.sort(function(x, y) { return y.pct - x.pct; });

  const capper = capperLast90From_(runs, w);
  return { window: w, compared: moved.length,
           up: moved.filter(function(m) { return m.pct > 0; }).slice(0, 5),
           down: moved.filter(function(m) { return m.pct < 0; }).reverse().slice(0, 5),
           capper: capper, capperCount: capper.length,
           note: moved.length ? '' : 'Not enough production in both quarters to compare.' };
}
function applyObservedUpm(days) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  return applyObservedUpm_(days || OBSERVED_UPM_DAYS, user.email);
}

// Trigger entry point. Trivial on purpose — everything it needs in order to
// refuse lives inside applyObservedUpm_.
function weeklyUpmUpdate() { applyObservedUpm_(OBSERVED_UPM_DAYS, 'weekly trigger'); }

// v0.4.115: no switch. Cori: "I don't really want to turn it on and off tho -
// can we just make it run by itself without a check box?" So the trigger installs
// itself and re-installs itself if it ever goes missing.
//
// The checkbox never worked anyway, and the reason is worth recording: creating a
// trigger needs the script.scriptapp OAuth scope, which was NOT in appsscript.json
// — this project's other triggers were all installed by hand from the Apps Script
// editor, where that permission is granted interactively. From the web app the
// call simply failed, and getUpmAutoStatus swallowed it and reported 'off', so
// the box unticked itself every time. The scope is in the manifest now.
//
// Idempotent and quiet: called on every admin load, creates nothing if a trigger
// is already there, and never throws into the caller — a missing permission must
// not take the health banner down with it.
function ensureWeeklyUpmTrigger_() {
  try {
    const has = ScriptApp.getProjectTriggers().some(function(t) {
      return t.getHandlerFunction() === 'weeklyUpmUpdate';
    });
    if (has) return { ok: true, installed: false };
    // Sunday early morning: the week's production has landed, and nobody has yet
    // opened the app on Monday to plan against it.
    ScriptApp.newTrigger('weeklyUpmUpdate').timeBased()
      .onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(4).create();
    Logger.log('ensureWeeklyUpmTrigger_: installed the weekly UPM trigger.');
    return { ok: true, installed: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

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


// ─── RUN SHEET ACTUALS (v0.4.59) ─────────────────────────────────────────────
/**
 * Where the floor's entries land. Two tabs in the plan archive, alongside
 * Published Plans, because that spreadsheet is already the fact table for the
 * Snowflake/Hex planned-vs-actual work and actuals belong next to the plan
 * they're measured against.
 *
 *   Run Sheet Actuals — one row per SKU, per line, per day.
 *   Run Sheet Shift   — one row per line, per day (who ran it, held-over totes).
 *
 * Both carry the PLANNED figures next to the actual ones. That's deliberate
 * denormalization: the plan can be republished under a day, and an actual that
 * only stored "1,125 units" would silently start being measured against a
 * different plan. Freezing the planned value on the row makes the variance a
 * subtraction between two columns rather than a join back to a moving target.
 *
 * Upsert, not append. A line lead editing a start time six times over a shift
 * should leave one row, not six. The natural keys are Date+Line+SKU and
 * Date+Line respectively.
 *
 * Nothing here deletes. Clearing a field on the tablet writes an empty cell and
 * the row stays — a blank is a fact about what was recorded, and reclaiming the
 * row would destroy the rest of it.
 */
const RUN_ACTUALS_HEADER = ['UpdatedAt','UpdatedBy','Week','Day','Date','Room','Line','LineLabel','SeqPos','SKU',
                            'PlannedUnits','PlannedFullTotes','PlannedPartialUnits','LabelVersion',
                            'ActualStart','ActualEnd','ActualPeople','ActualUnits',
                            'ActualFullTotes','ActualPartialUnits',
                            // v0.4.108. Appended rather than filed with the other Planned
                            // columns on purpose: inserting mid-header would shift every
                            // column of any row already written. Order is cosmetic, an
                            // off-by-one in a floor record is not.
                            'PlannedPeople'];
const RUN_SHIFT_HEADER   = ['UpdatedAt','UpdatedBy','Week','Day','Date','Room','Line','LineLabel','LineLeadName','HeldOverTotes'];

function runSheetTab_(name, header) {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.setFrozenRows(1);
    Logger.log('runSheetTab_: created "' + name + '".');
    return sheet;
  }
  // v0.4.108: a tab created before a column was added still carries the old,
  // narrower header, and runSheetUpsert_ reads and writes header.length columns
  // — so it would throw the moment the header grew. Widen and restamp row 1.
  // EXTEND ONLY: columns are appended, never reordered, so existing data keeps
  // its positions and no cell is rewritten.
  if (sheet.getMaxColumns() < header.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), header.length - sheet.getMaxColumns());
  }
  const cur = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  const same = header.every(function(h, i) { return String(cur[i] || '') === h; });
  if (!same) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    Logger.log('runSheetTab_: header on "' + name + '" widened to ' + header.length + ' columns.');
  }
  return sheet;
}

// Shared upsert. keyCols are 0-based indices whose combined value identifies a
// row. Writes are batched — one setValues per changed row, one appendRow-free
// block write for new rows — per the no-setValue house rule.
function runSheetUpsert_(sheet, header, rows, keyCols) {
  if (!rows.length) return { updated: 0, added: 0 };
  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, header.length).getValues() : [];
  const index = {};
  existing.forEach(function(r, i) {
    index[keyCols.map(function(c) { return String(r[c] || '').trim().toUpperCase(); }).join('\u0001')] = i;
  });

  const appends = [];
  let updated = 0;
  rows.forEach(function(row) {
    const key = keyCols.map(function(c) { return String(row[c] || '').trim().toUpperCase(); }).join('\u0001');
    if (index.hasOwnProperty(key)) {
      sheet.getRange(index[key] + 2, 1, 1, header.length).setValues([row]);
      updated++;
    } else {
      appends.push(row);
      index[key] = existing.length + appends.length - 1;
    }
  });
  if (appends.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, header.length).setValues(appends);
  }
  return { updated: updated, added: appends.length };
}

/**
 * Called from My Line. payload:
 *   { week, day, date, room, line, lineLabel, leadName, heldOverTotes,
 *     rows:[{ seqPos, sku, plannedUnits, plannedFullTotes, plannedPartialUnits,
 *              labelVersion, start, end, people, units }] }
 *
 * Floor viewers and admins only. A planner with no floor role has no business
 * recording what a line actually did.
 */
function saveRunSheetActuals(payload) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isFloorViewer) throw new Error('Not authorized');
  if (!payload || !payload.date || !payload.line) throw new Error('Missing date or line');

  const now  = new Date().toISOString();
  const week = payload.week || '';
  const day  = payload.day || '';
  const date = String(payload.date);
  const line = String(payload.line);
  const room = payload.room || '';
  const lbl  = payload.lineLabel || line;

  const shiftRow = [now, user.email, week, day, date, room, line, lbl,
                    payload.leadName || '', payload.heldOverTotes || ''];
  runSheetUpsert_(runSheetTab_(RUN_SHIFT_TAB, RUN_SHIFT_HEADER), RUN_SHIFT_HEADER, [shiftRow], [4, 6]);

  const rows = (payload.rows || []).map(function(r) {
    return [now, user.email, week, day, date, room, line, lbl,
            r.seqPos || '', String(r.sku || ''),
            r.plannedUnits || '', r.plannedFullTotes === null || r.plannedFullTotes === undefined ? '' : r.plannedFullTotes,
            r.plannedPartialUnits === null || r.plannedPartialUnits === undefined ? '' : r.plannedPartialUnits,
            r.labelVersion || '',
            r.start || '', r.end || '', r.people || '', r.units || '',
            '', '',   // ActualFullTotes / ActualPartialUnits — reserved, see header
            r.plannedPeople === undefined || r.plannedPeople === null ? '' : r.plannedPeople];
  });
  const res = rows.length
    ? runSheetUpsert_(runSheetTab_(RUN_ACTUALS_TAB, RUN_ACTUALS_HEADER), RUN_ACTUALS_HEADER, rows, [4, 6, 9])
    : { updated: 0, added: 0 };

  Logger.log('saveRunSheetActuals: ' + date + ' ' + line + ' — ' + res.updated + ' updated, ' + res.added + ' added, by ' + user.email);
  return { ok: true, updated: res.updated, added: res.added, savedAt: now };
}

/** Reads back what's already recorded, so a tablet reopened mid-shift shows it. */
function getRunSheetActuals(date, line) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isFloorViewer) throw new Error('Not authorized');
  const out = { rows: {}, leadName: '', heldOverTotes: '' };
  const d = String(date || '').trim().toUpperCase(), l = String(line || '').trim().toUpperCase();
  if (!d || !l) return out;

  const sh = runSheetTab_(RUN_SHIFT_TAB, RUN_SHIFT_HEADER);
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, RUN_SHIFT_HEADER.length).getValues().forEach(function(r) {
      if (String(r[4]).trim().toUpperCase() === d && String(r[6]).trim().toUpperCase() === l) {
        out.leadName = r[8] || ''; out.heldOverTotes = r[9] === 0 ? '0' : (r[9] || '');
      }
    });
  }
  const sa = runSheetTab_(RUN_ACTUALS_TAB, RUN_ACTUALS_HEADER);
  if (sa.getLastRow() > 1) {
    sa.getRange(2, 1, sa.getLastRow() - 1, RUN_ACTUALS_HEADER.length).getValues().forEach(function(r) {
      if (String(r[4]).trim().toUpperCase() !== d || String(r[6]).trim().toUpperCase() !== l) return;
      out.rows[String(r[9]).toUpperCase()] = {
        start: r[14] || '', end: r[15] || '',
        people: r[16] === 0 ? '0' : (r[16] || ''), units: r[17] === 0 ? '0' : (r[17] || '')
      };
    });
  }
  return out;
}

function saveSkuLibrary(library) {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  setSection_(STATE_KEYS.skuLibrary, library);
  const mirrorErr = mirrorConfigSafely_('sku', library, user.email);
  return { ok: true, mirror: mirrorErr };
}

// ─── UNITS PER TOTE (ported out of Assembly Sequencing 2.0) ──────────────────
/**
 * The tote count the floor reads off the legacy "New Assembly Run Sheet".
 * Ported here as data rather than fetched, because the 2.0 workbook is being
 * retired and the SKU Library is the tool's own source of truth for SKU facts.
 *
 * Tote size is per-SKU and cannot be derived from packageType — the same
 * package carries different counts (Wrap Box 28/32/54, 4oz Jar 140/162,
 * 16oz Jar 24/48, 32oz 12/18/23), which is exactly why it needs its own field.
 *
 * Lifted from that workbook's static "Pkging Types" tab (col A / col C) and
 * cross-checked against the 8/17 run sheet: every SKU running that day
 * reproduces its printed # Full Totes and # Units in Partial Tote exactly.
 */
const UNITS_PER_TOTE_SEED = {
  ALFREDO_CHIX_PROTEIN_BOWL:23, ALMOND_BUTTER_OATMEAL:48, APPLE_CINNAMON_OATS:48,
  APPLE_PECAN_CHICKEN_SALAD:23, APPLE_PECAN_SALAD:23, ASIAN_CHOPPED_SALAD:23,
  BACON_SANDWICH_BREAKFAST:54, BAJA_BOWL:48, BAJA_BOWL_042026:48, BAJA_CHICKEN_WRAP_202209:54,
  BBQ_CHIX_PROTEIN_BOWL:23, BBQ_RANCH_SALAD:23, BERRY_GRANOLA_YOGURT:48,
  BEYOND_BREAKFAST_BOWL:48, BILL_KIM_BOWL:48, BLACKENED_CHICKEN:140, BLUEBERRY_CHIA_OATS:48,
  BRAISED_CHICKEN_HEAT:24, BUFFALO_CHICKEN_SALAD:23, BUFFALO_MAC_HEAT:24,
  BURRATA_CAPRESE_SALAD:23, BURRITO_BOWL:48, BURRITO_BOWL_202501:48,
  BURRITO_CHIX_PROTEIN_BOWL:23, BUTTERNUT_FARRO_BOWL:48, CAPRESE_SALAD:23,
  CAPRESE_SALAD_202305:23, CAULI_SHAWARMA_SALAD:23, CHEDDAR_CHEESE:140, CHICKEN_BACON_SALAD:23,
  CHICKEN_CAESAR_SALAD:23, CHICKEN_CAPRESE_BOWL:24, CHICKEN_DUMPLING_HEAT:48,
  CHICKEN_MIXED_GREENS_SALAD:23, CHICKEN_SALAD_WRAP_TWO:32, CHICKEN_TIKKA_HEAT:48,
  CHILE_LIME_CAESAR_SALAD:23, CHILI_BRAISED_PORK:48, CHIMICHURRI_STEAK_BOWL_202601:23,
  CHIMICHURRI_STEAK_PROTEIN_BOWL:23, CHIPOTLE_TURKEY_SANDWICH_202501:36,
  CHIPOTLE_TURKEY_SANDWICH_FULL:32, CHIPS_GUAC:28, CHIX_BREAKFAST_BOWL:48,
  CHIX_CLUB_SANDWICH:36, CHOCOLATE_CHIA_PUDDING:48, CHOCOLATE_CHIA_PUDDING_072023:48,
  CHOCOLATE_PRETZELS:140, CHOCOLATE_TRAIL_MIX:140, CHOCOLATE_TRAIL_MIX_BIG:48,
  CLASSIC_CHIX_SALAD_BOWL:48, COOKIE_DOUGH_BITES:140, COOKIE_DOUGH_BITES_BIG:48,
  COSTCO_APPLE_PECAN_SALAD:12, COSTCO_BAJA_BOWL:12, COSTCO_BERRY_YOGURT_1OF2:36,
  COSTCO_CAPRESE_PASTA_BOWL:12, COSTCO_CAPRESE_SALAD:12, COSTCO_DILL_PICKLE_SALAD:12,
  COSTCO_GREEN_GODDESS_SALAD:12, COSTCO_HARVEST_GRAIN_BOWL:12, COSTCO_MEDITERRANEAN_SALAD:18,
  COSTCO_MEDITERRANEAN_SALAD_1OF2:18, COSTCO_MEX_STREET_CORN_SALAD:12,
  COSTCO_NORTH_NAPA_SALAD:12, COSTCO_PINEAPPLE_CHIA_1OF2:36, COSTCO_SOUTHWEST_SALAD:12,
  COSTCO_SW_RANCH_SALAD:12, COSTCO_TRUFFLE_COUSCOUS:12, COSTCO_USDA_CHIX_CAESAR_SALAD:12,
  COSTCO_USDA_SW_CHILI_CHIX_SALAD:18, CPK_BBQ_SALAD:23, CRUNCHY_THAI_BOWL:48,
  DILL_PICKLE_SALAD:23, ELIS_CHEESECAKE_CUP:140, ELOTE_SALAD:23, ELOTE_SALAD_202201:23,
  ENCHILADA_ROJA_BOWL:48, ENCHILADA_ROJA_HEAT:24, FAJITA_GROATS_BOWL:48, FALAFEL_BITES:140,
  FALAFEL_BOWL:48, FRUIT_CUP:48, FUJI_APPLE_CHIX_SALAD:23, GREEK_SALAD_202510:23,
  GREEK_SALAD_NEW:23, GREEN_GODDESS_SALAD:23, GRILLED_CHICKEN:140, GRILLED_CHICKEN_BIG:48,
  GRILLED_CHIX_VEG_BOWL:48, HAM_SANDWICH:36, HAM_SANDWICH_RETAIL:27, HARD_BOILED_EGGS:162,
  HARVEST_GRAIN_BOWL:24, HARVEST_SALAD:23, HONG_KONG_BOWL:48, HP_GRILLED_CHIX_VEG_BOWL:23,
  HUEVOS_RANCHEROS_BOWL:48, ITALIAN_CHOPPED_SALAD:23, ITALIAN_CHOPPED_SALAD_202209:23,
  ITALIAN_WRAP:54, ITALIAN_WRAP_202502:54, KIMCHI_BOWL:48, LARGE_GRILLED_CHICKEN:79,
  MEDI_BOWL:48, MEDI_CHIX_PROTEIN_BOWL:23, MEXICAN_CAESAR_SALAD:23, NAPA_CHICKPEA_WRAP:54,
  NORTH_NAPA_SALAD:23, PECAN_PIE_BITES:140, PERSIAN_GODDESS_SALAD:23,
  PESTO_CHICKEN_SALAD_SANDWICH:36, PESTO_CHICKEN_SALAD_WRAP:54, PESTO_CHICKEN_WRAP:54,
  PESTO_CHIX_PROTEIN_BOWL_MOZZ:23, PESTO_CHIX_PROTEIN_BOWL_PARM:23, PESTO_PASTA_BOWL:48,
  PESTO_PASTA_SAMPLE:48, PESTO_TURKEY_WRAP:54, PINEAPPLE_CHIA_BIG:48,
  PINEAPPLE_CHIA_PUDDING:162, PROTEIN_CHIX_COBB_SALAD:23, PROTEIN_TURKEY_WRAP:54,
  SAUSAGE_BURRITO_BREAKFAST:54, SESAME_GINGER_CHOPPED_SALAD:23, SHAWARMA_CHIX_PROTEIN_BOWL:23,
  SIDE_SALAD:32, SMOKED_CHEDDAR_COBB:23, SNACK_BOX_CHARCUTERIE:36, SNACK_BOX_MEDITERRANEAN:36,
  SONOMA_SALAD:23, SONOMA_SALAD_VALUE:24, SOUTHWEST_CHIX_SALAD:23, SOUTHWEST_SALAD:23,
  STEAKHOUSE_CHOPPED_SALAD:23, STEAK_CUP:140, STEAK_SOUTHWEST_SALAD:23,
  STRAWBERRY_CREAM_CHIA:48, STRAWBERRY_SALAD:23, SW_CHIPOTLE_SALAD:23, SW_RANCH_VALUE:24,
  TACO_CHIX_PROTEIN_BOWL:23, THAI_CRUNCH_SALAD:23, THAI_NOODLE_BOWL:48, TRUFFLE_COUSCOUS:48,
  TRUFFLE_COUSCOUS_202201:24, TRUFFLE_COUSCOUS_202309:48, TURKEY_APPLE_WRAP:54,
  TURKEY_CLUB_SANDWICH:36, TURKEY_COBB_SALAD:23, TURKEY_COBB_SALAD_202501:23,
  TURKEY_HARVEST_BOWL:24, TURKEY_SANDWICH:36, TURKEY_SANDWICH_RETAIL:27,
  TURKEY_SANDWICH_VALUE:36, TUSCAN_ROTINI_SAUSAGE:48, TUSCN_CHIX_SANDWICH:36,
  USDA_BAJA_CHIC_WRAP:54, USDA_CAESAR_CHIC_SALAD:23, USDA_CHEF_SALAD_TURKEY:23,
  USDA_CHICKEN_BACON_SALAD:23, USDA_HP_TURKEY_WRAP:54, USDA_HUMMUS_PROTEIN_BOWL:23,
  USDA_ITALIAN_TURKEY_WRAP:54, USDA_PESTO_CHIX_PROTEIN_BOWL:23,
  USDA_PESTO_CHIX_PROTEIN_BOWL_042026:23, USDA_PESTO_CHIX_WRAP_052026:54,
  USDA_PESTO_TURKEY_WRAP:54, USDA_RANCH_BBQ_CHIC_SALAD:23, USDA_SANTA_FE_SALAD:23,
  USDA_SOUTHWESTERN_VALUE_SALAD:23, USDA_SW_CHILI_CHIX_SALAD:23,
  USDA_TACO_CHIX_PROTEIN_BOWL:23, USDA_TURKEY_APPLE_WRAP:54, USDA_TURKEY_COBB_SALAD:23,
  USDA_VALUE_CSR_CHIC:23, VEGGIE_TIKKA_HEAT:48, VEG_BREAKFAST_BOWL:48, VEG_COBB_SALAD:23,
  VEG_HUMMUS:48, WRAP_SHAWARMA_CHICKPEA:54
};

/**
 * One-time port. Writes unitsPerTote onto matching SKU Library entries.
 *
 * Fills blanks ONLY. A value already sitting in the library — whether typed by
 * a planner or seeded by an earlier run — is left alone and reported, never
 * overwritten. Nothing is deleted. Re-running is therefore safe, and after the
 * first run the library, not this table, is where the number lives.
 *
 * Run from the editor. Logger.log only, per house convention.
 */
function seedUnitsPerTote() {
  const library = getSection_(STATE_KEYS.skuLibrary) || {};
  const keys = Object.keys(library);
  if (!keys.length) {
    Logger.log('seedUnitsPerTote: SKU Library is empty — nothing to seed.');
    return;
  }

  // Match on the same normalized key the rest of the attribute plumbing uses,
  // so punctuation drift between the two systems can't cause a silent miss.
  const seedByNorm = {};
  Object.keys(UNITS_PER_TOTE_SEED).forEach(function(sku) {
    seedByNorm[normalizeSku_(sku)] = UNITS_PER_TOTE_SEED[sku];
  });

  const filled = [], kept = [], missing = [];
  keys.forEach(function(key) {
    const rec = library[key] || {};
    const val = seedByNorm[normalizeSku_(key)];
    if (!(val > 0)) { missing.push(key); return; }
    const existing = parseFloat(rec.unitsPerTote);
    if (isFinite(existing) && existing > 0) {
      if (existing !== val) kept.push(key + ' (library ' + existing + ', seed ' + val + ')');
      return;
    }
    rec.unitsPerTote = val;
    library[key] = rec;
    filled.push(key);
  });

  if (filled.length) setSection_(STATE_KEYS.skuLibrary, library);

  Logger.log('seedUnitsPerTote: filled ' + filled.length + ', already set ' + (keys.length - filled.length - missing.length) + ', no seed row ' + missing.length + '.');
  if (kept.length)    Logger.log('  kept existing (seed differs): ' + kept.join('; '));
  if (missing.length) Logger.log('  no tote size on file: ' + missing.join(', '));
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
// v0.4.78 FIX. This guard is what stops the daily sync deactivating a SKU that
// is actually scheduled. It used to enumerate days from DEMAND_INDEX_KEY only —
// the LEGACY Script Properties index — which does not list days that have moved
// to the Demand Store sheet. Every sheet-migrated week was therefore invisible
// here, so a SKU carrying real demand read as undemanded and got switched off,
// again the next night, and again, however many times someone reactivated it by
// hand. That is not a data problem; that is this function lying.
//
// Now reads the sheet FIRST and the legacy index second, matching getDemandDay_.
function demandedSkus_() {
  const out = {};
  function absorb(d) {
    const skus = (d && d.skus) || {};
    Object.keys(skus).forEach(function(sku) {
      if ((skus[sku] || 0) > 0) out[normalizeSku_(sku)] = true;
    });
  }
  const map = demandStoreRead_();
  Object.keys(map).forEach(function(k) { absorb(demandStoreParse_(map[k].payload)); });
  const idx = getSection_(DEMAND_INDEX_KEY) || {};
  Object.keys(idx).forEach(function(week) {
    (idx[week] || []).forEach(function(day) { absorb(getDemandDay_(week, day)); });
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
  // v0.4.83: TWO maps, because Menu Library answers two different questions and
  // they were being conflated.
  //   menuMap  — Active rows only. Owns ACTIVE STATUS, unchanged.
  //   anyMap   — every named row whatever its Status. Owns ALLERGEN DATA.
  // A SKU being launched sits at Status "Upcoming" with its allergens already
  // filled in, and reading only the Active list meant that real data was ignored
  // and NO ALLERGEN DATA stamped over the top of it — including over allergens
  // someone had hand-entered in Sequins. Allergens are allergens regardless of
  // launch status. Whether the SKU is active is a separate question and still
  // belongs to the Active list.
  const menuMap = {}, anyMap = {};
  const sheet = SpreadsheetApp.openById(MENU_LIBRARY_SHEET_ID).getSheetByName(MENU_LIBRARY_TAB);
  if (!sheet) throw new Error('Tab "' + MENU_LIBRARY_TAB + '" not found in Menu Library');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues(); // cols A:M
    data.forEach(function(row) {
      const name = String(row[2] || '').trim();                          // col C
      if (!name) return;
      const norm = normalizeSku_(name);
      const allerg = String(row[12] || '').trim();                       // col M
      // First writer wins per status tier: an Active row's allergens should not
      // be shadowed by a later Upcoming row for the same name.
      const isActive = String(row[0] || '').trim().toLowerCase() === 'active'; // col A
      if (isActive) { menuMap[norm] = allerg; anyMap[norm] = allerg; }
      else if (!Object.prototype.hasOwnProperty.call(anyMap, norm)) anyMap[norm] = allerg;
    });
  }
  let matched = 0, unknown = 0, notFound = 0, deactivated = 0, reactivated = 0, upcoming = 0;
  const notFoundList = [], deactivatedList = [], liveButUnlisted = [], upcomingList = [];
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
      // v0.4.83: take allergens from a non-Active Menu Library row when one
      // exists, rather than stamping the sentinel over real data.
      const offList = Object.prototype.hasOwnProperty.call(anyMap, norm) ? anyMap[norm] : null;
      if (offList !== null && !allergenIsUnknown_(offList)) {
        library[key].allergens = offList;
        upcoming++; if (upcomingList.length < 25) upcomingList.push(key);
      } else {
        library[key].allergens = ALLERGEN_SENTINEL;
        notFound++; if (notFoundList.length < 25) notFoundList.push(key);
      }
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
    skipped: skipped, skippedList: skippedList,
    upcoming: upcoming, upcomingList: upcomingList };
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
// ─── CONFIG MIRROR ───────────────────────────────────────────────────────────
// Rewrite one mirror tab from scratch: clear the old body, write header + rows
// in a single setValues. One block write, per the no-setValue-in-a-loop rule.
// UpdatedAt is forced to text so the ISO stamp doesn't re-serialize through the
// spreadsheet timezone on the way in.
function writeConfigMirror_(tabName, header, rows) {
  const ss = SpreadsheetApp.openById(PLAN_ARCHIVE_SHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.setFrozenRows(1);
    Logger.log('writeConfigMirror_: created "' + tabName + '".');
  }
  const last = sheet.getLastRow();
  if (last > 0) sheet.getRange(1, 1, last, sheet.getMaxColumns()).clearContent();
  const block = [header].concat(rows);
  // v0.4.91: force text on time-like columns BEFORE writing, not after. Sheets
  // coerces "06:30" into a time serial on setValues, so StartTime was landing
  // as 0.2708333333333333 and the Line Config mirror stopped being readable —
  // and formatting it afterwards cannot recover the original string. Same
  // reason getDisplayValues() exists on the read side.
  ['UpdatedAt', 'UpdatedLocal', 'StartTime'].forEach(function (name) {
    const c = header.indexOf(name) + 1;
    if (c > 0) sheet.getRange(1, c, block.length, 1).setNumberFormat('@');
  });
  sheet.getRange(1, 1, block.length, header.length).setValues(block);
  return rows.length;
}

// v0.4.93: a plain local stamp beside the ISO one. UTC is right for machines
// and misleading in a sheet a human reads — 15:44Z reads as afternoon when it is
// 10:44 in Chicago. Script timezone, not hardcoded, so it follows appsscript.json.
function mirrorStampLocal_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function mirrorSkuLibrary_(library, email) {
  const at = new Date().toISOString();
  const local = mirrorStampLocal_();
  const keys = Object.keys(library || {}).sort();
  const rows = keys.map(function (k) {
    const s = library[k] || {};
    return [
      k, s.active !== false, !!s.pending, s.category || '', s.fcClass || '',
      s.packageType || '', s.unitsPerTote || '', s.upm || '',
      s.optimalHC === undefined || s.optimalHC === '' ? '' : s.optimalHC,
      s.allergens || '',
      s.labelNumberVersion || '',
      (s.admissibleLines || []).join(', '),
      (s.admissibleLinesFriSat || []).join(', '),
      !!s.friSatOverride, s.usdaPairedSku || '',
      !!s.capper, !!s.nightShift, !!s.preProcessed, at, local, email || ''
    ];
  });
  return writeConfigMirror_(SKU_LIB_MIRROR_TAB, SKU_LIB_MIRROR_HEADER, rows);
}

function mirrorLineConfig_(lines, email) {
  const at = new Date().toISOString();
  const local = mirrorStampLocal_();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rows = (lines || []).map(function (l) {
    const caps = l.caps || {};
    const d = l.days || {};
    return [
      l.id || '', l.label || '', l.type || '', l.room || '',
      Number(l.hc) || 0, Number(l.lineLead) || 0, l.pool || '',
      l.startTime || '', !!l.sandboxOnly,
      !!caps.capper, !!caps.smallCup, caps.usdaApproved !== false, !!caps.night
    ].concat(days.map(function (x) { return !!d[x]; })).concat([at, local, email || '']);
  });
  return writeConfigMirror_(LINE_CFG_MIRROR_TAB, LINE_CFG_MIRROR_HEADER, rows);
}

function mirrorRules_(rules, email) {
  const at = new Date().toISOString();
  const local = mirrorStampLocal_();
  const keys = Object.keys(rules || {}).sort();
  const rows = keys.map(function (k) {
    const v = rules[k];
    // Objects and arrays go in as JSON so nested rules (homeLines, lineSeeds)
    // stay readable and round-trippable rather than stringifying to [object].
    const out = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
    return [k, out, at, local, email || ''];
  });
  return writeConfigMirror_(RULES_MIRROR_TAB, RULES_MIRROR_HEADER, rows);
}

// Best-effort, exactly like the publish fan-out. The save is the record; the
// mirror is a courtesy. A sheet hiccup must never cost someone their edit.
// v0.4.88: returns a message instead of swallowing the failure into Logger.log.
// The mirror silently failed to record a SKU Library save and there was no way
// to see it — the tab just kept an old timestamp while the app reported success,
// so the mirror looked authoritative when it was stale. Exactly the class of
// invisible failure this session kept tripping over. Still non-fatal: the save
// is the record and a sheet problem must never cost an edit. But the caller
// hands the message back to the client so it lands in the status line.
function mirrorConfigSafely_(kind, payload, email) {
  try {
    const n = (kind === 'sku')   ? mirrorSkuLibrary_(payload, email)
            : (kind === 'rules') ? mirrorRules_(payload, email)
                                 : mirrorLineConfig_(payload, email);
    Logger.log('config mirror: wrote ' + n + ' ' + kind + ' rows.');
    return null;
  } catch (e) {
    const msg = 'Config mirror did NOT record this save (' + kind + '): ' + e.message;
    Logger.log(msg);
    return msg;
  }
}

function saveLineConfig(lineConfig) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  setSection_(STATE_KEYS.lineConfig, lineConfig);
  writeAuditLog_(user.email, 'save_line_config', '', '', lineConfig.length + ' lines');
  const mirrorErr = mirrorConfigSafely_('line', lineConfig, user.email);
  return { ok: true, mirror: mirrorErr };
}

function saveSequencingRules(rules) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  setSection_(STATE_KEYS.sequencingRules, rules);
  writeAuditLog_(user.email, 'save_rules', '', '', JSON.stringify(rules));
  const mirrorErr = mirrorConfigSafely_('rules', rules, user.email);
  return { ok: true, mirror: mirrorErr };
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
  const overrides = stateStoreGet_('breakOverrides');
  if (!overrides[weekLabel]) overrides[weekLabel] = {};
  if (!overrides[weekLabel][day]) overrides[weekLabel][day] = { lines: {} };
  if (!overrides[weekLabel][day].lines) overrides[weekLabel][day].lines = {};
  if (!overrides[weekLabel][day].lines[lineId]) overrides[weekLabel][day].lines[lineId] = {};
  if (!overrides[weekLabel][day].lines[lineId][brk]) overrides[weekLabel][day].lines[lineId][brk] = {};
  overrides[weekLabel][day].lines[lineId][brk][field] = val;
  stateStorePut_('breakOverrides', weekLabel, day, overrides[weekLabel][day]);
  writeAuditLog_(user.email, 'save_break_override', weekLabel, day, lineId + ' ' + brk + '.' + field + '=' + val);
  return { ok: true };
}

function setDayFloatingTeam(weekLabel, day, val) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.canEditRules) throw new Error('Not authorized');
  const overrides = stateStoreGet_('breakOverrides');
  if (!overrides[weekLabel]) overrides[weekLabel] = {};
  if (!overrides[weekLabel][day]) overrides[weekLabel][day] = { lines: {} };
  overrides[weekLabel][day].floatingTeam = !!val;
  stateStorePut_('breakOverrides', weekLabel, day, overrides[weekLabel][day]);
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
  stateStorePut_('scenarios', weekLabel, day, dayScenarios);
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
// Reads the Demand Store tab. It used to scan Script Properties for
// sequins_demand__* keys, which the v0.4.48 migration deletes — so after
// migrating it returned null and silently disabled everything downstream of it.
function currentDemandWeek_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const spans = {};
  const store = demandStoreRead_();
  Object.keys(store).forEach(function(k) {
    const label = k.split('\u0000')[0];
    const parsed = parseWeekLabel_(label);
    if (!parsed) return;
    const d = demandStoreParse_(store[k].payload);
    const dt = d && d.date ? String(d.date).slice(0, 10) : '';
    if (!dt) return;
    if (!spans[label]) spans[label] = { label: label, wk: parsed.wk, yr: parsed.yr, min: dt, max: dt };
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
// ─── DEMAND MIGRATION ─────────────────────────────────────────
// Read-only. Drives the banner in Load Demand so the migration is something
// you can see and click, not something you have to remember to run.
function demandMigrationStatus() {
  const props = PropertiesService.getScriptProperties();
  const legacy = getSection_(DEMAND_INDEX_KEY) || {};
  let days = 0, bytes = 0;
  Object.keys(legacy).forEach(function(wk) {
    (legacy[wk] || []).forEach(function(day) {
      const raw = props.getProperty(demandDayKey_(wk, day));
      if (!raw) return;
      days++;
      bytes += raw.length + (props.getProperty(demandHistoryKey_(wk, day)) || '').length;
    });
  });
  let inSheet = 0;
  Object.keys(demandStoreRead_()).forEach(function() { inSheet++; });
  // The four date-keyed state keys. Reported alongside demand so one card and
  // one button cover everything that does not belong in properties.
  let stateKeys = 0, stateBytes = 0;
  STATE_STORE_NAMES.forEach(function(name) {
    const raw = props.getProperty(STATE_KEYS[name]);
    if (!raw || raw === '{}') return;
    stateKeys++;
    stateBytes += raw.length;
  });
  const sbRaw = props.getProperty(STATE_KEYS.sandboxes);
  if (sbRaw && sbRaw !== '[]') { stateKeys++; stateBytes += sbRaw.length; }
  return { ok: true, legacyDays: days, legacyKB: Math.round(bytes / 1024), sheetDays: inSheet,
           stateKeys: stateKeys, stateKB: Math.round(stateBytes / 1024) };
}

// Moves every legacy demand day into the Demand Store tab and frees the
// property bytes. Verifies each day landed in the Sheet BEFORE deleting its
// keys; a day that fails verification keeps its keys and is reported as
// skipped. The legacy index is only removed when nothing was skipped, so a
// partial run is safe to re-run. Admin only, explicit click, never automatic.
// Moves overrides / finishBy / breakOverrides / scenarios into the State Store
// tab and deletes the property keys. Verifies each name landed before deleting.
// Same rules as the demand migration: explicit click, never automatic, and a
// key that fails verification is left exactly where it is.
function migrateStateToSheet() {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  const props = PropertiesService.getScriptProperties();
  let moved = 0, skipped = 0, freed = 0;
  for (let n = 0; n < STATE_STORE_NAMES.length; n++) {
    const name = STATE_STORE_NAMES[n], key = STATE_KEYS[name];
    const legacy = getSection_(key);
    if (!legacy || !Object.keys(legacy).length) continue;
    const raw = props.getProperty(key) || '';
    let wrote = 0, failed = 0;
    Object.keys(legacy).forEach(function(wk) {
      Object.keys(legacy[wk] || {}).forEach(function(day) {
        stateStorePut_(name, wk, day, legacy[wk][day]);
        wrote++;
      });
    });
    SpreadsheetApp.flush();
    STATE_STORE_CACHE_ = null;
    const back = stateStoreRead_()[name] || {};
    Object.keys(legacy).forEach(function(wk) {
      Object.keys(legacy[wk] || {}).forEach(function(day) {
        if (!back[wk] || !back[wk][day]) failed++;
      });
    });
    if (failed) {
      Logger.log('Verify FAILED for ' + name + ': ' + failed + ' of ' + wrote +
                 ' day(s) not readable back \u2014 property key LEFT IN PLACE.');
      skipped++;
      continue;
    }
    freed += raw.length + key.length;
    props.deleteProperty(key);
    moved += wrote;
  }
  // The legacy sandbox blob is the last non-config key. Folded in here so this
  // is genuinely the final click rather than setting up another one.
  // reclaimSandboxProperty verifies every sandbox is in the Sandboxes tab first
  // and refuses outright if any is missing, so this cannot lose one.
  try {
    const sb = reclaimSandboxProperty();
    if (sb && sb.ok && sb.freed) freed += sb.freed;
    else if (sb && sb.refused) { skipped++; Logger.log('Legacy sandbox key left in place \u2014 open Sandbox once, then re-run.'); }
  } catch (e) {
    Logger.log('Sandbox reclaim failed (non-fatal): ' + e.message);
  }
  const freedKB = Math.round(freed / 1024);
  writeAuditLog_(user.email, 'migrate_state_to_sheet', '', '',
                 moved + ' day-row(s) moved, ' + skipped + ' key(s) skipped, ~' + freedKB + 'KB freed');
  Logger.log('State migration: ' + moved + ' day-row(s) moved, ' + skipped + ' skipped, ~' + freedKB + 'KB freed.');
  return { ok: true, moved: moved, skipped: skipped, freedKB: freedKB };
}

function migrateDemandToSheet() {
  const user = getCurrentUser();
  if (!user.isAdmin) throw new Error('Not authorized');
  const props = PropertiesService.getScriptProperties();
  const legacy = getSection_(DEMAND_INDEX_KEY) || {};
  let moved = 0, skipped = 0, freed = 0;
  const weeks = Object.keys(legacy);
  for (let w = 0; w < weeks.length; w++) {
    const wk = weeks[w], days = legacy[wk] || [];
    for (let d = 0; d < days.length; d++) {
      const day = days[d];
      const dayKey = demandDayKey_(wk, day), histKey = demandHistoryKey_(wk, day);
      const payload = getSection_(dayKey);
      if (!payload) continue;                       // already gone, nothing to move
      const hist = getSection_(histKey) || [];
      demandStoreWrite_(wk, day, payload, hist);
      SpreadsheetApp.flush();
      const back = demandStoreRead_()[demandStoreKey_(wk, day)];
      const parsed = back ? demandStoreParse_(back.payload) : null;
      const wantSkus = Object.keys((payload && payload.skus) || {}).length;
      const gotSkus  = Object.keys((parsed  && parsed.skus)  || {}).length;
      if (!parsed || gotSkus !== wantSkus) {
        Logger.log('Verify FAILED for ' + wk + ' / ' + day + ' (' + gotSkus + ' of ' + wantSkus +
                   ' SKUs read back) — legacy keys LEFT IN PLACE.');
        skipped++;
        continue;
      }
      freed += (props.getProperty(dayKey) || '').length + (props.getProperty(histKey) || '').length;
      props.deleteProperty(dayKey);
      props.deleteProperty(histKey);
      moved++;
    }
  }
  if (skipped === 0) props.deleteProperty(DEMAND_INDEX_KEY);
  const freedKB = Math.round(freed / 1024);
  writeAuditLog_(user.email, 'migrate_demand_to_sheet', '', '',
                 moved + ' day(s) moved, ' + skipped + ' skipped, ~' + freedKB + 'KB freed');
  Logger.log('Demand migration: ' + moved + ' moved, ' + skipped + ' skipped, ~' + freedKB + 'KB freed.');
  return { ok: true, moved: moved, skipped: skipped, freedKB: freedKB };
}

// OBSOLETE as of v0.4.49. These existed only to relieve pressure on the Script
// Properties store, which demand no longer uses — it lives in the Demand Store
// tab, which has no ceiling worth pruning against. Kept as no-ops rather than
// deleted so an old bookmark or editor run says so instead of throwing.
function previewArchiveOldDemand() {
  Logger.log('previewArchiveOldDemand is obsolete — demand lives in the "' + DEMAND_STORE_TAB +
             '" tab now, not Script Properties. Nothing to archive.');
  return { ok: true, obsolete: true };
}
function archiveOldDemand() {
  Logger.log('archiveOldDemand is obsolete — demand lives in the "' + DEMAND_STORE_TAB +
             '" tab now, not Script Properties. Nothing to archive.');
  return { ok: true, obsolete: true };
}
function previewArchiveOldDemand_LEGACY_() {
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
function archiveOldDemand_LEGACY_(environment) {
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
  const entry = { enabled: !!(obj && obj.enabled), time: (obj && obj.time) || '' };
  stateStorePut_('finishBy', weekLabel, day, entry);
  const all = {}; all[weekLabel] = {}; all[weekLabel][day] = entry;
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
  // War Room write is deliberately AFTER the archive write and deliberately
  // cannot fail the publish. The plan is the record; the metrics cell is a
  // downstream courtesy. Anything that goes wrong comes back as a message the
  // client shows next to the publish result.
  let warRoom = null;
  try {
    warRoom = writeWarRoomPlanCost_(date, Number(snap.warRoomPerUnit));
  } catch (e) {
    warRoom = { ok: false, message: 'War Room: unexpected error — ' + e.message + '. Plan published; nothing written.' };
  }
  if (warRoom) writeAuditLog_(user.email, 'war_room_write', weekLabel, day, warRoom.message);
  // Arm the email. Deliberately last and deliberately non-fatal — an armed
  // flag is a reminder, not a record, and must never cost a published plan.
  try { armPlanEmail_(weekLabel, day, date); }
  catch (e) { Logger.log('plan email arm failed (non-fatal): ' + e.message); }
  let asm20 = null;
  try { asm20 = writeAssemblySequencing20_(snap, date); }
  catch (e) { asm20 = { ok: false, message: 'Assembly Sequencing 2.0: unexpected error — ' + e.message }; }
  if (asm20) writeAuditLog_(user.email, 'asm20_backup', weekLabel, day, asm20.message);
  return { ok: true, version: version, warRoom: warRoom, asm20: asm20 };
}
// ─── WAR ROOM: Assembly $ / unit plan (v0.4.51) ──────────────────────────────
// Replaces loadDailyEmailToRow91, which searched Gmail for the daily Assembly
// Plan email and scraped the first $0.xxx out of the body. That approach only
// ever worked when the plan's date was TODAY and when the mail came from one
// specific sender; publishing writes the cell directly instead, keyed off the
// plan's own date, so a Friday plan published on Thursday lands correctly.
//
// Column matching, in order of preference:
//   1. exact date match in row 1 whose row 3 weekday agrees  → write
//   2. no match, or weekday disagrees → derive the column arithmetically from
//      a verified anchor and confirm the neighbours read date−1 and date+1
//   3. neighbours disagree too → refuse, and say why
// Step 2 exists because the header has been a perfectly contiguous daily
// sequence for its whole life (259 columns, no gaps, no duplicates), so a
// single mistyped cell is recoverable from its surroundings. Step 3 is for
// when the structure itself has changed, which is not a typo.
function _wrParseDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  const m = String(v == null ? '' : v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    return (d.getMonth() === Number(m[1]) - 1 && d.getDate() === Number(m[2])) ? d : null;
  }
  const iso = String(v == null ? '' : v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}
function _wrDayNum_(d) { return Math.round(d.getTime() / 86400000); }
function _wrFmt_(d) { return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); }

function writeWarRoomPlanCost_(planDateRaw, perUnit) {
  const planDate = _wrParseDate_(planDateRaw);
  if (!planDate) return { ok: false, message: 'War Room: plan has no usable date, nothing written.' };
  if (!(typeof perUnit === 'number' && isFinite(perUnit) && perUnit > 0)) {
    return { ok: false, message: 'War Room: no $/unit to write (plan has no units?), nothing written.' };
  }
  let sheet;
  try {
    sheet = SpreadsheetApp.openById(WAR_ROOM_SHEET_ID).getSheetByName(WAR_ROOM_TAB);
  } catch (e) {
    return { ok: false, message: 'War Room: cannot open the sheet — ' + e.message + '. Plan published; row ' + WAR_ROOM_COST_ROW + ' not written.' };
  }
  if (!sheet) return { ok: false, message: 'War Room: tab "' + WAR_ROOM_TAB + '" not found. Plan published; nothing written.' };

  const lastCol = sheet.getLastColumn();
  if (lastCol < 2) return { ok: false, message: 'War Room: date header row is empty.' };
  const hdr = sheet.getRange(WAR_ROOM_DATE_ROW, 1, 1, lastCol).getValues()[0];
  const dow = sheet.getRange(WAR_ROOM_DOW_ROW, 1, 1, lastCol).getDisplayValues()[0];
  const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const wantDow = DOW[planDate.getDay()];
  const parsed = hdr.map(_wrParseDate_);
  const target = _wrDayNum_(planDate);

  // 1 — exact match, weekday agreeing. More than one such column is refused
  // rather than resolved: the old loader took the first and could be silently
  // wrong, and writing another team's column is worse than writing nothing.
  const exact = [];
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i] && _wrDayNum_(parsed[i]) === target) exact.push(i + 1);
  }
  const clean = exact.filter(function(c) {
    const w = String(dow[c - 1] || '').trim();
    return !w || w === wantDow;
  });
  if (clean.length === 1) {
    sheet.getRange(WAR_ROOM_COST_ROW, clean[0]).setValue(perUnit);
    return { ok: true, column: clean[0],
      message: 'War Room: wrote $' + perUnit.toFixed(3) + ' to row ' + WAR_ROOM_COST_ROW +
               ', column ' + _wrColName_(clean[0]) + ' (' + _wrFmt_(planDate) + ').' };
  }
  if (clean.length > 1) {
    return { ok: false, message: 'War Room: ' + clean.length + ' columns in row 1 read ' + _wrFmt_(planDate) +
      '. Refusing to guess which one — fix the duplicate header and republish. Nothing written.' };
  }

  // 2 — derive by position. Anchor on the nearest column whose date parses,
  // whose weekday agrees, and whose own neighbours are one day either side.
  let anchor = -1, anchorDay = 0;
  for (let i = 0; i < parsed.length; i++) {
    if (!parsed[i]) continue;
    const w = String(dow[i] || '').trim();
    if (w && w !== DOW[parsed[i].getDay()]) continue;
    const dn = _wrDayNum_(parsed[i]);
    const L = parsed[i - 1], R = parsed[i + 1];
    const okL = !L || _wrDayNum_(L) === dn - 1, okR = !R || _wrDayNum_(R) === dn + 1;
    if (!okL || !okR) continue;
    if (anchor === -1 || Math.abs(dn - target) < Math.abs(anchorDay - target)) { anchor = i; anchorDay = dn; }
  }
  if (anchor === -1) {
    return { ok: false, message: 'War Room: no column for ' + _wrFmt_(planDate) +
      ' and the header is too irregular to derive one. Nothing written.' };
  }
  const idx = anchor + (target - anchorDay);
  if (idx < 0 || idx >= parsed.length) {
    return { ok: false, message: 'War Room: ' + _wrFmt_(planDate) +
      ' falls outside the date header (it runs to ' +
      (parsed[parsed.length - 1] ? _wrFmt_(parsed[parsed.length - 1]) : '?') + '). Nothing written.' };
  }
  const L2 = parsed[idx - 1], R2 = parsed[idx + 1];
  const bracketed = (L2 && _wrDayNum_(L2) === target - 1) || (R2 && _wrDayNum_(R2) === target + 1);
  const dowOk = !String(dow[idx] || '').trim() || String(dow[idx]).trim() === wantDow;
  if (!bracketed || !dowOk) {
    return { ok: false, message: 'War Room: no column reads ' + _wrFmt_(planDate) +
      ' and position ' + _wrColName_(idx + 1) + ' does not check out against its neighbours. Nothing written.' };
  }
  sheet.getRange(WAR_ROOM_COST_ROW, idx + 1).setValue(perUnit);
  return { ok: true, column: idx + 1, byPosition: true,
    message: 'War Room: wrote $' + perUnit.toFixed(3) + ' to row ' + WAR_ROOM_COST_ROW + ', column ' +
             _wrColName_(idx + 1) + ' BY POSITION — that header cell reads "' +
             String(hdr[idx] == null ? '(blank)' : hdr[idx]) + '" but its neighbours confirm ' +
             _wrFmt_(planDate) + '. Worth fixing the header.' };
}
function _wrColName_(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
// ─── ASSEMBLY PLAN EMAIL (v0.4.51) ───────────────────────────────────────────
// The daily plan email used to be hand-written off a spreadsheet. It now
// renders from the published snapshot, but sending stays a deliberate human
// act: publishing ARMS the email, a person sends it. The armed/sent state is
// keyed by week/day in the State Store rather than held in the session, so an
// unsent plan keeps nagging across reloads and across people until someone
// actually sends it. Body HTML is NOT stored — it is re-rendered from the
// published plan on demand, so a stored email can never drift from the plan
// it describes.
// The deployed web-app URL, for the "open the plan" link in the email. Only
// the server can resolve it; the client caches it after load.
function getWebAppUrl() {
  try { return ScriptApp.getService().getUrl() || ''; }
  catch (e) { return ''; }
}
// The same URL with the Workspace domain segment stripped. getUrl() returns
// script.google.com/a/farmersfridge.com/macros/s/.../exec, and that /a/<domain>/
// prefix forces a Workspace sign-in no matter what the deployment's access is
// set to — so an external viewer following it lands on "unable to open the
// file" rather than the plan. The plain /macros/s/.../exec form is the one that
// honours "Anyone". Internal links keep using getWebAppUrl(); only the external
// link needs this.
function getPublicWebAppUrl() {
  return String(getWebAppUrl() || '').replace(/\/a\/[^\/]+\/macros\//, '/macros/');
}
function planEmailAll_() {
  const rows = stateStoreRead_()['planEmail'] || {};
  const out = {};
  Object.keys(rows).forEach(function(wk) {
    out[wk] = {};
    Object.keys(rows[wk]).forEach(function(d) { out[wk][d] = rows[wk][d].payload; });
  });
  return out;
}
function armPlanEmail_(weekLabel, day, dateStr) {
  stateStorePut_('planEmail', weekLabel, day, {
    status: 'pending', date: dateStr || '', armedAt: new Date().toISOString()
  });
}
// Publishing again re-arms: the numbers moved, so a previously-sent email is
// now stale and someone needs to send the new one.
function sendAssemblyPlanEmail(weekLabel, day, subject, htmlBody) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  const rules = getSection_(STATE_KEYS.sequencingRules) || {};
  const to = String(rules.planEmailRecipients || '').split(/[,;\s]+/)
    .filter(function(a) { return a.indexOf('@') > 0; }).join(',');
  if (!to) throw new Error('No recipients set. Sequencing Rules \u2192 Assembly plan email \u2192 Recipients.');
  if (!subject) throw new Error('No subject line \u2014 refusing to send.');
  if (!htmlBody) throw new Error('No email body \u2014 refusing to send.');
  const cc = String(rules.planEmailCc || '').split(/[,;\s]+/)
    .filter(function(a) { return a.indexOf('@') > 0; }).join(',');
  const opts = { to: to, subject: subject, htmlBody: htmlBody, name: 'Sequins \u2728' };
  if (cc) opts.cc = cc;
  MailApp.sendEmail(opts);
  stateStorePut_('planEmail', weekLabel, day, {
    status: 'sent', subject: subject, sentBy: user.email,
    sentAt: new Date().toISOString(), to: to, cc: cc || ''
  });
  writeAuditLog_(user.email, 'send_plan_email', weekLabel, day, subject + ' \u2192 ' + to);
  return { ok: true, to: to, cc: cc || '', sentBy: user.email };
}
// Dismissing is NOT sending. It clears the nag for a day that genuinely does
// not need an email (a republish to fix a typo, a scenario nobody acts on).
// Recorded so it is visible who decided that.
function dismissPlanEmail(weekLabel, day, reason) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner) throw new Error('Not authorized');
  stateStorePut_('planEmail', weekLabel, day, {
    status: 'dismissed', dismissedBy: user.email,
    dismissedAt: new Date().toISOString(), reason: String(reason || '')
  });
  writeAuditLog_(user.email, 'dismiss_plan_email', weekLabel, day, String(reason || ''));
  return { ok: true };
}
// ─── ASSEMBLY SEQUENCING 2.0 BACKUP WRITE (v0.4.51) ──────────────────────────
// Duplicates the template tab, names it after the plan date, and writes the
// sequence into the two input columns. Everything else on that tab is formulas
// and is left strictly alone — the old tool recalculates the plan itself, which
// is the point: it proves the fallback still works end to end.
//
// Units are written as VALUES, deliberately overwriting the array formula that
// pulls from CMS Demands. That decouples the backup from a feed that may stop.
//
// Refuses rather than half-writes. A backup that looks complete but isn't is
// worse than none, so a line with no block, or a sequence longer than its
// block, aborts the whole thing and reports which line.
function _asm20Blocks_(sheet) {
  const lastRow = Math.min(sheet.getLastRow(), 400);
  const col = sheet.getRange(1, 1, lastRow, 12).getDisplayValues();
  const blocks = {};
  for (let i = 0; i < col.length; i++) {
    if (String(col[i][4] || '').trim() !== '# Units') continue;   // col E marks a header
    const name = String(col[i][2] || '').trim();                  // col C holds the line
    if (!name) continue;
    const rows = [];
    for (let j = i + 1; j < col.length && j < i + 40; j++) {
      const slot = String(col[j][2] || '').trim();
      if (/^\d+$/.test(slot)) rows.push(j + 1);
      else if (String(col[j][3] || '').trim() === 'Total') break;
    }
    if (rows.length) blocks[name.toUpperCase()] = { first: rows[0], last: rows[rows.length - 1], cap: rows.length };
  }
  return blocks;
}
function _asm20TabName_(d, ss) {
  const base = (d.getMonth() + 1) + '.' + d.getDate() + '.' + d.getFullYear();
  if (!ss.getSheetByName(base)) return base;
  for (let n = 2; n < 40; n++) {
    const nm = base + ' (' + n + ')';
    if (!ss.getSheetByName(nm)) return nm;
  }
  return base + ' (' + new Date().getTime() + ')';
}
function writeAssemblySequencing20_(snap, planDateRaw) {
  const d = _wrParseDate_(planDateRaw);
  if (!d) return { ok: false, message: 'Assembly Sequencing 2.0: plan has no usable date, nothing written.' };
  let ss, tpl;
  try {
    ss  = SpreadsheetApp.openById(ASM20_SHEET_ID);
    tpl = ss.getSheetByName(ASM20_TEMPLATE_TAB);
  } catch (e) {
    return { ok: false, message: 'Assembly Sequencing 2.0: cannot open the sheet — ' + e.message + '. Nothing written.' };
  }
  if (!tpl) return { ok: false, message: 'Assembly Sequencing 2.0: tab "' + ASM20_TEMPLATE_TAB + '" not found. Nothing written.' };

  const blocks = _asm20Blocks_(tpl);
  // Validate EVERYTHING before touching the spreadsheet.
  const plan = [], problems = [];
  (snap.lines || []).forEach(function(line) {
    const ls = (snap.lineState || {})[line.id];
    const slots = (ls && ls.slots) || [];
    if (!slots.length) return;
    const key = String(ASM20_LINE_ALIASES[line.id] || line.id).toUpperCase();
    const b = blocks[key];
    if (!b) { problems.push('no block for ' + line.id); return; }
    if (slots.length > b.cap) {
      problems.push(line.id + ' has ' + slots.length + ' SKUs but its block holds ' + b.cap);
      return;
    }
    plan.push({ block: b, slots: slots, startMin: ls.startMin });
  });
  if (problems.length) {
    return { ok: false, message: 'Assembly Sequencing 2.0: not written — ' + problems.join('; ') +
      '. Add the block in ' + ASM20_TEMPLATE_TAB + ' and republish.' };
  }
  if (!plan.length) return { ok: false, message: 'Assembly Sequencing 2.0: nothing sequenced, no tab created.' };

  const name = _asm20TabName_(d, ss);
  let tab;
  try {
    tab = tpl.copyTo(ss).setName(name);
    ss.setActiveSheet(tab); ss.moveActiveSheet(2);
  } catch (e) {
    return { ok: false, message: 'Assembly Sequencing 2.0: could not create tab "' + name + '" — ' + e.message };
  }
  try {
    tab.getRange(ASM20_DATE_CELL).setValue(d);
    plan.forEach(function(p) {
      const cap = p.block.cap, sku = [], qty = [];
      for (let i = 0; i < cap; i++) {
        sku.push([i < p.slots.length ? p.slots[i].sku : '']);
        qty.push([i < p.slots.length ? (p.slots[i].qty || 0) : '']);
      }
      tab.getRange(p.block.first, ASM20_COL_SKU,   cap, 1).setValues(sku);
      tab.getRange(p.block.first, ASM20_COL_UNITS, cap, 1).setValues(qty);
      if (p.startMin != null) {
        tab.getRange(p.block.first, ASM20_COL_START)
           .setValue(Utilities.formatDate(
             new Date(2000, 0, 1, Math.floor(p.startMin / 60), Math.round(p.startMin % 60)),
             Session.getScriptTimeZone(), 'HH:mm:ss'));
      }
    });
    // Blank any block the plan did not use, so a copied template never shows
    // yesterday's SKUs sitting there looking like today's plan.
    const used = {};
    plan.forEach(function(p) { used[p.block.first] = true; });
    Object.keys(blocks).forEach(function(k) {
      const b = blocks[k];
      if (used[b.first]) return;
      const blank = [];
      for (let i = 0; i < b.cap; i++) blank.push(['', '']);
      tab.getRange(b.first, ASM20_COL_SKU, b.cap, 2).setValues(blank);
    });
  } catch (e) {
    return { ok: false, message: 'Assembly Sequencing 2.0: tab "' + name + '" was created but the write failed — ' +
      e.message + '. Check it before relying on it.' };
  }
  return { ok: true, tab: name,
    message: 'Assembly Sequencing 2.0: wrote ' + plan.length + ' lines to tab "' + name + '".' };
}
// Hide dated tabs older than the cutoff. HIDE, never delete — these are the
// fallback record and deleting them is not this function's business.
function hideOldAssembly20Tabs(daysOld) {
  const keep = Number(daysOld) || 3;
  const ss = SpreadsheetApp.openById(ASM20_SHEET_ID);
  const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - keep);
  let n = 0;
  ss.getSheets().forEach(function(sh) {
    const m = String(sh.getName()).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(\s*\(\d+\))?$/);
    if (!m) return;
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (d < cutoff && !sh.isSheetHidden()) { sh.hideSheet(); n++; }
  });
  Logger.log('hideOldAssembly20Tabs: hid ' + n + ' tab(s) older than ' + keep + ' days');
  return { ok: true, hidden: n };
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
  // Order follows Line Config, not the order lines happened to appear in the
  // archive rows — that was the sequencer's internal object order, which is why
  // a published plan came back shuffled while Workbench showed 1, 2, 3.
  // lineLead and caps ride along too: without them a plan reopened from the
  // archive computes lead = 0 and re-derives night from `type`, so its labor
  // numbers disagreed with the ones the same plan produced at publish time.
  function _lineOut_(id) {
    const c = cfgById[id] || {};
    return { id: id, label: c.label || id, startTime: c.startTime || '', hc: c.hc || 0,
             type: c.type || 'day', lineLead: Number(c.lineLead) || 0, caps: c.caps || null };
  }
  const lines = [];
  lineConfig.forEach(function(l){ if (lineSeen[l.id]) lines.push(_lineOut_(l.id)); });
  // Anything published on a line that has since left Line Config still belongs
  // in the plan — appended rather than dropped.
  Object.keys(lineSeen).forEach(function(id){ if (!cfgById[id]) lines.push(_lineOut_(id)); });
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

  const overrides = stateStoreGet_('overrides');
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

  stateStorePut_('overrides', weekLabel, day, overrides[weekLabel][day]);
  pruneOverridesBeforeCurrentWeek_();

  writeSkuMoveLog_({
    email: user.email, weekLabel, day, sku, fromLine, toLine, violations, note
  });

  return { ok: true };
}

function clearSkuMove(weekLabel, day, sku) {
  const user = getCurrentUser();
  if (!user.isAdmin && !user.isPlanner && !user.canEditRules) throw new Error('Not authorized');

  const overrides = stateStoreGet_('overrides');
  if (overrides?.[weekLabel]?.[day]?.[sku]) {
    delete overrides[weekLabel][day][sku];
    // An emptied day loses its row rather than keeping an empty object.
    if (Object.keys(overrides[weekLabel][day]).length) stateStorePut_('overrides', weekLabel, day, overrides[weekLabel][day]);
    else stateStoreDelete_('overrides', weekLabel, day);
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
