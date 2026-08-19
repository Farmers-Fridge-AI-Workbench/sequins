# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19.

---

## Blocked on Cori

### Version drift — `Code.js` header vs `APP_VERSION`

`APP_VERSION` in `Index.html` reads **v0.5.127**. The `Code.js` header says it
pairs with **v0.5.117**. Ten versions apart, and `Index.html` carries work
stamped `.118`, `.123`, `.127`.

To resolve: confirm whether `.118`–`.127` were client-only. If so, `Code.js`
stays at v0.4.59 and only the pairing line in its header moves. Then backfill
the missing changelog entries — a few lines each, newest-first.

This is exactly the drift CLAUDE.md warns about, and it's invisible unless
someone reads the header. Worth fixing before the next real change ships.

---

## Blocked on someone else

### Repo visibility — public since 2026-06-30

`Farmers-Fridge-AI-Workbench/sequins` is **public to the internet**, not
internal to Farmers Fridge. Verified by anonymous fetch: the full `Code.js`
downloads with no authentication.

Cori has write, not admin, so she can't change it. Needs an org owner
(github.com/orgs/Farmers-Fridge-AI-Workbench/people → Role: Owner) to either
flip visibility to Internal/Private, or grant her Admin on the repo.

Origin: the repo was created under the personal account `data-fairy-godmother`
and later transferred into the org. GitHub transfers preserve visibility, so
the setting was made at creation and the ability to change it moved away with
the transfer. Org audit log (`repo.access`) has the specifics.

### Org repo-creation policy

The org has **4 public repos**, so this likely isn't limited to Sequins.
Suggest to the org owner: Settings → Member privileges → Repository creation,
restricted to private/internal. Prevents recurrence better than auditing repos
one at a time.

---

## Ready to run

### Sheet sharing audit — the 9 spreadsheets in `Code.js`

The repo exposed the file IDs of all nine source/destination sheets. IDs are
addresses, not keys — what actually gates the data is each sheet's own sharing
setting.

Check all nine for "anyone with the link." Read-only, ~1 minute. Any sheet set
that way is effectively public right now regardless of what happens to the repo.

Worth doing whichever way the visibility decision lands.

---

## Decisions pending

### Wraps → LINE-3 / Sandwiches → LINE-2

Still unconfirmed — see the "In transition" section of CLAUDE.md for the full
picture. Short version: the code has already moved to soft home-line
preferences, but whether the *stated* rule retires is Cori's call. Don't encode
either reading without asking.

---

## Optional — quality of life

### Permission allowlist

No `.claude/` config in this repo yet, so routine read-only commands
(`git status`, `node --check`, greps) prompt every time. The
`/fewer-permission-prompts` skill scans actual usage and writes a sensible
project allowlist.

### Pre-ship syntax check as one command

CLAUDE.md mandates `node --check Code.js` **and** extracting the main
`<script>` block from `Index.html` via Python regex into a temp `.js` to
`node --check` that too — every time, no exceptions. The second half is fiddly
enough to get skipped under time pressure. A short script in the repo would
make it one command and remove the excuse.
