export function remove0x(hex: string): string {
  return hex.replace(/^0x/, '');
}
