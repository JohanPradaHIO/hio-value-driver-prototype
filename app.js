const DATA_ROOT = "ui-data/daily_actuals_v3";
const MTP_DATA_ROOT = "ui-data/mtp_plan_v3";
const LEGACY_DATA_ROOT = "ui-data/comparative_v2";
const DATA_VERSION = "20260612-actuals-clean-apr2025-v3-06";

const state = {
  baseline: [],
  components: [],
  scenarios: [],
  constraints: [],
  materialMix: [],
  metadata: null,
  selectedFleets: [],
  selectedModes: [],
  baselineSource: "actual",
  comparisonSource: "actual",
  baselineStart: null,
  baselineEnd: null,
  comparisonStart: null,
  comparisonEnd: null,
  activeRangePicker: null,
  rangeDraftStart: null,
  calendarMonth: {
    baseline: null,
    comparison: null
  },
  baselinePeriod: null,
  comparisonPeriod: null,
  comparisonMode: "actual_period",
  treeView: "workbook",
  impactView: "scenario",
  workbookZoom: 0.75,
  focusMode: false,
  detailsVisible: false,
  selectedNodeId: "total_material_movement",
  assumptions: {
    queue_load: 0,
    queue_dump: 0,
    truck_loading: 0,
    loaded_speed_delta_pct: 0,
    empty_speed_delta_pct: 0,
    loaded_distance_delta_pct: 0,
    empty_distance_delta_pct: 0,
    spot_load: 0,
    dumping: 0,
    spot_dump: 0,
    payload_delta_pct: 0,
    scheduled_maintenance_reduction_pct: 0,
    unscheduled_maintenance_reduction_pct: 0,
    standby_reduction_pct: 0,
    truck_count_delta: 0
  }
};

const treeLayout = [
  {
    title: "Baseline",
    nodes: ["payload_avg", "cycle_minutes", "truck_count_observed", "operating_hours", "baseline_modelled_tonnes"]
  },
  {
    title: "Assumptions",
    nodes: ["component_reduction_pct", "payload_delta_pct", "scheduled_maintenance_reduction_pct", "unscheduled_maintenance_reduction_pct", "standby_reduction_pct"]
  },
  {
    title: "Scenario Drivers",
    nodes: ["improved_payload", "improved_cycle_minutes", "scenario_truck_count", "improved_operating_hours", "improved_rate_tph"]
  },
  {
    title: "Material Movement",
    nodes: ["baseline_modelled_tonnes", "improved_modelled_tonnes", "tmm_uplift_tonnes", "truck_equivalent"]
  },
  {
    title: "Material Diagnostics",
    nodes: ["ore_tonnes", "waste_tonnes", "strip_ratio", "unknown_material_tonnes"]
  }
];

const workbookNodes = [
  ["total_material_movement", 360, 420],
  ["truck_equivalent", 360, 540],
  ["truck_production_rate", 660, 210],
  ["cycle_time_current", 920, 120],
  ["payload_current", 920, 280],
  ["queue_load_seconds", 1240, 20],
  ["truck_loading_seconds", 1240, 100],
  ["spot_load_seconds", 1240, 180],
  ["full_haul_seconds", 1240, 260],
  ["empty_haul_seconds", 1240, 340],
  ["queue_dump_seconds", 1240, 420],
  ["spot_dump_seconds", 1240, 500],
  ["dumping_seconds", 1240, 580],
  ["loaded_distance_km", 1520, 180],
  ["loaded_speed_kph", 1520, 260],
  ["empty_distance_km", 1520, 340],
  ["empty_speed_kph", 1520, 420],
  ["operating_hours_current", 660, 780],
  ["truck_count", 960, 700],
  ["operating_hours_per_truck", 960, 820],
  ["available_hours", 1240, 760],
  ["operational_standby_hours", 1240, 880],
  ["scheduled_hours", 1520, 720],
  ["unscheduled_maintenance_hours", 1520, 840],
  ["required_hours", 1800, 680],
  ["scheduled_maintenance_hours", 1800, 800],
  ["calendar_hours", 2080, 640],
  ["not_required_hours", 2080, 760],
  ["working_hours", 660, 960],
  ["operating_delay_hours", 960, 1000],
  ["productive_hours", 660, 1080]
];

const workbookEdges = [
  ["queue_load_seconds", "cycle_time_current"],
  ["truck_loading_seconds", "cycle_time_current"],
  ["spot_load_seconds", "cycle_time_current"],
  ["full_haul_seconds", "cycle_time_current"],
  ["empty_haul_seconds", "cycle_time_current"],
  ["queue_dump_seconds", "cycle_time_current"],
  ["spot_dump_seconds", "cycle_time_current"],
  ["dumping_seconds", "cycle_time_current"],
  ["loaded_distance_km", "full_haul_seconds"],
  ["loaded_speed_kph", "full_haul_seconds"],
  ["empty_distance_km", "empty_haul_seconds"],
  ["empty_speed_kph", "empty_haul_seconds"],
  ["cycle_time_current", "truck_production_rate"],
  ["payload_current", "truck_production_rate"],
  ["truck_production_rate", "total_material_movement"],
  ["operating_hours_current", "total_material_movement"],
  ["total_material_movement", "truck_equivalent"],
  ["truck_count", "operating_hours_current"],
  ["operating_hours_per_truck", "operating_hours_current"],
  ["available_hours", "operating_hours_per_truck"],
  ["operational_standby_hours", "operating_hours_per_truck"],
  ["scheduled_hours", "available_hours"],
  ["unscheduled_maintenance_hours", "available_hours"],
  ["required_hours", "scheduled_hours"],
  ["scheduled_maintenance_hours", "scheduled_hours"],
  ["calendar_hours", "required_hours"],
  ["not_required_hours", "required_hours"],
  ["operating_hours_current", "working_hours"],
  ["operating_delay_hours", "working_hours"],
  ["working_hours", "productive_hours"]
];

const assumptionControls = [
  ["queue_load", "Queue Load Reduction", 0, 0.5, 0.01, "Reduces time trucks spend waiting at the loading unit before spotting/loading. Unit: percent reduction of seconds per cycle."],
  ["queue_dump", "Queue Dump Reduction", 0, 0.5, 0.01, "Reduces time trucks spend waiting at the dump location. Unit: percent reduction of seconds per cycle."],
  ["truck_loading", "Truck Loading Reduction", 0, 0.3, 0.01, "Reduces the truck loading event duration. Unit: percent reduction of seconds per cycle."],
  ["loaded_speed_delta_pct", "Loaded Speed Improvement", 0, 0.2, 0.01, "Increases average loaded travel speed; loaded travel time is derived as distance / speed. Unit: percent change to km/h."],
  ["empty_speed_delta_pct", "Empty Speed Improvement", 0, 0.2, 0.01, "Increases average empty travel speed; empty travel time is derived as distance / speed. Unit: percent change to km/h."],
  ["loaded_distance_delta_pct", "Loaded Distance Change", -0.2, 0.2, 0.01, "Changes average loaded haul distance per cycle (haul route profile). Unit: percent change to km per cycle."],
  ["empty_distance_delta_pct", "Empty Distance Change", -0.2, 0.2, 0.01, "Changes average empty return distance per cycle (haul route profile). Unit: percent change to km per cycle."],
  ["spot_load", "Spot Load Reduction", 0, 0.3, 0.01, "Reduces time spent positioning at the loading unit. Unit: percent reduction of seconds per cycle."],
  ["dumping", "Dumping Reduction", 0, 0.2, 0.01, "Reduces active dumping duration at the dump location. Unit: percent reduction of seconds per cycle."],
  ["spot_dump", "Spot Dump Reduction", 0, 0.2, 0.01, "Reduces time spent positioning at the dump location. Unit: percent reduction of seconds per cycle."],
  ["payload_delta_pct", "Payload Improvement", -0.05, 0.1, 0.005, "Changes average truck payload. Unit: percent change to tonnes per cycle."],
  ["scheduled_maintenance_reduction_pct", "Scheduled Maintenance Reduction", 0, 0.5, 0.01, "Reduces scheduled maintenance loss hours, increasing available time. Unit: percent of scheduled maintenance hours."],
  ["unscheduled_maintenance_reduction_pct", "Unscheduled Maintenance Reduction", 0, 0.5, 0.01, "Reduces unscheduled maintenance loss hours, increasing available time. Unit: percent of unscheduled maintenance hours."],
  ["standby_reduction_pct", "Operational Standby Reduction", 0, 0.5, 0.01, "Reduces operational standby hours, increasing operating time. Unit: percent of standby hours."],
  ["truck_count_delta", "Truck Count (avg active trucks)", -10, 10, 1, "Adds or removes average active trucks for the scenario. Added trucks inherit the scenario operating hours per truck."]
];

const metricHelp = {
  "Baseline TMM": "TMM calculated by the model using the selected baseline inputs.",
  "Scenario TMM": "TMM calculated from the selected scenario mode and assumptions.",
  "TMM delta": "Difference between scenario TMM and baseline TMM.",
  "Annualized TMM delta": "TMM delta normalized to an annualized rate.",
  "Truck equivalent": "TMM delta converted into equivalent average baseline trucks."
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const [baselineText, scenarioText, constraintText, materialMixText, metadata] = await Promise.all([
    fetchText(`${DATA_ROOT}/daily_driver_facts.csv`),
    fetchText(`${LEGACY_DATA_ROOT}/scenario_templates.csv`),
    fetchText(`${LEGACY_DATA_ROOT}/driver_constraints.csv`),
    fetchText(`${LEGACY_DATA_ROOT}/material_destination_mix.csv`),
    fetchJson(`${LEGACY_DATA_ROOT}/tree_metadata.json`)
  ]);

  state.baseline = parseCsv(baselineText).map(coerceRow).map(normalizeDailyActualRow);

  // Optional MTP plan source: daily-prorated rows sharing the actuals contract.
  // Loaded separately so a missing/absent file never breaks the Actuals view.
  const mtpRows = await loadOptionalSource(`${MTP_DATA_ROOT}/daily_driver_facts.csv`);
  if (mtpRows.length) state.baseline = state.baseline.concat(mtpRows);

  state.components = deriveComponentsFromFacts(state.baseline);
  state.scenarios = parseCsv(scenarioText).map(coerceRow);
  state.constraints = parseCsv(constraintText).map(coerceRow);
  state.materialMix = parseCsv(materialMixText).map(coerceRow);
  state.metadata = metadata;
  state.selectedFleets = uniqueValues(state.baseline, "fleet_display_name");
  state.selectedModes = uniqueValues(state.baseline, "ahs_mode");
  setDefaultRanges();

  bindScopeFilters();
  renderAssumptionControls();
  document.getElementById("closeDetailsButton").addEventListener("click", () => {
    state.detailsVisible = false;
    render();
  });
  render();
}

async function fetchText(path) {
  const response = await fetch(versionedPath(path));
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.text();
}

