export function getFirstAndLastDayOfMonth(dateStr: string) {
  const [year, month] = dateStr.split("-").map((num) => parseInt(num, 10));

  const firstDay = new Date(year, month - 1, 1, 0, 0, 0);

  const lastDay = new Date(year, month, 0, 23, 59, 59);

  return { start: firstDay, end: lastDay };
}

export function getCurrentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthFormatted = month < 10 ? `0${month}` : month;
  return `${year}-${monthFormatted}`;
}
