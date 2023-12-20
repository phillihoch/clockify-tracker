import { TimeEntry } from "~/models/clockify.server";

export const groupByDate = (timeEntries: TimeEntry[]) => {
  const groupedByDay: Record<string, TimeEntry[]> = {};

  timeEntries.forEach((entry) => {
    const startDate = new Date(entry.timeInterval.start).toDateString(); // Converts to a readable date string, discarding time
    if (!groupedByDay[startDate]) {
      groupedByDay[startDate] = [];
    }
    groupedByDay[startDate].push(entry);
  });

  return groupedByDay;
};

// Pseudo
// Look at the time entries one after another

// check if totalWorktime exceeds max (10 hours)
// if totalWorktime = 0
// first entry
// add to totalWorkTime
// else
// check previous entry and check if time between > 15mins
// add to totalBreakTime
//

// add to totalWorkTime

// Total worktime should not be greater than 10 hours
// look at the next entry and check if time is between
// only count as break if time between is > 15 mins

interface TimePeriod {
  start: string;
  end: string;
  doesOverlap?: boolean;
}

interface PeriodWithBreak {
  durationInMinutes: number;
  isBreak: boolean;
  start: string;
  end: string;
  doesOverlap?: boolean;
}

function summarizeWorkingEntries(
  timeEntries: PeriodWithBreak[]
): PeriodWithBreak[] {
  const summarizedEntries: PeriodWithBreak[] = [];
  let currentWorkingEntry: PeriodWithBreak | null = null;

  for (const entry of timeEntries) {
    if (entry.isBreak) {
      if (currentWorkingEntry) {
        summarizedEntries.push(currentWorkingEntry);
        currentWorkingEntry = null;
      }
      summarizedEntries.push(entry);
    } else {
      if (currentWorkingEntry) {
        currentWorkingEntry.durationInMinutes += entry.durationInMinutes;
        currentWorkingEntry.doesOverlap = entry.doesOverlap
          ? true
          : currentWorkingEntry.doesOverlap;
        currentWorkingEntry.end = entry.end;
      } else {
        currentWorkingEntry = { ...entry };
      }
    }
  }

  // Add the last accumulated working entry if it exists
  if (currentWorkingEntry) {
    summarizedEntries.push(currentWorkingEntry);
  }

  return summarizedEntries;
}

export function calculateTotalWorkTime(timeEntries: TimeEntry[]): number {
  const getDurationInMinutes = (timeEntry: TimeEntry) => {
    const start = new Date(timeEntry.timeInterval.start);
    const end = new Date(timeEntry.timeInterval.end);
    return (end.getTime() - start.getTime()) / 60000;
  };

  const totalWorkTime = timeEntries.reduce(
    (acc, entry) => acc + getDurationInMinutes(entry),
    0
  );

  return totalWorkTime;
}

export function calculatePeriodsWithBreaks(
  workPeriods: TimePeriod[]
): PeriodWithBreak[] {
  const result: PeriodWithBreak[] = [];
  for (let i = 0; i < workPeriods.length; i++) {
    const currentPeriod = workPeriods[i];
    const currentStart = new Date(currentPeriod.start);
    const currentEnd = new Date(currentPeriod.end);
    const currentDuration =
      (currentEnd.getTime() - currentStart.getTime()) / 60000; // Convert ms to minutes

    result.push({
      durationInMinutes: currentDuration,
      isBreak: false,
      start: currentPeriod.start,
      end: currentPeriod.end,
      doesOverlap: currentPeriod.doesOverlap,
    });

    // Check for break only if it's not the last period
    if (i < workPeriods.length - 1) {
      const nextPeriod = workPeriods[i + 1];
      const nextStart = new Date(nextPeriod.start);
      const breakDuration =
        (nextStart.getTime() - currentEnd.getTime()) / 60000;

      if (breakDuration > 0) {
        result.push({
          durationInMinutes: breakDuration,
          isBreak: true,
          start: currentPeriod.end,
          end: nextPeriod.start,
          doesOverlap: currentPeriod.doesOverlap,
        });
      }
    }
  }

  const summarized = summarizeWorkingEntries(result);

  // only count as break when at least 15 minutes
  const summarizedAndFiltered = summarized.filter(
    (entry) =>
      !entry.isBreak || (entry.isBreak && entry.durationInMinutes >= 15)
  );

  return summarizedAndFiltered;
}

