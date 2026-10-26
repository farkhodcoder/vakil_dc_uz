/** "{n}-farzand" → "2-farzand" (noma'lum o'zgaruvchi o'z holicha qoladi) */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}