async function fetchJson(path) {
  const response = await fetch(versionedPath(path));
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

// Load an additional facts CSV that shares the actuals daily contract.
// Returns [] (never throws) if the file is absent or empty, so optional plan
// sources can be wired in without risking the core Actuals load.
async function loadOptionalSource(path) {
  try {
    const response = await fetch(versionedPath(path));
    if (!response.ok) return [];
    const text = await response.text();
    if (!text.trim()) return [];
    return parseCsv(text).map(coerceRow).map(normalizeDailyActualRow);
  } catch (error) {
    console.warn(`Optional source not loaded: ${path}`, error);
    return [];
  }
}

function versionedPath(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${DATA_VERSION}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function coerceRow(row) {
  const coerced = {};
  Object.entries(row).forEach(([key, value]) => {
    if (value === "") {
      coerced[key] = value;
      return;
    }
    const numeric = Number(value);
    coerced[key] = Number.isFinite(numeric) && value.trim() !== "" ? numeric : value;
  });
  return coerced;
}

function normalizeDailyActualRow(row) {
  // Approved payload basis: quantity_reporting (reconciles with actual_tonnes).
  // payload_reporting (truck sensor) is kept as a diagnostic field only.
  const cycleCount = Number(row.cycle_count) || 0;
  const payloadQuantity = Number(row.payload_from_quantity_per_cycle)
    || (cycleCount ? (Number(row.actual_tonnes) || 0) / cycleCount : 0)
    || Number(row.payload) || 0;
  const cycleHours = (Number(row.cycle_seconds) || 0) / 3600;
  const rateTph = cycleHours ? payloadQuantity / cycleHours : 0;
  const operatingHours = Number(row.operating_hours) || 0;
  const modelledTonnes = rateTph * operatingHours;
  const periodDays = Number(row.period_days) || 1;
  return {
    ...row,
    baseline_modelled_tonnes: modelledTonnes,
    modelled_tonnes_per_day: modelledTonnes / periodDays,
    modelled_tonnes_annualized: modelledTonnes / periodDays * 365,
    actual_tonnes_annualized: row.actual_tonnes_annualized_rate,
    payload_avg: payloadQuantity,
    payload_sensor_avg: row.payload,
    baseline_rate_tph: rateTph,
    empty_distance_avg: row.empty_distance_km,
    haul_distance_avg: row.loaded_distance_km,
    truck_count_observed: row.source_truck_count_observed || row.truck_count,
    cycle_truck_count: row.truck_count,
    truck_count_scenario_default: row.truck_count
  };
}

function deriveComponentsFromFacts(rows) {
  const componentFields = [
    ["empty_haul", "empty_travel_minutes"],
    ["full_haul", "loaded_travel_minutes"],
    ["queue_load", "queue_load_minutes"],
    ["spot_load", "spot_load_minutes"],
    ["truck_loading", "truck_loading_minutes"],
    ["queue_dump", "queue_dump_minutes"],
    ["spot_dump", "spot_dump_minutes"],
    ["dumping", "dumping_minutes"]
  ];

  return rows.flatMap((row) => componentFields.map(([componentName, minuteField]) => ({
    activity_date: row.activity_date,
    period_start: row.period_start,
    period_end: row.period_end,
    source_type: row.source_type,
    site_location: row.site_location,
    equipment_type: row.equipment_type,
    operational_equipment_class: row.operational_equipment_class,
    fleet_display_name: row.fleet_display_name,
    fleet_ident: row.fleet_ident,
    fleet_specific: row.fleet_specific,
    ahs_mode: row.ahs_mode,
    component_name: componentName,
    component_row_count: row.cycle_count,
    component_cycle_count: row.cycle_count,
    component_truck_count: row.truck_count,
    total_component_seconds: (Number(row[minuteField]) || 0) * 60 * (Number(row.cycle_count) || 0),
    seconds_per_cycle: (Number(row[minuteField]) || 0) * 60
  })));
}

function bindScopeFilters() {
  bindPeriodSelects();
  renderCheckboxFilter("fleetFilter", uniqueValues(state.baseline, "fleet_display_name"), state.selectedFleets, "selectedFleets");
  renderCheckboxFilter("modeFilter", uniqueValues(state.baseline, "ahs_mode"), state.selectedModes, "selectedModes");

  document.getElementById("resetButton").addEventListener("click", () => {
    state.assumptions = {
      queue_load: 0,
      queue_dump: 0,
      truck_loading: 0,
      loaded_speed_delta_pct: 0,
      empty_speed_delta_pct: 0,
      loaded_distance_delta_pct: 0,
      empty_distance_delta_pct: 0,
      spot_load: 0,
      dumping: 0,
      spot_dump: 0,
      payload_delta_pct: 0,
      scheduled_maintenance_reduction_pct: 0,
      unscheduled_maintenance_reduction_pct: 0,
      standby_reduction_pct: 0,
      truck_count_delta: 0
    };
    state.selectedFleets = uniqueValues(state.baseline, "fleet_display_name");
    state.selectedModes = uniqueValues(state.baseline, "ahs_mode");
    state.baselineSource = "actual";
    state.comparisonSource = "actual";
    state.comparisonMode = "actual_period";
    setDefaultRanges();
    bindScopeFilters();
    renderAssumptionControls();
    render();
  });


function bindPeriodSelects() {
  const baselineSourceSelect = document.getElementById("baselineSourceSelect");
  const comparisonModeSelect = document.getElementById("comparisonModeSelect");
  const baselineRangeButton = document.getElementById("baselineRangeButton");
  const comparisonRangeButton = document.getElementById("comparisonRangeButton");
  baselineSourceSelect.innerHTML = sourceOptions().map((source) => `<option value="${source}">${sourceLabel(source)}</option>`).join("");
  baselineSourceSelect.value = state.baselineSource;
  comparisonModeSelect.value = state.comparisonMode;
  updateRangeButtonLabels();
  renderRangeCalendars();

  baselineSourceSelect.onchange = () => {
    state.baselineSource = baselineSourceSelect.value;
    render();
  };
  baselineRangeButton.onclick = () => openRangePicker("baseline");
  comparisonRangeButton.onclick = () => openRangePicker("comparison");
  comparisonModeSelect.onchange = () => {
    state.comparisonMode = comparisonModeSelect.value;
    state.comparisonSource = comparisonSourceForMode(state.comparisonMode);
    renderAssumptionControls();
    bindPeriodSelects();
    render();
  };
}
function renderCheckboxFilter(containerId, options, selectedValues, stateKey) {
  const container = document.getElementById(containerId);
  const allChecked = selectedValues.length === options.length;
  const summary = filterSummary(options, selectedValues);
  const allOption = `
    <label class="multi-select-option">
      <input type="checkbox" value="__all" ${allChecked ? "checked" : ""} data-filter-key="${stateKey}">
      <span>All</span>
    </label>
  `;
  container.innerHTML = `
    <details class="multi-select">
      <summary>${summary}</summary>
      <div class="multi-select-menu">
        ${allOption}
        ${options.map((option) => {
    const checked = selectedValues.includes(option) ? "checked" : "";
    return `
      <label class="multi-select-option">
        <input type="checkbox" value="${option}" ${checked} data-filter-key="${stateKey}">
        <span>${option}</span>
      </label>
    `;
  }).join("")}
      </div>
    </details>
  `;

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value === "__all") {
        state[stateKey] = input.checked ? options : [];
        if (!state[stateKey].length) state[stateKey] = options;
        renderCheckboxFilter(containerId, options, state[stateKey], stateKey);
        render();
        return;
      }
      const checked = [...container.querySelectorAll("input:checked")]
        .map((item) => item.value)
        .filter((value) => value !== "__all");
      state[stateKey] = checked.length ? checked : options;
      renderCheckboxFilter(containerId, options, state[stateKey], stateKey);
      render();
    });
  });
}

function filterSummary(options, selectedValues) {
  if (selectedValues.length === options.length) return "All";
  if (selectedValues.length === 1) return selectedValues[0];
  if (selectedValues.length === 2) return selectedValues.join(" + ");
  return `${selectedValues.length} selected`;
}
  document.getElementById("zoomOutButton").addEventListener("click", () => {
    state.workbookZoom = clampZoom(state.workbookZoom - 0.1);
    render();
  });

  document.getElementById("zoomInButton").addEventListener("click", () => {
    state.workbookZoom = clampZoom(state.workbookZoom + 0.1);
    render();
  });

  document.getElementById("zoomFitButton").addEventListener("click", () => {
    state.workbookZoom = 0.55;
    render();
  });

  document.getElementById("focusModeButton").addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    if (state.focusMode) {
      state.workbookZoom = Math.min(state.workbookZoom, 0.75);
    }
    render();
  });

  document.getElementById("scenarioRankingButton").addEventListener("click", () => {
    state.impactView = "scenario";
    renderImpactPanels();
  });

  document.getElementById("sensitivityButton").addEventListener("click", () => {
    state.impactView = "sensitivity";
    renderImpactPanels();
  });
}

function renderAssumptionControls() {
  const container = document.getElementById("assumptionControls");
  const disabled = state.comparisonMode !== "custom_scenario";
  container.innerHTML = assumptionControls.map(([key, label, min, max, step, help]) => `
    <div class="control-row">
      <div class="control-head">
        <span>${label} ${infoButton(help)}</span>
        <span id="value-${key}">${formatAssumptionValue(key)}</span>
      </div>
      <input type="range" min="${constraintMin(key, min)}" max="${constraintMax(key, max)}" step="${constraintStep(key, step)}" value="${state.assumptions[key]}" data-assumption="${key}" ${disabled ? "disabled" : ""}>
      <div class="assumption-detail" id="detail-${key}"></div>
    </div>
  `).join("");
  container.classList.toggle("is-disabled", disabled);

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const key = event.target.dataset.assumption;
      state.assumptions[key] = applyConstraint(key, Number(event.target.value));
      event.target.value = state.assumptions[key];
      document.getElementById(`value-${key}`).textContent = formatAssumptionValue(key);
      render();
    });
  });
}

function formatAssumptionValue(key) {
  return key === "truck_count_delta" ? `${formatNumber(state.assumptions[key], 0)} trucks` : formatPct(state.assumptions[key]);
}

function constraintFor(key) {
  return state.constraints.find((constraint) => constraint.driver_id === key);
}

function constraintMin(key, fallback) {
  const constraint = constraintFor(key);
  const hardMin = constraint?.hard_min ?? fallback;
  if (key === "truck_count_delta") {
    const observedTruckCount = selectedBaseline().truck_count_observed || selectedBaseline().cycle_truck_count || 0;
    return Math.max(hardMin, -observedTruckCount);
  }
  return hardMin;
}

function constraintMax(key, fallback) {
  const constraint = constraintFor(key);
  return constraint?.hard_max ?? fallback;
}

function constraintStep(key, fallback) {
  const constraint = constraintFor(key);
  return constraint?.step ?? fallback;
}

function applyConstraint(key, value) {
  const min = constraintMin(key, Number.NEGATIVE_INFINITY);
  const max = constraintMax(key, Number.POSITIVE_INFINITY);
  return Math.min(max, Math.max(min, value));
}

function constraintWarning(key) {
  return "";
}

function render() {
  const baseline = selectedBaseline();
  const results = calculateCustomScenario(baseline, selectedComponents());
  const comparison = selectedComparison(results);
  const scenarioFacts = actualsScenarioFacts();
  let treeResults = results;
  if (scenarioFacts) {
    // Actuals/plan comparison: tree deltas come from the scenario range facts, not sliders.
    const uplift = scenarioFacts.baseline_modelled_tonnes - results.baseline_modelled_tonnes;
    treeResults = {
      ...results,
      tmm_uplift_tonnes: uplift,
      truck_equivalent: results.baseline_tonnes_per_truck_period ? uplift / results.baseline_tonnes_per_truck_period : 0
    };
  }
  renderScopeStatus(baseline);
  renderAssumptionDetails(baseline, selectedComponents());
  renderSummary(baseline, results, comparison);
  renderContributionPanel(results);
  renderTree(treeResults, scenarioFacts);
  renderScenarioTable();
  renderSensitivityView(baseline, selectedComponents(), results);
  renderImpactPanels();
  renderDetails(results);
  document.body.classList.toggle("details-hidden", !state.detailsVisible);
}

function renderScopeStatus(baseline) {
  const rows = selectedBaselineRows();
  const summary = document.getElementById("scopeSummary");
  const warning = document.getElementById("scopeWarning");
  summary.textContent = `${scopeFleetLabel()} · ${scopeModeLabel()} · Baseline ${dateRangeLabel(state.baselineStart, state.baselineEnd)} · Scenario ${scenarioModeLabel()} ${dateRangeLabel(state.comparisonStart, state.comparisonEnd)}`;

  const warnings = [];
  if (!rows.length) warnings.push("No rows match the selected baseline range and filters. Reverting calculations to empty values.");
  if (state.comparisonMode !== "custom_scenario" && !selectedComparisonRows().length) warnings.push("No scenario rows match the selected range, source and filters.");
  warning.hidden = !warnings.length;
  warning.textContent = warnings.join(" ");
}

function renderAssumptionDetails(baseline, components) {
  const componentMap = Object.fromEntries(components.map((row) => [row.component_name, row]));

  assumptionControls.forEach(([key]) => {
    const detail = document.getElementById(`detail-${key}`);
    if (!detail) return;
    const setDetail = (text) => {
      const warning = constraintWarning(key);
      detail.innerHTML = `${text}${warning ? `<div class="constraint-warning">${warning}</div>` : ""}`;
    };

    if (componentMap[key]) {
      const base = componentMap[key].seconds_per_cycle;
      const removed = base * state.assumptions[key];
      const next = base - removed;
      setDetail(`Baseline ${formatNumber(base, 1)} sec/cycle · Remove ${formatNumber(removed, 1)} sec · New ${formatNumber(next, 1)} sec/cycle`);
      return;
    }

    if (key === "payload_delta_pct") {
      const next = baseline.payload_avg * (1 + state.assumptions.payload_delta_pct);
      setDetail(`Baseline ${formatNumber(baseline.payload_avg, 1)} t/cycle · New ${formatNumber(next, 1)} t/cycle`);
      return;
    }

    if (key === "loaded_speed_delta_pct") {
      const next = (baseline.loaded_speed_kph || 0) * (1 + state.assumptions.loaded_speed_delta_pct);
      setDetail(`Baseline ${formatNumber(baseline.loaded_speed_kph, 1)} km/h · New ${formatNumber(next, 1)} km/h · Full Haul time derives from distance / speed`);
      return;
    }

    if (key === "empty_speed_delta_pct") {
      const next = (baseline.empty_speed_kph || 0) * (1 + state.assumptions.empty_speed_delta_pct);
      setDetail(`Baseline ${formatNumber(baseline.empty_speed_kph, 1)} km/h · New ${formatNumber(next, 1)} km/h · Empty Haul time derives from distance / speed`);
      return;
    }

    if (key === "loaded_distance_delta_pct") {
      const next = (baseline.haul_distance_avg || 0) * (1 + state.assumptions.loaded_distance_delta_pct);
      setDetail(`Baseline ${formatNumber(baseline.haul_distance_avg, 2)} km/cycle · New ${formatNumber(next, 2)} km/cycle · Full Haul time derives from distance / speed`);
      return;
    }

    if (key === "empty_distance_delta_pct") {
      const next = (baseline.empty_distance_avg || 0) * (1 + state.assumptions.empty_distance_delta_pct);
      setDetail(`Baseline ${formatNumber(baseline.empty_distance_avg, 2)} km/cycle · New ${formatNumber(next, 2)} km/cycle · Empty Haul time derives from distance / speed`);
      return;
    }

    if (key === "scheduled_maintenance_reduction_pct") {
      const reduced = baseline.scheduled_maintenance_hours * state.assumptions.scheduled_maintenance_reduction_pct;
      const next = baseline.scheduled_maintenance_hours - reduced;
      setDetail(`Baseline ${formatNumber(baseline.scheduled_maintenance_hours, 1)} scheduled maintenance h/month · Reduce ${formatNumber(reduced, 1)} h · New ${formatNumber(next, 1)} h`);
      return;
    }

    if (key === "unscheduled_maintenance_reduction_pct") {
      const reduced = baseline.unscheduled_maintenance_hours * state.assumptions.unscheduled_maintenance_reduction_pct;
      const next = baseline.unscheduled_maintenance_hours - reduced;
      setDetail(`Baseline ${formatNumber(baseline.unscheduled_maintenance_hours, 1)} unscheduled maintenance h/month · Reduce ${formatNumber(reduced, 1)} h · New ${formatNumber(next, 1)} h`);
      return;
    }

    if (key === "standby_reduction_pct") {
      const added = baseline.operational_standby_hours * state.assumptions.standby_reduction_pct;
      setDetail(`Baseline ${formatNumber(baseline.operational_standby_hours, 1)} standby h/month · Convert ${formatNumber(added, 1)} h`);
      return;
    }

    if (key === "truck_count_delta") {
      const base = baseline.truck_count_observed || baseline.cycle_truck_count || 0;
      setDetail(`${formatNumber(base + state.assumptions.truck_count_delta, 1)} avg active trucks · added trucks inherit scenario hours/truck`);
    }
  });
}

