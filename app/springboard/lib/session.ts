const STORAGE_KEY = 'springboard:session_id';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}