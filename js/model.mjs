export const COMPONENTS = [
  { id: "queue_load", label: "Queue at Load", field: "queue_load_minutes" },
  { id: "spot_load", label: "Spot at LU", field: "spot_load_minutes" },
  { id: "loaded_travel", label: "Loaded Travel", field: "loaded_travel_minutes" },
  { id: "truck_loading", label: "Truck Load Time", field: "truck_loading_minutes" },
  { id: "queue_dump", label: "Queue at Dump", field: "queue_dump_minutes" },
  { id: "spot_dump", label: "Spot at Dump", field: "spot_dump_minutes" },
  { id: "dumping", label: "Dumping Time", field: "dumping_minutes" },
  { id: "empty_travel", label: "Empty Travel", field: "empty_travel_minutes" }
];

const DIRECT_COMPONENTS = COMPONENTS.filter((component) => !["loaded_travel", "empty_travel"].includes(component.id));

export const LEVERS = [
  { group: "Rate", id: "payload_delta_pct", label: "Payload", min: -0.20, max: 0.10, step: 0.005, direction: "increase", baseline: "payload" },
  ...DIRECT_COMPONENTS.map((component) => ({
    group: "Rate",
    id: `${component.id}_reduction_pct`,
    label: component.label,
    min: -0.50,
    max: 0.50,
    step: 0.01,
    direction: "reduction",
    baseline: component.id
  })),
  { group: "Travel", id: "loaded_speed_increase_pct", label: "Loaded Speed", min: -0.25, max: 0.25, step: 0.01, direction: "increase", baseline: "loaded_speed", unit: "km/h" },
  { group: "Travel", id: "loaded_distance_reduction_pct", label: "Loaded Distance", min: -0.25, max: 0.25, step: 0.01, direction: "reduction", baseline: "loaded_distance", unit: "km/cycle" },
  { group: "Travel", id: "empty_speed_increase_pct", label: "Empty Speed", min: -0.25, max: 0.25, step: 0.01, direction: "increase", baseline: "empty_speed", unit: "km/h" },
  { group: "Travel", id: "empty_distance_reduction_pct", label: "Empty Distance", min: -0.25, max: 0.25, step: 0.01, direction: "reduction", baseline: "empty_distance", unit: "km/cycle" },
  { group: "Working Time", id: "scheduled_loss_reduction_pct", label: "Scheduled Loss", min: -0.50, max: 0.50, step: 0.01, direction: "reduction", baseline: "scheduled_loss" },
  { group: "Working Time", id: "unscheduled_loss_reduction_pct", label: "Unscheduled Loss", min: -0.50, max: 0.50, step: 0.01, direction: "reduction", baseline: "unscheduled_loss" },
  { group: "Working Time", id: "standby_reduction_pct", label: "Operating Standby", min: -0.50, max: 0.50, step: 0.01, direction: "reduction", baseline: "operating_standby" },
  { group: "Working Time", id: "operating_delay_reduction_pct", label: "Operating Delay", min: -0.50, max: 0.50, step: 0.01, direction: "reduction", baseline: "operating_delay" }
];

export function emptyAssumptions() {
  return Object.fromEntries(LEVERS.map((lever) => [lever.id, 0]));
}

