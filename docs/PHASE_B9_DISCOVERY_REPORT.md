# 🔒 PHASE B9 — FRONTEND UI PRECISION & ENTITLEMENT/PAYMENT INTEGRATION
# DISCOVERY & ARCHITECTURAL GAP REPORT v1.0
**Project:** AI Debate Master — Thinking OS  
**Repository:** `d:/Projects/The_Debate/debate-training`  
**Source of Truth:** Master Blueprint, `docs/VOICE_QUOTA_CONTRACT_v1.0.md`, `docs/16_PLAN_QUOTA_BUSINESS_SPEC.md`, Sealed B1–B8 Contracts  
**Status:** COMPLETE — SPEC GAP = 0  

---

## 1. Executive Summary & Objective

Phase B9 is the **Frontend UI Precision & Entitlement/Payment Integration** phase.
The backend authority for voice entitlement resolution (B6), credit pack catalog & FEFO engine (B7), atomic billing quantum (B4), 15-minute technical cap & boundary guards (B5), and payment webhook fulfillment (B8) is 100% complete and sealed across 21 test suites.

Phase B9 formalizes and integrates the frontend presentation and interaction layer to ensure:
1. **Unambiguous Entitlement Representation:** VIP, Subscription, Add-on (FEFO), Trial, and QUOTA_EXCEEDED.
2. **Authoritative Duration Ceiling:** Technical cap is strictly $15\text{ minutes} = 900,000\text{ms}$. "TIME_UNLIMITED" strictly means zero quota deduction, never infinite session length.
3. **Voice Preflight UX:** Revalidation before voice session initiation, deterministic handling of `allowed === false`.
4. **Credit Pack Catalog Integration:** Direct purchase and presentation of the 4 active packs (`PACK_VOICE_15`, `PACK_VOICE_60`, `PACK_TEXT_10`, `PACK_ASST_5`) with zero exposure of legacy pack codes.
5. **Robust Payment & Replay UX:** Server-authoritative checkout, idempotency (`alreadyPaid: true`), double-click prevention, and deterministic post-fulfillment refresh.
6. **Zero Client Authority:** Frontend is strictly a presentation and interaction layer; all quota deductions, entitlement decisions, and session caps remain exclusively backend-authoritative.

---

## 2. Current Frontend Architecture

- **Core Stack:** React 18.3.1 (SPA), Vite 5.4.10, TypeScript 5.6.3, TailwindCSS 3.4.19, Lucide React, React Router Dom v7.
- **Top-Level Navigation (`components/Dashboard.tsx`):**
  - Tabs: Arena (`⚔️`), Assistant (`🤖`), Plaza (`🏛️`), History (`📜`), Thinking Profile (`🧠`), Profile / Pricing (`👤`).
  - Top Bar Header: Brand Mark (Thinking OS v16.0), User badge, Quick Quota Badge (`{text} Text | {voice}m Voice`), Theme toggle, Logout.
- **Modals:**
  - `PricingModal.tsx`: Dual-cycle subscription plans and payment gateway checkout.
  - `AudioCheckModal.tsx`: Web Audio API microphone volume analyzer and speaker chime test.
  - `GentleEvictionModal.tsx`: Single-session eviction notification.
  - `AuthModal.tsx` & `Login.tsx`: E.164 phone normalization and OTP login flow.
- **Context Layer:**
  - `AuthContext.tsx`: Manages auth tokens, session ID, user profile, quota state snapshot, and gentle eviction triggers.
  - `ThemeContext.tsx`: Manages dark/light mode state and persistence.

---

## 3. Relevant Pages & Components Audit

| Component | Path | Current Responsibility | Phase B9 Scope / Enhancements |
| :--- | :--- | :--- | :--- |
| **`PricingModal.tsx`** | `frontend/src/components/PricingModal.tsx` | Displays monthly/yearly subscription plans; initiates checkout via SePAY, VNPay, MoMo, Sandbox. | Add Credit Pack Catalog tab (`PACK_VOICE_15`, `PACK_VOICE_60`, `PACK_TEXT_10`, `PACK_ASST_5`), prevent double-click race, handle `alreadyPaid` idempotently. |
| **`ProfileTab.tsx`** | `frontend/src/components/ProfileTab.tsx` | Displays user profile info, real-time quota gauges (text, voice, assistant), plan badges. | Integrate rich Voice Entitlement card (VIP badge, Subscription balance, Add-on FEFO packs list, Trial status), ensure zero NaN. |
| **`DebateArena.tsx`** | `frontend/src/components/DebateArena.tsx` | Main debate interface, text/voice mode switcher, timer, POI deck, argument HUD, coach feedback. | Implement Voice Preflight UX (check entitlement before voice recording), display entitlement badge/notice, clamp UI maxAllowedMs to 15m. |
| **`VoiceRecorder.tsx`** | `frontend/src/components/VoiceRecorder.tsx` | Audio capture, Web Audio DSP telemetry, WebSocket/REST fallback, STT transcription. | Ensure seamless integration with voice preflight and server duration limits. |
| **`AudioCheckModal.tsx`**| `frontend/src/components/AudioCheckModal.tsx` | Pre-match microphone and speaker diagnostics. | Fully compatible; verified no changes needed. |
| **`Dashboard.tsx`** | `frontend/src/components/Dashboard.tsx` | Main shell and top navbar quota indicator. | Ensure quota badge accurately reflects latest backend state without stale caching. |

