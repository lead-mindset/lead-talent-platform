export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

/** Fixed "today" for the prototype so upcoming/past stays stable while demoing. */
export const DEMO_TODAY = "2026-10-01";

export const isUpcoming = (date: string) => date >= DEMO_TODAY;

export function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day, weekday: new Date(year, month - 1, day).getDay() };
}

export function formatMonthLabel(monthIndex: number) {
  return MONTHS[monthIndex];
}

export function formatMonthShortUpper(monthNumber: number) {
  return MONTHS[monthNumber - 1].toUpperCase();
}

/** "6 oct · martes" */
export function formatDayHeader(date: string) {
  const { day, month, weekday } = dateParts(date);
  return `${day} ${MONTHS[month - 1].toLowerCase()} · ${DAY_NAMES[weekday]}`;
}

/** "martes 6 oct" */
export function formatFullDate(date: string) {
  const { day, month, weekday } = dateParts(date);
  return `${DAY_NAMES[weekday]} ${day} ${MONTHS[month - 1].toLowerCase()}`;
}