export function calculateRow(row, assumptions = emptyAssumptions()) {
  const directPhysicalPlan = row.plan_model_scope === "direct_physical";
  const combinedQueuePlan = row.plan_model_scope === "working_net_combined_queue";
  const calendarTime = number(row.calendar_hours);
  const notRequired = hasValue(row.not_required_hours) ? number(row.not_required_hours) : 0;
  const requiredTime = hasValue(row.required_hours) ? number(row.required_hours) : Math.max(0, calendarTime - notRequired);
  const hasLossSplit = hasValue(row.scheduled_maintenance_hours) && hasValue(row.unscheduled_maintenance_hours);
  const hasStandby = hasValue(row.operational_standby_hours);
  const hasOperatingDelay = hasValue(row.operating_delay_hours);

  const cycloneBase = hasValue(row.cyclone_standby_hours) ? number(row.cyclone_standby_hours) : 0;
  const scheduledBase = hasLossSplit ? number(row.scheduled_maintenance_hours) : null;
  const unscheduledBase = hasLossSplit ? number(row.unscheduled_maintenance_hours) : null;
  const baselineAvailable = hasLossSplit
    ? Math.max(0, requiredTime - cycloneBase - scheduledBase - unscheduledBase)
    : number(row.available_hours);
  const standbyBase = hasStandby ? number(row.operational_standby_hours) : Math.max(0, baselineAvailable - number(row.operating_hours));
  const baselineOperating = hasStandby || hasLossSplit
    ? Math.max(0, baselineAvailable - standbyBase)
    : number(row.operating_hours);
  const delayBase = hasOperatingDelay ? number(row.operating_delay_hours) : null;
  const baselineWorking = delayBase == null ? null : Math.max(0, baselineOperating - delayBase);

  const scheduledLoss = scheduledBase == null ? null : adjustedLoss(scheduledBase, assumptions.scheduled_loss_reduction_pct);
  const unscheduledLoss = unscheduledBase == null ? null : adjustedLoss(unscheduledBase, assumptions.unscheduled_loss_reduction_pct);
  const availableTime = hasLossSplit
    ? Math.max(0, requiredTime - cycloneBase - scheduledLoss - unscheduledLoss)
    : baselineAvailable;
  const operatingStandby = Math.min(availableTime, adjustedLoss(standbyBase, assumptions.standby_reduction_pct));
  const operatingTime = Math.max(0, availableTime - operatingStandby);
  const operatingDelay = delayBase == null
    ? null
    : Math.min(operatingTime, adjustedLoss(delayBase, assumptions.operating_delay_reduction_pct));
  const workingTime = operatingDelay == null ? null : Math.max(0, operatingTime - operatingDelay);

  const payloadBase = number(row.model_payload_tonnes) || number(row.payload_from_quantity_per_cycle) || number(row.quantity_reporting_avg) || number(row.payload);
  const payload = Math.max(0, payloadBase * (1 + number(assumptions.payload_delta_pct)));
  const baselineTravel = {
    loaded: travelLeg(row, "loaded", 0, 0),
    empty: travelLeg(row, "empty", 0, 0)
  };
  const scenarioTravel = {
    loaded: travelLeg(row, "loaded", assumptions.loaded_distance_reduction_pct, assumptions.loaded_speed_increase_pct),
    empty: travelLeg(row, "empty", assumptions.empty_distance_reduction_pct, assumptions.empty_speed_increase_pct)
  };
  const baselineComponents = buildComponents(row, baselineTravel, emptyAssumptions());
  const components = buildComponents(row, scenarioTravel, assumptions);
  if (directPhysicalPlan || combinedQueuePlan) {
    baselineComponents.queue_load = null;
    baselineComponents.queue_dump = null;
    components.queue_load = null;
    components.queue_dump = null;
  }
  const baselineGrossCycle = directPhysicalPlan || combinedQueuePlan
    ? number(row.source_gross_cycle_minutes)
    : totalComponents(baselineComponents);
  const grossCycle = directPhysicalPlan
    ? number(row.source_gross_cycle_minutes)
    : combinedQueuePlan
      ? baselineGrossCycle + totalPresentComponents(components) - totalPresentComponents(baselineComponents)
    : totalComponents(components);
  const cycleCount = number(row.cycle_count);
  const baselineNetCycle = baselineWorking != null && cycleCount > 0 ? baselineWorking * 60 / cycleCount : null;
  const grossCycleFactor = baselineGrossCycle > 0 ? grossCycle / baselineGrossCycle : 1;
  const netCycle = baselineNetCycle == null ? null : baselineNetCycle * grossCycleFactor;
  const rate = netCycle != null && netCycle > 0 ? payload / (netCycle / 60) : null;
  const modelledTmm = directPhysicalPlan
    ? number(row.actual_tonnes)
    : workingTime == null || rate == null ? null : workingTime * rate;
  const modelCycleCount = workingTime != null && netCycle != null && netCycle > 0 ? workingTime * 60 / netCycle : 0;

  return {
    source: row,
    key: `${row.activity_date}|${row.fleet_display_name}|${row.ahs_mode}`,
    activity_date: row.activity_date,
    fleet: row.fleet_display_name,
    mode: row.ahs_mode,
    cycle_count: cycleCount,
    model_cycle_count: modelCycleCount,
    actual_tonnes: number(row.actual_tonnes),
    truck_count: directPhysicalPlan ? null : number(row.source_truck_count),
    calendar_time: directPhysicalPlan ? null : calendarTime,
    not_required: directPhysicalPlan ? null : notRequired,
    required_time: directPhysicalPlan ? null : requiredTime,
    cyclone_standby: directPhysicalPlan ? null : cycloneBase,
    scheduled_loss: directPhysicalPlan ? null : scheduledLoss,
    unscheduled_loss: directPhysicalPlan ? null : unscheduledLoss,
    available_time: directPhysicalPlan ? null : availableTime,
    availability_pct: directPhysicalPlan
      ? (hasValue(row.source_availability_pct) ? number(row.source_availability_pct) : null)
      : ratio(availableTime, requiredTime),
    operating_standby: directPhysicalPlan ? null : operatingStandby,
    operating_time: directPhysicalPlan ? null : operatingTime,
    operating_delay: directPhysicalPlan ? null : operatingDelay,
    working_time: directPhysicalPlan ? null : workingTime,
    uoa_pct: directPhysicalPlan ? null : workingTime == null ? null : ratio(workingTime, availableTime),
    payload,
    loaded_distance: scenarioTravel.loaded.distance,
    loaded_speed: scenarioTravel.loaded.speed,
    empty_distance: scenarioTravel.empty.distance,
    empty_speed: scenarioTravel.empty.speed,
    components,
    gross_cycle: grossCycle,
    baseline_gross_cycle: baselineGrossCycle,
    net_cycle: netCycle,
    baseline_net_cycle: baselineNetCycle,
    rate,
    modelled_tmm: modelledTmm
  };
}

