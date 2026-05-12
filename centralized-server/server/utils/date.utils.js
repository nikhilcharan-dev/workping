/**
 * Centralized date/time utilities to eliminate duplication
 */

/**
 * Get today's date range (00:00:00 to 23:59:59)
 */
export function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get week's start date (Monday at 00:00)
 */
export function getWeekStartDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get current month's date range
 */
export function getMonthDateRange() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startOfMonth, endOfMonth };
}

/**
 * Get current year's date range
 */
export function getCurrentYearDateRange() {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  return { startOfYear, endOfYear };
}

/**
 * Normalize and validate leave dates (no past dates)
 */
export function normalizeLeaveDates(dates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedDates = [];

  for (const d of dates) {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      return { valid: false, error: `Invalid date: ${d}` };
    }
    if (date < today) {
      return { valid: false, error: `Date ${date.toLocaleDateString("en-IN")} is in the past` };
    }
    normalizedDates.push(date);
  }

  return { valid: true, dates: normalizedDates };
}

/**
 * Format date list for display (shows first 3, then "+N more")
 */
export function formatDateList(dates) {
  const formatted =
    dates
      .slice(0, 3)
      .map((d) => new Date(d).toLocaleDateString("en-IN"))
      .join(", ") + (dates.length > 3 ? ` +${dates.length - 3} more` : "");
  return formatted;
}

/**
 * Get all timestamps for a given date (start and end of day)
 */
export function getDateBoundaries(dateString) {
  const date = new Date(dateString);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * Check if a date falls within a range
 */
export function isDateInRange(date, startDate, endDate) {
  const d = new Date(date);
  return d >= startDate && d <= endDate;
}

/**
 * Get number of days between two dates
 */
export function getDaysBetween(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate - startDate) / msPerDay);
}
