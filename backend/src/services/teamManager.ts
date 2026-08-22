/**
 * Team Pass & School Bundles Service (Deprecated in v15.0.0 Strict One-Account Policy).
 * Retained with deterministic deprecated response stubs.
 */

export async function provisionTeamBundle(
  leaderUserId: string,
  bundleCode: string,
  orderId?: string,
  txClient?: any,
) {
  return {
    teamGroupId: 'deprecated',
    bundleCode,
    totalSeats: 1,
    leaderUserId,
    orderId,
    invitations: [],
  };
}

export async function redeemTeamInvitation(userId: string, invitationCode: string) {
  return {
    success: false,
    error: 'FEATURE_DEPRECATED',
    message: 'Chức năng đội nhóm/tài khoản phụ đã được bãi bỏ theo Master Blueprint v15.0.0 (Strict One-Account Policy).',
  };
}

export async function getTeamGroupDetails(teamGroupId: string) {
  return null;
}

export async function getUserTeamGroups(userId: string) {
  return {
    leading: [],
    memberOf: [],
  };
}