const DATA_ROOT = "../ui-data/cat793_jan_2026";
const DATA_VERSION = "20260520-sensitivity-1";

const state = {
  baseline: [],
  components: [],
  scenarios: [],
  metadata: null,
  mode: "AHS",
  treeView: "compact",
  impactView: "scenario",
  workbookZoom: 0.75,
  focusMode: false,
  selectedNodeId: "tmm_uplift_tonnes",
  assumptions: {
    queue_load: 0,
    queue_dump: 0,
    truck_loading: 0,
    full_haul: 0,
    empty_haul: 0,
    spot_load: 0,
    dumping: 0,
    spot_dump: 0,
    payload_delta_pct: 0,
    scheduled_maintenance_reduction_pct: 0,
    unscheduled_maintenance_reduction_pct: 0,
    standby_reduction_pct: 0
  }
};

const treeLayout = [
  {
    title: "Baseline",
    nodes: ["payload_avg", "cycle_minutes", "operating_hours", "actual_tonnes"]
  },
  {
    title: "Assumptions",
    nodes: ["component_reduction_pct", "payload_delta_pct", "scheduled_maintenance_reduction_pct", "unscheduled_maintenance_reduction_pct", "standby_reduction_pct"]
  },
  {
    title: "Improved Drivers",
    nodes: ["improved_payload", "improved_cycle_minutes", "improved_operating_hours", "improved_rate_tph"]
  },
  {
    title: "Material Movement",
    nodes: ["baseline_modelled_tonnes", "improved_modelled_tonnes", "tmm_uplift_tonnes", "truck_equivalent"]
  },
  {
    title: "Crusher Impact",
    nodes: ["direct_crusher_ratio_mode", "direct_crusher_uplift_tonnes_mode", "direct_crusher_ratio_scope", "direct_crusher_uplift_tonnes_scope"]
  }
];

const workbookNodes = [
  ["actual_tonnes", 20, 20],
  ["total_material_movement", 360, 360],
  ["direct_crusher_uplift_tonnes_mode", 20, 520],
  ["truck_equivalent", 360, 500],
  ["truck_production_rate", 660, 210],
  ["cycle_time_current", 920, 120],
  ["payload_current", 920, 280],
  ["operating_hours_current", 660, 780],
  ["queue_load_seconds", 1240, 20],
  ["truck_loading_seconds", 1240, 100],
  ["spot_load_seconds", 1240, 180],
  ["full_haul_seconds", 1240, 260],
  ["empty_haul_seconds", 1240, 340],
  ["queue_dump_seconds", 1240, 420],
  ["spot_dump_seconds", 1240, 500],
  ["dumping_seconds", 1240, 580],
  ["available_hours", 960, 700],
  ["operational_standby_hours", 960, 820],
  ["scheduled_hours", 1240, 660],
  ["unscheduled_maintenance_hours", 1240, 780],
  ["required_hours", 1520, 620],
  ["scheduled_maintenance_hours", 1520, 740],
  ["calendar_hours", 1800, 580],
  ["not_required_hours", 1800, 700],
  ["working_hours", 660, 940],
  ["operating_delay_hours", 960, 940],
  ["productive_hours", 660, 1060]
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
  ["cycle_time_current", "truck_production_rate"],
  ["payload_current", "truck_production_rate"],
  ["truck_production_rate", "total_material_movement"],
  ["operating_hours_current", "total_material_movement"],
  ["total_material_movement", "truck_equivalent"],
  ["total_material_movement", "direct_crusher_uplift_tonnes_mode"],
  ["available_hours", "operating_hours_current"],
  ["operational_standby_hours", "operating_hours_current"],
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
  ["full_haul", "Full Haul Reduction", 0, 0.2, 0.01, "Reduces loaded travel time from load to dump. Unit: percent reduction of seconds per cycle."],
  ["empty_haul", "Empty Haul Reduction", 0, 0.2, 0.01, "Reduces empty travel time from dump back to loading. Unit: percent reduction of seconds per cycle."],
  ["spot_load", "Spot Load Reduction", 0, 0.3, 0.01, "Reduces time spent positioning at the loading unit. Unit: percent reduction of seconds per cycle."],
  ["dumping", "Dumping Reduction", 0, 0.2, 0.01, "Reduces active dumping duration at the dump location. Unit: percent reduction of seconds per cycle."],
  ["spot_dump", "Spot Dump Reduction", 0, 0.2, 0.01, "Reduces time spent positioning at the dump location. Unit: percent reduction of seconds per cycle."],
  ["payload_delta_pct", "Payload Improvement", -0.05, 0.1, 0.005, "Changes average truck payload. Unit: percent change to tonnes per cycle."],
  ["scheduled_maintenance_reduction_pct", "Scheduled Maintenance Reduction", 0, 0.5, 0.01, "Reduces scheduled maintenance loss hours, increasing available time. Unit: percent of scheduled maintenance hours."],
  ["unscheduled_maintenance_reduction_pct", "Unscheduled Maintenance Reduction", 0, 0.5, 0.01, "Reduces unscheduled maintenance loss hours, increasing available time. Unit: percent of unscheduled maintenance hours."],
  ["standby_reduction_pct", "Operational Standby Reduction", 0, 0.5, 0.01, "Reduces operational standby hours, increasing operating time. Unit: percent of standby hours."]
];

