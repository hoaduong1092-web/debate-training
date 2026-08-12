# 14 — School Network & Community Expansion (Extension Proposal)

**Document:** `docs/14_SCHOOL_NETWORK_SPEC.md`
**Project:** AI Debate Master — Thinking OS
**Blueprint Version:** 3.0.0
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`
**Document Status:** EXTENSION PROPOSAL — NOT a Blueprint-Compliant Specification
**Compliance Rule:** This document describes a *proposed* community/network expansion that is NOT present in Blueprint v3.0.0. Every entity, API, role, quota rule, and monetisation item in this document is by definition outside the current Source of Truth and MUST be treated as `SPEC GAP` until formally incorporated into an authoritative Blueprint revision. Nothing in this document overrides or amends the Blueprint or any compliant spec (`02`–`12`, `13`).

---

## 1. Document Purpose & Scope

### 1.1 Purpose

This document proposes a **School Network & Community** expansion for AI Debate Master — informally called **Debate School Network** — that would let students practise, form teams, compete in tournaments, and build a community.

The goal is to record the proposal in a form that can be reviewed and, if approved, fed back into an authoritative Blueprint revision. Until that revision happens, the proposal has no normative force.

### 1.2 Scope

The proposed expansion covers:

- Student-centric community membership.
- Optional school affiliation (schools as a tag, not as a tenant).
- Teams (school teams and independent teams) as the core unit of group activity.
- Leagues and tournaments run on the platform (Tournament-as-a-Service).
- Sponsorship of tournaments and teams.
- Team seats and quotas for AI usage.
- Rankings and leaderboards for individuals, teams, and schools.
- Monetisation tiers above the existing Basic / Standard / Premium.

### 1.3 Relationship to the Existing Specifications

This proposal **does not** modify:

- `00_MASTER_SPEC.md` (5 Domains, Microservices, 4 AI Coaches, PostgreSQL/Redis/WebSocket — unchanged).
- `02_DOMAIN_SPEC.md` (the 5 Business Domains remain exactly: Auth, User & Subscription, Arena, Assistant, Plaza).
- `03_DATABASE_SPEC.md` (the 3 Blueprint tables `users`, `debate_sessions`, `debate_transcripts` remain the only normative schema).
- `04_API_SPEC.md` (the Blueprint REST + WebSocket endpoints remain the only normative API).
- `11_DEPLOYMENT_SPEC.md` (the deployment stack and storage tiers remain unchanged).

All of the above remain Blueprint-compliant. This file is a **companion proposal**, not an amendment.

`SPEC GAP: Blueprint v3.0.0 does not describe any School Network, Team, Tournament, Sponsorship, Seat, or community-ranking capability. The entire content of this document is therefore a proposal, not a specification.`

---

## 2. Proposal Status

| Property | Value |
|---|---|
| Blueprint reference | None — not present in Blueprint v3.0.0 |
| Status | Extension Proposal, awaiting Blueprint revision |
| Authority | None until an authoritative Blueprint update is issued |
| Effect on existing specs | None — `02`–`12`, `13` are unchanged |
| Mandatory implementation? | No — purely optional, gated on Blueprint approval |

`SPEC GAP: No part of this expansion is authorised by Blueprint v3.0.0. Adoption requires an explicit, versioned Blueprint revision (e.g. v3.1.0).`

---

## 3. Guiding Principles (Proposed)

The expansion is intended to follow these principles:

- **Student-centric** — each student is a Community Member first.
- **School-optional** — schools are an affiliation/tag, not a mandatory tenant.
- **Team as core unit** — students form teams (school teams or independent teams).
- **Plaza as community layer** — the existing Plaza concept is the entry point to community features.
- **Tournament-as-a-Service** — organisers can run tournaments on the platform.
- **Sponsorship** — external sponsors can fund tournaments or teams.
- **Monetisation** — free tier, Student Pro, Team Seats, tournament fees, platform fees.

`SPEC GAP: These principles are proposed by this document and are not stated by Blueprint v3.0.0. They must not be cited as Blueprint policy.`

---

## 4. Proposed Entities (Conceptual Only)

These entities are **proposed** for the expansion. They are NOT schema. They are NOT to be added to `03_DATABASE_SPEC.md`. They exist only as discussion material for a future Blueprint revision.

| Entity | Conceptual description |
|---|---|
| **School** | A school (THCS / THPT / combined). Optional affiliation tag for users and teams. |
| **Team** | A group of students (school team or independent team). Captain, members, optional mentor. |
| **Team Seat** | A paid subscription slot assigned to a team member, granting Pro features. |
| **Student Profile** | Extended user profile with school, team memberships, and debate passport. |
| **League** | A competition season (e.g. "Vietnam High School Debate League 2026"). |
| **Tournament** | A specific competition within a league or standalone. |
| **Sponsor** | An individual or organisation that funds tournaments or teams. |
| **Tournament Organizer** | The person/entity creating and managing a tournament. |

`SPEC GAP: No entity above is defined by Blueprint v3.0.0. Names, attributes, relationships, identifiers, and constraints are all unspecified by the Source of Truth.`

---

## 5. Proposed Domain Treatment

Blueprint v3.0.0 fixes exactly 5 Business Domains (`02_DOMAIN_SPEC.md` §1, §18 Rule 01). This proposal **does not** introduce a 6th Domain, **does not** rename, merge, split, or replace any of the 5 existing Domains, and **does not** propose any change to the "exactly 5 Domains" rule.

Should an authoritative Blueprint revision ever adopt this expansion, the placement of community features (teams, schools, leagues, tournaments, sponsorship, rankings, quota, seats) within the fixed 5-Domain structure would itself be a `SPEC GAP` to be decided by that revision — not by this proposal.

Until then, this proposal does **not** assign community features to any Domain and does **not** endorse any Domain-level restructuring.

`SPEC GAP: The Domain placement of community features is not specified by Blueprint v3.0.0 and is not proposed here. Any such placement is reserved for an authoritative Blueprint revision.`

---

## 6. Proposed Conceptual Data Entities (NOT DATABASE SCHEMA)

> **NOT DATABASE SCHEMA.**
> **NOT A CONTRACT FOR TABLES, COLUMNS, TYPES, KEYS, INDEXES, OR CONSTRAINTS.**
> **`03_DATABASE_SPEC.md` MUST NOT be modified based on this proposal.**
> **No entity, attribute, or relationship below is to be promoted to a PostgreSQL table, column, datatype, primary key, foreign key, index, CHECK constraint, or schema object of any kind on the basis of this document. Doing so would violate the Blueprint v3.0.0 rule that schema outside the Source of Truth is `PROHIBITED`.**

The items below are **conceptual data entities only**, described at the level of business purpose and high-level attributes. They are conversation material for a future Blueprint revision if one is ever issued. They deliberately carry **no datatype, no column structure, no key designation, no index, no constraint, and no relational notation.**

If an authoritative Blueprint revision is issued in the future, that revision alone — not this document — would specify the actual normative schema (names, columns, types, PKs, FKs, indexes, constraints, cascade rules, partitioning).

### 6.1 Conceptual Entity: School

- **Purpose:** represents a school (e.g. junior high / senior high) as an optional affiliation tag for students and teams.
- **Conceptual attributes (business-level only):** name, geographic location, school level.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.2 Conceptual Entity: User–School Affiliation

- **Purpose:** represents an optional, status-tracked link between a student and a school (e.g. pending / active / left).
- **Conceptual attributes:** the student, the school, current affiliation status, timestamps of joining and leaving (attributes at business-semantic level only).
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.3 Conceptual Entity: Team

- **Purpose:** represents a group of students competing together — either a school team (affiliated with a school, optionally verified) or an independent team (no school).
- **Conceptual attributes:** team name, captain, optional school affiliation, optional verification flag, free-text description.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.4 Conceptual Entity: Team Member

- **Purpose:** represents a student belonging to a team with a role such as captain, member, or mentor.
- **Conceptual attributes:** the team, the student, the role, timestamps of joining and leaving (business-semantic level only).
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.5 Conceptual Entity: Team Seat

- **Purpose:** represents a paid subscription slot that a team assigns to a member, granting them elevated features. May be sponsored by a third party.
- **Conceptual attributes:** the team, the member, the subscription level, validity period, optional sponsor.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.6 Conceptual Entity: League

- **Purpose:** represents a competition season (e.g. "Vietnam High School Debate League 2026") that may contain one or more tournaments.
- **Conceptual attributes:** league name, season label, validity period, organiser, optional sponsor.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.7 Conceptual Entity: Tournament

- **Purpose:** represents a specific competition, optionally within a league. May charge an entry fee and offer a prize pool.
- **Conceptual attributes:** tournament name, optional parent league, debate format (e.g. WSDC-style / Asian Parliamentary / Oxford-style / custom), lifecycle status (e.g. draft / open / ongoing / completed), validity period, organiser, optional sponsor, optional participant cap, free-form rules description.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.8 Conceptual Entity: Tournament Participant

- **Purpose:** represents an entry into a tournament, either as a team or as an individual, with a status such as registered / confirmed / eliminated / winner.
- **Conceptual attributes:** the tournament, the team or individual, participation status, registration timestamp, optional final score.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.9 Conceptual Entity: Sponsor

- **Purpose:** represents an individual, company, or organisation that may fund tournaments or teams.
- **Conceptual attributes:** sponsor name, sponsor type, contact point, optional logo.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.10 Conceptual Entity: Sponsorship

- **Purpose:** represents a funding relationship between a sponsor and a target (a tournament, a team, or a league).
- **Conceptual attributes:** the sponsor, the sponsorship target, the funding amount, validity period.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.11 Conceptual Entity: User Quota

- **Purpose:** represents a per-period usage counter that bounds how many AI sessions a user may consume, including any extra sessions purchased on top of their plan allowance.
- **Conceptual attributes:** the user, the billing period, used count, plan allowance, extra purchased count, reset point.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.12 Conceptual Entity: Ranking

- **Purpose:** represents a precomputed ranking entry for an individual, a team, or a school over a time window such as weekly / monthly / all-time.
- **Conceptual attributes:** ranking type (individual / team / school), the ranked entity, aggregated score, rank position, period label, update timestamp.
- **No schema semantics.** No PK, no FK, no datatype, no column definition implied.

### 6.13 Schema Discipline (Reaffirmed)

Every item in §6.1–§6.12 is **purely conceptual**. None of the following are defined, implied, or authorised by this document:

- table name;
- column name;
- data type (e.g. UUID, VARCHAR, INT, NUMERIC, JSONB, TIMESTAMP);
- primary key;
- foreign key;
- index;
- CHECK / UNIQUE / NOT NULL / DEFAULT constraint;
- cascade rule;
- partitioning scheme;
- migration script;
- enum definition.

`SPEC GAP: Blueprint v3.0.0 defines no schema for School, Team, Seat, League, Tournament, Sponsor, Sponsorship, Ranking, Quota, or community features. No part of this section is schema. `03_DATABASE_SPEC.md` MUST NOT be modified based on this proposal. Adding any PostgreSQL object on the basis of this document would violate the Blueprint's "Unauthorized Schema: PROHIBITED" rule.`

