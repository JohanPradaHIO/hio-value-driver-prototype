import { fetchCsv } from "./csv.mjs";

const PACKAGES = [
  { path: "./ui-data/multifleet_actuals_v5/daily_driver_facts.csv?v=20260731-v5-19", packageId: "current_actuals", optional: false },
  { path: "./ui-data/mtp_plan_v5/daily_driver_facts.csv?v=20260731-v5-19", packageId: "mtp_plan", optional: false },
  { path: "./ui-data/stmp_plan_v5/daily_driver_facts.csv?v=20260731-v5-19", packageId: "stmp_plan", optional: false },
  { path: "./ui-data/weekly_plan_v5/daily_driver_facts.csv?v=20260731-v5-19", packageId: "weekly_plan", optional: false }
];

export async function loadFacts() {
  const groups = await Promise.all(PACKAGES.map(async (item) => {
    const rows = await fetchCsv(item.path, { optional: item.optional });
    return rows.map((row) => normalizeRow(row, item.packageId));
  }));
  return groups.flat().sort((left, right) => String(left.activity_date).localeCompare(String(right.activity_date)));
}

export function normalizeRow(row, packageId) {
  const cycleCount = number(row.cycle_count);
  const actualTonnes = number(row.actual_tonnes);
  const payload = number(row.payload_from_quantity_per_cycle)
    || number(row.quantity_reporting_avg)
    || (cycleCount ? actualTonnes / cycleCount : 0)
    || number(row.payload);

  return {
    ...row,
    package_id: packageId,
    activity_date: String(row.activity_date || row.period_start || ""),
    source_type: String(row.source_type || (
      packageId === "mtp_plan" ? "mtp"
        : packageId === "stmp_plan" ? "stmp"
          : packageId === "weekly_plan" ? "weekly" : "actual"
    )).toLowerCase(),
    fleet_display_name: String(row.fleet_display_name || row.operational_equipment_class || "Unknown fleet"),
    ahs_mode: String(row.ahs_mode || "Unknown"),
    model_payload_tonnes: payload,
    source_truck_count: number(row.source_truck_count_observed) || number(row.truck_count)
  };
}

export function filterFacts(facts, { source, start, end, fleets, modes }) {
  return facts.filter((row) => {
    if (row.source_type !== source) return false;
    if (start && row.activity_date < start) return false;
    if (end && row.activity_date > end) return false;
    if (fleets?.length && !fleets.includes(row.fleet_display_name)) return false;
    if (!isPlanSource(source) && modes?.length && !modes.includes(row.ahs_mode)) return false;
    return true;
  });
}

export function comparePeriodCoverage(baselineRows, comparisonRows, baselineStart, baselineEnd, comparisonStart, comparisonEnd) {
  const minimumCoverage = 0.90;
  const baseline = coverageByCohort(baselineRows);
  const comparison = coverageByCohort(comparisonRows);
  const keys = [...new Set([...baseline.keys(), ...comparison.keys()])].sort();
  const baselineDays = inclusiveDays(baselineStart, baselineEnd);
  const comparisonDays = inclusiveDays(comparisonStart, comparisonEnd);
  const missingBaseline = keys.filter((key) => !baseline.has(key));
  const missingComparison = keys.filter((key) => !comparison.has(key));
  const incompleteBaseline = keys.filter((key) => baseline.has(key) && baseline.get(key).size !== baselineDays);
  const incompleteComparison = keys.filter((key) => comparison.has(key) && comparison.get(key).size !== comparisonDays);
  const lowCoverageBaseline = keys.filter((key) => baseline.has(key) && baseline.get(key).size / baselineDays < minimumCoverage);
  const lowCoverageComparison = keys.filter((key) => comparison.has(key) && comparison.get(key).size / comparisonDays < minimumCoverage);

  return {
    valid: keys.length > 0 && !missingBaseline.length && !missingComparison.length
      && !lowCoverageBaseline.length && !lowCoverageComparison.length,
    normalized: incompleteBaseline.length > 0 || incompleteComparison.length > 0,
    minimumCoverage,
    keys,
    baselineDays,
    comparisonDays,
    missingBaseline,
    missingComparison,
    incompleteBaseline,
    incompleteComparison,
    lowCoverageBaseline,
    lowCoverageComparison
  };
}

function coverageByCohort(rows) {
  const coverage = new Map();
  rows.forEach((row) => {
    const key = `${row.fleet_display_name}|${row.ahs_mode}`;
    if (!coverage.has(key)) coverage.set(key, new Set());
    coverage.get(key).add(row.activity_date);
  });
  return coverage;
}

function inclusiveDays(start, end) {
  if (!start || !end) return 0;
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}
export function sourceRange(facts, source) {
  const dates = facts.filter((row) => row.source_type === source).map((row) => row.activity_date).filter(Boolean).sort();
  return { min: dates[0] || "", max: dates.at(-1) || "" };
}

export function uniqueValues(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort();
}

export function completeMonths(facts, source = "actual") {
  const byMonth = new Map();
  facts.filter((row) => row.source_type === source).forEach((row) => {
    const month = row.activity_date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, new Set());
    byMonth.get(month).add(row.activity_date);
  });
  return [...byMonth.entries()]
    .filter(([month, dates]) => dates.size === daysInMonth(month))
    .map(([month]) => month)
    .sort();
}

export function monthBounds(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(days).padStart(2, "0")}` };
}

export function sourceLabel(source) {
  return source === "mtp" ? "MTP" : source === "stmp" ? "STMP" : source === "weekly" ? "Weekly" : "Actuals";
}

export function isPlanSource(source) {
  return source === "mtp" || source === "stmp" || source === "weekly";
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}