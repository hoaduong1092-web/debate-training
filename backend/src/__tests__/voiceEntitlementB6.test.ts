/**
 * Phase B6 — VIP Time Pass & Free Trial Entitlement Resolvers Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * 
 * Verifies all 35 Phase B6 Invariants across VIP, Subscription, Add-on, Trial, Precedence & Defensive Security:
 *  - TC-B6-01: Active VIP -> TIME_UNLIMITED
 *  - TC-B6-02: VIP startedAt exactly NOW boundary -> valid
 *  - TC-B6-03: VIP expiresAt exactly NOW boundary -> invalid
 *  - TC-B6-04: Expired VIP -> falls through to subscription
 *  - TC-B6-05: Future-start VIP -> invalid
 *  - TC-B6-06: Inactive/cancelled VIP -> invalid
 *  - TC-B6-07: VIP -> maxAllowedMs exactly 900,000
 *  - TC-B6-08: VIP -> zero wallet mutation
 *  - TC-B6-09: Subscription >= 1 minute -> SUBSCRIPTION source
 *  - TC-B6-10: Subscription 3 minutes -> maxAllowedMs 180,000
 *  - TC-B6-11: Subscription 15+ minutes -> maxAllowedMs capped at 900,000
 *  - TC-B6-12: Subscription 0 -> fall through
 *  - TC-B6-13: Eligible add-on -> ADD_ON source
 *  - TC-B6-14: Multiple packs -> FEFO expiresAt ASC
 *  - TC-B6-15: Expired pack ignored
 *  - TC-B6-16: Depleted pack ignored
 *  - TC-B6-17: B6 does not mutate pack balance
 *  - TC-B6-18: Active valid trial -> TRIAL source
 *  - TC-B6-19: Expired trial -> ignored
 *  - TC-B6-20: Trial with zero voice minutes -> ignored
 *  - TC-B6-21: Trial status COMPLETED -> ignored
 *  - TC-B6-22: Trial 5 minutes -> maxAllowedMs 300,000
 *  - TC-B6-23: B6 does not mutate trial balance
 *  - TC-B6-24: VIP + subscription + addon + trial -> VIP wins
 *  - TC-B6-25: No VIP + subscription + addon + trial -> subscription wins
 *  - TC-B6-26: No VIP + zero subscription + addon + trial -> addon wins
 *  - TC-B6-27: No VIP + zero subscription + no addon + trial -> trial wins
 *  - TC-B6-28: All exhausted -> QUOTA_EXCEEDED
 *  - TC-B6-29: Negative balances -> treated as zero
 *  - TC-B6-30: Malformed numeric values cannot create entitlement
 *  - TC-B6-31: maxAllowedMs never exceeds 900,000
 *  - TC-B6-32: Repeated resolution is read-only
 *  - TC-B6-33: Resolution does not consume TEXT_DEBATE
 *  - TC-B6-34: Resolution does not consume Assistant credit
 *  - TC-B6-35: Resolution does not consume Voice minutes
 */

import { PrismaClient } from '@prisma/client';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';
import { VoiceSessionService, MAX_SESSION_DURATION_MS } from '../services/voiceSessionService';

const prisma = new PrismaClient();

const B6_USER_VIP = '66666666-5555-4666-b666-666666666601';
const B6_USER_SUB = '66666666-5555-4666-b666-666666666602';
const B6_USER_ADDON = '66666666-5555-4666-b666-666666666603';
const B6_USER_TRIAL = '66666666-5555-4666-b666-666666666604';
const B6_USER_COMBO = '66666666-5555-4666-b666-666666666605';
const B6_USER_EXHAUSTED = '66666666-5555-4666-b666-666666666606';

const ALL_B6_USERS = [
  B6_USER_VIP,
  B6_USER_SUB,
  B6_USER_ADDON,
  B6_USER_TRIAL,
  B6_USER_COMBO,
  B6_USER_EXHAUSTED,
];