---

## 7. Proposed API Capabilities (NOT API CONTRACT)

> **NOT API CONTRACT.**
> **NOT A DEFINITION OF HTTP METHODS, URL PATHS, REQUEST BODIES, RESPONSE BODIES, STATUS CODES, OR AUTH HEADERS.**
> **`04_API_SPEC.md` MUST NOT be modified based on this proposal.**
> **No HTTP method, no URL path, no request schema, and no response schema is defined, implied, or authorised by this document. Adding any concrete endpoint to `04_API_SPEC.md` on the basis of this proposal would violate the Blueprint v3.0.0 rule that API contract outside the Source of Truth is `SPEC GAP`.**

The items below describe **business capabilities only**, at the level of "what a future revision might let users do". They are **not** REST endpoints, **not** operation names, **not** resource URLs, **not** RPC methods. A future Blueprint revision — not this document — would decide how, if at all, those capabilities map to REST routes, WebSocket events, or other transport.

### 7.1 School Capabilities (proposed)

- Discover existing schools.
- View a school's information.
- Request affiliation with a school.
- Update an affiliation status.
- End an affiliation with a school.

### 7.2 Team Capabilities (proposed)

- Discover existing teams (e.g. by school or public listing).
- Create a team.
- View a team's information.
- Update a team (by the captain).
- Disband a team (by the captain).
- Request to join a team.
- Invite a member to a team (by the captain).
- Accept an invitation to a team.
- Leave a team.