export function aggregateModel(rows, assumptions = emptyAssumptions()) {
  const records = rows.map((row) => calculateRow(row, assumptions));
  if (!records.length) return emptyAggregate();

  const requiredTime = sumNullable(records, "required_time");
  const availableTime = sumNullable(records, "available_time");
  const operatingTime = sumNullable(records, "operating_time");
  const workingTime = sumNullable(records, "working_time");
  const modelledTmm = sumNullable(records, "modelled_tmm");
  const sourceCycleWeight = sum(records, "cycle_count");
  const modelCycleWeight = sum(records, "model_cycle_count");
  const weightField = modelCycleWeight > 0 ? "model_cycle_count" : "cycle_count";
  const payload = weighted(records, (record) => record.payload, (record) => record[weightField]);
  const netCycle = weightedNullable(records, (record) => record.net_cycle, (record) => record[weightField]);
  const components = Object.fromEntries(COMPONENTS.map((component) => [
    component.id,
    weightedNullable(records, (record) => record.components[component.id], (record) => record[weightField])
  ]));
  const grossCycle = weightedNullable(records, (record) => record.gross_cycle, (record) => record[weightField]);
  const loadedDistance = weighted(records, (record) => record.loaded_distance, (record) => record[weightField]);
  const emptyDistance = weighted(records, (record) => record.empty_distance, (record) => record[weightField]);
  const loadedSpeed = speedFromDistanceAndTime(loadedDistance, components.loaded_travel);
  const emptySpeed = speedFromDistanceAndTime(emptyDistance, components.empty_travel);
  const effectiveRate = modelledTmm == null || !workingTime ? null : modelledTmm / workingTime;
  const rateFromDisplayedInputs = netCycle ? payload / (netCycle / 60) : null;
  const actualTonnes = sum(records, "actual_tonnes");

  return {
    records,
    row_count: records.length,
    day_count: new Set(records.map((record) => record.activity_date)).size,
    cycle_count: sourceCycleWeight,
    model_cycle_count: modelCycleWeight,
    actual_tonnes: actualTonnes,
    modelled_tmm: modelledTmm,
    calendar_time: sumNullable(records, "calendar_time"),
    not_required: sumNullable(records, "not_required"),
    required_time: requiredTime,
    cyclone_standby: sumNullable(records, "cyclone_standby"),
    scheduled_loss: sumNullable(records, "scheduled_loss"),
    unscheduled_loss: sumNullable(records, "unscheduled_loss"),
    available_time: availableTime,
    availability_pct: requiredTime == null || availableTime == null
      ? weightedNullable(records, (record) => record.availability_pct, (record) => record[weightField])
      : ratio(availableTime, requiredTime),
    operating_standby: sumNullable(records, "operating_standby"),
    operating_time: operatingTime,
    operating_delay: sumNullable(records, "operating_delay"),
    working_time: workingTime,
    uoa_pct: workingTime == null ? null : ratio(workingTime, availableTime),
    payload,
    loaded_distance: loadedDistance,
    loaded_speed: loadedSpeed,
    empty_distance: emptyDistance,
    empty_speed: emptySpeed,
    components,
    gross_cycle: grossCycle,
    net_cycle: netCycle,
    rate: effectiveRate,
    rate_from_displayed_inputs: rateFromDisplayedInputs,
    aggregation_rate_gap: effectiveRate == null || rateFromDisplayedInputs == null ? null : effectiveRate - rateFromDisplayedInputs,
    truck_count: records.some((record) => record.truck_count == null) ? null : averageDailyTruckCount(records),
    variance_tonnes: modelledTmm == null ? null : modelledTmm - actualTonnes,
    variance_pct: modelledTmm == null ? null : ratio(modelledTmm - actualTonnes, actualTonnes),
    partial_time_detail: records.some((record) => record.scheduled_loss == null || record.unscheduled_loss == null || record.operating_delay == null)
  };
}

