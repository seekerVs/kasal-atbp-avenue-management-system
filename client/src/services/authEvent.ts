// client/src/services/authEvent.ts

export const AUTH_CHANGE_EVENT = 'auth-change';

// A function to dispatch (send) the event
export const dispatchAuthChangeEvent = () => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
};