const metricHelp = {
  "Actual tonnes": "Actual tonnes reported by Wenco haul cycles for the selected scope.",
  "Baseline modelled": "Tonnes calculated by the model using payload, cycle time and operating hours.",
  "Baseline annualized": "Baseline modelled tonnes multiplied by 12. This is a simple annualized view, not a forecast.",
  "Custom annualized": "Scenario modelled tonnes multiplied by 12 using the current slider assumptions.",
  "Custom uplift": "Additional modelled tonnes from the current slider assumptions.",
  "Annualized uplift": "Monthly custom uplift multiplied by 12.",
  "Truck equivalent": "Custom uplift converted into equivalent average baseline trucks.",
  "Crusher uplift": "Estimated direct crusher uplift using the selected mode's crusher ratio."
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const [baselineText, componentText, scenarioText, metadata] = await Promise.all([
    fetchText(`${DATA_ROOT}/baseline.csv`),
    fetchText(`${DATA_ROOT}/cycle_components.csv`),
    fetchText(`${DATA_ROOT}/scenario_results.csv`),
    fetchJson(`${DATA_ROOT}/tree_metadata.json`)
  ]);

  state.baseline = parseCsv(baselineText).map(coerceRow);
  state.components = parseCsv(componentText).map(coerceRow);
  state.scenarios = parseCsv(scenarioText).map(coerceRow);
  state.metadata = metadata;
  state.mode = state.baseline[0]?.ahs_mode || "AHS";

  bindModeSelect();
  renderAssumptionControls();
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

function bindModeSelect() {
  const select = document.getElementById("modeSelect");
  select.innerHTML = [...new Set(state.baseline.map((row) => row.ahs_mode))]
    .map((mode) => `<option value="${mode}">${mode}</option>`)
    .join("");
  select.value = state.mode;
  select.addEventListener("change", () => {
    state.mode = select.value;
    render();
  });

  document.getElementById("resetButton").addEventListener("click", () => {
    state.assumptions = {
      queue_load: 0,
      queue_dump: 0,
      truck_loading: 0,
      full_haul: 0,
      empty_haul: 0,
      spot_load: 0,
      dumping: 0,
      spot_dump: 0,
      payload_delta_pct: 0,
      scheduled_maintenance_reduction_pct: 0,
      unscheduled_maintenance_reduction_pct: 0,
      standby_reduction_pct: 0
    };
    renderAssumptionControls();
    render();
  });

  document.getElementById("compactTreeButton").addEventListener("click", () => {
    state.treeView = "compact";
    render();
  });

  document.getElementById("workbookTreeButton").addEventListener("click", () => {
    state.treeView = "workbook";
    render();
  });

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
      state.treeView = "workbook";
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
  container.innerHTML = assumptionControls.map(([key, label, min, max, step, help]) => `
    <div class="control-row">
      <div class="control-head">
        <span>${label} ${infoButton(help)}</span>
        <span id="value-${key}">${formatPct(state.assumptions[key])}</span>
      </div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${state.assumptions[key]}" data-assumption="${key}">
      <div class="assumption-detail" id="detail-${key}"></div>
    </div>
  `).join("");

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const key = event.target.dataset.assumption;
      state.assumptions[key] = Number(event.target.value);
      document.getElementById(`value-${key}`).textContent = formatPct(state.assumptions[key]);
      render();
    });
  });
}