export function aggregateLikeForLike(baselineRows, comparisonRows, options = {}) {
  const baselineGroups = groupSourceRows(baselineRows);
  const comparisonGroups = groupSourceRows(comparisonRows);
  const commonKeys = [...baselineGroups.keys()].filter((key) => comparisonGroups.has(key));
  if (!commonKeys.length) return emptyAggregate();

  let comparisonDays = Number(options.comparisonDays) || 0;
  const standardizedRows = commonKeys.map((key) => {
    const baseline = aggregateModel(baselineGroups.get(key));
    const comparison = aggregateModel(comparisonGroups.get(key));
    const baselineDays = baseline.day_count || 1;
    const currentDays = comparison.day_count || 1;
    comparisonDays = Math.max(comparisonDays, currentDays);

    const exposureScale = (Number(options.comparisonDays) || currentDays) / baselineDays;
    const calendarTime = baseline.calendar_time * exposureScale;
    const notRequired = baseline.not_required * exposureScale;
    const requiredTime = baseline.required_time * exposureScale;
    const scheduledLoss = comparison.scheduled_loss == null ? null : requiredTime * ratio(comparison.scheduled_loss, comparison.required_time);
    const unscheduledLoss = comparison.unscheduled_loss == null ? null : requiredTime * ratio(comparison.unscheduled_loss, comparison.required_time);
    const availableTime = scheduledLoss == null || unscheduledLoss == null
      ? baseline.available_time * exposureScale
      : Math.max(0, requiredTime - scheduledLoss - unscheduledLoss);
    const operatingStandby = availableTime * ratio(comparison.operating_standby, comparison.available_time);
    const operatingTime = Math.max(0, availableTime - operatingStandby);
    const operatingDelay = comparison.operating_delay == null ? null : operatingTime * ratio(comparison.operating_delay, comparison.operating_time);
    const workingTime = operatingDelay == null ? null : Math.max(0, operatingTime - operatingDelay);
    const cycleCount = workingTime != null && comparison.net_cycle ? workingTime * 60 / comparison.net_cycle : 0;
    const actualTonnes = workingTime != null && comparison.rate != null ? workingTime * comparison.rate : 0;
    const [fleet, mode] = key.split("|");

    return {
      activity_date: "like-for-like",
      fleet_display_name: fleet,
      ahs_mode: mode,
      calendar_hours: calendarTime,
      not_required_hours: notRequired,
      required_hours: requiredTime,
      cyclone_standby_hours: baseline.cyclone_standby * exposureScale,
      scheduled_maintenance_hours: scheduledLoss,
      unscheduled_maintenance_hours: unscheduledLoss,
      available_hours: availableTime,
      operational_standby_hours: operatingStandby,
      operating_hours: operatingTime,
      operating_delay_hours: operatingDelay,
      working_hours: workingTime,
      model_payload_tonnes: comparison.payload,
      cycle_count: cycleCount,
      actual_tonnes: actualTonnes,
      source_truck_count: baseline.truck_count,
      loaded_distance_km: comparison.loaded_distance,
      loaded_speed_kph: comparison.loaded_speed,
      empty_distance_km: comparison.empty_distance,
      empty_speed_kph: comparison.empty_speed,
      ...Object.fromEntries(COMPONENTS.map((component) => [component.field, comparison.components[component.id]]))
    };
  });

  const result = aggregateModel(standardizedRows);
  result.day_count = comparisonDays;
  result.comparison_basis = "like_for_like";
  return result;
}