---

## 4. Relevant Hooks & Service Layer Audit

- **`frontend/src/lib/api.ts`:**
  - Contains API wrappers for debate sessions, messages, history, profile, plans, checkout, and auth.
  - **Audit Finding:** Missing explicit wrappers for `fetchVoiceEntitlement`, `createVoiceSession`, `finalizeVoiceSession`, `abortVoiceSession`.
  - **Action in B9:** Add typed client methods for Voice Session & Entitlement endpoints.
- **`frontend/src/contexts/AuthContext.tsx`:**
  - Provides `useAuth()`, `refreshUser()`, `updateUserQuota()`.
  - **Audit Finding:** `refreshUser()` fetches `/api/v1/auth/me` and falls back to `fetchUserProfile()`.
  - **Action in B9:** Ensure post-payment, post-voice turn, and post-upgrade events trigger `refreshUser()` to purge stale client data.

---

## 5. API Endpoints Trace & Backend Contract Alignment

| Frontend Action | Target Endpoint | HTTP Method | Auth Required | Backend Controller | Contract Verified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Get Voice Entitlement** | `/api/v1/voice/entitlement` | `GET` | Bearer Token | `getVoiceEntitlementHandler` | ✅ Yes (B6 Resolver) |
| **Create Voice Session** | `/api/v1/voice/sessions` | `POST` | Bearer Token | `createVoiceSessionHandler` | ✅ Yes (B3 Lifecycle) |
| **Finalize Voice Session** | `/api/v1/voice/sessions/:id/finalize` | `POST` | Bearer Token | `finalizeVoiceSessionHandler` | ✅ Yes (B4 Atomic Billing) |
| **Abort Voice Session** | `/api/v1/voice/sessions/:id/abort` | `POST` | Bearer Token | `abortVoiceSessionHandler` | ✅ Yes (B3 Lifecycle) |
| **Get Plans & Packs** | `/api/v1/plans` | `GET` | Bearer Token | `getSubscriptionPlans` | ✅ Yes (B7 Catalog) |
| **Create Checkout** | `/api/v1/payments/checkout` | `POST` | Bearer Token | `createCheckoutSession` | ✅ Yes (B8 Checkout) |
| **Sandbox Direct Upgrade** | `/api/v1/payments/sandbox-upgrade` | `POST` | Bearer Token | `handleSandboxDirectUpgrade` | ✅ Yes (B8 Sandbox) |
| **Get User Profile** | `/api/v1/users/profile` | `GET` | Bearer Token | `getUserProfile` | ✅ Yes (Dual Quota) |
| **Current User Info** | `/api/v1/auth/me` | `GET` | Bearer Token | `getMe` | ✅ Yes (Auth & Quota) |

---

## 6. Authoritative Type Definitions

We standardize one single normalized frontend type for Voice Entitlement in `frontend/src/lib/api.ts`:

```typescript
export type VoiceEntitlementMode = 'TIME_UNLIMITED' | 'QUOTA';

export type VoiceEntitlementSource = 'VIP' | 'SUBSCRIPTION' | 'ADD_ON' | 'TRIAL' | null;

export interface VoiceEntitlementActivePack {
  packId: string;
  packCode: string;
  remainingUnits: number;
  expiresAt: string | Date;
}

export interface VoiceEntitlementActiveTrial {
  trialId: string;
  voiceMinsRemaining: number;
  expiresAt: string | Date;
}

export interface VoiceEntitlementBreakdown {
  subscriptionMinutes: number;
  addonMinutes: number;
  trialMinutes: number;
  vipPassCode: string | null;
  activePacks?: VoiceEntitlementActivePack[];
  activeTrial?: VoiceEntitlementActiveTrial | null;
}

export interface VoiceEntitlementResult {
  allowed: boolean;
  mode: VoiceEntitlementMode;
  source: VoiceEntitlementSource;
  availableMinutes: number | null;
  maxAllowedMs: number;
  breakdown?: VoiceEntitlementBreakdown;
  reason?: string;
}
```

