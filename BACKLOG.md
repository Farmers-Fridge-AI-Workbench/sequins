# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19. Last refreshed 2026-08-31.

---

## Ready to build

### Quarterly throughput report: most improved, most declined

Cori, 2026-09-03: "Might be cool to report on a quarterly basis what what’s
improved and declined the most too..."

Now possible, and cheap, because v0.4.113 started writing every adopted UPM
change to a **UPM Updates** tab with the old value, the new value, the sample
behind it and a timestamp. A quarter of those rows IS the report — no new data
collection, just a read of history that did not exist before this week.

Rank by percentage change over the quarter, not absolute UPM: a bowl going 9 to
11 matters more than a snack going 40 to 42. Worth splitting improved from
declined rather than one signed list, since they prompt different conversations.

Open question before building: does a declining UPM mean the line got slower, or
that the SKU changed? A recipe change mid-quarter makes before and after two
different products. The Menu Library label version may be the tell.

---

## Small, mine to do

_Nothing queued._

---

## Blocked on Cori

_Nothing queued._

Dropped 2026-08-31: the **go-live date for sandbox-only lines**. Cori: "for now
we will just turn it on when it's time." The manual `sandboxOnly` checkbox is
enough. Restate it here if flipping it by hand ever gets missed.

---

## Blocked on someone else

### Push run-sheet actuals into the internal system the floor already types into

Cori, 2026-08-31: "they already type in actuals - it's an internally built
system. I need to get with that team and figure out how to connect what we're
going to put in here to that system so the team doesn't have to enter it twice."

Hers to arrange with that team; ours to build once the interface is known. Do
not go looking for the destination — it is not any sheet Sequins currently
touches. Both obvious candidates were checked on 2026-08-31 and ruled out:
Assembly Sequencing 2.0 is only a fallback and is being retired, and War Room's
`Assembly $ / unit` is computed from a database ("Database DoD - Final"), not
entered.

What Sequins will have to offer, so the shape is known before the conversation:
`Run Sheet Actuals` captures **per SKU** — ActualStart, ActualEnd, ActualPeople,
ActualUnits, ActualFullTotes, ActualPartialUnits — with the planned figures
stored alongside each row. `Run Sheet Shift` holds the per-line/day header. Both
were empty as of 2026-08-31; nothing has been captured yet.

The open question for that team is grain: per SKU, or per line per day. Per-day
makes the push an aggregation and leaves the per-SKU detail as Sequins' own
contribution to the Snowflake north star.

---

## Parked — low priority, Cori's call 2026-08-31

Both need an org owner and neither is urgent: "you can stop worrying about that
for now too...very low prio." Kept on record because the exposure is real and
still open, not because it needs chasing.

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
