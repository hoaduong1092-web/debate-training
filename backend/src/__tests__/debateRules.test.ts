import { DebateRuleEngine } from '../services/debateRuleEngine';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass += 1;
    console.log('  ✅ PASS', name);
  } else {
    fail += 1;
    failures.push(name);
    console.log('  ❌ FAIL', name, detail !== undefined ? detail : '');
  }
}

function section(name: string): void {
  console.log(`\n▶ ${name}`);
}

export async function runDebateRuleTests(): Promise<boolean> {
  console.log('============================================================');
  console.log('  DEBATE RULE ENGINE & POI SAFETY GATE TEST SUITE (v15.0.0)');
  console.log('============================================================\n');

  section('TC-RULE-01: Block POI during first minute (Protected Time)');
  {
    const totalDuration = 480; // 8 minutes speech
    check('POI blocked at second 30', DebateRuleEngine.isPoiAllowed(30, totalDuration) === false);
    check('POI blocked at second 59', DebateRuleEngine.isPoiAllowed(59, totalDuration) === false);
  }

  section('TC-RULE-02: Block POI during last minute (Protected Time)');
  {
    const totalDuration = 480; // 8 minutes speech
    check('POI blocked at second 421', DebateRuleEngine.isPoiAllowed(421, totalDuration) === false);
    check('POI blocked at second 479', DebateRuleEngine.isPoiAllowed(479, totalDuration) === false);
  }

  section('TC-RULE-03: Allow POI between 1st minute and 7th minute (Unprotected Window)');
  {
    const totalDuration = 480;
    check('POI allowed at second 60', DebateRuleEngine.isPoiAllowed(60, totalDuration) === true);
    check('POI allowed at second 240', DebateRuleEngine.isPoiAllowed(240, totalDuration) === true);
    check('POI allowed at second 420', DebateRuleEngine.isPoiAllowed(420, totalDuration) === true);
  }

  section('TC-RULE-04: Enforce 15s maximum POI microphone cutoff');
  {
    const normalPoi = DebateRuleEngine.validatePoiDuration(12);
    check('Normal 12s POI is valid', normalPoi.valid === true && normalPoi.cutOffSeconds === 12);

    const excessivePoi = DebateRuleEngine.validatePoiDuration(22);
    check('Excessive 22s POI is capped to 15s cutoff', excessivePoi.valid === false && excessivePoi.cutOffSeconds === 15);
  }

  section('TC-RULE-05: Standard 8-turn WSDC speaker order');
  {
    const order = DebateRuleEngine.getWsdcSpeakerOrder();
    check('Order length is 8', order.length === 8);
    check('First speaker is Prop 1 (Prime Minister)', order[0].speaker === 'Prop 1 (Prime Minister)');
    check('7th speaker is Opp Reply (NEGATIVE)', order[6].side === 'NEGATIVE' && order[6].isReply === true);
    check('8th speaker is Prop Reply (AFFIRMATIVE)', order[7].side === 'AFFIRMATIVE' && order[7].isReply === true);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return fail === 0;
}

if (require.main === module) {
  runDebateRuleTests().then((ok) => process.exit(ok ? 0 : 1));
}