async function cleanupB6TestData() {
  await prisma.voiceSession.deleteMany({ where: { userId: { in: ALL_B6_USERS } } });
  await prisma.userVipPass.deleteMany({ where: { userId: { in: ALL_B6_USERS } } });
  await prisma.userCreditPack.deleteMany({ where: { userId: { in: ALL_B6_USERS } } });
  await prisma.userFreeTrial.deleteMany({ where: { userId: { in: ALL_B6_USERS } } });
  await prisma.debateTranscript.deleteMany({ where: { session: { userId: { in: ALL_B6_USERS } } } });
  await prisma.debateSession.deleteMany({ where: { userId: { in: ALL_B6_USERS } } });
  await prisma.userQuota.deleteMany({ where: { userId: { in: ALL_B6_USERS } } });
  await prisma.user.deleteMany({ where: { id: { in: ALL_B6_USERS } } });
}

async function setupB6TestData() {
  await cleanupB6TestData();

  // 1. VIP User
  await prisma.user.create({
    data: {
      id: B6_USER_VIP,
      phoneNumber: '+84666666601',
      displayName: 'B6 VIP User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 15,
          assistantRemaining: 10,
        },
      },
      vipPasses: {
        create: {
          passCode: 'VIP_30D',
          status: 'ACTIVE',
          startedAt: new Date(Date.now() - 3600_000),
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      },
    },
  });

  // 2. Subscription User (30 voice mins)
  await prisma.user.create({
    data: {
      id: B6_USER_SUB,
      phoneNumber: '+84666666602',
      displayName: 'B6 Sub User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 30,
          assistantRemaining: 10,
        },
      },
    },
  });

  // 3. Add-on User (0 sub mins + 2 packs)
  await prisma.user.create({
    data: {
      id: B6_USER_ADDON,
      phoneNumber: '+84666666603',
      displayName: 'B6 Addon User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 0,
          assistantRemaining: 10,
        },
      },
      creditPacks: {
        createMany: {
          data: [
            {
              packCode: 'PACK_VOICE_15',
              dimension: 'voice',
              totalUnits: 15,
              remainingUnits: 15,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 10 * 86400_000), // expires sooner
            },
            {
              packCode: 'PACK_VOICE_60',
              dimension: 'voice',
              totalUnits: 60,
              remainingUnits: 60,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 20 * 86400_000), // expires later
            },
          ],
        },
      },
    },
  });

  // 4. Trial User (0 sub mins, active trial with 5 mins)
  await prisma.user.create({
    data: {
      id: B6_USER_TRIAL,
      phoneNumber: '+84666666604',
      displayName: 'B6 Trial User',
      quota: {
        create: {
          textTurnsRemaining: 0,
          voiceMinsRemaining: 0,
          assistantRemaining: 0,
        },
      },
      freeTrial: {
        create: {
          phoneNumber: '+84666666604',
          status: 'ACTIVE',
          textRemaining: 3,
          voiceMinsRemaining: 5,
          assistantRemaining: 1,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 3 * 86400_000),
        },
      },
    },
  });

  // 5. Combo User (VIP + Sub + Addon + Trial all configured)
  await prisma.user.create({
    data: {
      id: B6_USER_COMBO,
      phoneNumber: '+84666666605',
      displayName: 'B6 Combo User',
      quota: {
        create: {
          textTurnsRemaining: 50,
          voiceMinsRemaining: 20,
          assistantRemaining: 20,
        },
      },
      vipPasses: {
        create: {
          passCode: 'VIP_7D',
          status: 'ACTIVE',
          startedAt: new Date(Date.now() - 3600_000),
          expiresAt: new Date(Date.now() + 7 * 86400_000),
        },
      },
      creditPacks: {
        create: {
          packCode: 'PACK_VOICE_15',
          dimension: 'voice',
          totalUnits: 15,
          remainingUnits: 15,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 15 * 86400_000),
        },
      },
      freeTrial: {
        create: {
          phoneNumber: '+84666666605',
          status: 'ACTIVE',
          textRemaining: 3,
          voiceMinsRemaining: 5,
          assistantRemaining: 1,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 3 * 86400_000),
        },
      },
    },
  });

  // 6. Exhausted User (0 everywhere, no VIP, no packs, no trial)
  await prisma.user.create({
    data: {
      id: B6_USER_EXHAUSTED,
      phoneNumber: '+84666666606',
      displayName: 'B6 Exhausted User',
      quota: {
        create: {
          textTurnsRemaining: 0,
          voiceMinsRemaining: 0,
          assistantRemaining: 0,
        },
      },
    },
  });
}

