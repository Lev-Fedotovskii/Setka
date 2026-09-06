// Civil dates use UTC arithmetic; display/current time explicitly use the institution zone.
export const minute = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const clock = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const weekday = d => new Date(d + 'T12:00:00Z').getUTCDay() || 7;
export const monday = d => addDays(d, 1 - weekday(d));
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
export function academicWeek(date, term) {
  const offset = Math.floor(daysBetween(monday(term.parityAnchor.date), monday(date)) / 7);
  return { number: offset + 1, parity: ((offset % 2 + 2) % 2 === 0) ? term.parityAnchor.parity : term.parityAnchor.parity === 'odd' ? 'even' : 'odd' };
}
export function nowInZone(timezone = 'Europe/Moscow', now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour)*60+Number(parts.minute) };
}
export const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