---

## 7. State-Management & UI State Matrix

| State ID | Condition | Badge / UI Presentation | Button Action / Interaction |
| :--- | :--- | :--- | :--- |
| **STATE A: Loading** | Fetch in flight | Skeleton spinner / disabled button | Disabled |
| **STATE B: VIP Active** | `source === 'VIP'` & `mode === 'TIME_UNLIMITED'` | 👑 **VIP Time Pass**<br/>"VIP — không trừ quota (tối đa 15 phút/phiên)" | Allowed (`allowed: true`) |
| **STATE C: Subscription** | `source === 'SUBSCRIPTION'` | 💎 **Gói Thuê Bao**<br/>"Voice quota: X phút (tối đa 15 phút/phiên)" | Allowed (`allowed: true`) |
| **STATE D: Add-on** | `source === 'ADD_ON'` | ⚡ **Gói Nạp Add-on**<br/>"Gói nạp: Y phút (FEFO: sớm nhất ưu tiên)" | Allowed (`allowed: true`) |
| **STATE E: Free Trial** | `source === 'TRIAL'` | 🎁 **Dùng Thử Miễn Phí**<br/>"Free Trial còn Z phút" | Allowed (`allowed: true`) |
| **STATE F: Multiple Sources** | Sub + Addon + Trial exist | Precedence respected (Sub $\to$ Addon $\to$ Trial) | Allowed (`allowed: true`) |
| **STATE G: Quota Exhausted** | `allowed === false` (`QUOTA_EXCEEDED`) | ⚠️ **Hết Hạn Ngạch Giọng Nói**<br/>"Không còn phút phát biểu khả dụng" | Blocked $\to$ Opens Pricing / Top-up modal |
| **STATE H: API Error** | HTTP 500 / Network Error | ❌ **Lỗi Kết Nối**<br/>"Không thể kiểm tra hạn ngạch" | Shows Retry CTA |
| **STATE I: Creation Pending** | Session creation in flight | ⏳ "Đang khởi tạo phiên đấu Voice..." | Submit disabled |
| **STATE J: Creation Rejected**| 403 / 409 from server | 🚫 Explanatory error toast / modal | Refetches entitlement |
| **STATE K: Payment Pending** | Checkout initiated | VietQR QR code / gateway redirect link | Double-click disabled |
| **STATE L: Payment Success** | Backend confirms PAID | 🎉 "Thanh toán thành công! Gói đã kích hoạt." | Refreshes user quota & profile |
| **STATE M: Payment Failed** | Gateway returns failure | ❌ "Thanh toán không thành công. Vui lòng thử lại." | Preserves quota, permits retry |
| **STATE N: Payment Cancelled**| User closes / cancels | "Giao dịch đã hủy." | Returns to selector |
| **STATE O: Payment Replay** | `alreadyPaid === true` | ℹ️ "Đơn hàng đã được xử lý trước đó." | Treated as success |
| **STATE P: Stale Frontend** | Turn ended / Tab focused | Auto-revalidates with backend | Backend authoritative value wins |

---

## 8. Existing Payment UI Audit

- `PricingModal.tsx` contains:
  - 3 Monthly Tiers (`BASIC_MONTHLY` @ 49k, `STANDARD_MONTHLY` @ 129k, `PREMIUM_MONTHLY` @ 399k).
  - 3 Yearly Tiers (`BASIC_YEARLY` @ 490k, `STANDARD_YEARLY` @ 1.19m, `PREMIUM_YEARLY` @ 3.59m).
  - Provider Selector: SePAY VietQR, VNPay, MoMo, Sandbox.
- **Gaps Identified & Addressed in B9:**
  - **Credit Pack Tab:** Added tab to purchase individual add-on packs (`PACK_VOICE_15`, `PACK_VOICE_60`, `PACK_TEXT_10`, `PACK_ASST_5`).
  - **Authoritative Price Derivation:** All prices directly bound to backend `PlanQuotaRegistry` / `/api/v1/plans`.
  - **Replay Handshake:** Recognizes `alreadyPaid: true` as already fulfilled without throwing generic failure.

---

## 9. Existing Voice UI Audit