function render() {
  const baseline = selectedBaseline();
  const results = calculateCustomScenario(baseline, selectedComponents());
  renderAssumptionDetails(baseline, selectedComponents());
  renderSummary(baseline, results);
  renderTree(results);
  renderScenarioTable();
  renderSensitivityView(baseline, selectedComponents(), results);
  renderImpactPanels();
  renderDetails(results);
}

function renderAssumptionDetails(baseline, components) {
  const componentMap = Object.fromEntries(components.map((row) => [row.component_name, row]));

  assumptionControls.forEach(([key]) => {
    const detail = document.getElementById(`detail-${key}`);
    if (!detail) return;

    if (componentMap[key]) {
      const base = componentMap[key].seconds_per_cycle;
      const removed = base * state.assumptions[key];
      const next = base - removed;
      detail.textContent = `Baseline ${formatNumber(base, 1)} sec/cycle · Remove ${formatNumber(removed, 1)} sec · New ${formatNumber(next, 1)} sec/cycle`;
      return;
    }

    if (key === "payload_delta_pct") {
      const next = baseline.payload_avg * (1 + state.assumptions.payload_delta_pct);
      detail.textContent = `Baseline ${formatNumber(baseline.payload_avg, 1)} t/cycle · New ${formatNumber(next, 1)} t/cycle`;
      return;
    }

    if (key === "scheduled_maintenance_reduction_pct") {
      const reduced = baseline.scheduled_maintenance_hours * state.assumptions.scheduled_maintenance_reduction_pct;
      const next = baseline.scheduled_maintenance_hours - reduced;
      detail.textContent = `Baseline ${formatNumber(baseline.scheduled_maintenance_hours, 1)} scheduled maintenance h/month · Reduce ${formatNumber(reduced, 1)} h · New ${formatNumber(next, 1)} h`;
      return;
    }

    if (key === "unscheduled_maintenance_reduction_pct") {
      const reduced = baseline.unscheduled_maintenance_hours * state.assumptions.unscheduled_maintenance_reduction_pct;
      const next = baseline.unscheduled_maintenance_hours - reduced;
      detail.textContent = `Baseline ${formatNumber(baseline.unscheduled_maintenance_hours, 1)} unscheduled maintenance h/month · Reduce ${formatNumber(reduced, 1)} h · New ${formatNumber(next, 1)} h`;
      return;
    }

    if (key === "standby_reduction_pct") {
      const added = baseline.operational_standby_hours * state.assumptions.standby_reduction_pct;
      detail.textContent = `Baseline ${formatNumber(baseline.operational_standby_hours, 1)} standby h/month · Convert ${formatNumber(added, 1)} h`;
    }
  });
}

function selectedBaseline() {
  return state.baseline.find((row) => row.ahs_mode === state.mode);
}

function selectedComponents() {
  return state.components.filter((row) => row.ahs_mode === state.mode);
}