### 7.3 Team Seat Capabilities (proposed)

- View the seats assigned within a team.
- Purchase one or more seats for team members.
- Revoke a seat from a team member.

### 7.4 League & Tournament Capabilities (proposed)

- Discover leagues.
- Create a league (by an organiser).
- View a league's information.
- Discover tournaments within a league.
- Create a tournament.
- View a tournament's information.
- Register a team or an individual for a tournament.
- Follow a tournament bracket.
- View tournament rankings.

### 7.5 Sponsorship Capabilities (proposed)

- Record a sponsorship.
- View sponsorships.
- Link a sponsor to a tournament.

### 7.6 Ranking Capabilities (proposed)

- View school rankings.
- View team rankings.
- View individual rankings.

### 7.7 API Discipline (Reaffirmed)

None of the following are specified, implied, or authorised by this section:

- HTTP method (GET/POST/PATCH/PUT/DELETE/etc.);
- URL path or path parameter;
- query parameter;
- request JSON body;
- response JSON body;
- HTTP status code;
- error payload;
- authentication header;
- rate limit;
- idempotency contract;
- pagination contract.

`SPEC GAP: Blueprint v3.0.0 Section 08 defines no community/team/tournament/sponsorship/ranking API capability. The bullets above are capability-level discussion only. `04_API_SPEC.md` MUST NOT be modified based on this proposal. Adding any concrete REST endpoint on the basis of this document would violate the Blueprint's discipline that API contract outside the Source of Truth is `SPEC GAP`.`