function groupSourceRows(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = `${row.fleet_display_name}|${row.ahs_mode}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return groups;
}

export function aggregateByFleetMode(rows, assumptions = emptyAssumptions()) {
  const groups = groupSourceRows(rows);
  return [...groups.entries()].map(([key, groupRows]) => {
    const [fleet, mode] = key.split("|");
    return { fleet, mode, ...aggregateModel(groupRows, assumptions) };
  });
}

export function truckEquivalent(baseline, current) {
  const baselineDays = Number(baseline?.day_count) || 0;
  const currentDays = Number(current?.day_count) || 0;
  const baselineTrucks = Number(baseline?.truck_count) || 0;
  if (!baselineDays || !currentDays || !baselineTrucks) return 0;

  const baselineAnnualTmm = Number(baseline?.modelled_tmm) / baselineDays * 365;
  const currentAnnualTmm = Number(current?.modelled_tmm) / currentDays * 365;
  const baselineAnnualTmmPerTruck = baselineAnnualTmm / baselineTrucks;
  return baselineAnnualTmmPerTruck ? (currentAnnualTmm - baselineAnnualTmm) / baselineAnnualTmmPerTruck : 0;
}

export function nodeValue(model, nodeId) {
  if (COMPONENTS.some((component) => component.id === nodeId)) return model.components?.[nodeId] ?? null;
  const mapping = {
    tmm: "modelled_tmm",
    rate: "rate",
    net_cycle: "net_cycle",
    gross_cycle: "gross_cycle",
    operating_time: "operating_time",
    truck_count: "truck_count",
    truck_equivalent: "truck_equivalent",
    payload: "payload",
    loaded_distance: "loaded_distance",
    loaded_speed: "loaded_speed",
    empty_distance: "empty_distance",
    empty_speed: "empty_speed",
    available_time: "available_time",
    operating_standby: "operating_standby",
    working_time: "working_time",
    required_time: "required_time",
    cyclone_standby: "cyclone_standby",
    scheduled_loss: "scheduled_loss",
    unscheduled_loss: "unscheduled_loss",
    availability_pct: "availability_pct",
    operating_delay: "operating_delay",
    uoa_pct: "uoa_pct",
    calendar_time: "calendar_time",
    not_required: "not_required"
  };
  return model[mapping[nodeId]] ?? null;
}

export function modelClosure(model) {
  const grossFromComponents = totalComponents(model.components || {});
  return {
    required_delta: model.required_time - (model.calendar_time - model.not_required),
    available_delta: model.scheduled_loss == null || model.unscheduled_loss == null ? null : model.available_time - (model.required_time - model.cyclone_standby - model.scheduled_loss - model.unscheduled_loss),
    operating_delta: model.operating_time - (model.available_time - model.operating_standby),
    working_delta: model.working_time == null || model.operating_delay == null ? null : model.working_time - (model.operating_time - model.operating_delay),
    gross_cycle_delta: model.gross_cycle == null || grossFromComponents == null ? null : model.gross_cycle - grossFromComponents,
    rate_delta: model.rate == null || model.rate_from_displayed_inputs == null ? null : model.rate - model.rate_from_displayed_inputs,
    tmm_delta: model.modelled_tmm == null || model.rate == null || model.working_time == null ? null : model.modelled_tmm - model.rate * model.working_time
  };
}

function emptyAggregate() {
  return {
    records: [], row_count: 0, day_count: 0, cycle_count: 0, model_cycle_count: 0, actual_tonnes: 0, modelled_tmm: 0,
    calendar_time: 0, not_required: 0, required_time: 0, cyclone_standby: 0, scheduled_loss: 0, unscheduled_loss: 0,
    available_time: 0, availability_pct: 0, operating_standby: 0, operating_time: 0,
    operating_delay: 0, working_time: 0, uoa_pct: 0, payload: 0,
    loaded_distance: 0, loaded_speed: 0, empty_distance: 0, empty_speed: 0,
    components: {}, gross_cycle: 0, net_cycle: 0, rate: 0, rate_from_displayed_inputs: 0,
    aggregation_rate_gap: 0, truck_count: 0, variance_tonnes: 0, variance_pct: 0, partial_time_detail: false
  };
}

function buildComponents(row, travel, assumptions) {
  return Object.fromEntries(COMPONENTS.map((component) => {
    if (component.id === "loaded_travel") return [component.id, travel.loaded.minutes];
    if (component.id === "empty_travel") return [component.id, travel.empty.minutes];
    const base = number(row[component.field]);
    const reduction = number(assumptions[`${component.id}_reduction_pct`]);
    return [component.id, Math.max(0, base * (1 - reduction))];
  }));
}

function totalComponents(components) {
  if (Object.values(components).some((value) => value == null)) return null;
  return Object.values(components).reduce((sumValue, value) => sumValue + number(value), 0);
}

function totalPresentComponents(components) {
  return Object.values(components).reduce((sumValue, value) => sumValue + (value == null ? 0 : number(value)), 0);
}

function averageDailyTruckCount(records) {
  const daily = new Map();
  records.forEach((record) => daily.set(record.activity_date, (daily.get(record.activity_date) || 0) + record.truck_count));
  return daily.size ? [...daily.values()].reduce((sumValue, value) => sumValue + value, 0) / daily.size : 0;
}

function adjustedLoss(value, reduction) {
  return Math.max(0, value * (1 - number(reduction)));
}

function travelLeg(row, prefix, distanceReduction, speedIncrease) {
  const baseMinutes = number(row[`${prefix}_travel_minutes`]);
  const baseDistance = number(row[`${prefix}_distance_km`]);
  const sourceSpeed = number(row[`${prefix}_speed_kph`]);
  const baseSpeed = sourceSpeed || speedFromDistanceAndTime(baseDistance, baseMinutes);
  const distance = Math.max(0, baseDistance * (1 - number(distanceReduction)));
  const speed = Math.max(0, baseSpeed * (1 + number(speedIncrease)));
  const factorDenominator = 1 + number(speedIncrease);
  const minutes = baseDistance > 0 && baseSpeed > 0 && factorDenominator > 0
    ? baseMinutes * (1 - number(distanceReduction)) / factorDenominator
    : baseMinutes;
  return { distance, speed, minutes: Math.max(0, minutes) };
}

function speedFromDistanceAndTime(distance, minutes) {
  return minutes > 0 ? distance / (minutes / 60) : 0;
}

function weighted(records, valueFn, weightFn) {
  const denominator = records.reduce((total, record) => total + number(weightFn(record)), 0);
  if (!denominator) return records.length ? number(valueFn(records[0])) : 0;
  return records.reduce((total, record) => total + number(valueFn(record)) * number(weightFn(record)), 0) / denominator;
}

function weightedNullable(records, valueFn, weightFn) {
  if (records.some((record) => valueFn(record) == null)) return null;
  return weighted(records, valueFn, weightFn);
}

function sum(records, field) {
  return records.reduce((total, record) => total + number(record[field]), 0);
}

function sumNullable(records, field) {
  return records.some((record) => record[field] == null) ? null : sum(records, field);
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}