function calculateCustomScenario(baseline, components, assumptions = state.assumptions) {
  const componentMap = Object.fromEntries(components.map((row) => [row.component_name, row]));
  const cycleSecondsRemoved = Object.entries(assumptions)
    .filter(([key]) => componentMap[key])
    .reduce((sum, [key, reduction]) => sum + componentMap[key].seconds_per_cycle * reduction, 0);

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
  const improvedOperatingHours = improvedAvailableHours - remainingOperationalStandbyHours;
  const improvedWorkingHours = improvedOperatingHours - operatingDelayHours;
  const improvedRateTph = improvedPayload / (improvedCycleSeconds / 3600);
  const improvedModelledTonnes = improvedRateTph * improvedOperatingHours;
  const tmmUplift = improvedModelledTonnes - baseline.baseline_modelled_tonnes;

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
    scheduled_maintenance_reduced_hours: scheduledMaintenanceReducedHours,
    unscheduled_maintenance_reduced_hours: unscheduledMaintenanceReducedHours,
    converted_standby_hours: convertedStandbyHours,
    improved_available_hours: improvedAvailableHours,
    improved_availability_current: improvedAvailableHours / requiredHours,
    remaining_scheduled_maintenance_hours: scheduledMaintenanceHours - scheduledMaintenanceReducedHours,
    remaining_unscheduled_maintenance_hours: unscheduledMaintenanceHours - unscheduledMaintenanceReducedHours,
    remaining_operational_standby_hours: remainingOperationalStandbyHours,
    improved_operating_hours: improvedOperatingHours,
    improved_working_hours: improvedWorkingHours,
    productive_hours_current: productiveHours,
    improved_rate_tph: improvedRateTph,
    improved_modelled_tonnes: improvedModelledTonnes,
    tmm_uplift_tonnes: tmmUplift,
    annualized_tmm_uplift_tonnes: tmmUplift * 12,
    truck_equivalent: tmmUplift / baseline.baseline_tonnes_per_truck_month,
    direct_crusher_uplift_tonnes_mode: tmmUplift * baseline.direct_crusher_ratio_mode,
    direct_crusher_uplift_tonnes_scope: tmmUplift * baseline.direct_crusher_ratio_scope
  };
}

function renderSummary(baseline, results) {
  const items = [
    ["Actual tonnes", baseline.actual_tonnes, "t/month"],
    ["Baseline modelled", baseline.baseline_modelled_tonnes, "t/month"],
    ["Baseline annualized", baseline.baseline_modelled_tonnes * 12, "t/year"],
    ["Custom annualized", results.improved_modelled_tonnes * 12, "t/year"],
    ["Custom uplift", results.tmm_uplift_tonnes, "t/month"],
    ["Annualized uplift", results.annualized_tmm_uplift_tonnes, "t/year"],
    ["Truck equivalent", results.truck_equivalent, "trucks"],
    ["Crusher uplift", results.direct_crusher_uplift_tonnes_mode, `${formatNumber(results.direct_crusher_uplift_tonnes_mode * 12)} t/year mode`]
  ];

  document.getElementById("summaryBand").innerHTML = items.map(([label, value, unit]) => `
    <div class="metric">
      <div class="label">${label} ${infoButton(metricHelp[label])}</div>
      <div class="value">${formatNumber(value)}</div>
      <div class="sub">${unit}</div>
    </div>
  `).join("");
}

function renderTree(results) {
  const canvas = document.getElementById("treeCanvas");
  const active = activePath();
  const workbookMode = state.treeView === "workbook";
  document.getElementById("activePathLabel").textContent = active.size ? "Highlighted impact path" : "";
  document.body.classList.toggle("focus-mode", state.focusMode);
  document.getElementById("compactTreeButton").classList.toggle("active", !workbookMode);
  document.getElementById("workbookTreeButton").classList.toggle("active", workbookMode);
  document.getElementById("zoomLabel").textContent = `${Math.round(state.workbookZoom * 100)}%`;
  document.querySelector(".zoom-control").classList.toggle("is-disabled", !workbookMode);
  document.querySelectorAll(".zoom-control button").forEach((button) => {
    button.disabled = !workbookMode;
  });
  document.getElementById("focusModeButton").classList.toggle("active", state.focusMode);
  document.getElementById("focusModeButton").textContent = state.focusMode ? "Exit Focus" : "Focus";

  if (workbookMode) {
    renderWorkbookTree(canvas, results, active);
    return;
  }

  canvas.innerHTML = treeLayout.map((column) => `
    <div class="tree-col">
      <div class="tree-col-title">${column.title}</div>
      ${column.nodes.map((nodeId) => renderNode(nodeId, results, active)).join("")}
    </div>
  `).join("");

  canvas.querySelectorAll(".tree-node").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedNodeId = node.dataset.nodeId;
      render();
    });
  });
}

