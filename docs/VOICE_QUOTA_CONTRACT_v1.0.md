# 🔒 VOICE QUOTA CONTRACT v1.0
## AI DEBATE MASTER — THINKING OS

> **Status:** RATIFIED & LOCKED (Source of Truth)  
> **Effective Date:** 2026-08-22  
> **Authority:** Master Blueprint V15.0 / V16.0 & Canonical Commerce Architecture  
> **Supersedes:** All legacy "Voice Credit = 1 Session", "Audio Credit", and hybrid session/minute descriptions.

---

## 1. CANONICAL BUSINESS UNIT DEFINITIONS

Across all layers (Database, Backend, Frontend, Payments, Documentation), business quotas are strictly locked to the following units:

| Dimension | Canonical Business Unit | Unit Definition | Technical Constraint |
| :--- | :--- | :--- | :--- |
| **TEXT** | **1 Text Credit / Session** | 1 Complete Text Debate Sparring Session | Maximum 20 argument rounds (≤ 60 turns total) |
| **VOICE** | **1 Voice Minute** | **1 Minute of billable Voice AI usage** | **Maximum 15 minutes per session (Technical Limit)** |
| **ASSISTANT** | **1 Assistant Credit** | 1 Successfully generated & validated artifact | Speech Draft or Motion Analysis Report |
| **VIP** | **Time-Based Pass** | Unlimited access within time window (`starts_at` → `expires_at`) | Technical safeguards (15 min/session, 1 active session) apply |

> [!IMPORTANT]
> **CORE INVARIANT:**  
> $$\text{Voice Business Unit} = \text{1 Voice Minute}$$  
> $$\text{Voice Minute} \neq \text{Voice Session}$$  
> **15 minutes is a Technical Session Guardrail, NOT a Business Unit.**

---

## 2. DUAL-CYCLE SUBSCRIPTION MATRIX (VOICE MINUTES)

All Subscription Plans are provisioned with minute-based Voice Quota:

| Plan Code | Duration | Price (VNĐ) | Text Quota | Voice Quota (Minutes) | Assistant Quota | Features Display Text |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **BASIC_MONTHLY** | 30 days | 49.000 | 30 sessions | **15 phút** | 10 credits | 15 phút luyện nói Voice AI |
| **BASIC_YEARLY** | 365 days | 490.000 | 360 sessions | **180 phút** | 120 credits | 180 phút luyện nói Voice AI (Tiết kiệm ~17%) |
| **STANDARD_MONTHLY** | 30 days | 129.000 | 100 sessions | **60 phút** | 50 credits | 60 phút luyện nói Voice AI |
| **STANDARD_YEARLY** | 365 days | 1.190.000 | 1.200 sessions | **720 phút** | 600 credits | 720 phút (12 giờ) Voice AI (Tiết kiệm ~23%) |
| **PREMIUM_MONTHLY** | 30 days | 399.000 | 500 sessions | **300 phút** | 200 credits | 300 phút luyện nói Voice AI |
| **PREMIUM_YEARLY** | 365 days | 3.590.000 | 6.000 sessions | **3.600 phút** | 2.400 credits | 3.600 phút (60 giờ) Voice AI (Tiết kiệm 25%) |

---

## 3. BILLING QUANTUM & DURATION CALCULATION POLICY

### 3.1. Mathematical Formula
For any session with actual speech duration $D_{\text{ms}}$:

$$\text{Billable Minutes} = 
\begin{cases} 
0 & \text{if } D_{\text{ms}} < 3\,000 \text{ ms (No meaningful audio processed)} \\
\min\left(15, \left\lceil \frac{D_{\text{ms}}}{60\,000} \right\rceil\right) & \text{if } D_{\text{ms}} \ge 3\,000 \text{ ms}
\end{cases}$$

### 3.2. Boundary Test Cases

| Actual Duration ($D_{\text{ms}}$) | Human-readable Time | Billable Voice Minutes | Rationale / Behavior |
| :--- | :--- | :---: | :--- |
| $0 \text{ ms}$ | $0\text{s}$ | **0** | No audio streamed or recorded. |
| $1\,500 \text{ ms}$ | $1.5\text{s}$ | **0** | Accidental click / Noise filter threshold ($< 3\text{s}$). |
| $3\,000 \text{ ms}$ | $3\text{s}$ | **1** | $\lceil 3/60 \rceil = 1$ minute. |
| $59\,000 \text{ ms}$ | $59\text{s}$ | **1** | $\lceil 59/60 \rceil = 1$ minute. |
| $60\,000 \text{ ms}$ | $1\text{m }00\text{s}$ | **1** | $\lceil 60/60 \rceil = 1$ minute. |
| $61\,000 \text{ ms}$ | $1\text{m }01\text{s}$ | **2** | $\lceil 61/60 \rceil = 2$ minutes. |
| $119\,000 \text{ ms}$ | $1\text{m }59\text{s}$ | **2** | $\lceil 119/60 \rceil = 2$ minutes. |
| $120\,000 \text{ ms}$ | $2\text{m }00\text{s}$ | **2** | $\lceil 120/60 \rceil = 2$ minutes. |
| $899\,000 \text{ ms}$ | $14\text{m }59\text{s}$ | **15** | $\lceil 899/60 \rceil = 15$ minutes. |
| $900\,000 \text{ ms}$ | $15\text{m }00\text{s}$ | **15** | Maximum allowable technical session duration. |
| $\ge 900\,001 \text{ ms}$ | $> 15\text{m }00\text{s}$ | **15** | Server-side cap enforced (never bills $>15$ mins). |