function selectedBaseline() {
  const baseline = aggregateBaseline(selectedBaselineRows());
  return { ...baseline, ...aggregateMaterialMix(selectedMaterialRows()) };
}

function selectedComparison(results) {
  if (state.comparisonMode === "custom_scenario") {
    const periodDays = Number(results.period_days) || 31;
    return {
      ...results,
      source_type: "custom_scenario",
      baseline_modelled_tonnes: results.improved_modelled_tonnes,
      modelled_tonnes_per_day: results.improved_modelled_tonnes / periodDays,
      modelled_tonnes_annualized: results.improved_modelled_tonnes / periodDays * 365
    };
  }
  const rows = selectedComparisonRows();
  return rows.length
    ? aggregateBaseline(rows)
    : { missing_comparison: true, period_days: selectedBaseline().period_days, baseline_modelled_tonnes: selectedBaseline().baseline_modelled_tonnes };
}

function selectedComponents() {
  return aggregateComponents(state.components.filter((row) => scopeFilter(row) && sourceFilter(row, state.baselineSource) && rangeFilter(row, state.baselineStart, state.baselineEnd)));
}

function selectedComparisonComponents() {
  return aggregateComponents(state.components.filter((row) => scopeFilter(row) && sourceFilter(row, state.comparisonSource) && rangeFilter(row, state.comparisonStart, state.comparisonEnd)));
}

function zeroAssumptions() {
  return Object.fromEntries(Object.keys(state.assumptions).map((key) => [key, 0]));
}

// When the scenario is another actuals/plan range (not a custom scenario), build the
// scenario side of the tree from that range's facts with no slider assumptions applied.
function actualsScenarioFacts() {
  if (state.comparisonMode === "custom_scenario") return null;
  const rows = selectedComparisonRows();
  if (!rows.length) return null;
  return calculateCustomScenario(aggregateBaseline(rows), selectedComparisonComponents(), zeroAssumptions());
}

function selectedBaselineRows() {
  return state.baseline.filter((row) => scopeFilter(row) && sourceFilter(row, state.baselineSource) && rangeFilter(row, state.baselineStart, state.baselineEnd));
}

function selectedComparisonRows() {
  return state.baseline.filter((row) => scopeFilter(row) && sourceFilter(row, state.comparisonSource) && rangeFilter(row, state.comparisonStart, state.comparisonEnd));
}

function selectedMaterialRows() {
  return state.materialMix.filter((row) => scopeFilter(row) && sourceFilter(row, state.baselineSource) && rangeFilter(row, state.baselineStart, state.baselineEnd));
}

function scopeFilter(row) {
  const fleet = row.fleet_display_name || row.operational_equipment_class;
  return state.selectedFleets.includes(fleet) && state.selectedModes.includes(row.ahs_mode);
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter((value) => value !== "" && value != null))];
}

function periodKey(row) {
  return `${row.period_start || row.period_month}|${row.period_end || row.period_month}|${row.source_type || "actual"}`;
}

function periodOptions() {
  const options = new Map();
  state.baseline.forEach((row) => {
    options.set(periodKey(row), {
      key: periodKey(row),
      label: `${row.period_label || row.period_month} (${row.source_type || "actual"})`
    });
  });
  return [...options.values()];
}

function setDefaultRanges() {
  const actualRows = state.baseline.filter((row) => (row.source_type || "actual") === "actual");
  const rows = actualRows.length ? actualRows : state.baseline;
  const starts = rows.map(rowStartDate).filter(Boolean).sort();
  const ends = rows.map(rowEndDate).filter(Boolean).sort();
  state.baselineStart = starts[0] || null;
  state.baselineEnd = defaultRangeEnd(rows, state.baselineStart, ends);
  state.comparisonStart = state.baselineStart;
  state.comparisonEnd = state.baselineEnd;
  state.calendarMonth.baseline = monthStart(state.baselineStart);
  state.calendarMonth.comparison = monthStart(state.comparisonStart);
}

function defaultRangeEnd(rows, start, sortedEnds) {
  if (!start) return null;
  const sameMonthEnds = rows
    .map(rowEndDate)
    .filter((date) => date && date.slice(0, 7) === start.slice(0, 7))
    .sort();
  return sameMonthEnds.at(-1) || sortedEnds[0] || start;
}

function sourceOptions() {
  const sources = uniqueValues(state.baseline, "source_type").length ? uniqueValues(state.baseline, "source_type") : ["actual"];
  return sources.includes("actual") ? sources : ["actual", ...sources];
}

function sourceLabel(source) {
  return {
    actual: "Actuals",
    weekly_plan: "Weekly Plan",
    stp: "STP",
    mtp: "MTP",
    custom_scenario: "Custom"
  }[source] || labelize(source);
}

function comparisonSourceForMode(mode) {
  return {
    actual_period: "actual",
    weekly_plan: "weekly_plan",
    stp: "stp",
    mtp: "mtp"
  }[mode] || state.baselineSource;
}

function sourceFilter(row, source) {
  return (row.source_type || "actual") === source;
}

function rowStartDate(row) {
  return row.period_start || row.period_month || row.date || row.shift_date || null;
}

function rowEndDate(row) {
  return row.period_end || row.period_month || row.date || row.shift_date || rowStartDate(row);
}

function rangeFilter(row, start, end) {
  const rowStart = rowStartDate(row);
  const rowEnd = rowEndDate(row);
  if (!rowStart || !rowEnd || !start || !end) return false;
  return rowStart >= start && rowEnd <= end;
}

function dateRangeLabel(start, end) {
  return start && end ? `${start} to ${end}` : "selected range";
}

function formatRangeButtonLabel(start, end) {
  if (!start || !end) return "Select range";
  if (start === end) return formatDisplayDate(start);
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

function updateRangeButtonLabels() {
  const baselineRangeButton = document.getElementById("baselineRangeButton");
  const comparisonRangeButton = document.getElementById("comparisonRangeButton");
  if (!baselineRangeButton || !comparisonRangeButton) return;
  const scenarioUsesRange = state.comparisonMode !== "custom_scenario";
  baselineRangeButton.textContent = formatRangeButtonLabel(state.baselineStart, state.baselineEnd);
  comparisonRangeButton.textContent = scenarioUsesRange ? formatRangeButtonLabel(state.comparisonStart, state.comparisonEnd) : "Based on baseline assumptions";
  comparisonRangeButton.disabled = !scenarioUsesRange;
}

function openRangePicker(target) {
  state.activeRangePicker = state.activeRangePicker === target ? null : target;
  state.rangeDraftStart = null;
  state.calendarMonth[target] = state.calendarMonth[target] || monthStart(rangeStartForTarget(target));
  renderRangeCalendars();
}

function renderRangeCalendars() {
  renderRangeCalendar("baseline", "baselineRangeCalendar");
  renderRangeCalendar("comparison", "comparisonRangeCalendar");
}

function renderRangeCalendar(target, elementId) {
  const calendar = document.getElementById(elementId);
  if (!calendar) return;
  const isOpen = state.activeRangePicker === target;
  calendar.hidden = !isOpen;
  if (!isOpen) return;

  const currentMonth = state.calendarMonth[target] || monthStart(rangeStartForTarget(target));
  const monthDate = parseDate(currentMonth);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const leadingBlanks = firstDay.getDay();
  const start = rangeStartForTarget(target);
  const end = rangeEndForTarget(target);
  const cells = [];

  for (let blank = 0; blank < leadingBlanks; blank += 1) {
    cells.push(`<span class="range-day is-empty"></span>`);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = formatDateISO(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    const selected = date === start || date === end;
    const inRange = start && end && date > start && date < end;
    const draft = state.rangeDraftStart === date;
    const classes = ["range-day", selected ? "is-selected" : "", inRange ? "is-in-range" : "", draft ? "is-draft" : ""].join(" ");
    cells.push(`<button class="${classes}" type="button" data-range-target="${target}" data-range-date="${date}">${day}</button>`);
  }

  calendar.innerHTML = `
    <div class="range-calendar-head">
      <button type="button" data-calendar-nav="previous" data-range-target="${target}">‹</button>
      <strong>${monthLabel(currentMonth)}</strong>
      <button type="button" data-calendar-nav="next" data-range-target="${target}">›</button>
    </div>
    <div class="range-weekdays">
      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
    </div>
    <div class="range-days">${cells.join("")}</div>
    <div class="range-calendar-hint">Select start date, then end date.</div>
  `;

  calendar.querySelectorAll("[data-calendar-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarMonth[target] = addMonths(state.calendarMonth[target], button.dataset.calendarNav === "next" ? 1 : -1);
      renderRangeCalendars();
    });
  });

  calendar.querySelectorAll("[data-range-date]").forEach((button) => {
    button.addEventListener("click", () => selectRangeDate(button.dataset.rangeTarget, button.dataset.rangeDate));
  });
}

function selectRangeDate(target, date) {
  if (!state.rangeDraftStart) {
    state.rangeDraftStart = date;
    setRangeForTarget(target, date, date);
    render();
    updateRangeButtonLabels();
    state.activeRangePicker = target;
    renderRangeCalendars();
    return;
  }

  const start = state.rangeDraftStart <= date ? state.rangeDraftStart : date;
  const end = state.rangeDraftStart <= date ? date : state.rangeDraftStart;
  setRangeForTarget(target, start, end);
  state.rangeDraftStart = null;
  state.activeRangePicker = null;
  render();
  updateRangeButtonLabels();
  renderRangeCalendars();
}

function rangeStartForTarget(target) {
  return target === "baseline" ? state.baselineStart : state.comparisonStart;
}

function rangeEndForTarget(target) {
  return target === "baseline" ? state.baselineEnd : state.comparisonEnd;
}

function setRangeForTarget(target, start, end) {
  if (target === "baseline") {
    state.baselineStart = start;
    state.baselineEnd = end;
    return;
  }
  state.comparisonStart = start;
  state.comparisonEnd = end;
}