function renderWorkbookTree(canvas, results, active) {
  const treeWidth = 2020;
  const treeHeight = 1120;
  const zoom = state.workbookZoom;
  const nodeWidth = 190;
  const nodeHeight = 58;
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
        ${workbookNodes.map(([nodeId, x, y]) => renderWorkbookNode(nodeId, x, y, results, active)).join("")}
      </div>
    </div>
  `;

  canvas.querySelectorAll(".workbook-node").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedNodeId = node.dataset.nodeId;
      render();
    });
  });
}

function renderWorkbookNode(nodeId, x, y, results, active) {
  const node = nodeById(nodeId) || virtualNode(nodeId);
  const classes = [
    "workbook-node",
    `node-${node.node_type || "source"}`,
    state.selectedNodeId === nodeId ? "selected" : "",
    active.has(nodeId) ? "active-path" : ""
  ].join(" ");

  return `
    <button class="${classes}" style="left:${x}px; top:${y}px" data-node-id="${nodeId}" type="button">
      <span>${workbookNodeLabel(nodeId, node.label)} <small>${workbookNodeUnit(nodeId, node.unit)}</small></span>
      <strong>${nodeValue(node, results)}</strong>
    </button>
  `;
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
      <div class="node-label">${node.label || nodeId}</div>
      <div class="node-value">${value}</div>
      <div class="node-type">${node.node_type || "node"} · ${node.unit || ""}</div>
    </div>
  `;
}

function activePath() {
  const highlighted = new Set(["tmm_uplift_tonnes", "truck_equivalent", "direct_crusher_uplift_tonnes_mode", "direct_crusher_uplift_tonnes_scope"]);
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
    ["operating_hours_current", "total_material_movement", "truck_equivalent", "direct_crusher_uplift_tonnes_mode"].forEach((node) => highlighted.add(node));
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
  const rows = state.scenarios
    .filter((row) => row.ahs_mode === state.mode)
    .sort((a, b) => b.tmm_uplift_tonnes - a.tmm_uplift_tonnes);

  document.getElementById("scenarioRows").innerHTML = rows.map((row) => `
    <tr>
      <td>${labelize(row.scenario_name)}</td>
      <td>${row.driver_family}</td>
      <td class="numeric">${formatNumber(row.tmm_uplift_tonnes)}</td>
      <td class="numeric">${formatNumber(row.truck_equivalent, 3)}</td>
      <td class="numeric">${formatNumber(row.direct_crusher_uplift_tonnes_mode)}</td>
      <td class="numeric">${formatNumber(row.direct_crusher_uplift_tonnes_scope)}</td>
    </tr>
  `).join("");
}

