import { aggregateModel } from "./model.mjs";

export function buildDailyAdditiveEvidence({
  baselineRows,
  comparisonRows,
  baselineTotal,
  comparisonTotal,
  start,
  end,
  valueField
}) {
  const dates = calendarDates(start, end);
  const baselineByDate = groupByDate(baselineRows);
  const comparisonByDate = groupByDate(comparisonRows);
  const baselineValues = aggregateValues(baselineByDate, valueField);
  const comparisonValues = aggregateValues(comparisonByDate, valueField);
  const missingBaselineDates = dates.filter((date) => baselineValues.get(date) == null);
  const missingComparisonDates = dates.filter((date) => comparisonValues.get(date) == null);

  if (!dates.length) {
    return {
      eligible: false,
      reconciled: false,
      rows: [],
      missingBaselineDates,
      missingComparisonDates
    };
  }

  let cumulativeDelta = 0;
  const rows = dates.map((date) => {
    const baseline = baselineValues.get(date) ?? null;
    const scenario = comparisonValues.get(date) ?? null;
    const delta = baseline == null || scenario == null ? null : scenario - baseline;
    const rowCumulativeDelta = delta == null ? null : (cumulativeDelta += delta);
    return { date, baseline, scenario, delta, cumulativeDelta: rowCumulativeDelta };
  });
  const totals = {
    baseline: sumAvailable(rows, "baseline"),
    scenario: sumAvailable(rows, "scenario"),
    delta: sumAvailable(rows, "delta"),
    cumulativeDelta: [...rows].reverse().find((row) => row.cumulativeDelta != null)?.cumulativeDelta ?? null
  };
  const completePairs = !missingBaselineDates.length && !missingComparisonDates.length;
  const expectedDelta = completePairs ? comparisonTotal - baselineTotal : null;
  const residuals = {
    baseline: totals.baseline - baselineTotal,
    scenario: totals.scenario - comparisonTotal,
    delta: expectedDelta == null ? null : totals.delta - expectedDelta,
    cumulativeDelta: expectedDelta == null ? null : totals.cumulativeDelta - expectedDelta
  };
  const tolerance = Math.max(1e-6, Math.max(Math.abs(baselineTotal), Math.abs(comparisonTotal)) * 1e-10);
  const reconciled = Object.values(residuals).every((value) => value == null || Math.abs(value) <= tolerance);

  return {
    eligible: reconciled,
    reconciled,
    rows,
    totals,
    residuals,
    tolerance,
    completePairs,
    missingBaselineDates,
    missingComparisonDates
  };
}

export function buildDailyTmmEvidence(options) {
  return buildDailyAdditiveEvidence({ ...options, valueField: "modelled_tmm" });
}

function calendarDates(start, end) {
  if (!start || !end || end < start) return [];
  const dates = [];
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function groupByDate(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.activity_date)) groups.set(row.activity_date, []);
    groups.get(row.activity_date).push(row);
  });
  return groups;
}

function aggregateValues(groups, valueField) {
  return new Map([...groups].map(([date, rows]) => [date, aggregateModel(rows)[valueField]]));
}

function sumAvailable(rows, field) {
  return rows.reduce((total, row) => total + (row[field] ?? 0), 0);
}
