# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19. Last refreshed 2026-08-21.

---

## Ready to build

### Config search — what should a new line BE?

The original ask, and everything built on 2026-08-21 was groundwork for it. When
standing up a line (LINE-7 for holiday volume), have Sequins propose its pool,
capabilities, start time and seed rather than someone guessing.

Method, settled: don't write a recommender, **brute-force the real engine**.
Enumerate candidate configs (≈4 pools × 3 start times × a few capability sets),
run each through `runSequencer` on a real week, score on unplaced count, latest
finish, overtime, chain breaks and hours spread, and show the top few with their
actual numbers. No new assumptions — the same engine that makes the plans, asked
thirty times instead of once.

Two things it must do that aren't obvious:

- **Score churn.** A config that moves 5 SKUs for 90% of the gain beats one that
  moves 30. "SKUs moved" has to be a cost in the ranking, not just an output.
- **Also propose which SKUs to make admissible** on the new line. Without that
  every config scores identically badly.

It cannot recommend headcount — throughput is not a function of HC in the model,
so every config would say the same thing. Needs the floor tracker first.

Groundwork already done: the Line Planner tab (v0.5.148/.149) proved the
*existing* shape is not the lever — unbinding SKU line assignments across Wk 34
and Wk 35 produced identical finish times, identical overtime, a worse hours
spread and new chain breaks. The Lines column is earning its keep, so the
interesting question really is the new line.

### Warn when demanded SKUs aren't sequenced

The engine silently drops any demanded SKU that is `pending`, absent from the
SKU Library, or non-assembly. A week then gets planned short with nothing said.
That is how FUJI_APPLE_PECAN_SALAD went missing from Wk 42 planning.

2026-08-21 proved this class of silent failure is the expensive one — the same
shape as the config mirror failing quietly and the poll discarding edits without
a word. One line in Sandbox and Workbench: "3 demanded SKUs not sequenced:
FUJI_APPLE_PECAN_SALAD (pending), …".

---

## Small, mine to do

### Local-time column in the config mirrors

The mirrors stamp UTC ISO, which is right for machines and confusing in a sheet —
`15:44Z` read as afternoon when it was 10:44 Chicago. Add a local-time column
beside it.

### Sheet sharing audit — the 9 spreadsheets in `Code.js`

The public repo exposed the file IDs of all nine source/destination sheets. IDs
are addresses, not keys; what gates the data is each sheet's own sharing setting.
Check all nine for "anyone with the link". Read-only, about a minute. Worth doing
whichever way the repo visibility decision lands.

---

## Blocked on Cori

### Go-live date for sandbox-only lines

`sandboxOnly` is a boolean: a line is hidden from live planning or it isn't, and
flipping it is a manual edit. What Cori wants is a **date** in Line Config for
when a staged line joins real planning, so LINE-7 turns itself on for the
holiday weeks without anyone remembering.

Deferred 2026-08-19 to ship the sandbox modelling first. When built, the flag
becomes a date comparison at the same chokepoint in `runSequencer`, plus a date
input. Nothing else should move — every live surface already routes through
`liveLines_`. The per-sandbox `lineDays` map stays regardless; it answers "how
many days do we need it", not "when does it become real".

### Wraps → LINE-3 / Sandwiches → LINE-2

Still unconfirmed — see the "In transition" section of CLAUDE.md. The code has
moved to soft home-line preferences; whether the *stated* rule retires is Cori's
call. Don't encode either reading without asking.

---

## Blocked on someone else

### Repo visibility — public since 2026-06-30

`Farmers-Fridge-AI-Workbench/sequins` is **public to the internet**, not internal
to Farmers Fridge. Verified by anonymous fetch: the full `Code.js` downloads with
no authentication.

Cori has write, not admin, so she cannot change it. Needs an org owner
(github.com/orgs/Farmers-Fridge-AI-Workbench/people → Role: Owner) to flip
visibility to Internal/Private, or to grant her Admin.

Origin: created under the personal account `data-fairy-godmother` and later
transferred into the org. GitHub transfers preserve visibility, so the setting
was made at creation and the ability to change it moved away with the transfer.
Org audit log (`repo.access`) has the specifics.

### Org repo-creation policy

The org has **4 public repos**, so this likely is not limited to Sequins. Suggest
Settings → Member privileges → Repository creation, restricted to
private/internal. Prevents recurrence better than auditing repos one at a time.

---

## Known gaps, not bugs

### Off-capper moves read optimistic

Runtime is planned at the library UPM regardless of which line runs a SKU, so a
capper SKU spilled onto a normal line is modelled as costing the same time it
would on the capper. If the capper is genuinely faster, every off-capper move —
including LINE-6 → LINE-7 in Sandbox — understates the cost. Needs real
off-capper completion times from the floor tracker.

### Overtime cannot be derived from headcount

`sbOvertime_` prices overtime from crew size, but the engine's runtime is
`qty ÷ upm` with `upm` a per-SKU constant. Nothing makes throughput a function
of people, so the model cannot answer "how many people do we need" — only "how
long will it run". Same blocker as above.

---

## Optional — quality of life

### Permission allowlist

No `.claude/` config in this repo, so routine read-only commands (`git status`,
`node --check`, greps) prompt every time. The `/fewer-permission-prompts` skill
scans actual usage and writes a project allowlist.

### Pre-ship syntax check as one command

CLAUDE.md mandates `node --check Code.js` **and** extracting the main `<script>`
block from `Index.html` to check that too, every time. The second half is fiddly
enough to get skipped under pressure. A short script would make it one command.
Note the extraction now works via node rather than Python — Python is not
installed on this machine, so the CLAUDE.md instruction to use a Python regex is
inaccurate.