function renderImpactPanels() {
  const scenarioActive = state.impactView === "scenario";
  document.getElementById("scenarioRankingPanel").hidden = !scenarioActive;
  document.getElementById("sensitivityPanel").hidden = scenarioActive;
  document.getElementById("scenarioRankingButton").classList.toggle("active", scenarioActive);
  document.getElementById("sensitivityButton").classList.toggle("active", !scenarioActive);
  document.getElementById("impactSubtitle").textContent = scenarioActive
    ? "Template scenarios from Databricks"
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
      <td class="numeric">${formatNumber(row.direct_crusher_uplift_tonnes_mode)}</td>
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
    truck_equivalent: tmmUplift / baseline.baseline_tonnes_per_truck_month,
    direct_crusher_uplift_tonnes_mode: tmmUplift * baseline.direct_crusher_ratio_mode
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
    .map(([fromNodeId]) => (nodeById(fromNodeId) || virtualNode(fromNodeId))?.label || fromNodeId);
  const downstream = visibleEdges
    .filter(([fromNodeId]) => fromNodeId === state.selectedNodeId)
    .map(([, toNodeId]) => (nodeById(toNodeId) || virtualNode(toNodeId))?.label || toNodeId);
  const formula = state.metadata.formulas.find((item) => item.formula_id === node?.formula_id);
  const workbookFormula = state.treeView === "workbook" ? workbookFormulaDetails(state.selectedNodeId, results) : null;

  document.getElementById("nodeDetails").innerHTML = `
    <div class="detail-item"><strong>${node?.label || state.selectedNodeId}</strong>${node?.description || ""}</div>
    <div class="detail-item"><strong>Value</strong>${value} ${node?.unit || ""}</div>
    <div class="detail-item"><strong>Type</strong>${node?.node_type || "node"}</div>
    <div class="detail-item"><strong>Upstream</strong>${upstream.length ? upstream.join(", ") : "None"}</div>
    <div class="detail-item"><strong>Downstream</strong>${downstream.length ? downstream.join(", ") : "None"}</div>
    ${workbookFormula ? `<div class="detail-item formula-card"><strong>Calculation</strong>${workbookFormula}</div>` : ""}
    ${formula ? `<div class="detail-item"><strong>Formula</strong>${formula.expression}</div>` : ""}
  `;

  document.getElementById("lineageDetails").innerHTML = `
    <div class="detail-item"><strong>Dataset</strong>${node?.dataset || "metadata"}</div>
    <div class="detail-item"><strong>Field</strong>${node?.field || "Not source-backed"}</div>
    <div class="detail-item"><strong>Mode</strong>${state.mode}</div>
    ${state.mode === "CONV" ? `<div class="detail-item warn"><strong>Sample size warning</strong>CONV has 3 trucks in this CAT793 January 2026 slice.</div>` : ""}
  `;
}

function nodeById(nodeId) {
  return state.metadata.nodes.find((node) => node.node_id === nodeId);
}

function workbookFormulaDetails(nodeId, results) {
  const formulas = {
    cycle_time_current: "(Queue Load + Truck Loading + Spot Load + Full Haul + Empty Haul + Queue Dump + Spot Dump + Dumping) / 60",
    truck_production_rate: "Operating Payload / (Cycle Time / 60)",
    total_material_movement: "Truck Production Rate * Operating Time",
    required_hours: "Calendar Time - Not Required Time",
    scheduled_hours: "Required Time - Scheduled Maintenance",
    available_hours: "Scheduled Time - Unscheduled Maintenance",
    operating_hours_current: "Available Time - Operational Standby",
    availability_current: "Available Hours / Required Hours",
    working_hours: "Operating Time - Operating Delay",
    payload_current: "Baseline Payload * (1 + Payload Improvement)",
    truck_equivalent: "TMM Uplift / Baseline Tonnes per Truck Month",
    direct_crusher_uplift_tonnes_mode: "TMM Uplift * Direct Crusher Ratio"
  };
  const formula = formulas[nodeId];
  if (!formula) return null;
  return `
    <div class="formula-expression">${formula}</div>
  `;
}

