export function translateAuth0UserId(sub: string): string {
  return sub.replace('auth0|', '');
}
