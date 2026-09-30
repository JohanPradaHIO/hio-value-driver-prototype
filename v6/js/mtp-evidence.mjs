import { aggregateModel } from "./model.mjs";

export function buildMtpTmmBasis({ mtpRows, start, end, valueField = "modelled_tmm" }) {
  const months = selectedMonths(start, end);
  const segments = months.map((month) => buildMonthSegment(mtpRows, month, start, end, valueField));
  const invalidMonths = segments.filter((segment) => segment.supported && (!segment.complete || !segment.uniform)).map((segment) => segment.month);
  const availableSegments = segments.filter((segment) => segment.supported && segment.complete && segment.uniform);
  const selectedTarget = availableSegments.length
    ? availableSegments.reduce((total, segment) => total + segment.selectedTarget, 0)
    : null;
  const availableMonths = new Set(availableSegments.map((segment) => segment.month));
  const selectedRows = mtpRows.filter((row) => (
    row.activity_date >= start
    && row.activity_date <= end
    && availableMonths.has(row.activity_date.slice(0, 7))
  ));
  const packagedTarget = selectedRows.length ? aggregateModel(selectedRows)[valueField] : null;
  const tolerance = Math.max(1e-6, Math.max(Math.abs(selectedTarget), Math.abs(packagedTarget ?? 0)) * 1e-10);
  const residual = packagedTarget == null || selectedTarget == null ? null : packagedTarget - selectedTarget;
  const reconciled = packagedTarget == null && selectedTarget == null
    || residual != null && Math.abs(residual) <= tolerance;
  const fleetNames = [...new Set(availableSegments.flatMap((segment) => segment.fleetTargets.map((item) => item.fleet)))];
  const fleetTargets = fleetNames.map((fleet) => ({
    fleet,
    selectedTarget: availableSegments.reduce((total, segment) => {
      const item = segment.fleetTargets.find((target) => target.fleet === fleet);
      return total + (item?.selectedTarget ?? 0);
    }, 0)
  }));
  const selectedDays = segments.reduce((total, segment) => total + segment.selectedDays, 0);
  const coveredDays = availableSegments.reduce((total, segment) => total + segment.selectedDays, 0);

  return {
    eligible: months.length > 0 && !invalidMonths.length && reconciled,
    reconciled,
    nativeFullMonth: segments.length === 1 && segments[0]?.supported && segments[0].selectedDays === segments[0].daysInMonth,
    segments,
    fleetTargets,
    selectedTarget,
    packagedTarget,
    residual,
    tolerance,
    invalidMonths,
    missingMonths: [...new Set([
      ...invalidMonths,
      ...segments.filter((segment) => !segment.supported).map((segment) => segment.month)
    ])],
    selectedDays,
    coveredDays,
    completeCoverage: coveredDays === selectedDays
  };
}

export function buildMtpDailyTmmEvidence({
  actualRows,
  mtpBasis,
  baselineSource,
  actualTotal,
  start,
  end,
  valueField = "modelled_tmm"
}) {
  const dates = calendarDates(start, end);
  const actualByDate = groupBy(actualRows, (row) => row.activity_date);
  const missingActualDates = dates.filter((date) => !actualByDate.has(date));
  if (!mtpBasis.eligible || !dates.length) {
    return ineligibleDaily(baselineSource, missingActualDates);
  }

  let cumulativeDelta = 0;
  const rows = dates.map((date) => {
    const actual = actualByDate.has(date) ? aggregateModel(actualByDate.get(date))[valueField] : null;
    const segment = mtpBasis.segments.find((item) => date.startsWith(item.month));
    const mtp = segment?.supported && segment.complete && segment.uniform ? segment.dailyTargetPace : null;
    const baseline = baselineSource === "mtp" ? mtp : actual;
    const scenario = baselineSource === "mtp" ? actual : mtp;
    const delta = baseline == null || scenario == null ? null : scenario - baseline;
    const rowCumulativeDelta = delta == null ? null : (cumulativeDelta += delta);
    return { date, baseline, scenario, delta, cumulativeDelta: rowCumulativeDelta };
  });
  const expected = baselineSource === "mtp"
    ? { baseline: mtpBasis.selectedTarget, scenario: actualTotal }
    : { baseline: actualTotal, scenario: mtpBasis.selectedTarget };
  return reconcileDaily(rows, expected, missingActualDates);
}

export function buildMtpFleetTmmEvidence({
  actualRows,
  mtpBasis,
  fleets,
  baselineSource,
  actualTotal,
  valueField = "modelled_tmm"
}) {
  const rows = fleets.map((fleet) => {
    const fleetActualRows = actualRows.filter((row) => row.fleet_display_name === fleet);
    const actual = fleetActualRows.length ? aggregateModel(fleetActualRows)[valueField] : null;
    const mtpTarget = mtpBasis.fleetTargets.find((item) => item.fleet === fleet)?.selectedTarget ?? null;
    const baseline = baselineSource === "mtp" ? mtpTarget : actual;
    const scenario = baselineSource === "mtp" ? actual : mtpTarget;
    return {
      fleet,
      baseline,
      scenario,
      delta: baseline == null || scenario == null ? null : scenario - baseline
    };
  });
  const expected = baselineSource === "mtp"
    ? { baseline: mtpBasis.selectedTarget, scenario: actualTotal }
    : { baseline: actualTotal, scenario: mtpBasis.selectedTarget };
  const completePairs = rows.every((row) => row.baseline != null && row.scenario != null);
  const totals = {
    ...expected,
    delta: mtpBasis.completeCoverage && expected.baseline != null && expected.scenario != null
      ? expected.scenario - expected.baseline
      : null
  };
  const residuals = {
    baseline: sumAvailable(rows, "baseline") - expected.baseline,
    scenario: sumAvailable(rows, "scenario") - expected.scenario,
    delta: completePairs && totals.delta != null ? sumAvailable(rows, "delta") - totals.delta : null
  };
  const tolerance = evidenceTolerance(expected.baseline, expected.scenario);
  const reconciled = Math.abs(residuals.baseline) <= tolerance
    && Math.abs(residuals.scenario) <= tolerance
    && (residuals.delta == null || Math.abs(residuals.delta) <= tolerance);
  return { eligible: mtpBasis.eligible && reconciled, reconciled, completePairs, rows, totals, residuals, tolerance };
}