function virtualNode(nodeId) {
  const labels = {
    total_material_movement: "Total Material Movement",
    truck_production_rate: "Truck Production Rate",
    cycle_time_current: "Cycle Time",
    payload_current: "Operating Payload",
    operating_hours_current: "Operating Time",
    component_reduction_pct: "Component Reduction",
    payload_delta_pct: "Payload Improvement",
    scheduled_maintenance_reduction_pct: "Scheduled Maintenance Reduction",
    unscheduled_maintenance_reduction_pct: "Unscheduled Maintenance Reduction",
    standby_reduction_pct: "Operational Standby Reduction",
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
    node_type: ["component_reduction_pct", "payload_delta_pct", "scheduled_maintenance_reduction_pct", "unscheduled_maintenance_reduction_pct", "standby_reduction_pct"].includes(nodeId)
      ? "assumption"
      : ["total_material_movement", "truck_production_rate", "cycle_time_current", "payload_current", "operating_hours_current"].includes(nodeId)
      ? "calculated"
      : "source",
    unit: virtualUnit(nodeId),
    dataset: ["total_material_movement", "truck_production_rate", "cycle_time_current", "payload_current", "operating_hours_current"].includes(nodeId)
      ? "scenario_results"
      : nodeId.endsWith("_seconds") ? "cycle_components" : "baseline",
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
    total_material_movement: "t/month",
    direct_crusher_uplift_tonnes_mode: "t/month",
    truck_equivalent: "trucks",
    truck_production_rate: "t/h",
    cycle_time_current: "min/cycle",
    payload_current: "t/cycle",
    operating_hours_current: "h/month",
    calendar_hours: "h/month",
    not_required_hours: "h/month",
    availability_current: "%",
    available_hours: "h/month",
    required_hours: "h/month",
    scheduled_hours: "h/month",
    scheduled_maintenance_hours: "h/month",
    unscheduled_maintenance_hours: "h/month",
    operational_standby_hours: "h/month",
    operating_delay_hours: "h/month",
    working_hours: "h/month",
    productive_hours: "h/month"
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
    total_material_movement: "tonnes/month",
    truck_production_rate: "tonnes/hour",
    cycle_time_current: "minutes/cycle",
    payload_current: "tonnes/cycle",
    operating_hours_current: "hours/month",
    component_reduction_pct: "percent",
    payload_delta_pct: "percent",
    scheduled_maintenance_reduction_pct: "percent",
    unscheduled_maintenance_reduction_pct: "percent",
    standby_reduction_pct: "percent",
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
    total_material_movement: "Modelled total material movement for the current assumptions. With no changes this equals baseline modelled tonnes.",
    truck_production_rate: "Truck production rate for the current assumptions.",
    cycle_time_current: "Cycle time for the current assumptions. Component reductions lower this value.",
    payload_current: "Payload for the current assumptions. Payload improvement changes this value.",
    operating_hours_current: "Operating time for the current assumptions. It follows the TUM hierarchy: Available Time minus Operational Standby.",
    component_reduction_pct: "Aggregate view of the current cycle-component reduction assumptions.",
    payload_delta_pct: "User assumption that changes average tonnes per cycle.",
    scheduled_maintenance_reduction_pct: "User assumption that reduces scheduled maintenance loss hours and increases Scheduled Time.",
    unscheduled_maintenance_reduction_pct: "User assumption that reduces unscheduled maintenance loss hours and increases Available Time.",
    standby_reduction_pct: "User assumption that converts operational standby hours into operating hours.",
    calendar_hours: "All calendar time in the selected month and equipment scope.",
    not_required_hours: "Calendar time where the fleet is not required for production.",
    required_hours: "Time required for the fleet. Calculated as Calendar Time minus Not Required Time.",
    scheduled_hours: "Required Time after scheduled maintenance is removed.",
    available_hours: "Scheduled Time after unscheduled maintenance is removed.",
    scheduled_maintenance_hours: "Planned maintenance loss hours in the selected month.",
    unscheduled_maintenance_hours: "Unplanned maintenance loss hours in the selected month.",
    operational_standby_hours: "Available hours where equipment is not operating because of operational standby.",
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
    return formatNumber(results.improved_modelled_tonnes);
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
  if (node.node_id === "operating_hours_current") {
    return formatNumber(results.improved_operating_hours, 1);
  }
  if (node.node_id === "calendar_hours") {
    return formatNumber(results.calendar_hours_current);
  }
  if (node.node_id === "not_required_hours") {
    return formatNumber(results.not_required_hours_current);
  }
  if (node.node_id === "required_hours") {
    return formatNumber(results.required_hours_current);
  }
  if (node.node_id === "scheduled_hours") {
    return formatNumber(results.improved_scheduled_hours);
  }
  if (node.node_id === "availability_current") {
    return formatPct(results.improved_availability_current);
  }
  if (node.node_id === "available_hours") {
    return formatNumber(results.improved_available_hours);
  }
  if (node.node_id === "scheduled_maintenance_hours") {
    return formatNumber(results.remaining_scheduled_maintenance_hours);
  }
  if (node.node_id === "unscheduled_maintenance_hours") {
    return formatNumber(results.remaining_unscheduled_maintenance_hours);
  }
  if (node.node_id === "operational_standby_hours") {
    return formatNumber(results.remaining_operational_standby_hours);
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
  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
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
