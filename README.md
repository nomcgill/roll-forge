# RollForge v1.0 — Software Design Spec (SDS)

> Scope: implement “Actions & Modifiers” rolling workflow on `/characters/[id]` with mobile-first UI, local (client) history, CRUD for Actions/Action Modifiers, and character preferences that control crit and advantage behavior. Small, incremental commits with Jest testing when possible.

---

## 1) Goals (v1)

- Create, edit, and delete **Actions** and **Action Modifiers**.
- **Ready an Action**: pick actions + modifiers, set tallies (Adv/Normal/Disadv or “Add”), then execute “Roll Them Bones”.
- **History**: show one row **per tally click** plus one row for per-turn modifiers, all within the executed **Action Group**, with totals by type at the bottom.
- Persist Actions/Action Modifiers and Character preferences in DB; keep History in client state (for now).
- Mobile-first: swipe between Ready/History; desktop shows both columns. Sticky “Roll Them Bones”.

**Non-goals (v1)**

- Server-side persistence of History.
- Feats and proficiency auto-adjustments.
- Theming beyond a dark/slate default.

---

## 2) Data Model (Prisma)

### Character

- `id`, … (existing)
- `preferences` **Json** (single blob for extensibility):
  ```ts
  type CharacterPreferences = {
    followsAdvantageRules: boolean; // enables Adv/Dis buttons globally
    critRules: "5e-double-damage-dice" | null; // null disables all crit logic & UI
    critThreshold: number; // 0–20, default 20
    uniqueDamageTypes: string[]; // max 18 chars each, case-insensitive unique
    // theme later (e.g., { name: 'Nightshade', ... })
  };
  ```

### Data Model (ActionModifier) & Constraints

#### ActionModifier

- `id`, `characterId → Character`, `name (≤25)`, `favorite:boolean`, timestamps
- `rollDetails Json`:
  ```ts
  type ActionModifierRollDetails = {
    eachAttack: boolean; // true = per-action, false = per-turn
    conditions?: {
      wielding?: "weapon" | "unarmed";
      distance?: "melee" | "ranged";
      spell?: boolean;
    };
    attackImpact?: {
      // modifies to-hit; cannot cause crits
      static?: number;
      signStatic?: 1 | -1;
      dice?: Array<{
        count: number;
        size: DieSize;
        signDice?: 1 | -1;
        // canCrit NEVER allowed here
      }>;
    };
    damage: Array<{
      type: string | null; // null allowed ONLY when eachAttack=true (“None (base)” → inherit first action type)
      source?: string; // ≤18 chars; shows in row when type is null; totals still aggregate under inherited type
      static?: number;
      signStatic?: 1 | -1;
      dice?: Array<{
        count: number;
        size: DieSize;
        signDice?: 1 | -1;
      }>;
    }>;
    favorite?: boolean;
  };
  ```

---

## 3) API (Next.js app dir; one method per file)

- **Actions**

  - `GET /api/characters/[id]/actions`
  - `POST /api/characters/[id]/actions`
  - `GET /api/actions/[actionId]`
  - `PATCH /api/actions/[actionId]`
  - `DELETE /api/actions/[actionId]`

- **Action Modifiers**
  - `GET /api/characters/[id]/action-modifiers`
  - `POST /api/characters/[id]/action-modifiers`
  - `GET /api/action-modifiers/[modifierId]`
  - `PATCH /api/action-modifiers/[modifierId]`
  - `DELETE /api/action-modifiers/[modifierId]`

**AuthZ**

- Ensure each row’s `characterId` belongs to the session user.

**Conventions**

- Destructure `{ params }` in dynamic handlers.
- Validate: name lengths, die sizes, `type:null` only allowed when `eachAttack=true`, etc.

---

## 4) Execution Rules (“Roll Them Bones”)

### Building the Action Group on Ready

- Ready lists are **alphabetical**; favorites pre-selected (no pinning), tallies start at 0.
- Tally UI:
  - If `followsAdvantageRules = true`: show **Disadv | Normal | Adv** (0–10 each).
  - If `false`: show a single **Add** button (0–10).
  - Right-click (desktop) or 400ms long-press (touch) decrements.
- Modifiers grouped into **Per Action** and **Per Turn**; incompatible selections are visually flagged but **still included** in math.

### Rolling semantics

- **Per tally instance**:
  - If Adv/Dis is used, **roll every to-hit die twice** (any size), keep best/worst per die, then sum kept dice + `static` (with signStatic) + **attackImpact**.
  - **Per-turn `attackImpact`**: roll independently **per action instance**; participates after pairing; **cannot crit**; affects each action’s to-hit.
  - **Per-action `attackImpact`**: applies only to that action instance’s to-hit.
- **Crit detection** (only if `critRules !== null`):
  - A die contributes to crit checks **only** if its `canCrit: true` (UI restricts to **d20** under default 5e).
  - If any **kept** crit-eligible die’s natural value ≥ `critThreshold`, that **action row** is a crit.
