export const SESSION_KEY = 'pt_user';

export function saveSession(authPayload) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(authPayload));
}

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}