async function runB6Tests() {
  console.log('\n============================================================');
  console.log('  PHASE B6 — VIP TIME PASS & FREE TRIAL ENTITLEMENT TEST');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`  \u2705 PASS: ${title}`);
      passed++;
    } else {
      console.error(`  \u274c FAIL: ${title}`, extra ? extra : '');
      failed++;
    }
  }

  await setupB6TestData();

  // ─── PART 1: VIP TIME PASS RESOLUTION (01-08) ──────────────────────────────
  console.log('▶ SECTION 1: VIP Time Pass Resolution');

  // TC-B6-01: Active VIP -> TIME_UNLIMITED
  try {
    const res1 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP);
    assert(
      'TC-B6-01: Active VIP -> TIME_UNLIMITED',
      res1.allowed === true &&
      res1.mode === 'TIME_UNLIMITED' &&
      res1.source === 'VIP' &&
      res1.availableMinutes === null &&
      res1.breakdown?.vipPassCode === 'VIP_30D'
    );
  } catch (e: any) {
    assert('TC-B6-01', false, e.message);
  }

  // TC-B6-02: VIP startedAt exactly NOW boundary -> valid
  try {
    const nowBoundary = new Date();
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_VIP },
      data: {
        startedAt: nowBoundary,
        expiresAt: new Date(nowBoundary.getTime() + 86400_000),
      },
    });
    const res2 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP, nowBoundary);
    assert(
      'TC-B6-02: VIP startedAt exactly NOW boundary -> valid',
      res2.allowed === true && res2.mode === 'TIME_UNLIMITED' && res2.source === 'VIP'
    );
  } catch (e: any) {
    assert('TC-B6-02', false, e.message);
  }

  // TC-B6-03: VIP expiresAt exactly NOW boundary -> invalid (strictly expiresAt > now)
  try {
    const nowBoundary = new Date();
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_VIP },
      data: {
        startedAt: new Date(nowBoundary.getTime() - 86400_000),
        expiresAt: nowBoundary,
      },
    });
    const res3 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP, nowBoundary);
    // When VIP expires at now, it should fall through to Subscription (15 mins)
    assert(
      'TC-B6-03: VIP expiresAt exactly NOW boundary -> invalid for VIP, falls through to Subscription',
      res3.allowed === true && res3.mode === 'QUOTA' && res3.source === 'SUBSCRIPTION'
    );
  } catch (e: any) {
    assert('TC-B6-03', false, e.message);
  }

  // TC-B6-04: Expired VIP -> falls through to subscription
  try {
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_VIP },
      data: {
        startedAt: new Date(Date.now() - 10 * 86400_000),
        expiresAt: new Date(Date.now() - 1 * 86400_000), // expired 1 day ago
      },
    });
    const res4 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP);
    assert(
      'TC-B6-04: Expired VIP -> falls through to subscription (15 mins)',
      res4.allowed === true && res4.source === 'SUBSCRIPTION' && res4.availableMinutes === 15
    );
  } catch (e: any) {
    assert('TC-B6-04', false, e.message);
  }

  // TC-B6-05: Future-start VIP -> invalid
  try {
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_VIP },
      data: {
        startedAt: new Date(Date.now() + 86400_000), // starts tomorrow
        expiresAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
    const res5 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP);
    assert(
      'TC-B6-05: Future-start VIP -> invalid, falls through to subscription',
      res5.allowed === true && res5.source === 'SUBSCRIPTION'
    );
  } catch (e: any) {
    assert('TC-B6-05', false, e.message);
  }

  // TC-B6-06: Inactive/cancelled VIP -> invalid
  try {
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_VIP },
      data: {
        status: 'CANCELLED',
        startedAt: new Date(Date.now() - 3600_000),
        expiresAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
    const res6 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP);
    assert(
      'TC-B6-06: Inactive/cancelled VIP -> invalid, falls through to subscription',
      res6.allowed === true && res6.source === 'SUBSCRIPTION'
    );
  } catch (e: any) {
    assert('TC-B6-06', false, e.message);
  }

  // TC-B6-07: VIP -> maxAllowedMs exactly 900000
  try {
    // Restore active VIP
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_VIP },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(Date.now() - 3600_000),
        expiresAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
    const res7 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP);
    assert(
      'TC-B6-07: VIP -> maxAllowedMs exactly 900,000ms (15 minutes)',
      res7.maxAllowedMs === MAX_SESSION_DURATION_MS && res7.maxAllowedMs === 900_000
    );
  } catch (e: any) {
    assert('TC-B6-07', false, e.message);
  }

  // TC-B6-08: VIP -> zero wallet mutation
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: B6_USER_VIP } });
    await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_VIP);
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B6_USER_VIP } });
    assert(
      'TC-B6-08: VIP -> zero wallet mutation during resolution',
      quotaBefore!.voiceMinsRemaining === quotaAfter!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('TC-B6-08', false, e.message);
  }

  // ─── PART 2: SUBSCRIPTION QUOTA RESOLUTION (09-12) ─────────────────────────
  console.log('\n▶ SECTION 2: Subscription Quota Resolution');

  // TC-B6-09: Subscription >= 1 minute -> SUBSCRIPTION source
  try {
    const res9 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_SUB);
    assert(
      'TC-B6-09: Subscription >= 1 minute -> SUBSCRIPTION source',
      res9.allowed === true &&
      res9.mode === 'QUOTA' &&
      res9.source === 'SUBSCRIPTION' &&
      res9.availableMinutes === 30
    );
  } catch (e: any) {
    assert('TC-B6-09', false, e.message);
  }

  // TC-B6-10: Subscription 3 minutes -> maxAllowedMs 180,000
  try {
    await prisma.userQuota.update({
      where: { userId: B6_USER_SUB },
      data: { voiceMinsRemaining: 3 },
    });
    const res10 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_SUB);
    assert(
      'TC-B6-10: Subscription 3 minutes -> maxAllowedMs 180,000ms',
      res10.availableMinutes === 3 && res10.maxAllowedMs === 180_000
    );
  } catch (e: any) {
    assert('TC-B6-10', false, e.message);
  }

  // TC-B6-11: Subscription 15+ minutes -> maxAllowedMs capped at 900,000
  try {
    await prisma.userQuota.update({
      where: { userId: B6_USER_SUB },
      data: { voiceMinsRemaining: 60 },
    });
    const res11 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_SUB);
    assert(
      'TC-B6-11: Subscription 15+ minutes (60m) -> maxAllowedMs capped at 900,000ms',
      res11.availableMinutes === 60 && res11.maxAllowedMs === 900_000
    );
  } catch (e: any) {
    assert('TC-B6-11', false, e.message);
  }

  // TC-B6-12: Subscription 0 -> fall through
  try {
    await prisma.userQuota.update({
      where: { userId: B6_USER_SUB },
      data: { voiceMinsRemaining: 0 },
    });
    const res12 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_SUB);
    assert(
      'TC-B6-12: Subscription 0 with no packs/trial -> QUOTA_EXCEEDED (allowed: false)',
      res12.allowed === false && res12.source === null && res12.availableMinutes === 0
    );
  } catch (e: any) {
    assert('TC-B6-12', false, e.message);
  }

  // ─── PART 3: ADD-ON CREDIT PACK RESOLUTION (13-17) ─────────────────────────
  console.log('\n▶ SECTION 3: Add-on Credit Pack Resolution');

  // TC-B6-13: Eligible add-on -> ADD_ON source
  try {
    const res13 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_ADDON);
    assert(
      'TC-B6-13: Eligible add-on (sub=0) -> ADD_ON source with combined total',
      res13.allowed === true &&
      res13.mode === 'QUOTA' &&
      res13.source === 'ADD_ON' &&
      res13.availableMinutes === 75 // 15 + 60
    );
  } catch (e: any) {
    assert('TC-B6-13', false, e.message);
  }

  // TC-B6-14: Multiple packs -> FEFO expiresAt ASC
  try {
    const res14 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_ADDON);
    const packs = res14.breakdown?.activePacks || [];
    assert(
      'TC-B6-14: Multiple packs -> FEFO sorted by expiresAt ASC',
      packs.length === 2 &&
      packs[0].packCode === 'PACK_VOICE_15' &&
      packs[1].packCode === 'PACK_VOICE_60' &&
      packs[0].expiresAt.getTime() < packs[1].expiresAt.getTime()
    );
  } catch (e: any) {
    assert('TC-B6-14', false, e.message);
  }

  // TC-B6-15: Expired pack ignored
  try {
    await prisma.userCreditPack.updateMany({
      where: { userId: B6_USER_ADDON, packCode: 'PACK_VOICE_15' },
      data: { expiresAt: new Date(Date.now() - 3600_000) }, // expired 1 hour ago
    });
    const res15 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_ADDON);
    assert(
      'TC-B6-15: Expired pack ignored -> only active PACK_VOICE_60 available (60 mins)',
      res15.availableMinutes === 60 &&
      res15.breakdown?.activePacks?.length === 1 &&
      res15.breakdown?.activePacks[0].packCode === 'PACK_VOICE_60'
    );
  } catch (e: any) {
    assert('TC-B6-15', false, e.message);
  }

  // TC-B6-16: Depleted pack ignored
  try {
    await prisma.userCreditPack.updateMany({
      where: { userId: B6_USER_ADDON, packCode: 'PACK_VOICE_60' },
      data: { remainingUnits: 0, status: 'DEPLETED' },
    });
    const res16 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_ADDON);
    assert(
      'TC-B6-16: Depleted pack ignored -> total available = 0, allowed = false',
      res16.allowed === false && res16.availableMinutes === 0
    );
  } catch (e: any) {
    assert('TC-B6-16', false, e.message);
  }

  // TC-B6-17: B6 does not mutate pack balance
  try {
    // Recreate a pack
    await prisma.userCreditPack.updateMany({
      where: { userId: B6_USER_ADDON, packCode: 'PACK_VOICE_60' },
      data: {
        remainingUnits: 60,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 20 * 86400_000),
      },
    });
    const packBefore = await prisma.userCreditPack.findFirst({ where: { userId: B6_USER_ADDON, packCode: 'PACK_VOICE_60' } });
    await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_ADDON);
    const packAfter = await prisma.userCreditPack.findFirst({ where: { userId: B6_USER_ADDON, packCode: 'PACK_VOICE_60' } });
    assert(
      'TC-B6-17: B6 does not mutate pack balance during resolution',
      packBefore!.remainingUnits === packAfter!.remainingUnits
    );
  } catch (e: any) {
    assert('TC-B6-17', false, e.message);
  }

  // ─── PART 4: FREE TRIAL RESOLUTION (18-23) ─────────────────────────────────
  console.log('\n▶ SECTION 4: Free Trial Resolution');

  // TC-B6-18: Active valid trial -> TRIAL source
  try {
    const res18 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_TRIAL);
    assert(
      'TC-B6-18: Active valid trial -> TRIAL source (5 mins)',
      res18.allowed === true &&
      res18.mode === 'QUOTA' &&
      res18.source === 'TRIAL' &&
      res18.availableMinutes === 5 &&
      res18.breakdown?.activeTrial?.voiceMinsRemaining === 5
    );
  } catch (e: any) {
    assert('TC-B6-18', false, e.message);
  }

  // TC-B6-19: Expired trial -> ignored
  try {
    await prisma.userFreeTrial.updateMany({
      where: { userId: B6_USER_TRIAL },
      data: { expiresAt: new Date(Date.now() - 3600_000) },
    });
    const res19 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_TRIAL);
    assert(
      'TC-B6-19: Expired trial -> ignored, allowed = false',
      res19.allowed === false && res19.availableMinutes === 0
    );
  } catch (e: any) {
    assert('TC-B6-19', false, e.message);
  }

  // TC-B6-20: Trial with zero voice minutes -> ignored
  try {
    await prisma.userFreeTrial.updateMany({
      where: { userId: B6_USER_TRIAL },
      data: {
        expiresAt: new Date(Date.now() + 3 * 86400_000),
        voiceMinsRemaining: 0,
      },
    });
    const res20 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_TRIAL);
    assert(
      'TC-B6-20: Trial with zero voice minutes -> ignored, allowed = false',
      res20.allowed === false && res20.availableMinutes === 0
    );
  } catch (e: any) {
    assert('TC-B6-20', false, e.message);
  }

  // TC-B6-21: Trial status COMPLETED -> ignored
  try {
    await prisma.userFreeTrial.updateMany({
      where: { userId: B6_USER_TRIAL },
      data: {
        status: 'COMPLETED',
        voiceMinsRemaining: 5,
      },
    });
    const res21 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_TRIAL);
    assert(
      'TC-B6-21: Trial status COMPLETED -> ignored, allowed = false',
      res21.allowed === false && res21.availableMinutes === 0
    );
  } catch (e: any) {
    assert('TC-B6-21', false, e.message);
  }

  // TC-B6-22: Trial 5 minutes -> maxAllowedMs 300,000
  try {
    await prisma.userFreeTrial.updateMany({
      where: { userId: B6_USER_TRIAL },
      data: {
        status: 'ACTIVE',
        voiceMinsRemaining: 5,
        expiresAt: new Date(Date.now() + 3 * 86400_000),
      },
    });
    const res22 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_TRIAL);
    assert(
      'TC-B6-22: Trial 5 minutes -> maxAllowedMs 300,000ms',
      res22.availableMinutes === 5 && res22.maxAllowedMs === 300_000
    );
  } catch (e: any) {
    assert('TC-B6-22', false, e.message);
  }

  // TC-B6-23: B6 does not mutate trial balance
  try {
    const trialBefore = await prisma.userFreeTrial.findFirst({ where: { userId: B6_USER_TRIAL } });
    await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_TRIAL);
    const trialAfter = await prisma.userFreeTrial.findFirst({ where: { userId: B6_USER_TRIAL } });
    assert(
      'TC-B6-23: B6 does not mutate trial balance during resolution',
      trialBefore!.voiceMinsRemaining === trialAfter!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('TC-B6-23', false, e.message);
  }

  // ─── PART 5: PRECEDENCE MATRIX (24-28) ─────────────────────────────────────
  console.log('\n▶ SECTION 5: Precedence Matrix');

  // TC-B6-24: VIP + subscription + addon + trial -> VIP wins
  try {
    const res24 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_COMBO);
    assert(
      'TC-B6-24: VIP + subscription + addon + trial -> VIP wins (Priority 1)',
      res24.allowed === true &&
      res24.mode === 'TIME_UNLIMITED' &&
      res24.source === 'VIP' &&
      res24.breakdown?.subscriptionMinutes === 20 &&
      res24.breakdown?.addonMinutes === 15 &&
      res24.breakdown?.trialMinutes === 5
    );
  } catch (e: any) {
    assert('TC-B6-24', false, e.message);
  }

  // TC-B6-25: No VIP + subscription + addon + trial -> subscription wins
  try {
    await prisma.userVipPass.updateMany({
      where: { userId: B6_USER_COMBO },
      data: { status: 'CANCELLED' },
    });
    const res25 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_COMBO);
    assert(
      'TC-B6-25: No VIP + subscription + addon + trial -> subscription wins (Priority 2)',
      res25.allowed === true &&
      res25.mode === 'QUOTA' &&
      res25.source === 'SUBSCRIPTION' &&
      res25.availableMinutes === 40 // 20 sub + 15 addon + 5 trial
    );
  } catch (e: any) {
    assert('TC-B6-25', false, e.message);
  }

  // TC-B6-26: No VIP + zero subscription + addon + trial -> addon wins
  try {
    await prisma.userQuota.update({
      where: { userId: B6_USER_COMBO },
      data: { voiceMinsRemaining: 0 },
    });
    const res26 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_COMBO);
    assert(
      'TC-B6-26: No VIP + zero subscription + addon + trial -> addon wins (Priority 3)',
      res26.allowed === true &&
      res26.mode === 'QUOTA' &&
      res26.source === 'ADD_ON' &&
      res26.availableMinutes === 20 // 15 addon + 5 trial
    );
  } catch (e: any) {
    assert('TC-B6-26', false, e.message);
  }

  // TC-B6-27: No VIP + zero subscription + no addon + trial -> trial wins
  try {
    await prisma.userCreditPack.updateMany({
      where: { userId: B6_USER_COMBO },
      data: { remainingUnits: 0, status: 'DEPLETED' },
    });
    const res27 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_COMBO);
    assert(
      'TC-B6-27: No VIP + zero subscription + no addon + trial -> trial wins (Priority 4)',
      res27.allowed === true &&
      res27.mode === 'QUOTA' &&
      res27.source === 'TRIAL' &&
      res27.availableMinutes === 5 // 5 trial
    );
  } catch (e: any) {
    assert('TC-B6-27', false, e.message);
  }

  // TC-B6-28: All exhausted -> QUOTA_EXCEEDED
  try {
    const res28 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    assert(
      'TC-B6-28: All exhausted -> QUOTA_EXCEEDED (allowed: false, Priority 5)',
      res28.allowed === false &&
      res28.source === null &&
      res28.availableMinutes === 0 &&
      res28.maxAllowedMs === 0
    );
  } catch (e: any) {
    assert('TC-B6-28', false, e.message);
  }

  // ─── PART 6: DEFENSIVE & READ-ONLY SECURITY (29-35) ────────────────────────
  console.log('\n▶ SECTION 6: Defensive & Read-Only Security');

  // TC-B6-29: Negative balances -> treated as zero
  try {
    await prisma.userQuota.update({
      where: { userId: B6_USER_EXHAUSTED },
      data: { voiceMinsRemaining: -10 },
    });
    const res29 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    assert(
      'TC-B6-29: Negative balances -> treated as zero, allowed = false',
      res29.allowed === false && res29.availableMinutes === 0
    );
  } catch (e: any) {
    assert('TC-B6-29', false, e.message);
  }

  // TC-B6-30: Malformed numeric values cannot create entitlement
  try {
    const res30 = (VoiceEntitlementResolver as any).sanitizeMinutes(NaN);
    const res30b = (VoiceEntitlementResolver as any).sanitizeMinutes(Infinity);
    const res30c = (VoiceEntitlementResolver as any).sanitizeMinutes(-5);
    const res30d = (VoiceEntitlementResolver as any).sanitizeMinutes('60');
    assert(
      'TC-B6-30: Malformed numeric values (NaN, Inf, -5, string) safely sanitized to 0',
      res30 === 0 && res30b === 0 && res30c === 0 && res30d === 0
    );
  } catch (e: any) {
    assert('TC-B6-30', false, e.message);
  }

  // TC-B6-31: maxAllowedMs never exceeds 900,000
  try {
    await prisma.userQuota.update({
      where: { userId: B6_USER_EXHAUSTED },
      data: { voiceMinsRemaining: 1000 }, // 1000 mins
    });
    const res31 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    assert(
      'TC-B6-31: maxAllowedMs never exceeds 900,000ms for massive quotas (1000m)',
      res31.availableMinutes === 1000 && res31.maxAllowedMs === 900_000
    );
  } catch (e: any) {
    assert('TC-B6-31', false, e.message);
  }

  // TC-B6-32: Repeated resolution is read-only (10 calls)
  try {
    const quotaStart = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    for (let i = 0; i < 10; i++) {
      await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    }
    const quotaEnd = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    assert(
      'TC-B6-32: Repeated resolution (10x) is 100% read-only with zero DB mutations',
      quotaStart!.voiceMinsRemaining === quotaEnd!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('TC-B6-32', false, e.message);
  }

  // TC-B6-33: Resolution does not consume TEXT_DEBATE
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    assert(
      'TC-B6-33: Resolution does not consume TEXT_DEBATE turns',
      quotaBefore!.textTurnsRemaining === quotaAfter!.textTurnsRemaining
    );
  } catch (e: any) {
    assert('TC-B6-33', false, e.message);
  }

  // TC-B6-34: Resolution does not consume Assistant credit
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    assert(
      'TC-B6-34: Resolution does not consume Assistant credit',
      quotaBefore!.assistantRemaining === quotaAfter!.assistantRemaining
    );
  } catch (e: any) {
    assert('TC-B6-34', false, e.message);
  }

  // TC-B6-35: Resolution does not consume Voice minutes
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    await VoiceEntitlementResolver.resolveVoiceEntitlement(B6_USER_EXHAUSTED);
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B6_USER_EXHAUSTED } });
    assert(
      'TC-B6-35: Resolution does not consume Voice minutes',
      quotaBefore!.voiceMinsRemaining === quotaAfter!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('TC-B6-35', false, e.message);
  }

  // Cleanup
  await cleanupB6TestData();

  console.log('\n============================================================');
  console.log(`  B6 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runB6Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal B6 Test Error:', err);
    process.exit(1);
  });
