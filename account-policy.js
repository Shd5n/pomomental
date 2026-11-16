const OWNER_EMAIL = 'dr.adeeb47@outlook.com';

// This is an extra presentation check. The database independently authorizes
// every administrative request using the verified account ID and email.
export function canManage(stateUser, verifiedUser) {
  return stateUser?.isAdmin === true && !!verifiedUser?.id &&
    stateUser.id === verifiedUser.id &&
    String(verifiedUser.email || '').trim().toLowerCase() === OWNER_EMAIL &&
    !!verifiedUser.email_confirmed_at;
}

export function needsWelcome(profile) {
  if (profile?.onboardingCompleted === true) return false;
  return !profile?.displayName?.trim() || /^student$/i.test(profile.displayName.trim()) ||
    profile?.onboardingCompleted === false;
}

export function validDisplayName(value) {
  const name = String(value || '').trim();
  return name.length >= 2 && name.length <= 40 && !/[\u0000-\u001f\u007f]/.test(name);
}