- **Crit damage doubling (5e)**:
  - On crit, **double rolled damage dice** for the Action and any **per-action** modifiers.
  - **Per-turn** modifier damage dice are **not** doubled.
  - Statics are never doubled.

---

## 5) History composition (client state for now)

- Each **tally click** yields **one History row** upon execution.
- **Per-turn** modifiers yield **one History row** per execution (no success section).
- Rows are ordered **chronologically (creation order)** within the Action Group.
- **Collapsed row**: name, Adv/Dis/Normal (or none), success result (e.g., `22`), and typed damage summaries (no numeric sorting).
- **Expanded row**: full math breakdown (die results, kept rolls, statics, and sources for `type:null`).
- **Action Group footer**: Grand total + per-type breakdown over **selected** rows (user can deselect rows that didn’t hit).

**Timestamp**

- Store `{ iso, tz }` on each Action Group; display `hh:mm a` and label newest “– most recent”.

---

## 6) UI / UX

- **Route**: `/characters/[id]` with `?mode=ready|history|new-action|edit-action|new-modifier|edit-modifier`.
- **Layout**:
  - **Mobile**: horizontal scroll-snap between Ready & History; sticky “Roll Them Bones”; auto-snap to History after execution.
  - **Desktop**: two columns; sticky button at bottom of Ready column; after execution, scroll newest History entry into view.
- **Ready Action preview boxes** (no expanders):
  - Show: name, success preview (sum of `toHit` statics + dice notation), verbose list of damage lines (no grouping/totaling), condition badges, and the tally buttons.
  - Per-action modifiers do **not** appear here; they show only in History after execution.
- **Copy specifics**
  - Damage type selector displays **“None (base)”** for the `null` option (per-action modifiers only).
  - Inheritance hint: _“Inherits the first damage type chosen for this action.”_
- **Style**
  - Tailwind, dark/slate default; mobile-first spacing; rounded-2xl, soft shadows.

---

## 7) Error Handling & Validation

- Server: Zod (or minimal checks) in handlers; return 400 with field errors.
- Client: inline + form errors; disable add buttons at limits (“Maximum damage sources reached!” at ≥10).
- Incompatible selections: visual warning badge; included in math.

---

## 8) Testing (planning only)

- **Unit**: roller (deterministic RNG injection), crit gating, Adv/Dis pairing, inheritance to first type.
- **API**: CRUD happy paths + authz; validation failures.
- **Component**: Ready tallies (inc/dec), sticky button behavior, History rows render & expand.

---

## 9) Performance & State

- Keep History in client state (e.g., `useReducer`/Zustand), keyed by character id.
- Roller is pure/predictable; inject RNG seed for tests later.
- No heavy gesture libs—use CSS scroll-snap.

---

## 10) Security

- Require session; verify `characterId` ownership for all Actions/Modifiers.
- Enforce name lengths; block disallowed die sizes; enforce `type:null` scope rules.

---

## 11) Milestones

**M0 – Schema & scaffolding**

1. Prisma migration: `Action`, `ActionModifier`, add `preferences` to `Character`.
2. Minimal CRUD API stubs (all routes, authz guards, no business logic yet).

**M1 – Character page skeleton** 3. `/characters/[id]` skeleton: header + mode routing (query param).  
4. Mobile scroll-snap & desktop split; sticky “Roll Them Bones”.  
5. Ready pane lists (alphabetical), selection state, favorites preselected.

**M2 – Builder forms** 6. New/Edit **Action** form (no server wiring yet) + local validation.  
7. New/Edit **Action Modifier** form (enforce `type:null` only when `eachAttack=true`).  
8. Wire forms to API (create/edit/delete) + optimistic updates.

**M3 – Tally mechanics** 9. Adv rules toggle respected; show **Disadv/Normal/Adv** or single **Add**.  
10. Tally increments, caps (0–10), decrement via right-click/long-press.

**M4 – Roller (no history yet)** 11. Implement pure roller util: Adv/Dis per-die pairing, attackImpact semantics, crit gating, doubling rules (5e), inheritance to first type, incompatible still included.  
12. Console-log a sample result structure from the Ready selection.

**M5 – History (client state)** 13. Action Group model in client state with `{ iso, tz }`.  
14. Add **one row per tally** + **one row per per-turn modifier**; rows in chronological order.  
15. Collapsed summaries (success value + typed damages).  
16. Expanded details showing full math & sources.  
17. Grand total with per-type breakdown over **selected** rows; row selection toggles.

**M6 – Preferences panel** 18. UI for `followsAdvantageRules`, `critRules`, `critThreshold`.  
19. Manage `uniqueDamageTypes` (add/remove) with 2-step delete that hard-deletes dependents.

**M7 – Polish** 20. Empty states, errors, tooltips (“None (base)”), a11y touches (focus rings, ARIA).

## 12) Open Items (track for later)

- Feats engine (Savage Attacks, Piercer) & proficiency adjustments.
- Server-side History + multi-user/time zone transforms.
- Theme system (named presets like “Nightshade”).
- Import/export of Actions/Modifiers (JSON).