---

## 8. Proposed Real-time & Quota (Conceptual)

### 8.1 WebSocket

The existing WebSocket `/api/v1/debates/{id}/stream` (defined in `04_API_SPEC.md` and `05_REALTIME_CONTRACT.md`) is **unchanged**. New WebSocket endpoints for live team chat or tournament bracket updates are only future possibilities.

`SPEC GAP: Blueprint v3.0.0 does not define community WebSocket events.`

### 8.2 Quota (proposed numbers, illustrative only)

- Free tier: 5 AI sessions/month — *proposed*.
- Pro: 50 sessions/month — *proposed*.
- Pro+: 120 sessions/month — *proposed*.
- Team Seats: each seat grants a member Pro or Pro+ — *proposed*.
- Extra sessions: purchasable packs — *proposed*.

`SPEC GAP: Blueprint v3.0.0 does not define any quota model, any session-count limit, any team-seat model, or any "Pro/Pro+" tier. The numbers above are illustrative.`

---

## 9. Proposed Monetisation (Non-Authoritative)

| Revenue source | Payer (proposed) |
|---|---|
| Student Pro (individual) | Student / Parent |
| Pro+ (individual) | Student / Parent |
| Extra session packs | Student / Team |
| Team Seats (bulk) | Team / Captain / Sponsor |
| Tournament entry fee | Participant |
| Tournament platform fee | Organiser / Sponsor |
| Sponsorship (Powered-by) | Sponsor / Organiser |

`SPEC GAP: Blueprint v3.0.0 only names the Basic / Standard / Premium subscription tiers and their illustrative prices (49k / 129k / 399k VNĐ). It does not mention Student Pro, Pro+, Team Seats, tournament fees, platform fees, or sponsorship.`

---

## 10. Compliance with Existing Blueprint Principles (Proposed)

If the expansion is approved in a future Blueprint revision, it should be designed to satisfy:

- **No school-centric tenant** — schools remain optional affiliations.
- **Community-first** — Plaza stays the centre.
- **AI usage cost-controlled** — quotas and extra packs prevent unlimited usage.
- **Modular** — community extensions are isolated; no change to core Arena, AI Coach, or Scoring.
- **Spec discipline** — actual pricing, quota numbers, and tournament rules remain `SPEC GAP` until validated with real usage data.

`SPEC GAP: The list above is the proposal's own self-imposed constraints, not Blueprint rules.`

---

## 11. Files Intentionally NOT Modified

The following files are **intentionally left unchanged** because they are Blueprint-compliant specifications and this proposal is not yet Blueprint-authorised:

| File | Reason for not modifying |
|---|---|
| `00_MASTER_SPEC.md` | Only a short pointer to this proposal file may be added; the Source of Truth, 5 Domains, and core stack are unchanged. |
| `02_DOMAIN_SPEC.md` | The "exactly 5 Domains, do not rename/merge" rule must stay intact. |
| `03_DATABASE_SPEC.md` | The "do not add schema outside Blueprint" rule must stay intact. |
| `04_API_SPEC.md` | The API contract remains the Blueprint Section 08 endpoints only. |
| `05_REALTIME_CONTRACT.md` | The WebSocket contract for `/api/v1/debates/{id}/stream` is unchanged. |
| `11_DEPLOYMENT_SPEC.md` | The deployment stack and storage tiers are unchanged. |
| `13_SYSTEM_PROMPTS.md` | Community features do not affect the AI Coach system prompts. |

When an authoritative Blueprint revision is issued, the relevant changes will be made in a separate, versioned update to each of the above files — not silently through this proposal.