function parseDate(dateText) {
  const [year, month, day] = (dateText || formatDateISO(new Date())).split("-").map(Number);
  return new Date(year, month - 1, day || 1);
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(dateText) {
  if (!dateText) return formatDateISO(new Date());
  return `${dateText.slice(0, 7)}-01`;
}

function addMonths(dateText, offset) {
  const date = parseDate(dateText);
  date.setMonth(date.getMonth() + offset);
  return formatDateISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

function monthLabel(dateText) {
  return parseDate(dateText).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function formatDisplayDate(dateText) {
  return parseDate(dateText).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function sumRows(rows, field) {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

function weightedAverage(rows, valueField, weightField) {
  const weight = sumRows(rows, weightField);
  if (!weight) return rows.length ? Number(rows[0][valueField]) || 0 : 0;
  return rows.reduce((sum, row) => sum + (Number(row[valueField]) || 0) * (Number(row[weightField]) || 0), 0) / weight;
}

function aggregateBaseline(rows) {
  if (!rows.length) return {};
  if (rows.length === 1) {
    return {
      ...rows[0],
      selected_scope_label: scopeLabel(rows),
      baseline_rate_tph: rows[0].operating_hours ? rows[0].baseline_modelled_tonnes / rows[0].operating_hours : 0
    };
  }

  const first = rows[0];
  const actualTonnes = sumRows(rows, "actual_tonnes");
  const operatingHours = sumRows(rows, "operating_hours");
  // Range truck count = average of daily active truck counts ("avg active trucks"),
  // never the sum of daily distinct counts.
  const truckCount = averageDailyTruckCount(rows);
  const cycleCount = sumRows(rows, "cycle_count");
  const periodDays = rangeDayCount(rows);
  const requiredHours = sumRows(rows, "required_hours");
  const availableHours = sumRows(rows, "available_hours");
  const workingHours = sumRows(rows, "working_hours");
  const productiveHours = sumRows(rows, "productive_hours");
  const cycleSeconds = weightedAverage(rows, "cycle_seconds", "cycle_count");
  // Payload basis: quantity_reporting -> range payload = actual tonnes / cycles.
  const payloadAvg = actualTonnes && cycleCount ? actualTonnes / cycleCount : weightedAverage(rows, "payload_avg", "cycle_count");
  const baselineRateTph = cycleSeconds ? payloadAvg / (cycleSeconds / 3600) : 0;
  // Modelled TMM rebuilt from the decomposition: rate x total fleet operating time.
  const baselineModelledTonnes = baselineRateTph * operatingHours;
  const emptyDistance = weightedAverage(rows, "empty_distance_avg", "cycle_count");
  const loadedDistance = weightedAverage(rows, "haul_distance_avg", "cycle_count");
  const emptyTravelMinutes = weightedAverage(rows, "empty_travel_minutes", "cycle_count");
  const loadedTravelMinutes = weightedAverage(rows, "loaded_travel_minutes", "cycle_count");

  return {
    ...first,
    operational_equipment_class: "Multiple fleets/modes",
    fleet_display_name: scopeFleetLabel(),
    ahs_mode: scopeModeLabel(),
    selected_scope_label: scopeLabel(rows),
    period_days: periodDays,
    period_label: `${formatDisplayDate(first.period_start)} - ${formatDisplayDate(rows[rows.length - 1].period_end || first.period_end)}`,
    tum_equipment_count: sumRows(rows, "tum_equipment_count"),
    cycle_truck_count: truckCount,
    truck_count_observed: truckCount,
    cycle_count: cycleCount,
    actual_tonnes: actualTonnes,
    actual_tonnes_per_day: actualTonnes / periodDays,
    actual_tonnes_annualized: actualTonnes / periodDays * 365,
    payload_avg: payloadAvg,
    payload_sensor_avg: weightedAverage(rows, "payload_sensor_avg", "cycle_count"),
    empty_distance_avg: emptyDistance,
    haul_distance_avg: loadedDistance,
    empty_distance_km: emptyDistance,
    loaded_distance_km: loadedDistance,
    empty_travel_minutes: emptyTravelMinutes,
    loaded_travel_minutes: loadedTravelMinutes,
    empty_speed_kph: emptyTravelMinutes ? emptyDistance / (emptyTravelMinutes / 60) : 0,
    loaded_speed_kph: loadedTravelMinutes ? loadedDistance / (loadedTravelMinutes / 60) : 0,
    calendar_hours: sumRows(rows, "calendar_hours"),
    not_required_hours: sumRows(rows, "not_required_hours"),
    required_hours: requiredHours,
    scheduled_hours: sumRows(rows, "scheduled_hours"),
    scheduled_maintenance_hours: sumRows(rows, "scheduled_maintenance_hours"),
    unscheduled_maintenance_hours: sumRows(rows, "unscheduled_maintenance_hours"),
    available_hours: availableHours,
    operating_hours: operatingHours,
    operating_hours_per_truck: truckCount ? operatingHours / truckCount : 0,
    operational_standby_hours: sumRows(rows, "operational_standby_hours"),
    operating_delay_hours: sumRows(rows, "operating_delay_hours"),
    working_hours: workingHours,
    productive_hours: productiveHours,
    non_productive_hours: sumRows(rows, "non_productive_hours"),
    full_rate_productive_hours: sumRows(rows, "full_rate_productive_hours"),
    availability_current: requiredHours ? availableHours / requiredHours : 0,
    working_of_available: availableHours ? workingHours / availableHours : 0,
    productive_of_working: workingHours ? productiveHours / workingHours : 0,
    cycle_seconds: cycleSeconds,
    cycle_minutes: cycleSeconds / 60,
    baseline_rate_tph: baselineRateTph,
    baseline_modelled_tonnes: baselineModelledTonnes,
    modelled_tonnes_per_day: baselineModelledTonnes / periodDays,
    modelled_tonnes_annualized: baselineModelledTonnes / periodDays * 365,
    baseline_tonnes_per_truck_month: truckCount ? baselineModelledTonnes / truckCount : 0,
    baseline_tonnes_per_truck_period: truckCount ? baselineModelledTonnes / truckCount : 0,
    baseline_tonnes_per_truck_day: truckCount ? baselineModelledTonnes / truckCount / periodDays : 0,
    direct_crusher_ratio_mode: actualTonnes ? rows.reduce((sum, row) => sum + (Number(row.actual_tonnes) || 0) * (Number(row.direct_crusher_ratio_mode) || 0), 0) / actualTonnes : 0,
    direct_crusher_ratio_scope: actualTonnes ? rows.reduce((sum, row) => sum + (Number(row.actual_tonnes) || 0) * (Number(row.direct_crusher_ratio_scope) || 0), 0) / actualTonnes : 0,
    source_quality_note: rows.map((row) => row.source_quality_note).filter(Boolean).join(" | ")
  };
}

function rangeDayCount(rows) {
  const dates = uniqueValues(rows, "activity_date");
  if (dates.length) return dates.length;
  const first = rows[0] || {};
  return Number(first.period_days) || 31;
}

function averageDailyTruckCount(rows) {
  // Sum trucks across fleets within each day, then average across days.
  const byDate = new Map();
  rows.forEach((row) => {
    const key = row.activity_date || row.period_start;
    const trucks = Number(row.truck_count_observed) || Number(row.cycle_truck_count) || 0;
    byDate.set(key, (byDate.get(key) || 0) + trucks);
  });
  if (!byDate.size) return 0;
  return [...byDate.values()].reduce((total, value) => total + value, 0) / byDate.size;
}

function aggregateComponents(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const group = groups.get(row.component_name) || [];
    group.push(row);
    groups.set(row.component_name, group);
  });
  return [...groups.entries()].map(([componentName, group]) => ({
    ...group[0],
    component_name: componentName,
    component_row_count: sumRows(group, "component_row_count"),
    component_cycle_count: sumRows(group, "component_cycle_count"),
    component_truck_count: sumRows(group, "component_truck_count"),
    total_component_seconds: sumRows(group, "total_component_seconds"),
    seconds_per_cycle: weightedAverage(group, "seconds_per_cycle", "component_cycle_count"),
    ahs_mode: scopeModeLabel(),
    fleet_display_name: scopeFleetLabel()
  }));
}

function aggregateMaterialMix(rows) {
  const tonnesByClass = Object.fromEntries(rows.map((row) => [row.material_destination_class, 0]));
  rows.forEach((row) => {
    tonnesByClass[row.material_destination_class] = (tonnesByClass[row.material_destination_class] || 0) + (Number(row.quantity_tonnes) || 0);
  });
  const oreDirectCrusher = tonnesByClass.ore_direct_crusher || 0;
  const oreRomOrStockpile = tonnesByClass.ore_rom_or_stockpile || 0;
  const wasteTonnes = tonnesByClass.waste || 0;
  const otherNonCrusher = tonnesByClass.other_non_crusher || 0;
  const unknownTonnes = tonnesByClass.unknown || 0;
  const oreTonnes = oreDirectCrusher + oreRomOrStockpile;
  const totalTonnes = oreTonnes + wasteTonnes + otherNonCrusher + unknownTonnes;
  const qualityFlags = [...new Set(rows.map((row) => row.quality_flag).filter(Boolean))];
  const classificationRules = [...new Set(rows.map((row) => row.classification_rule).filter(Boolean))];
  return {
    ore_tonnes: oreTonnes,
    waste_tonnes: wasteTonnes,
    rom_or_stockpile_tonnes: oreRomOrStockpile,
    direct_crusher_tonnes: oreDirectCrusher,
    other_non_crusher_tonnes: otherNonCrusher,
    unknown_material_tonnes: unknownTonnes,
    material_destination_total_tonnes: totalTonnes,
    strip_ratio: oreTonnes ? wasteTonnes / oreTonnes : null,
    direct_crusher_ratio_material: totalTonnes ? oreDirectCrusher / totalTonnes : 0,
    material_quality_flags: qualityFlags.join(", "),
    material_classification_rules: classificationRules.join(" | ")
  };
}

function scopeFleetLabel() {
  const allFleets = uniqueValues(state.baseline, "fleet_display_name");
  return state.selectedFleets.length === allFleets.length ? "All" : state.selectedFleets.join(" + ");
}

function scopeModeLabel() {
  const allModes = uniqueValues(state.baseline, "ahs_mode");
  return state.selectedModes.length === allModes.length ? "All" : state.selectedModes.join(" + ");
}

function scopeLabel(rows = selectedBaselineRows()) {
  const periodLabel = rows[0]?.period_label || rows[0]?.period_month || "Selected period";
  return `${periodLabel} · ${scopeFleetLabel()} · ${scopeModeLabel()}`;
}

function calculateCustomScenario(baseline, components, assumptions = state.assumptions) {
  const componentMap = Object.fromEntries(components.map((row) => [row.component_name, row]));
  // Travel legs are derived from distance and speed: time = distance / speed.
  // new time = base time * (1 + distance delta) / (1 + speed delta).
  const travelLegFactor = (distDelta, speedDelta) => (1 + (distDelta || 0)) / (1 + (speedDelta || 0));
  const loadedTravelFactor = travelLegFactor(assumptions.loaded_distance_delta_pct, assumptions.loaded_speed_delta_pct);
  const emptyTravelFactor = travelLegFactor(assumptions.empty_distance_delta_pct, assumptions.empty_speed_delta_pct);
  const travelSecondsRemoved = (componentMap.full_haul ? componentMap.full_haul.seconds_per_cycle * (1 - loadedTravelFactor) : 0)
    + (componentMap.empty_haul ? componentMap.empty_haul.seconds_per_cycle * (1 - emptyTravelFactor) : 0);
  const cycleSecondsRemoved = Object.entries(assumptions)
    .filter(([key]) => componentMap[key])
    .reduce((sum, [key, reduction]) => sum + componentMap[key].seconds_per_cycle * reduction, 0)
    + travelSecondsRemoved;

  const scheduledMaintenanceHours = baseline.scheduled_maintenance_hours ?? 0;
  const unscheduledMaintenanceHours = baseline.unscheduled_maintenance_hours ?? 0;
  const availableHours = baseline.available_hours ?? 0;
  const operationalStandbyHours = baseline.operational_standby_hours ?? 0;
  const requiredHours = baseline.required_hours ?? 0;
  const scheduledHours = baseline.scheduled_hours ?? availableHours + unscheduledMaintenanceHours;
  const notRequiredHours = baseline.not_required_hours ?? null;
  const calendarHours = baseline.calendar_hours ?? (notRequiredHours == null ? null : requiredHours + notRequiredHours);
  const operatingDelayHours = baseline.operating_delay_hours ?? 0;
  const productiveHours = baseline.productive_hours ?? null;
  const improvedPayload = baseline.payload_avg * (1 + assumptions.payload_delta_pct);
  const improvedCycleSeconds = baseline.cycle_seconds - cycleSecondsRemoved;
  const improvedCycleMinutes = improvedCycleSeconds / 60;
  const scheduledMaintenanceReducedHours = scheduledMaintenanceHours * assumptions.scheduled_maintenance_reduction_pct;
  const unscheduledMaintenanceReducedHours = unscheduledMaintenanceHours * assumptions.unscheduled_maintenance_reduction_pct;
  const convertedStandbyHours = operationalStandbyHours * assumptions.standby_reduction_pct;
  const improvedScheduledHours = scheduledHours + scheduledMaintenanceReducedHours;
  const improvedAvailableHours = availableHours
    + scheduledMaintenanceReducedHours
    + unscheduledMaintenanceReducedHours;
  const remainingOperationalStandbyHours = operationalStandbyHours - convertedStandbyHours;
  const improvedOperatingHoursBeforeTruckCount = (baseline.operating_hours ?? 0)
    + scheduledMaintenanceReducedHours
    + unscheduledMaintenanceReducedHours
    + convertedStandbyHours;
  const observedTruckCount = baseline.truck_count_observed || baseline.cycle_truck_count || 0;
  const scenarioTruckCount = Math.max(0, observedTruckCount + assumptions.truck_count_delta);
  // Added/removed trucks inherit the scenario operating hours per truck (visible assumption).
  const improvedOperatingHoursPerTruck = observedTruckCount ? improvedOperatingHoursBeforeTruckCount / observedTruckCount : 0;
  const truckCountOperatingHoursDelta = assumptions.truck_count_delta * improvedOperatingHoursPerTruck;
  const improvedOperatingHours = Math.max(0, scenarioTruckCount * improvedOperatingHoursPerTruck);
  const improvedWorkingHours = improvedOperatingHours - operatingDelayHours;
  const baselineRateTph = baseline.baseline_rate_tph || (baseline.payload_avg / (baseline.cycle_seconds / 3600));
  const payloadFactor = baseline.payload_avg ? improvedPayload / baseline.payload_avg : 1;
  const cycleFactor = improvedCycleSeconds ? baseline.cycle_seconds / improvedCycleSeconds : 1;
  const improvedRateTph = baselineRateTph * payloadFactor * cycleFactor;
  const improvedModelledTonnes = improvedRateTph * improvedOperatingHours;
  const tmmUplift = improvedModelledTonnes - baseline.baseline_modelled_tonnes;

  // Per-truck TUM chain values (fleet hours divided by avg active trucks).
  const perTruck = (value) => (observedTruckCount && Number.isFinite(value) ? value / observedTruckCount : 0);
  const improvedEmptySpeed = (baseline.empty_speed_kph || 0) * (1 + (assumptions.empty_speed_delta_pct || 0));
  const improvedLoadedSpeed = (baseline.loaded_speed_kph || 0) * (1 + (assumptions.loaded_speed_delta_pct || 0));
  const improvedEmptyDistance = (baseline.empty_distance_avg || 0) * (1 + (assumptions.empty_distance_delta_pct || 0));
  const improvedLoadedDistance = (baseline.haul_distance_avg || 0) * (1 + (assumptions.loaded_distance_delta_pct || 0));

  return {
    ...baseline,
    cycle_seconds_removed: cycleSecondsRemoved,
    calendar_hours_current: calendarHours,
    not_required_hours_current: notRequiredHours,
    required_hours_current: requiredHours,
    improved_scheduled_hours: improvedScheduledHours,
    improved_payload: improvedPayload,
    improved_cycle_seconds: improvedCycleSeconds,
    improved_cycle_minutes: improvedCycleMinutes,
    observed_truck_count: observedTruckCount,
    scenario_truck_count: scenarioTruckCount,
    truck_count_delta: assumptions.truck_count_delta,
    truck_count_operating_hours_delta: truckCountOperatingHoursDelta,
    scheduled_maintenance_reduced_hours: scheduledMaintenanceReducedHours,
    unscheduled_maintenance_reduced_hours: unscheduledMaintenanceReducedHours,
    converted_standby_hours: convertedStandbyHours,
    improved_available_hours: improvedAvailableHours,
    improved_availability_current: improvedAvailableHours / requiredHours,
    remaining_scheduled_maintenance_hours: scheduledMaintenanceHours - scheduledMaintenanceReducedHours,
    remaining_unscheduled_maintenance_hours: unscheduledMaintenanceHours - unscheduledMaintenanceReducedHours,
    remaining_operational_standby_hours: remainingOperationalStandbyHours,
    improved_operating_hours: improvedOperatingHours,
    improved_operating_hours_per_truck: improvedOperatingHoursPerTruck,
    operating_hours_per_truck_baseline: perTruck(baseline.operating_hours ?? 0),
    calendar_hours_per_truck: perTruck(calendarHours ?? 0),
    not_required_hours_per_truck: perTruck(notRequiredHours ?? 0),
    required_hours_per_truck: perTruck(requiredHours),
    scheduled_hours_per_truck: perTruck(scheduledHours),
    improved_scheduled_hours_per_truck: perTruck(improvedScheduledHours),
    available_hours_per_truck: perTruck(availableHours),
    improved_available_hours_per_truck: perTruck(improvedAvailableHours),
    scheduled_maintenance_hours_per_truck: perTruck(scheduledMaintenanceHours),
    remaining_scheduled_maintenance_hours_per_truck: perTruck(scheduledMaintenanceHours - scheduledMaintenanceReducedHours),
    unscheduled_maintenance_hours_per_truck: perTruck(unscheduledMaintenanceHours),
    remaining_unscheduled_maintenance_hours_per_truck: perTruck(unscheduledMaintenanceHours - unscheduledMaintenanceReducedHours),
    operational_standby_hours_per_truck: perTruck(operationalStandbyHours),
    remaining_operational_standby_hours_per_truck: perTruck(remainingOperationalStandbyHours),
    improved_empty_speed_kph: improvedEmptySpeed,
    improved_loaded_speed_kph: improvedLoadedSpeed,
    improved_empty_distance_km: improvedEmptyDistance,
    improved_loaded_distance_km: improvedLoadedDistance,
    loaded_travel_factor: loadedTravelFactor,
    empty_travel_factor: emptyTravelFactor,
    improved_working_hours: improvedWorkingHours,
    productive_hours_current: productiveHours,
    improved_rate_tph: improvedRateTph,
    improved_modelled_tonnes: improvedModelledTonnes,
    tmm_uplift_tonnes: tmmUplift,
    annualized_tmm_uplift_tonnes: tmmUplift * 12,
    truck_equivalent: tmmUplift / baseline.baseline_tonnes_per_truck_period
  };
}

function renderSummary(baseline, results, comparison) {
  const baselinePeriodDaysMissing = !Number(baseline.period_days);
  const comparisonPeriodDaysMissing = !Number(comparison.period_days);
  const periodDays = Number(baseline.period_days) || 31;
  const comparisonDays = Number(comparison.period_days) || periodDays;
  const baselineAnnualized = baseline.modelled_tonnes_annualized || (baseline.baseline_modelled_tonnes / periodDays * 365);
  const comparisonAnnualized = comparison.modelled_tonnes_annualized || (comparison.baseline_modelled_tonnes / comparisonDays * 365);
  const baselineTonnesPerDay = baseline.modelled_tonnes_per_day || (baseline.baseline_modelled_tonnes / periodDays);
  const comparisonTonnesPerDay = comparison.modelled_tonnes_per_day || (comparison.baseline_modelled_tonnes / comparisonDays);
  const deltaPeriod = comparison.baseline_modelled_tonnes - baseline.baseline_modelled_tonnes;
  const deltaTonnesPerDay = comparisonTonnesPerDay - baselineTonnesPerDay;
  const deltaAnnualized = comparisonAnnualized - baselineAnnualized;
  const deltaPct = baselineAnnualized ? deltaAnnualized / baselineAnnualized : 0;
  const comparisonTypeLabel = scenarioModeLabel();
  const deltaTone = valueTone(deltaPeriod, "higher");
  const deltaBadge = deltaTone === "neutral" ? "No change" : deltaTone === "positive" ? "Better" : "Worse";

  const groups = [
    ["Baseline", "", [
      ["Annualized TMM", baselineAnnualized, "t/year", 0, "neutral"],
      ["TMM / day", baselineTonnesPerDay, `t/day · ${periodDays} days`, 0, "neutral"]
    ]],
    ["Scenario", comparisonTypeLabel, [
      ["Annualized TMM", comparisonAnnualized, "t/year", 0, "neutral"],
      ["TMM / day", comparisonTonnesPerDay, comparison.missing_comparison ? "no scenario rows" : `t/day · ${comparisonDays} days`, 0, "neutral"]
    ]],
    ["Delta", deltaBadge, [
      ["Annualized delta", deltaAnnualized, `${formatPct(deltaPct)} vs baseline`, 0, deltaTone],
      ["TMM / day delta", deltaTonnesPerDay, "t/day", 0, deltaTone]
    ]]
  ];

  document.getElementById("summaryBand").innerHTML = groups.map(([title, badge, items]) => `
    <div class="metric-group metric-group-${title.toLowerCase()}">
      <h3>${title}${badge ? `<span>${badge}</span>` : ""}</h3>
      ${items.map(([label, value, unit, decimals, tone]) => `
        <div class="metric metric-compact metric-${tone || "neutral"}">
          <div class="label">${label}</div>
          <div class="value ${decimals == null ? "text-value" : ""}">${decimals == null ? value : decimals === "pct" ? formatPct(value) : formatNumber(value, decimals)}</div>
          <div class="sub">${unit}</div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderContributionPanel(results) {
  const recoveredHours = (results.scheduled_maintenance_reduced_hours || 0) + (results.unscheduled_maintenance_reduced_hours || 0) + (results.converted_standby_hours || 0);
  const rows = [
    ["Truck count", results.truck_count_delta ? results.improved_modelled_tonnes - results.baseline_modelled_tonnes : 0, results.truck_count_delta ? `${formatNumber(results.truck_count_delta, 0)} truck delta` : "No truck-count change"],
    ["Payload", state.assumptions.payload_delta_pct ? results.baseline_modelled_tonnes * state.assumptions.payload_delta_pct : 0, formatPct(state.assumptions.payload_delta_pct)],
    ["Cycle time", results.cycle_seconds_removed ? results.tmm_uplift_tonnes : 0, `${formatNumber(results.cycle_seconds_removed, 1)} sec/cycle removed`],
    ["TUM hours", recoveredHours ? results.tmm_uplift_tonnes : 0, `${formatNumber(recoveredHours, 1)} h recovered`]
  ].filter((row) => Math.abs(row[1] || 0) >= 0.5);

  document.getElementById("contributionPanel").innerHTML = `
    <div class="contribution-title">TMM Delta Contribution</div>
    ${rows.length ? rows.map(([driver, value, note]) => `
      <div class="contribution-row">
        <span>${driver}</span>
        <strong>${formatNumber(value)}</strong>
        <em>${note}</em>
      </div>
    `).join("") : `<div class="contribution-row muted-row"><span>No active scenario changes</span><strong>0</strong><em>baseline modelled equals improved modelled</em></div>`}
  `;
}

function renderTree(results, scenarioFacts = null) {
  const canvas = document.getElementById("treeCanvas");
  const active = activePath();
  document.getElementById("activePathLabel").textContent = active.size ? "Highlighted impact path" : "";
  document.body.classList.toggle("focus-mode", state.focusMode);
  document.getElementById("zoomLabel").textContent = `${Math.round(state.workbookZoom * 100)}%`;
  document.getElementById("focusModeButton").classList.toggle("active", state.focusMode);
  document.getElementById("focusModeButton").textContent = state.focusMode ? "Exit Focus" : "Focus";
  renderWorkbookTree(canvas, results, active, scenarioFacts);
}

function renderWorkbookTree(canvas, results, active, scenarioFacts = null) {
  const treeWidth = 2320;
  const treeHeight = 1180;
  const zoom = state.workbookZoom;
  const nodeWidth = 208;
  const nodeHeight = 72;
  const nodeMap = Object.fromEntries(workbookNodes.map(([nodeId, x, y]) => [nodeId, { x, y, w: nodeWidth, h: nodeHeight }]));
  const lines = workbookEdges
    .filter(([from, to]) => nodeMap[from] && nodeMap[to])
    .map(([from, to]) => {
      const a = nodeMap[from];
      const b = nodeMap[to];
      const aCenterX = a.x + a.w / 2;
      const bCenterX = b.x + b.w / 2;
      const aCenterY = a.y + a.h / 2;
      const bCenterY = b.y + b.h / 2;
      const activeLine = active.has(from) && active.has(to) ? " active" : "";
      if (Math.abs(aCenterX - bCenterX) < 8) {
        const y1 = aCenterY < bCenterY ? a.y + a.h : a.y;
        const y2 = aCenterY < bCenterY ? b.y : b.y + b.h;
        return `<path class="workbook-link${activeLine}" d="M ${aCenterX} ${y1} V ${y2}" />`;
      }
      const fromIsRight = a.x > b.x;
      const x1 = fromIsRight ? a.x : a.x + a.w;
      const y1 = aCenterY;
      const x2 = fromIsRight ? b.x + b.w : b.x;
      const y2 = bCenterY;
      const mid = (x1 + x2) / 2;
      return `<path class="workbook-link${activeLine}" d="M ${x1} ${y1} H ${mid} V ${y2} H ${x2}" />`;
    })
    .join("");

  canvas.innerHTML = `
    <div class="workbook-zoom-stage" style="width:${treeWidth * zoom}px; height:${treeHeight * zoom}px">
      <div class="workbook-tree" style="transform:scale(${zoom})">
        <svg class="workbook-lines" width="${treeWidth}" height="${treeHeight}" viewBox="0 0 ${treeWidth} ${treeHeight}" aria-hidden="true">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z"></path>
            </marker>
          </defs>
          ${lines}
        </svg>
        ${workbookNodes.map(([nodeId, x, y]) => renderWorkbookNode(nodeId, x, y, results, active, scenarioFacts)).join("")}
      </div>
    </div>
  `;

  canvas.querySelectorAll(".workbook-node").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedNodeId = node.dataset.nodeId;
      state.detailsVisible = true;
      render();
    });
  });
}

function renderWorkbookNode(nodeId, x, y, results, active, scenarioFacts = null) {
  const node = nodeById(nodeId) || virtualNode(nodeId);
  const valueView = workbookNodeValueView(nodeId, node, results, scenarioFacts);
  const classes = [
    "workbook-node",
    `node-${node.node_type || "source"}`,
    valueView.tone ? `tone-${valueView.tone}` : "",
    valueView.split ? "has-split-values" : "",
    state.selectedNodeId === nodeId ? "selected" : "",
    active.has(nodeId) ? "active-path" : ""
  ].join(" ");

  return `
    <button class="${classes}" style="left:${x}px; top:${y}px" data-node-id="${nodeId}" type="button">
      <span>${workbookNodeLabel(nodeId, displayNodeLabel(node))} <small>${workbookNodeUnit(nodeId, node.unit)}</small></span>
      ${valueView.html}
    </button>
  `;
}

function workbookNodeValueView(nodeId, node, results, scenarioFacts = null) {
  const comparison = workbookNodeComparison(nodeId, results, scenarioFacts);
  if (!comparison) {
    const tone = ["tmm_uplift_tonnes", "truck_equivalent"].includes(nodeId) ? valueTone(Number(nodeRawValue(nodeId, results)) || 0, "higher") : "";
    return {
      split: false,
      tone,
      html: `<strong class="workbook-single-value">${nodeValue(node, results)}</strong>`
    };
  }

  const tone = valueTone(comparison.scenario - comparison.baseline, comparison.direction);
  return {
    split: true,
    tone,
    html: `
      <div class="workbook-values" aria-label="Baseline and scenario values">
        <div class="node-value-pair node-value-baseline"><em>Base</em><strong>${formatNodeComparisonValue(comparison.baseline, comparison.decimals)}</strong></div>
        <div class="node-value-pair node-value-scenario"><em>Scenario</em><strong>${formatNodeComparisonValue(comparison.scenario, comparison.decimals)}</strong></div>
      </div>
    `
  };
}

function workbookNodeComparison(nodeId, results, scenarioFacts = null) {
  // sc: source of the Scenario side. For custom scenarios it is the baseline results
  // (improved_* fields carry the slider effects). For actuals/plan range comparisons it
  // is the comparison-range facts run through the engine with zero assumptions, so the
  // improved_* fields equal that range's own actuals.
  const sc = scenarioFacts || results;
  const baselineTruckCount = results.truck_count_observed || results.cycle_truck_count || results.observed_truck_count || 0;
  const periodDays = Number(results.period_days) || 31;
  const scenarioPeriodDays = Number(sc.period_days) || periodDays;
  const baselineAnnualized = results.modelled_tonnes_annualized || (results.baseline_modelled_tonnes / periodDays * 365);
  const scenarioAnnualized = sc.improved_modelled_tonnes / scenarioPeriodDays * 365;
  const comparisons = {
    total_material_movement: [baselineAnnualized, scenarioAnnualized, 0, "higher"],
    truck_production_rate: [results.baseline_rate_tph, sc.improved_rate_tph, 1, "higher"],
    cycle_time_current: [results.cycle_minutes || (results.cycle_seconds / 60), sc.improved_cycle_minutes, 2, "lower"],
    payload_current: [results.payload_avg, sc.improved_payload, 1, "higher"],
    truck_count: [baselineTruckCount, sc.scenario_truck_count, 1, "higher"],
    operating_hours_per_truck: [results.operating_hours_per_truck_baseline, sc.improved_operating_hours_per_truck, 1, "higher"],
    operating_hours_current: [results.operating_hours, sc.improved_operating_hours, 1, "higher"],
    available_hours: [results.available_hours_per_truck, sc.improved_available_hours_per_truck, 1, "higher"],
    scheduled_hours: [results.scheduled_hours_per_truck, sc.improved_scheduled_hours_per_truck, 1, "higher"],
    scheduled_maintenance_hours: [results.scheduled_maintenance_hours_per_truck, sc.remaining_scheduled_maintenance_hours_per_truck, 1, "lower"],
    unscheduled_maintenance_hours: [results.unscheduled_maintenance_hours_per_truck, sc.remaining_unscheduled_maintenance_hours_per_truck, 1, "lower"],
    operational_standby_hours: [results.operational_standby_hours_per_truck, sc.remaining_operational_standby_hours_per_truck, 1, "lower"],
    empty_speed_kph: [results.empty_speed_kph, sc.improved_empty_speed_kph, 1, "higher"],
    loaded_speed_kph: [results.loaded_speed_kph, sc.improved_loaded_speed_kph, 1, "higher"],
    working_hours: [results.working_hours, sc.improved_working_hours, 0, "higher"]
  };

  if (scenarioFacts) {
    // Distances differ between two actual ranges.
    comparisons.empty_distance_km = [results.empty_distance_avg, sc.empty_distance_avg, 2, "lower"];
    comparisons.loaded_distance_km = [results.haul_distance_avg, sc.haul_distance_avg, 2, "lower"];
    // Context nodes also differ between two actual ranges (e.g. Jan 745 vs Feb 672 calendar h/truck).
    comparisons.calendar_hours = [results.calendar_hours_per_truck, sc.calendar_hours_per_truck, 1, "neutral"];
    comparisons.not_required_hours = [results.not_required_hours_per_truck, sc.not_required_hours_per_truck, 1, "lower"];
    comparisons.required_hours = [results.required_hours_per_truck, sc.required_hours_per_truck, 1, "higher"];
    comparisons.operating_delay_hours = [results.operating_delay_hours, sc.operating_delay_hours, 0, "lower"];
    comparisons.productive_hours = [results.productive_hours_current, sc.productive_hours_current, 0, "higher"];
  } else {
    // Custom scenario: distances move with the distance sliders.
    comparisons.empty_distance_km = [results.empty_distance_avg, results.improved_empty_distance_km, 2, "lower"];
    comparisons.loaded_distance_km = [results.haul_distance_avg, results.improved_loaded_distance_km, 2, "lower"];
  }

  if (nodeId.endsWith("_seconds")) {
    const componentName = nodeId.replace("_seconds", "");
    const component = selectedComponents().find((row) => row.component_name === componentName);
    if (!component) return null;
    const baseline = component.seconds_per_cycle;
    let scenarioSeconds;
    if (scenarioFacts) {
      const scenarioComponent = selectedComparisonComponents().find((row) => row.component_name === componentName);
      scenarioSeconds = scenarioComponent ? scenarioComponent.seconds_per_cycle : baseline;
    } else if (componentName === "full_haul") {
      scenarioSeconds = baseline * (results.loaded_travel_factor ?? 1);
    } else if (componentName === "empty_haul") {
      scenarioSeconds = baseline * (results.empty_travel_factor ?? 1);
    } else {
      scenarioSeconds = baseline * (1 - (state.assumptions[componentName] || 0));
    }
    return {
      baseline,
      scenario: scenarioSeconds,
      decimals: 1,
      direction: "lower"
    };
  }

  const comparison = comparisons[nodeId];
  if (!comparison || comparison.some((value, index) => index < 2 && !Number.isFinite(value))) return null;
  return {
    baseline: comparison[0],
    scenario: comparison[1],
    decimals: comparison[2],
    direction: comparison[3]
  };
}

function nodeRawValue(nodeId, results) {
  const values = {
    tmm_uplift_tonnes: results.tmm_uplift_tonnes,
    truck_equivalent: results.truck_equivalent
  };
  return values[nodeId];
}

function formatNodeComparisonValue(value, decimals) {
  return formatNumber(value, decimals);
}

function valueTone(delta, direction = "higher") {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return "neutral";
  const better = direction === "lower" ? delta < 0 : delta > 0;
  return better ? "positive" : "negative";
}

function scenarioModeLabel() {
  const labels = {
    custom_scenario: "Custom",
    actual_period: "Actuals",
    mtp: "MTP",
    stp: "STP",
    weekly_plan: "Weekly Plan"
  };
  return labels[state.comparisonMode] || labelize(state.comparisonMode);
}

function renderNode(nodeId, results, active) {
  const node = nodeById(nodeId) || virtualNode(nodeId);
  const value = nodeValue(node, results);
  const classes = [
    "tree-node",
    `node-${node.node_type || "source"}`,
    state.selectedNodeId === nodeId ? "selected" : "",
    active.has(nodeId) ? "active-path" : ""
  ].join(" ");

  return `
    <div class="${classes}" data-node-id="${nodeId}">
      <div class="node-label">${displayNodeLabel(node)}</div>
      <div class="node-value">${value}</div>
      <div class="node-type">${node.node_type || "node"} · ${node.unit || ""}</div>
    </div>
  `;
}

function activePath() {
  const highlighted = new Set(["total_material_movement", "truck_equivalent"]);
  const changedComponents = Object.keys(state.assumptions)
    .filter((key) => selectedComponents().some((row) => row.component_name === key) && state.assumptions[key] > 0);
  if (changedComponents.length) {
    ["component_reduction_pct", "cycle_seconds_removed", "improved_cycle_minutes", "improved_rate_tph", "improved_modelled_tonnes"].forEach((node) => highlighted.add(node));
    changedComponents.forEach((componentName) => highlighted.add(`${componentName}_seconds`));
    ["cycle_time_current", "truck_production_rate", "total_material_movement"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.payload_delta_pct !== 0) {
    ["payload_delta_pct", "improved_payload", "improved_rate_tph", "improved_modelled_tonnes"].forEach((node) => highlighted.add(node));
    ["payload_current", "truck_production_rate", "total_material_movement"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.scheduled_maintenance_reduction_pct || state.assumptions.unscheduled_maintenance_reduction_pct || state.assumptions.standby_reduction_pct) {
    ["scheduled_maintenance_reduction_pct", "unscheduled_maintenance_reduction_pct", "standby_reduction_pct", "improved_operating_hours", "improved_modelled_tonnes"].forEach((node) => highlighted.add(node));
    ["operating_hours_per_truck", "operating_hours_current", "total_material_movement", "truck_equivalent"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.truck_count_delta !== 0) {
    ["truck_count", "operating_hours_current", "total_material_movement", "truck_equivalent"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.loaded_speed_delta_pct || state.assumptions.loaded_distance_delta_pct) {
    ["loaded_speed_kph", "loaded_distance_km", "full_haul_seconds", "cycle_time_current", "truck_production_rate", "total_material_movement"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.empty_speed_delta_pct || state.assumptions.empty_distance_delta_pct) {
    ["empty_speed_kph", "empty_distance_km", "empty_haul_seconds", "cycle_time_current", "truck_production_rate", "total_material_movement"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.scheduled_maintenance_reduction_pct) {
    ["scheduled_maintenance_hours", "scheduled_hours", "available_hours"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.unscheduled_maintenance_reduction_pct) {
    ["unscheduled_maintenance_hours", "available_hours"].forEach((node) => highlighted.add(node));
  }
  if (state.assumptions.standby_reduction_pct) {
    highlighted.add("operational_standby_hours");
  }
  return highlighted;
}

function renderScenarioTable() {
  const baseline = selectedBaseline();
  const rows = aggregateScenarioRows(state.scenarios.filter(scopeFilter), baseline)
    .sort((a, b) => b.tmm_uplift_tonnes - a.tmm_uplift_tonnes);

  document.getElementById("scenarioRows").innerHTML = rows.map((row) => `
    <tr>
      <td>${labelize(row.scenario_name)}</td>
      <td>${row.driver_family}</td>
      <td class="numeric">${formatNumber(row.tmm_uplift_tonnes)}</td>
      <td class="numeric">${formatNumber(row.truck_equivalent, 3)}</td>
    </tr>
  `).join("");
}

function aggregateScenarioRows(rows, baseline) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = `${row.scenario_name}|${row.driver_family}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => {
    const first = group[0];
    const uplift = sumRows(group, "tmm_uplift_tonnes");
    return {
      ...first,
      tmm_uplift_tonnes: uplift,
      truck_equivalent: baseline.baseline_tonnes_per_truck_period ? uplift / baseline.baseline_tonnes_per_truck_period : sumRows(group, "truck_equivalent")
    };
  });
}

function renderImpactPanels() {
  const scenarioActive = state.impactView === "scenario";
  document.getElementById("scenarioRankingPanel").hidden = !scenarioActive;
  document.getElementById("sensitivityPanel").hidden = scenarioActive;
  document.getElementById("scenarioRankingButton").classList.toggle("active", scenarioActive);
  document.getElementById("sensitivityButton").classList.toggle("active", !scenarioActive);
  document.getElementById("impactSubtitle").textContent = scenarioActive
    ? "Template scenario seed, pending Databricks refresh"
    : "Marginal impact from the current model state";
}

function renderSensitivityView(baseline, components, currentResults) {
  const rows = calculateSensitivityRows(baseline, components, currentResults);
  const maxImpact = Math.max(...rows.map((row) => row.tmm_uplift_tonnes), 1);

  document.getElementById("sensitivityBubbles").innerHTML = rows.slice(0, 10).map((row) => {
    const size = 46 + Math.sqrt(row.tmm_uplift_tonnes / maxImpact) * 92;
    return `
      <div class="sensitivity-bubble family-${row.driver_family}" style="width:${size}px; height:${size}px">
        <strong>${row.driver_name}</strong>
        <span>${formatNumber(row.tmm_uplift_tonnes)} t/mo</span>
      </div>
    `;
  }).join("");

  document.getElementById("sensitivityRows").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.driver_name}</td>
      <td>${labelize(row.driver_family)}</td>
      <td>${row.step_label}</td>
      <td class="numeric">${formatNumber(row.tmm_uplift_tonnes)}</td>
      <td class="numeric">${formatNumber(row.annualized_tmm_uplift_tonnes)}</td>
      <td class="numeric">${formatNumber(row.truck_equivalent, 3)}</td>
    </tr>
  `).join("");
}

function calculateSensitivityRows(baseline, components, currentResults) {
  const baseAssumptions = { ...state.assumptions };
  const currentTonnes = currentResults.improved_modelled_tonnes;
  const sensitivityDrivers = [];

  components.forEach((component) => {
    const currentReduction = baseAssumptions[component.component_name] || 0;
    const remainingSeconds = component.seconds_per_cycle * (1 - currentReduction);
    if (remainingSeconds <= 0) return;

    const secondsStep = Math.min(1, remainingSeconds);
    const nextAssumptions = {
      ...baseAssumptions,
      [component.component_name]: currentReduction + secondsStep / component.seconds_per_cycle
    };
    sensitivityDrivers.push(sensitivityRow({
      baseline,
      components,
      currentTonnes,
      assumptions: nextAssumptions,
      driverName: componentDisplayName(component.component_name),
      driverFamily: "cycle_component",
      stepLabel: `-${formatNumber(secondsStep, 1)} s/cycle`
    }));
  });

  sensitivityDrivers.push(sensitivityRow({
    baseline,
    components,
    currentTonnes,
    assumptions: {
      ...baseAssumptions,
      payload_delta_pct: baseAssumptions.payload_delta_pct + 1 / baseline.payload_avg
    },
    driverName: "Payload",
    driverFamily: "payload",
    stepLabel: "+1 t/cycle"
  }));

  [
    ["scheduled_maintenance_reduction_pct", "Scheduled Maintenance", "availability", baseline.scheduled_maintenance_hours],
    ["unscheduled_maintenance_reduction_pct", "Unscheduled Maintenance", "availability", baseline.unscheduled_maintenance_hours],
    ["standby_reduction_pct", "Operational Standby", "standby", baseline.operational_standby_hours]
  ].forEach(([key, driverName, driverFamily, baseHours]) => {
    const currentReduction = baseAssumptions[key] || 0;
    const remainingHours = baseHours * (1 - currentReduction);
    if (remainingHours <= 0) return;

    const hourStep = Math.min(1, remainingHours);
    sensitivityDrivers.push(sensitivityRow({
      baseline,
      components,
      currentTonnes,
      assumptions: {
        ...baseAssumptions,
        [key]: currentReduction + hourStep / baseHours
      },
      driverName,
      driverFamily,
      stepLabel: `-${formatNumber(hourStep, 1)} h/month`
    }));
  });

  return sensitivityDrivers
    .filter((row) => Number.isFinite(row.tmm_uplift_tonnes))
    .sort((a, b) => b.tmm_uplift_tonnes - a.tmm_uplift_tonnes);
}

function sensitivityRow({ baseline, components, currentTonnes, assumptions, driverName, driverFamily, stepLabel }) {
  const variant = calculateCustomScenario(baseline, components, assumptions);
  const tmmUplift = variant.improved_modelled_tonnes - currentTonnes;
  return {
    driver_name: driverName,
    driver_family: driverFamily,
    step_label: stepLabel,
    tmm_uplift_tonnes: tmmUplift,
    annualized_tmm_uplift_tonnes: tmmUplift * 12,
    truck_equivalent: tmmUplift / baseline.baseline_tonnes_per_truck_period
  };
}

function componentDisplayName(componentName) {
  const names = {
    queue_load: "Queue Load",
    queue_dump: "Queue Dump",
    truck_loading: "Truck Loading",
    full_haul: "Full Haul",
    empty_haul: "Empty Haul",
    spot_load: "Spot Load",
    dumping: "Dumping",
    spot_dump: "Spot Dump"
  };
  return names[componentName] || labelize(componentName);
}

function renderDetails(results) {
  const node = nodeById(state.selectedNodeId) || virtualNode(state.selectedNodeId);
  const value = nodeValue(node, results);
  const metadataEdges = state.metadata.edges.map((edge) => [edge.from_node_id, edge.to_node_id]);
  const visibleEdges = state.treeView === "workbook" ? workbookEdges : metadataEdges;
  const upstream = visibleEdges
    .filter(([, toNodeId]) => toNodeId === state.selectedNodeId)
    .filter(([fromNodeId]) => !hiddenUiNode(fromNodeId))
    .map(([fromNodeId]) => displayNodeLabel(nodeById(fromNodeId) || virtualNode(fromNodeId)) || fromNodeId);
  const downstream = visibleEdges
    .filter(([fromNodeId]) => fromNodeId === state.selectedNodeId)
    .filter(([, toNodeId]) => !hiddenUiNode(toNodeId))
    .map(([, toNodeId]) => displayNodeLabel(nodeById(toNodeId) || virtualNode(toNodeId)) || toNodeId);
  const formula = state.metadata.formulas.find((item) => item.formula_id === node?.formula_id);
  const workbookFormula = state.treeView === "workbook" ? workbookFormulaDetails(state.selectedNodeId, results) : null;
  const constraint = constraintFor(state.selectedNodeId);
  const classification = metricClassification(state.selectedNodeId);
  const metricNote = metricFormulaNote(state.selectedNodeId);

  document.getElementById("nodeDetails").innerHTML = `
    <div class="detail-item"><strong>${displayNodeLabel(node) || state.selectedNodeId}</strong>${node?.description || ""}</div>
    <div class="detail-item"><strong>Value</strong>${value} ${node?.unit || ""}</div>
    ${classification ? `<div class="detail-item"><strong>Classification</strong>${classification}</div>` : ""}
    <div class="detail-item"><strong>Type</strong>${node?.node_type || "node"}</div>
    <div class="detail-item"><strong>Upstream</strong>${upstream.length ? upstream.join(", ") : "None"}</div>
    <div class="detail-item"><strong>Downstream</strong>${downstream.length ? downstream.join(", ") : "None"}</div>
    ${metricNote ? `<div class="detail-item formula-card"><strong>Metric note</strong>${metricNote}</div>` : ""}
    ${workbookFormula ? `<div class="detail-item formula-card"><strong>Calculation</strong>${workbookFormula}</div>` : ""}
    ${formula ? `<div class="detail-item"><strong>Formula</strong>${formula.expression}</div>` : ""}
    ${constraint ? `<div class="detail-item"><strong>Constraint</strong>${constraintSummary(constraint)}</div>` : ""}
  `;

  document.getElementById("lineageDetails").innerHTML = `
    <div class="detail-item"><strong>Dataset</strong>${node?.dataset || "metadata"}</div>
    <div class="detail-item"><strong>Field</strong>${node?.field || "Not source-backed"}</div>
  `;
}

function hiddenUiNode(nodeId) {
  return String(nodeId).startsWith("direct_crusher_uplift");
}

function displayNodeLabel(node) {
  if (!node) return "";
  const labels = {
    baseline_modelled_tonnes: "Baseline TMM",
    improved_modelled_tonnes: "Scenario TMM",
    tmm_uplift_tonnes: "TMM Delta",
    truck_equivalent: "Truck Equivalent",
    total_material_movement: "TMM",
    scenario_truck_count: "Avg Active Trucks",
    truck_count: "Avg Active Trucks",
    operating_hours_per_truck: "Operating Hours per Truck",
    operating_hours_current: "Total Fleet Operating Time"
  };
  return labels[node.node_id] || node.label || node.node_id;
}

function metricClassification(nodeId) {
  const classifications = {
    payload_avg: "baseline input",
    cycle_minutes: "baseline input",
    truck_count_observed: "baseline input",
    operating_hours: "baseline input",
    baseline_modelled_tonnes: "baseline",
    improved_modelled_tonnes: "scenario",
    total_material_movement: "scenario",
    improved_payload: "scenario",
    improved_cycle_minutes: "scenario",
    truck_count: "scenario",
    scenario_truck_count: "scenario",
    operating_hours_per_truck: "driver input",
    empty_distance_km: "driver input",
    loaded_distance_km: "driver input",
    empty_speed_kph: "driver input",
    loaded_speed_kph: "driver input",
    improved_operating_hours: "scenario",
    improved_rate_tph: "scenario",
    tmm_uplift_tonnes: "delta",
    truck_equivalent: "delta",
    ore_tonnes: "diagnostic",
    waste_tonnes: "diagnostic",
    strip_ratio: "diagnostic",
    unknown_material_tonnes: "diagnostic"
  };
  if (String(nodeId).endsWith("_reduction_pct") || nodeId === "payload_delta_pct" || nodeId === "truck_count_delta" || nodeId === "component_reduction_pct") return "scenario assumption";
  if (String(nodeId).endsWith("_hours") || String(nodeId).endsWith("_seconds")) return "driver input";
  return classifications[nodeId] || null;
}

function metricFormulaNote(nodeId) {
  const notes = {
    baseline_modelled_tonnes: "Baseline TMM calculated from production rate and total fleet operating time. Payload basis: official production quantity (quantity_reporting).",
    improved_modelled_tonnes: "Scenario TMM after applying payload, cycle-time and operating-time assumptions; truck count scales total fleet operating time.",
    tmm_uplift_tonnes: "Scenario TMM minus baseline TMM.",
    truck_equivalent: "TMM delta divided by baseline tonnes per truck for the selected period. It is an output, not a truck-count input.",
    truck_count: "Average active trucks: average of the daily distinct truck counts in the range. Trucks entering or leaving scope intraday make calendar hours per truck differ from 24 h on some days.",
    scenario_truck_count: "Average active trucks after applying the truck-count slider. Added trucks inherit the scenario operating hours per truck (visible assumption).",
    operating_hours_per_truck: "Operating hours per truck = fleet operating hours / avg active trucks. Maintenance and standby assumptions change this value; the truck slider does not.",
    operating_hours_current: "Total fleet operating time = avg active trucks x operating hours per truck. This identity is exact in the daily extract.",
    total_material_movement: "Scenario TMM: production rate multiplied by total fleet operating time. Truck-count changes scale fleet operating time."
  };
  return notes[nodeId] || null;
}

function constraintSummary(constraint) {
  return `${formatConstraintValue(constraint, constraint.hard_min)} to ${formatConstraintValue(constraint, constraint.hard_max)}.`;
}

function formatConstraintValue(constraint, value) {
  return constraint.unit === "percent" ? formatPct(value) : `${formatNumber(value, 0)} ${constraint.unit || ""}`.trim();
}

function nodeById(nodeId) {
  return state.metadata.nodes.find((node) => node.node_id === nodeId);
}

function workbookFormulaDetails(nodeId, results) {
  const formulas = {
    cycle_time_current: "(Queue Load + Truck Loading + Spot Load + Full Haul + Empty Haul + Queue Dump + Spot Dump + Dumping) / 60",
    truck_production_rate: "Operating Payload / (Cycle Time / 60)",
    total_material_movement: "Truck Production Rate * Total Fleet Operating Time",
    operating_hours_current: "Avg Active Trucks * Operating Hours per Truck",
    operating_hours_per_truck: "Available Time per Truck - Operational Standby per Truck",
    full_haul_seconds: "Loaded Distance / Loaded Speed * 3600",
    empty_haul_seconds: "Empty Distance / Empty Speed * 3600",
    required_hours: "Calendar Time - Not Required Time (per truck)",
    scheduled_hours: "Required Time - Scheduled Maintenance (per truck)",
    available_hours: "Scheduled Time - Unscheduled Maintenance (per truck)",
    availability_current: "Available Hours / Required Hours",
    working_hours: "Total Fleet Operating Time - Operating Delay",
    payload_current: "Baseline Payload * (1 + Payload Improvement). Payload basis: official production quantity (quantity_reporting), tonnes per cycle.",
    truck_count: "Average of daily active truck counts in the selected range, plus the truck-count slider in custom scenarios.",
    scenario_truck_count: "Average of daily active truck counts plus the truck-count slider.",
    truck_equivalent: "TMM Delta / Baseline Tonnes per Truck Period",
  };
  const formula = formulas[nodeId];
  if (!formula) return null;
  return `
    <div class="formula-expression">${formula}</div>
  `;
}

function virtualNode(nodeId) {
  const labels = {
    baseline_modelled_tonnes: "Baseline TMM",
    total_material_movement: "TMM",
    truck_production_rate: "Truck Production Rate",
    cycle_time_current: "Cycle Time",
    payload_current: "Operating Payload",
    truck_count_observed: "Avg Active Trucks",
    scenario_truck_count: "Avg Active Trucks",
    truck_count: "Avg Active Trucks",
    operating_hours_per_truck: "Operating Hours per Truck",
    operating_hours_current: "Total Fleet Operating Time",
    empty_distance_km: "Empty Distance",
    loaded_distance_km: "Loaded Distance",
    empty_speed_kph: "Empty Speed",
    loaded_speed_kph: "Loaded Speed",
    ore_tonnes: "Ore Tonnes",
    waste_tonnes: "Waste Tonnes",
    strip_ratio: "Strip Ratio",
    direct_crusher_ratio_material: "Direct Crusher Ratio",
    unknown_material_tonnes: "Unknown Material",
    component_reduction_pct: "Component Reduction",
    payload_delta_pct: "Payload Improvement",
    scheduled_maintenance_reduction_pct: "Scheduled Maintenance Reduction",
    unscheduled_maintenance_reduction_pct: "Unscheduled Maintenance Reduction",
    standby_reduction_pct: "Operational Standby Reduction",
    truck_count_delta: "Truck Count",
    calendar_hours: "Calendar Time",
    not_required_hours: "Not Required Time",
    required_hours: "Required Time",
    scheduled_hours: "Scheduled Time",
    scheduled_maintenance_hours: "Scheduled Maintenance",
    unscheduled_maintenance_hours: "Unscheduled Maintenance",
    available_hours: "Available Time",
    availability_current: "Availability",
    operational_standby_hours: "Operational Standby",
    operating_delay_hours: "Operating Delay",
    working_hours: "Working Time",
    productive_hours: "Productive Time",
    queue_load_seconds: "Queue Load",
    truck_loading_seconds: "Truck Loading",
    spot_load_seconds: "Spot Load",
    full_haul_seconds: "Full Haul",
    empty_haul_seconds: "Empty Haul",
    queue_dump_seconds: "Queue Dump",
    spot_dump_seconds: "Spot Dump",
    dumping_seconds: "Dumping"
  };
  return {
    node_id: nodeId,
    label: labels[nodeId] || labelize(nodeId),
    node_type: ["component_reduction_pct", "payload_delta_pct", "scheduled_maintenance_reduction_pct", "unscheduled_maintenance_reduction_pct", "standby_reduction_pct", "truck_count_delta"].includes(nodeId)
      ? "assumption"
      : ["total_material_movement", "truck_production_rate", "cycle_time_current", "payload_current", "truck_count", "scenario_truck_count", "operating_hours_current", "operating_hours_per_truck", "empty_speed_kph", "loaded_speed_kph", "strip_ratio", "direct_crusher_ratio_material"].includes(nodeId)
      ? "calculated"
      : "source",
    unit: virtualUnit(nodeId),
    dataset: ["total_material_movement", "truck_production_rate", "cycle_time_current", "payload_current", "truck_count", "scenario_truck_count", "operating_hours_current", "operating_hours_per_truck"].includes(nodeId)
      ? "scenario_results"
      : ["ore_tonnes", "waste_tonnes", "strip_ratio", "direct_crusher_ratio_material", "unknown_material_tonnes"].includes(nodeId) ? "material_destination_mix" : nodeId.endsWith("_seconds") ? "cycle_components" : "baseline",
    field: nodeId,
    description: virtualDescription(nodeId)
  };
}

function workbookNodeLabel(nodeId, fallback) {
  const labels = {
    availability_current: "Availability",
    calendar_hours: "Calendar Time",
    not_required_hours: "Not Required Time",
    available_hours: "Available Hours",
    required_hours: "Required Hours",
    scheduled_hours: "Scheduled Time",
    operational_standby_hours: "Operational Standby",
    operating_delay_hours: "Operating Delay",
    working_hours: "Working Time",
    productive_hours: "Productive Time"
  };
  return labels[nodeId] || fallback;
}

function workbookNodeUnit(nodeId, fallback) {
  const units = {
    actual_tonnes: "t/month",
    total_material_movement: "t/year",
    baseline_modelled_tonnes: "t/month",
    tmm_uplift_tonnes: "t/month",
    truck_equivalent: "trucks",
    truck_count_observed: "avg trucks",
    scenario_truck_count: "avg trucks",
    truck_count: "avg trucks",
    operating_hours_per_truck: "h/truck",
    empty_distance_km: "km/cycle",
    loaded_distance_km: "km/cycle",
    empty_speed_kph: "km/h",
    loaded_speed_kph: "km/h",
    ore_tonnes: "t/month",
    waste_tonnes: "t/month",
    strip_ratio: "waste / ore",
    direct_crusher_ratio_material: "% of scoped tonnes",
    unknown_material_tonnes: "t/month",
    truck_production_rate: "t/h",
    cycle_time_current: "min/cycle",
    payload_current: "t/cycle",
    operating_hours_current: "fleet h",
    calendar_hours: "h/truck",
    not_required_hours: "h/truck",
    availability_current: "%",
    available_hours: "h/truck",
    required_hours: "h/truck",
    scheduled_hours: "h/truck",
    scheduled_maintenance_hours: "h/truck",
    unscheduled_maintenance_hours: "h/truck",
    operational_standby_hours: "h/truck",
    operating_delay_hours: "fleet h",
    working_hours: "fleet h",
    productive_hours: "fleet h"
  };
  return units[nodeId] || compactUnit(fallback) || "s/cycle";
}

function compactUnit(unit) {
  const units = {
    "seconds/cycle": "s/cycle",
    "minutes/cycle": "min/cycle",
    "tonnes/hour": "t/h",
    "tonnes/month": "t/month",
    "tonnes/cycle": "t/cycle",
    "hours/month": "h/month"
  };
  return units[unit] || unit;
}

function virtualUnit(nodeId) {
  const units = {
    total_material_movement: "tonnes/year",
    baseline_modelled_tonnes: "tonnes/month",
    tmm_uplift_tonnes: "tonnes/month",
    truck_production_rate: "tonnes/hour",
    cycle_time_current: "minutes/cycle",
    payload_current: "tonnes/cycle",
    truck_count_observed: "avg trucks",
    scenario_truck_count: "avg trucks",
    truck_count: "avg trucks",
    operating_hours_per_truck: "hours/truck",
    empty_distance_km: "km/cycle",
    loaded_distance_km: "km/cycle",
    empty_speed_kph: "km/hour",
    loaded_speed_kph: "km/hour",
    ore_tonnes: "tonnes/month",
    waste_tonnes: "tonnes/month",
    strip_ratio: "ratio",
    direct_crusher_ratio_material: "percent",
    unknown_material_tonnes: "tonnes/month",
    operating_hours_current: "hours/month",
    component_reduction_pct: "percent",
    payload_delta_pct: "percent",
    scheduled_maintenance_reduction_pct: "percent",
    unscheduled_maintenance_reduction_pct: "percent",
    standby_reduction_pct: "percent",
    truck_count_delta: "trucks",
    calendar_hours: "hours/month",
    not_required_hours: "hours/month",
    required_hours: "hours/month",
    scheduled_hours: "hours/month",
    available_hours: "hours/month",
    scheduled_maintenance_hours: "hours/month",
    unscheduled_maintenance_hours: "hours/month",
    operational_standby_hours: "hours/month",
    operating_delay_hours: "hours/month",
    working_hours: "hours/month",
    productive_hours: "hours/month"
  };
  return units[nodeId] || "seconds/cycle";
}

function virtualDescription(nodeId) {
  const descriptions = {
    baseline_modelled_tonnes: "Baseline TMM for the selected baseline.",
    total_material_movement: "Scenario TMM for the current mode and assumptions.",
    truck_production_rate: "Truck production rate for the current assumptions.",
    cycle_time_current: "Cycle time for the current assumptions. Component reductions lower this value.",
    payload_current: "Payload for the current assumptions. Payload improvement changes this value.",
    truck_count_observed: "Average of daily active truck counts in the selected baseline range.",
    truck_count: "Average of daily active truck counts, plus the truck-count slider in custom scenarios. A truck counts as active on a day if it reported any TUM time in scope.",
    scenario_truck_count: "Average active trucks after applying the slider. Added trucks inherit the scenario operating hours per truck.",
    operating_hours_per_truck: "Fleet operating hours divided by average active trucks. End of the per-truck TUM chain: Available Time per Truck minus Operational Standby per Truck.",
    empty_distance_km: "Cycle-weighted average empty travel distance per cycle (dump back to loading).",
    loaded_distance_km: "Cycle-weighted average loaded travel distance per cycle (load to dump).",
    empty_speed_kph: "Empty Distance divided by empty travel time. Empty haul reductions imply a higher speed.",
    loaded_speed_kph: "Loaded Distance divided by loaded travel time. Full haul reductions imply a higher speed.",
    ore_tonnes: "Ore tonnes from material/destination classification. Current seed only confirms direct-crusher ore and leaves the remaining tonnes unknown.",
    waste_tonnes: "Waste tonnes from material/destination classification. Current seed has no confirmed waste split yet.",
    strip_ratio: "Diagnostic waste/ore ratio. It is not used as a hidden shortcut to calculate ore tonnes.",
    direct_crusher_ratio_material: "Direct-crusher tonnes divided by total classified scope tonnes from material/destination evidence.",
    unknown_material_tonnes: "Tonnes not yet split into ore, waste, ROM/stockpile or other non-crusher classes.",
    operating_hours_current: "Total fleet operating time: average active trucks multiplied by operating hours per truck. The TUM chain explains the per-truck side.",
    component_reduction_pct: "Aggregate view of the current cycle-component reduction assumptions.",
    payload_delta_pct: "User assumption that changes average tonnes per cycle.",
    scheduled_maintenance_reduction_pct: "User assumption that reduces scheduled maintenance loss hours and increases Scheduled Time.",
    unscheduled_maintenance_reduction_pct: "User assumption that reduces unscheduled maintenance loss hours and increases Available Time.",
    standby_reduction_pct: "User assumption that converts operational standby hours into operating hours.",
    truck_count_delta: "User assumption that adds or removes active trucks from the selected scope.",
    calendar_hours: "Calendar time per truck in the selected range and equipment scope.",
    not_required_hours: "Calendar time per truck where the fleet is not required for production.",
    required_hours: "Time required per truck. Calculated as Calendar Time minus Not Required Time.",
    scheduled_hours: "Required Time per truck after scheduled maintenance is removed.",
    available_hours: "Scheduled Time per truck after unscheduled maintenance is removed.",
    scheduled_maintenance_hours: "Planned maintenance loss hours per truck in the selected range.",
    unscheduled_maintenance_hours: "Unplanned maintenance loss hours per truck in the selected range.",
    operational_standby_hours: "Available hours per truck where equipment is not operating because of operational standby.",
    operating_delay_hours: "Delay time inside Operating Time. It explains Working Time, but does not create Operating Time in this prototype.",
    working_hours: "Operating Time after Operating Delay is removed.",
    productive_hours: "Working Time used productively."
  };
  return descriptions[nodeId] || "Cycle component from Wenco status movement. Value reflects the current reduction assumption.";
}

function nodeValue(node, results) {
  if (!node) return "";
  if (node.node_id === "component_reduction_pct") {
    const total = Object.keys(state.assumptions)
      .filter((key) => selectedComponents().some((row) => row.component_name === key))
      .reduce((sum, key) => sum + state.assumptions[key], 0);
    return formatPct(total / selectedComponents().length);
  }
  if (node.node_id === "total_material_movement") {
    const periodDays = Number(results.period_days) || 31;
    return formatNumber(results.improved_modelled_tonnes / periodDays * 365);
  }
  if (node.node_id === "truck_production_rate") {
    return formatNumber(results.improved_rate_tph, 1);
  }
  if (node.node_id === "cycle_time_current") {
    return formatNumber(results.improved_cycle_minutes, 2);
  }
  if (node.node_id === "payload_current") {
    return formatNumber(results.improved_payload, 1);
  }
  if (node.node_id === "truck_count") {
    return formatNumber(results.scenario_truck_count, 1);
  }
  if (node.node_id === "truck_count_observed") {
    return formatNumber(results.observed_truck_count ?? results.truck_count_observed ?? results.cycle_truck_count, 1);
  }
  if (node.node_id === "scenario_truck_count") {
    return formatNumber(results.scenario_truck_count, 1);
  }
  if (node.node_id === "operating_hours_current") {
    return formatNumber(results.improved_operating_hours, 1);
  }
  if (node.node_id === "operating_hours_per_truck") {
    return formatNumber(results.improved_operating_hours_per_truck, 1);
  }
  if (node.node_id === "empty_distance_km") {
    return formatNumber(results.empty_distance_avg, 2);
  }
  if (node.node_id === "loaded_distance_km") {
    return formatNumber(results.haul_distance_avg, 2);
  }
  if (node.node_id === "empty_speed_kph") {
    return formatNumber(results.improved_empty_speed_kph ?? results.empty_speed_kph, 1);
  }
  if (node.node_id === "loaded_speed_kph") {
    return formatNumber(results.improved_loaded_speed_kph ?? results.loaded_speed_kph, 1);
  }
  if (node.node_id === "ore_tonnes") {
    return formatNumber(results.ore_tonnes);
  }
  if (node.node_id === "waste_tonnes") {
    return formatNumber(results.waste_tonnes);
  }
  if (node.node_id === "strip_ratio") {
    return results.strip_ratio == null ? "Not available" : formatNumber(results.strip_ratio, 2);
  }
  if (node.node_id === "direct_crusher_ratio_material") {
    return formatPct(results.direct_crusher_ratio_material);
  }
  if (node.node_id === "unknown_material_tonnes") {
    return formatNumber(results.unknown_material_tonnes);
  }
  if (node.node_id === "calendar_hours") {
    return formatNumber(results.calendar_hours_per_truck, 1);
  }
  if (node.node_id === "not_required_hours") {
    return formatNumber(results.not_required_hours_per_truck, 1);
  }
  if (node.node_id === "required_hours") {
    return formatNumber(results.required_hours_per_truck, 1);
  }
  if (node.node_id === "scheduled_hours") {
    return formatNumber(results.improved_scheduled_hours_per_truck, 1);
  }
  if (node.node_id === "availability_current") {
    return formatPct(results.improved_availability_current);
  }
  if (node.node_id === "available_hours") {
    return formatNumber(results.improved_available_hours_per_truck, 1);
  }
  if (node.node_id === "scheduled_maintenance_hours") {
    return formatNumber(results.remaining_scheduled_maintenance_hours_per_truck, 1);
  }
  if (node.node_id === "unscheduled_maintenance_hours") {
    return formatNumber(results.remaining_unscheduled_maintenance_hours_per_truck, 1);
  }
  if (node.node_id === "operational_standby_hours") {
    return formatNumber(results.remaining_operational_standby_hours_per_truck, 1);
  }
  if (node.node_id === "operating_delay_hours") {
    return formatNumber(results.operating_delay_hours);
  }
  if (node.node_id === "working_hours") {
    return formatNumber(results.improved_working_hours);
  }
  if (node.node_id === "productive_hours") {
    return formatNumber(results.productive_hours_current);
  }
  const componentName = node.node_id.replace("_seconds", "");
  const component = selectedComponents().find((row) => row.component_name === componentName);
  if (component) {
    const reduction = state.assumptions[componentName] || 0;
    return formatNumber(component.seconds_per_cycle * (1 - reduction), 1);
  }
  if (node.node_type === "assumption") {
    return formatPct(state.assumptions[node.node_id] ?? 0);
  }
  const value = results[node.field];
  return typeof value === "number" ? formatNumber(value) : value ?? "";
}

function formatNumber(value, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const normalized = Math.abs(value) < 1 / (10 ** Math.max(digits, 0)) ? 0 : value;
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(normalized);
}

function formatPct(value) {
  return `${formatNumber(value * 100, 1)}%`;
}

function clampZoom(value) {
  return Math.min(1.4, Math.max(0.45, Number(value.toFixed(2))));
}

function labelize(value) {
  return String(value).replaceAll("_", " ");
}

function infoButton(text) {
  const safe = String(text || "").replaceAll('"', "&quot;");
  return `<button class="info-button" type="button" aria-label="${safe}" data-tooltip="${safe}">i</button>`;
}
