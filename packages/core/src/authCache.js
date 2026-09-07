/** Whether private client state must be discarded before rendering a session. */
export function identityChanged(previousUserId, nextUserId) {
  return previousUserId !== undefined && previousUserId !== nextUserId;
}