const sixHoursInMinutes = 6 * 60;
const nineHoursInMinutes = 9 * 60;
const tenHoursInMinutes = 10 * 60;

const reasons = {
  moreThanTenHours: "Your total work time is more than 10 hours",
  moreThanSixHoursWithoutBreak: "You worked over 6 hours without a break",
  breakTimeNotEnough30: "Your total break time is less than 30 minutes",
  breakTimeNotEnough45: "Your total break time is less than 45 minutes",
};

export function checkBreakCompliance(timeEntries: TimeEntry[]): {
  valid: boolean;
  periodsWithBreaks: PeriodWithBreak[];
  reason?: string;
} {
  const periods = timeEntries
    .map((entry, index) => ({
      start: entry.timeInterval.start,
      end: entry.timeInterval.end,
      doesOverlap: timeEntries[index + 1]
        ? doTimeEntriesOverlap([entry, timeEntries[index + 1]])
        : false,
    }))
    .sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  const periodsWithBreaks = calculatePeriodsWithBreaks(periods).reverse();

  const totalWorkTime = periodsWithBreaks.reduce(
    (acc, period) => (!period.isBreak ? acc + period.durationInMinutes : acc),
    0
  );
  const totalBreakTime = periodsWithBreaks.reduce(
    (acc, period) => (period.isBreak ? acc + period.durationInMinutes : acc),
    0
  );

  if (totalWorkTime <= sixHoursInMinutes) {
    return { valid: true, periodsWithBreaks };
  }

  if (totalWorkTime > tenHoursInMinutes) {
    return {
      valid: false,
      periodsWithBreaks,
      reason: reasons.moreThanTenHours,
    };
  }

  // do not work longer than 6 hours without break
  const workingSessions = periodsWithBreaks.filter((period) => !period.isBreak);
  if (
    workingSessions.some(
      (period) => period.durationInMinutes > sixHoursInMinutes
    )
  ) {
    return {
      valid: false,
      periodsWithBreaks,
      reason: reasons.moreThanSixHoursWithoutBreak,
    };
  }

  if (
    totalWorkTime > sixHoursInMinutes &&
    totalWorkTime <= nineHoursInMinutes
  ) {
    if (totalBreakTime >= 30) {
      return { valid: true, periodsWithBreaks };
    }
    return {
      valid: false,
      periodsWithBreaks,
      reason: reasons.breakTimeNotEnough30,
    };
  }

  // CASE: totalWorkTime > 9 hours && totalWorkTime <= 10 hours
  if (totalBreakTime >= 45) {
    return { valid: true, periodsWithBreaks };
  }
  return {
    valid: false,
    periodsWithBreaks,
    reason: reasons.breakTimeNotEnough45,
  };
}

export function doTimeEntriesOverlap(timeEntries: TimeEntry[]): boolean {
  const periods = timeEntries
    .map((entry) => ({
      start: entry.timeInterval.start,
      end: entry.timeInterval.end,
    }))
    .sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

  return doPeriodsOverlap(periods);
}

function doPeriodsOverlap(periods: TimePeriod[]): boolean {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const startA = new Date(periods[i].start).getTime();
      const endA = new Date(periods[i].end).getTime();
      const startB = new Date(periods[j].start).getTime();
      const endB = new Date(periods[j].end).getTime();

      if (startA < endB && endA > startB) {
        return true; // Überschneidung gefunden
      }
    }
  }
  return false; // Keine Überschneidungen
}
