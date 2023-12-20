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
    const start = getTimeWithoutSeconds(timeEntry.timeInterval.start);
    const end = getTimeWithoutSeconds(timeEntry.timeInterval.end);
    return (end - start) / 60000;
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
    const currentStart = getTimeWithoutSeconds(currentPeriod.start);
    const currentEnd = getTimeWithoutSeconds(currentPeriod.end);
    const currentDuration = (currentEnd - currentStart) / 60000; // Convert ms to minutes

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
      const nextStart = getTimeWithoutSeconds(nextPeriod.start);
      const breakDuration = (nextStart - currentEnd) / 60000;

      if (breakDuration > 0) {
        result.push({
          durationInMinutes: breakDuration,
          isBreak: true,
          start: currentPeriod.end,
          end: nextPeriod.start,
          doesOverlap: false,
        });
      }
    }
  }

  const summarized = summarizeWorkingEntries(result);

  return summarized;
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

  // do not work longer than 6 hours without break (break only counts from 15mins up)
  const filteredPeriodsWithBreaks = periodsWithBreaks.filter(
    (period) => !period.isBreak || (period.isBreak && period.durationInMinutes >= 15)
  )
  const summarizedFilteredPeriodsWithRealBreaks = summarizeWorkingEntries(filteredPeriodsWithBreaks);
  const realWorkingSessions = summarizedFilteredPeriodsWithRealBreaks.filter((period) => !period.isBreak);
  if (
    realWorkingSessions.some(
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
      return getTimeWithoutSeconds(a.start) - getTimeWithoutSeconds(b.start);
    });

  return doPeriodsOverlap(periods);
}

function getTimeWithoutSeconds(dateString: string) {
  let date = new Date(dateString);
  if (date.getSeconds() < 30) {
    date.setSeconds(0);
  } else {
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() + 1);
  }
  return date.getTime();
}

function doPeriodsOverlap(periods: TimePeriod[]): boolean {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const startA = getTimeWithoutSeconds(periods[i].start);
      const endA = getTimeWithoutSeconds(periods[i].end);
      const startB = getTimeWithoutSeconds(periods[j].start);
      const endB = getTimeWithoutSeconds(periods[j].end);

      if (startA < endB && endA > startB) {
        return true; // Überschneidung gefunden
      }
    }
  }
  return false; // Keine Überschneidungen
}