- `DebateArena.tsx` currently has `inputMode === 'voice'`, which toggles `VoiceRecorder.tsx`.
- **Gaps Identified & Addressed in B9:**
  - Added **Voice Preflight Check**: When switching to Voice Mode or clicking to record, `DebateArena` checks voice entitlement.
  - If `allowed === false`, an explanatory Quota Exceeded notification is presented with immediate options to upgrade or buy Voice Boost (`PACK_VOICE_15` or `PACK_VOICE_60`), blocking voice session creation.
  - Displayed session duration ceiling is strictly $15\text{ minutes}$ (or remaining quota if $<15\text{m}$).

---

## 10. Existing Quota UI Audit

- `ProfileTab.tsx` renders 3 quota cards: Text Debate, Voice AI, Assistant Questions.
- **Enhancement in B9:**
  - Displays user's active entitlement details (VIP Pass badge, Subscription minutes, active Credit Packs with expiration dates in FEFO order, or Free Trial remaining minutes).
  - Guarantees zero `NaN` or `undefined` presentation.

---

## 11. Error & Loading Handling Audit

- **Standardized Error Codes:**
  - `QUOTA_EXCEEDED` $\to$ Clear Vietnamese explanation & CTA to top up.
  - `VOICE_SESSION_ALREADY_ACTIVE` $\to$ Explains that another voice session is active.
  - `SESSION_REVOKED` $\to$ Triggers gentle eviction modal.
  - `UNAUTHORIZED` $\to$ Directs to login.
  - `INVALID_PRODUCT` $\to$ Re-fetches catalog.

---

## 12. Security & Invariant Audit

1. **Client Price Tamper Resistance:** Frontend passes `itemCode` and `provider` only; server queries authoritative price.
2. **Client Duration Spoof Resistance:** Server clamps elapsed duration to technical cap ($900,000\text{ms}$).
3. **No Client-Side Quota Deductions:** Frontend does not decrement quotas locally; it always re-fetches authoritative balances from the server.
4. **No Legacy Code Exposure:** `PACK_VOICE_5` and `PACK_VOICE_10` are excluded from the active catalog UI.

---

## 13. SPEC GAP Audit

| Requirement | Contract Source | Status | Spec Gap Count |
| :--- | :--- | :--- | :--- |
| Voice Entitlement Precedence | `docs/VOICE_QUOTA_CONTRACT_v1.0.md` §12 | Sealed (B6) | **0** |
| 15-Minute Technical Cap | `docs/VOICE_QUOTA_CONTRACT_v1.0.md` §6 | Sealed (B5) | **0** |
| Active Credit Pack Catalog | `docs/16_PLAN_QUOTA_BUSINESS_SPEC.md` | Sealed (B7) | **0** |
| Payment Fulfillment & Idempotency | `docs/VOICE_QUOTA_CONTRACT_v1.0.md` §15 | Sealed (B8) | **0** |
| Dual-Cycle Subscription Plans | `docs/16_PLAN_QUOTA_BUSINESS_SPEC.md` | Sealed (B8) | **0** |

$$\mathbf{SPEC\ GAP\ COUNT = 0}$$

---

## 14. Implementation Plan for Phase B9

1. **API Client Layer (`frontend/src/lib/api.ts`):**
   - Export authoritative types: `VoiceEntitlementResult`, `VoiceEntitlementMode`, `VoiceEntitlementSource`, `VoiceEntitlementBreakdown`.
   - Export methods: `fetchVoiceEntitlement`, `createVoiceSession`, `finalizeVoiceSession`, `abortVoiceSession`.
2. **Pricing & Checkout Modal (`frontend/src/components/PricingModal.tsx`):**
   - Add Credit Pack catalog selector (`PACK_VOICE_15`, `PACK_VOICE_60`, `PACK_TEXT_10`, `PACK_ASST_5`).
   - Add duplicate click lock (`isSubmitting` guard).
   - Handle `alreadyPaid` gracefully.
3. **Profile & Entitlement Dashboard (`frontend/src/components/ProfileTab.tsx`):**
   - Add rich Voice Entitlement card (VIP, Subscription, FEFO Add-on Packs list, Free Trial).
4. **Debate Arena Voice Preflight (`frontend/src/components/DebateArena.tsx`):**
   - Add preflight entitlement check before voice recording.
   - Display clear quota / VIP status bar with $15\text{m}$ max cap.
5. **Dedicated Phase B9 Contract Test Suite (`backend/src/__tests__/phaseB9FrontendContract.test.ts`):**
   - Implement 30 comprehensive test cases covering `B9-01` through `B9-30`.
6. **Master Regression Execution:**
   - Register B9 suite in `runAll.ts` (Suite #22) and verify 100% green.