---

## 4. MINIMUM REMAINING MINUTES & SESSION DURATION CAP

### 4.1. Start Rule
* **Eligibility Rule:** A user is allowed to start a Voice Session if:
  $$\text{Voice Minutes Available} \ge 1$$
* User is **NOT** required to have 15 full minutes in their wallet to start.

### 4.2. Runtime Cap Rule
If a user has $R$ minutes remaining ($1 \le R < 15$), the server enforces:
$$\text{Max Allowed Session Duration} = R \times 60\,000 \text{ ms}$$
* When elapsed time reaches $R$ minutes:
  1. Server sends a WebSocket warning frame (`VOICE_QUOTA_DEPLETED`).
  2. Server automatically finalizes the session.
  3. Server decrements exactly $R$ minutes.
  4. User receives the Coach Report for the portion completed.

---

## 5. 15-MINUTE SERVER-SIDE ENFORCEMENT

* **Constant:** `MAX_VOICE_SESSION_DURATION_MS = 15 * 60 * 1000` ($900\,000\text{ ms}$).
* **Authority:** Server-side timestamp (`session.started_at` in DB/Memory).
* **Behavior on 15-Minute Expiry:**
  1. At $14\text{m }30\text{s}$, emit a 30-second warning signal.
  2. At $15\text{m }00\text{s}$, server forcibly closes audio ingestion and sets session state to `FINALIZING`.
  3. Quota is decremented by 15 minutes.
  4. Final Coach DSP Metrics & Transcript are compiled and returned.
  5. WebSocket gracefully disconnected with code `1000 (Session Completed)`.

---

## 6. DISCONNECT, ABORT & FAILURE POLICIES

| Scenario | Condition | Billable Duration | Consumption Action |
| :--- | :--- | :--- | :--- |
| **A. User Ends Normally** | User clicks "Hoàn thành" | Actual speech duration ($D_{\text{ms}}$) | Decrement $\lceil D_{\text{ms}} / 60\,000 \rceil$ |
| **B. Client Disconnect / Tab Close** | WebSocket disconnects after speech | Measured speech duration before drop | Decrement $\lceil D_{\text{ms}} / 60\,000 \rceil$ (if $\ge 3\text{s}$) |
| **C. Client Crash / Network Timeout** | Server session remains open | Evaluated from last valid audio chunk timestamp | Decrement $\lceil D_{\text{ms}} / 60\,000 \rceil$ |
| **D. Immediate Exit (Zero speech)** | Connection opened, closed $< 3\text{s}$ | $0\text{ ms}$ | **0 Minutes (No Deduction)** |
| **E. AI / Server 500 Failure** | STT/AI engine throws internal error | Any | **0 Minutes (No Deduction / Protection)** |

---

## 7. ATOMIC CONDITIONAL DECREMENT & CONCURRENCY

### 7.1. Atomic SQL Query
All Voice Minute deductions MUST execute via single-statement conditional SQL:

```sql
UPDATE user_quotas
SET voice_mins_remaining = voice_mins_remaining - :billableMinutes,
    last_reset_at = NOW()
WHERE user_id = :userId::uuid
  AND voice_mins_remaining >= :billableMinutes;
```

### 7.2. Result Interpretation
* `affected_rows === 1` $\rightarrow$ **Success** (`ALLOW`, balance updated).
* `affected_rows === 0` $\rightarrow$ **Failure** (`QUOTA_EXCEEDED`, wallet never drops below 0).

---

## 8. IDEMPOTENCY & CONCURRENT SESSION GUARD

### 8.1. Single Source of Consumption
A Voice Session is finalized and consumed **strictly once** through `finalizeVoiceSession(voiceSessionId)`:
* Session state transitions: `CREATED` $\rightarrow$ `ACTIVE` $\rightarrow$ `FINALIZING` $\rightarrow$ `COMPLETED`.
* Re-executing finalization on a `COMPLETED` session returns the cached final result with `alreadyFinalized: true` and **zero additional quota decrement**.

