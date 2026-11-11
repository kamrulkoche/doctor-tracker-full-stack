/**
 * One bit of module state: was the session ended on purpose?
 * After an intentional sign-out the guard sends the user to a clean `/login`;
 * after an expired session it adds `?next=` so they return to where they were.
 */
let intentionalSignOut = false;

export function markIntentionalSignOut(): void {
  intentionalSignOut = true;
}

export function consumeIntentionalSignOut(): boolean {
  const value = intentionalSignOut;
  intentionalSignOut = false;
  return value;
}
