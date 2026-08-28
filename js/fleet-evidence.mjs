import { aggregateModel } from "./model.mjs";

export function buildFleetAdditiveEvidence({
  baselineRows,
  comparisonRows,
  fleets,
  baselineTotal,
  comparisonTotal,
  valueField
}) {
  const rows = fleets.map((fleet) => {
    const baseRows = baselineRows.filter((row) => row.fleet_display_name === fleet);
    const scenarioRows = comparisonRows.filter((row) => row.fleet_display_name === fleet);
    const baseline = baseRows.length ? aggregateModel(baseRows)[valueField] : null;
    const scenario = scenarioRows.length ? aggregateModel(scenarioRows)[valueField] : null;
    return {
      fleet,
      baseline,
      scenario,
      delta: baseline == null || scenario == null ? null : scenario - baseline
    };
  });
  const completePairs = rows.every((row) => row.baseline != null && row.scenario != null);
  const expectedDelta = comparisonTotal - baselineTotal;
  const totals = {
    baseline: sumAvailable(rows, "baseline"),
    scenario: sumAvailable(rows, "scenario"),
    delta: expectedDelta
  };
  const pairedDelta = completePairs ? sumAvailable(rows, "delta") : null;
  const residuals = {
    baseline: totals.baseline - baselineTotal,
    scenario: totals.scenario - comparisonTotal,
    delta: pairedDelta == null ? null : pairedDelta - expectedDelta
  };
  const tolerance = Math.max(1e-6, Math.max(Math.abs(baselineTotal), Math.abs(comparisonTotal)) * 1e-10);
  const reconciled = Math.abs(residuals.baseline) <= tolerance
    && Math.abs(residuals.scenario) <= tolerance
    && (residuals.delta == null || Math.abs(residuals.delta) <= tolerance);

  return { eligible: reconciled, reconciled, completePairs, rows, totals, residuals, tolerance };
}

export function buildFleetTmmEvidence(options) {
  return buildFleetAdditiveEvidence({ ...options, valueField: "modelled_tmm" });
}

function sumAvailable(rows, field) {
  return rows.reduce((total, row) => total + (row[field] ?? 0), 0);
}