function buildMonthSegment(rows, month, start, end, valueField) {
  const daysInMonth = monthDays(month);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const selectedStart = start > monthStart ? start : monthStart;
  const selectedEnd = end < monthEnd ? end : monthEnd;
  const selectedDays = inclusiveDays(selectedStart, selectedEnd);
  const monthRows = rows.filter((row) => row.activity_date >= monthStart && row.activity_date <= monthEnd);
  const fleets = [...new Set(monthRows.map((row) => row.fleet_display_name))];
  const fleetTargets = fleets.map((fleet) => {
    const fleetRows = monthRows.filter((row) => row.fleet_display_name === fleet);
    const byDate = groupBy(fleetRows, (row) => row.activity_date);
    const monthlyTarget = aggregateModel(fleetRows)[valueField];
    const dailyTargetPace = monthlyTarget / daysInMonth;
    const tolerance = evidenceTolerance(monthlyTarget, dailyTargetPace);
    const uniform = [...byDate.values()].every((dateRows) => (
      Math.abs(aggregateModel(dateRows)[valueField] - dailyTargetPace) <= tolerance
    ));
    return {
      fleet,
      monthlyTarget,
      dailyTargetPace,
      selectedTarget: dailyTargetPace * selectedDays,
      complete: byDate.size === daysInMonth,
      uniform
    };
  });
  const complete = monthRows.length > 0 && fleetTargets.every((item) => item.complete);
  const uniform = monthRows.length > 0 && fleetTargets.every((item) => item.uniform);
  const monthlyTarget = monthRows.length ? aggregateModel(monthRows)[valueField] : null;
  const supported = monthlyTarget != null;
  const dailyTargetPace = monthlyTarget == null ? null : monthlyTarget / daysInMonth;

  return {
    month,
    monthStart,
    monthEnd,
    selectedStart,
    selectedEnd,
    selectedDays,
    daysInMonth,
    monthlyTarget,
    dailyTargetPace,
    selectedTarget: dailyTargetPace == null ? null : dailyTargetPace * selectedDays,
    fleetTargets,
    supported,
    complete,
    uniform
  };
}

function selectedMonths(start, end) {
  if (!start || !end || end < start) return [];
  const months = [];
  const current = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  const last = end.slice(0, 7);
  while (current.toISOString().slice(0, 7) <= last) {
    months.push(current.toISOString().slice(0, 7));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

function monthDays(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function inclusiveDays(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
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

function groupBy(rows, key) {
  const groups = new Map();
  rows.forEach((row) => {
    const value = key(row);
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  });
  return groups;
}

function reconcileDaily(rows, expected, missingActualDates = [], comparableCoverage = true) {
  const totals = {
    baseline: sumAvailable(rows, "baseline"),
    scenario: sumAvailable(rows, "scenario"),
    delta: sumAvailable(rows, "delta"),
    cumulativeDelta: [...rows].reverse().find((row) => row.cumulativeDelta != null)?.cumulativeDelta ?? null
  };
  const completePairs = comparableCoverage && rows.every((row) => row.baseline != null && row.scenario != null);
  const expectedDelta = completePairs && expected.baseline != null && expected.scenario != null
    ? expected.scenario - expected.baseline
    : null;
  const residuals = {
    baseline: expected.baseline == null ? null : totals.baseline - expected.baseline,
    scenario: expected.scenario == null ? null : totals.scenario - expected.scenario,
    delta: expectedDelta == null ? null : totals.delta - expectedDelta,
    cumulativeDelta: expectedDelta == null ? null : totals.cumulativeDelta - expectedDelta
  };
  const tolerance = evidenceTolerance(expected.baseline, expected.scenario);
  const reconciled = Object.values(residuals).every((value) => value == null || Math.abs(value) <= tolerance);
  return {
    eligible: reconciled,
    reconciled,
    rows,
    totals,
    residuals,
    tolerance,
    completePairs,
    missingBaselineDates: [],
    missingComparisonDates: missingActualDates
  };
}

function ineligibleDaily(baselineSource, missingActualDates) {
  return {
    eligible: false,
    reconciled: false,
    rows: [],
    missingBaselineDates: baselineSource === "actual" ? missingActualDates : [],
    missingComparisonDates: baselineSource === "actual" ? [] : missingActualDates
  };
}

function evidenceTolerance(left, right) {
  return Math.max(1e-6, Math.max(Math.abs(left ?? 0), Math.abs(right ?? 0)) * 1e-10);
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + row[field], 0);
}

function sumAvailable(rows, field) {
  return rows.reduce((total, row) => total + (row[field] ?? 0), 0);
}
