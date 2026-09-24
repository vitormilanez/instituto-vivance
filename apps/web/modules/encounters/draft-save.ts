/** Reconcile a save acknowledgement without overwriting edits typed in flight. */
export function acknowledgedDraftField(
  current: string,
  sent: string,
  saved: string,
): string {
  return current === sent ? saved : current;
}
