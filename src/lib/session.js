export const SESSION_KEY = 'pt_user';

export function saveSession(authPayload) {
  const serialized = JSON.stringify(authPayload);
  localStorage.setItem(SESSION_KEY, serialized);
  sessionStorage.setItem(SESSION_KEY, serialized);
}

export function getSession() {
  try {
    const localValue = localStorage.getItem(SESSION_KEY);
    if (localValue) {
      sessionStorage.setItem(SESSION_KEY, localValue);
      return JSON.parse(localValue);
    }

    const sessionValue = sessionStorage.getItem(SESSION_KEY);
    if (sessionValue) {
      localStorage.setItem(SESSION_KEY, sessionValue);
      return JSON.parse(sessionValue);
    }

    return null;
  } catch {
    return null;
  }
}

export function updateSession(patch) {
  const current = getSession() || {};
  const nextValue = { ...current, ...patch };
  saveSession(nextValue);
  return nextValue;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