### 8.2. Concurrent Session Policy
$$\text{MAX\_ACTIVE\_VOICE\_SESSIONS\_PER\_USER} = 1$$
If a user attempts to open a second concurrent Voice Session while one is `ACTIVE`:
* Rejection Code: `VOICE_SESSION_ALREADY_ACTIVE` (HTTP 409 Conflict).

---

## 9. FREE TRIAL CONTRACT

* **Trial Code:** `FREE_TRIAL`
* **Eligibility Requirement:** Verified Phone Number (`PhoneValidator.normalizeE164`).
* **Limit:** Exactly 1 Free Trial claim per verified phone number / account.
* **Duration:** 3 Days (72 Hours).
* **Entitlement Package:**
  * **Text Debate:** 3 sessions
  * **Voice AI:** **5 Voice Minutes**
  * **Assistant:** 1 generation
  * **Coaches:** Logic Coach + Voice DSP enabled

---

## 10. VIP TIME PASS CONTRACT

* **Access Mode:** `TIME_UNLIMITED`
* **Duration Presets:**
  * `VIP_1D` (24 Hours)
  * `VIP_3D` (72 Hours — Hero Campaign Product)
  * `VIP_7D` (7 Days)
  * `VIP_30D` (30 Days)
* **Entitlement Resolution:**
  * If `NOW() >= starts_at AND NOW() < expires_at AND status === 'ACTIVE'`:
    * Access: **UNLIMITED**
    * Quota Decrement: **0** (Wallet balance is untouched and preserved).
* **Technical Safeguards:**
  * 15 minutes per session limit still strictly enforced.
  * Rate limits & concurrent session limits ($=1$) still apply.
* **Interaction with Subscription:**
  * When VIP is active, subscription quota does NOT decrement.
  * When VIP expires, user's prior subscription / add-on quota resumes immediately without any loss or reset.

---

## 11. ADD-ON (CREDIT PACK) CONTRACT

* **Dimension:** Standardized to Voice Minutes.
* **Catalog:**
  * `PACK_VOICE_15`: 15.000 VNĐ $\rightarrow$ **+15 Voice Minutes** (30 days)
  * `PACK_VOICE_60`: 49.000 VNĐ $\rightarrow$ **+60 Voice Minutes** (30 days)
  * `PACK_TEXT_10`: 19.000 VNĐ $\rightarrow$ **+10 Text Sessions** (30 days)
  * `PACK_ASST_5`: 15.000 VNĐ $\rightarrow$ **+5 Assistant Generations** (30 days)
* **Consumption Strategy:** Primary (Subscription) $\rightarrow$ Secondary (Add-on with FEFO).

---

## 12. UNIFIED ENTITLEMENT RESOLUTION HIERARCHY

```text
                          USER REQUEST
                               │
                               ▼
                   ┌───────────────────────┐
                   │  ENTITLEMENT RESOLVER │
                   └───────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     [1. Active VIP]   [2. Subscription]    [3. Free Trial]
            │                  │                  │
    TIME_UNLIMITED             │             TRIAL_QUOTA
            │                  ▼                  │
            │           [4. Add-on FEFO]          │
            │                  │                  │
            ▼                  ▼                  ▼
     ALLOW (No deduct)   ALLOW (Deduct)     ALLOW (Deduct)
                               │
                               ▼ (If all balances = 0)
                         QUOTA_EXCEEDED (403)
```

---

## 13. SEPARATION OF COMMERCE & AI COST TELEMETRY

$$\text{Business Wallet (Voice Minutes)} \quad\neq\quad \text{AI Technical Cost Telemetry}$$

* **AI Gateway Telemetry:** Continues to log `input_tokens`, `output_tokens`, `execution_ms`, `estimated_cost_usd`, `model`.
* **Voice DSP Telemetry:** Logs `wpm`, `filler_count`, `duration_ms`, `pause_alert`, `tier`, `stt_source` into `DebateTranscript`.
* **VIP Users:** Technical telemetry is fully recorded for margin and unit economics analysis, even when $0$ business quota is deducted.

---

## 14. FRONTEND PRESENTATION CONTRACT

* **Profile Tab:** `🎙️ Tranh Biện Giọng Nói (Voice AI): {voiceRemaining} / {voiceLimit} phút`
* **Dashboard:** `{textRemaining} Text | {voiceMinsRemaining}m Voice`
* **Pricing Modal:**
  * Balance: `{voiceMinsRemaining} Phút Voice`
  * Features: `60 phút luyện nói Voice AI` (Standard), `300 phút luyện nói Voice AI` (Premium)
* **Debate Arena:** In Voice Mode, displays live duration timer and remaining minutes indicator.
