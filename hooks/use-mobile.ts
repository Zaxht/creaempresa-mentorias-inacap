import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';
function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function snapshot() { return window.matchMedia(QUERY).matches; }
function serverSnapshot() { return false; }

export function useIsMobile() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