---

## 12. Proposed Blueprint Amendment (Section 21 — DRAFT ONLY)

> **DRAFT ONLY — NOT APPROVED — NOT PART OF BLUEPRINT v3.0.0 — NO AUTHORITY.**
> **This is draft text for future review only. It has no normative force. It does not amend, extend, or interpret Blueprint v3.0.0. It must not be quoted, implemented, or cited as Blueprint policy in any form until an authoritative, versioned Blueprint revision is formally issued.**

The text below is **content that could potentially be proposed** for inclusion in a future Blueprint revision (e.g. a hypothetical v3.1.0) as a new **Section 21 — School Network & Community Expansion**. It is a draft for review discussion only. It does **not** change Blueprint v3.0.0 in any way.

```markdown
## 21. School Network & Community Expansion (DRAFT — NOT APPROVED)

A future Blueprint revision could potentially expand the core with a
community layer — informally "Debate School Network" — to create a
student-centric, school-optional debate network. This is a draft concept
for review only and is not part of Blueprint v3.0.0.

Potential guiding principles (draft only):
- Student-first: each student could potentially be a community member,
  independent of any school.
- School-optional: schools could potentially act as an affiliation tag,
  not a tenant.
- Team-based: students could potentially form teams (school team or
  independent team) to compete.
- Tournament-as-a-Service: third parties could potentially run
  tournaments on the platform.
- Sponsorship: sponsors could potentially fund tournaments or teams.
- Quota & monetisation: potential future layers such as Free / Pro /
  Team Seats / Tournament fees / Sponsorship fees (all illustrative,
  not approved, not requirement).

Potential future entities could include School, Team, Seat, League,
Tournament, Sponsor, and Ranking. These are conceptual only; none are
defined as schema, API, or requirement in this draft.
See docs/14_SCHOOL_NETWORK_SPEC.md for the proposal document.

Note: This is an expansion draft only. It does not change the core
components (AI Coach, Scoring, Arena, basic Plaza). The 5 Business
Domains of Blueprint v3.0.0 are not renamed, merged, split, or replaced
by this draft. Quota numbers, pricing, tournament rules, and entity
definitions remain `SPEC GAP` until an authoritative Blueprint
revision is issued and until they are validated with operational data.
```

`SPEC GAP: Section 21 above is proposed DRAFT text only. It is NOT APPROVED. It is NOT PART OF BLUEPRINT v3.0.0. It has NO AUTHORITY. It is provided for future review only and must not be implemented, cited, or treated as Blueprint policy.`

---

## 13. School Network Compliance Checklist (Proposal Review Only)

This checklist is for **reviewing the proposal**. None of these items are normative. Each item is `SPEC GAP` until the Blueprint is revised.

| # | Proposed item | Status until Blueprint revision |
|---:|---|---|
| 1 | School affiliation tag | SPEC GAP |
| 2 | Teams (school / independent) | SPEC GAP |
| 3 | Team seats (paid member slots) | SPEC GAP |
| 4 | Leagues & tournaments | SPEC GAP |
| 5 | Tournament-as-a-Service (third-party organisers) | SPEC GAP |
| 6 | Sponsorships | SPEC GAP |
| 7 | Quota model (Free / Pro / Pro+ / seats) | SPEC GAP |
| 8 | Rankings (school / team / individual) | SPEC GAP |
| 9 | Community WebSocket events (future) | SPEC GAP |
| 10 | Monetisation tiers & pricing | SPEC GAP |
| 11 | Domain placement of community features (reserved for an authoritative Blueprint revision; no placement is proposed in this document) | SPEC GAP |

---

## 14. Document Status

```text
Document:                docs/14_SCHOOL_NETWORK_SPEC.md
Blueprint Version:       3.0.0
Document Type:           EXTENSION PROPOSAL
Blueprint-Covered:       NO
Authority:               None — proposal only
Effect on 02–12, 13:     NONE

Source of Truth:         ai-debate-master-blueprint-v3.pdf (unchanged)
Existing Domains:        5 (Auth, User&Sub, Arena, Assistant, Plaza) — unchanged
Existing Core Schema:    users, debate_sessions, debate_transcripts — unchanged
Existing API:            Section 08 endpoints — unchanged

Adoption Path:           Requires a versioned Blueprint revision (e.g. v3.1.0)
SPEC GAP Policy:         All content in this document is SPEC GAP until that revision
```

---

*End of `14_SCHOOL_NETWORK_SPEC.md`*
