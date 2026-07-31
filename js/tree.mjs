import { COMPONENTS, nodeValue } from "./model.mjs?v=20260731-v5-19";

export const TREE_WIDTH = 1650;
export const TREE_HEIGHT = 1175;

const NODES = [
  node("tmm", "Haul Fleet Tonnes Moved", 35, 550, "output", "t"),
  node("rate", "Net Rate", 300, 155, "calculated", "t/WT h"),
  node("working_time", "Working Time", 300, 745, "calculated", "h"),
  node("truck_count", "Number of Trucks", 300, 930, "context", "avg trucks"),
  node("truck_equivalent", "Truck Equivalent", 35, 930, "calculated", "trucks"),

  node("payload", "Payload", 565, 70, "source", "t/cycle"),
  node("net_cycle", "Net Cycle", 565, 245, "calculated", "min/cycle"),
  node("operating_time", "Operating Time", 565, 650, "calculated", "h"),
  node("operating_delay", "Operating Delay", 565, 835, "source", "h"),
  node("uoa_pct", "UoA", 565, 1000, "percentage", "%"),

  node("gross_cycle", "Observed Gross Cycle", 845, 245, "calculated", "min/cycle"),
  node("available_time", "Available Time", 845, 570, "calculated", "h"),
  node("operating_standby", "Operating Standby", 845, 735, "source", "h"),

  node("queue_load", "Queue at Load", 1125, 0, "source", "min/cycle"),
  node("spot_load", "Spot at LU", 1125, 72, "source", "min/cycle"),
  node("loaded_travel", "Loaded Travel", 1125, 144, "calculated", "min/cycle"),
  node("truck_loading", "Truck Load Time", 1125, 216, "source", "min/cycle"),
  node("queue_dump", "Queue at Dump", 1125, 288, "source", "min/cycle"),
  node("spot_dump", "Spot at Dump", 1125, 360, "source", "min/cycle"),
  node("dumping", "Dumping Time", 1125, 432, "source", "min/cycle"),
  node("empty_travel", "Empty Travel", 1125, 504, "calculated", "min/cycle"),

  node("required_time", "Required Time", 1125, 600, "calculated", "h"),
  node("cyclone_standby", "Cyclone Standby", 1125, 665, "source", "h"),
  node("scheduled_loss", "Scheduled Loss", 1125, 730, "source", "h"),
  node("unscheduled_loss", "Unscheduled Loss", 1125, 795, "source", "h"),
  node("availability_pct", "Availability", 1125, 860, "percentage", "%"),

  node("loaded_distance", "Loaded Distance", 1405, 105, "source", "km/cycle"),
  node("loaded_speed", "Loaded Speed", 1405, 185, "source", "km/h"),
  node("empty_distance", "Empty Distance", 1405, 410, "source", "km/cycle"),
  node("empty_speed", "Empty Speed", 1405, 490, "source", "km/h"),
  node("calendar_time", "Calendar Time", 1405, 610, "source", "h"),
  node("not_required", "Not Required", 1405, 700, "source", "h")
];

const ANNUALIZED_TOTALS = new Set([
  "tmm", "calendar_time", "not_required", "required_time", "scheduled_loss",
  "cyclone_standby", "unscheduled_loss", "available_time", "operating_standby", "operating_time",
  "operating_delay", "working_time"
]);

const LOWER_IS_BETTER = new Set([
  "net_cycle", "gross_cycle", "queue_load", "spot_load", "loaded_travel", "loaded_distance", "truck_loading",
  "queue_dump", "spot_dump", "dumping", "empty_travel", "empty_distance", "not_required",
  "cyclone_standby", "scheduled_loss", "unscheduled_loss", "operating_standby", "operating_delay"
]);

const NEUTRAL_COMPARISON = new Set(["calendar_time", "truck_count"]);

const LEVER_PATHS = {
  payload_delta_pct: ["payload", "rate", "tmm"],
  ...Object.fromEntries(COMPONENTS
    .filter((component) => !["loaded_travel", "empty_travel"].includes(component.id))
    .map((component) => [`${component.id}_reduction_pct`, [component.id, "gross_cycle", "net_cycle", "rate", "tmm"]])),
  loaded_speed_increase_pct: ["loaded_speed", "loaded_travel", "gross_cycle", "net_cycle", "rate", "tmm"],
  loaded_distance_reduction_pct: ["loaded_distance", "loaded_travel", "gross_cycle", "net_cycle", "rate", "tmm"],
  empty_speed_increase_pct: ["empty_speed", "empty_travel", "gross_cycle", "net_cycle", "rate", "tmm"],
  empty_distance_reduction_pct: ["empty_distance", "empty_travel", "gross_cycle", "net_cycle", "rate", "tmm"],
  scheduled_loss_reduction_pct: ["scheduled_loss", "available_time", "availability_pct", "operating_time", "working_time", "uoa_pct", "tmm"],
  unscheduled_loss_reduction_pct: ["unscheduled_loss", "available_time", "availability_pct", "operating_time", "working_time", "uoa_pct", "tmm"],
  standby_reduction_pct: ["operating_standby", "operating_time", "working_time", "uoa_pct", "tmm"],
  operating_delay_reduction_pct: ["operating_delay", "working_time", "uoa_pct", "tmm"]
};

const EDGES = [
  ["rate", "tmm"], ["truck_count", "tmm"], ["working_time", "tmm"], ["tmm", "truck_equivalent", "output"],
  ["payload", "rate"], ["net_cycle", "rate"], ["gross_cycle", "net_cycle"],
  ...COMPONENTS.map((component) => [component.id, "gross_cycle"]),
  ["loaded_distance", "loaded_travel"], ["loaded_speed", "loaded_travel"],
  ["empty_distance", "empty_travel"], ["empty_speed", "empty_travel"],
  ["operating_time", "working_time"], ["operating_delay", "working_time"], ["uoa_pct", "working_time"],
  ["available_time", "operating_time"], ["operating_standby", "operating_time"],
  ["required_time", "available_time"], ["cyclone_standby", "available_time"], ["scheduled_loss", "available_time"], ["unscheduled_loss", "available_time"], ["availability_pct", "available_time"],
  ["calendar_time", "required_time"], ["not_required", "required_time"]
];

export const NODE_INFO = {
  tmm: ["Haul Fleet Tonnes Moved", ""],
  rate: ["Net Rate", "Effective Net Rate = total modelled TMM / total Working Time. At source grain it is Payload / (Net Cycle / 60)."],
  net_cycle: ["Net Cycle", "Baseline = Working Time x 60 / recorded cycles. In Custom, it stays frozen except for proportional changes from the observed gross component cycle."],
  gross_cycle: ["Observed Gross Cycle", "Sum of the eight observed Wenco cycle components. It controls relative custom changes to Net Cycle; it is not presented as the Net Cycle itself."],
  working_time: ["Working Time", "Operating Time - Operating Delay. This is the V5 TMM time multiplier."],
  operating_time: ["Operating Time", "Available Time - Operating Standby."],
  operating_delay: ["Operating Delay", "Recorded Operating Delay. In Custom, recovered delay increases Working Time while baseline Net Cycle remains frozen."],
  truck_count: ["Number of Trucks", "Average active trucks in scope. Shown as a TMM branch for operational context; it is not yet multiplied into TMM."],
  truck_equivalent: ["Truck Equivalent", "Annualized TMM delta divided by baseline annualized TMM per average truck. This is an output, not a truck-count input."],
  payload: ["Payload", "Cycle-weighted observed payload. In Custom, payload changes Net Rate directly."],
  available_time: ["Available Time", "Required Time - Cyclone Standby - Scheduled Loss - Unscheduled Loss."],
  operating_standby: ["Operating Standby", "Available time not operating. Reducing it increases Operating and Working Time."],
  required_time: ["Required Time", "Calendar Time - Not Required."],
  cyclone_standby: ["Cyclone Standby", "Weekly plan hours unavailable due to cyclone standby. Retained separately from Scheduled Maintenance."],
  scheduled_loss: ["Scheduled Loss", "Scheduled maintenance loss hours."],
  unscheduled_loss: ["Unscheduled Loss", "Unscheduled maintenance loss hours."],
  availability_pct: ["Availability", "Available Time / Required Time."],
  uoa_pct: ["UoA", "Working Time / Available Time."],
  calendar_time: ["Calendar Time", "Source calendar hours for equipment in scope."],
  not_required: ["Not Required", "Source hours where equipment was not required to operate."],
  ...Object.fromEntries(COMPONENTS.map((component) => [component.id, [component.label, "Observed gross-cycle component. Custom changes flow through Gross Cycle, Net Cycle, Net Rate, and TMM once."]])),
  loaded_travel: ["Loaded Travel", "Loaded Distance / Loaded Speed x 60. It contributes to Observed Gross Cycle."],
  empty_travel: ["Empty Travel", "Empty Distance / Empty Speed x 60. It contributes to Observed Gross Cycle."],
  loaded_distance: ["Loaded Distance", "Cycle-weighted loaded distance. Positive custom values shorten distance and reduce Loaded Travel."],
  loaded_speed: ["Loaded Speed", "Distance-consistent loaded speed. Positive custom values increase speed and reduce Loaded Travel."],
  empty_distance: ["Empty Distance", "Cycle-weighted empty return distance. Positive custom values shorten distance and reduce Empty Travel."],
  empty_speed: ["Empty Speed", "Distance-consistent empty speed. Positive custom values increase speed and reduce Empty Travel."]
};

export function changedNodeIds(baseline, current, enabled = true, assumptions = null) {
  if (!enabled) return new Set();
  const activeLeverIds = assumptions
    ? Object.entries(assumptions).filter(([, value]) => Math.abs(Number(value) || 0) > 0.000001).map(([id]) => id)
    : [];
  if (activeLeverIds.length) {
    const activePath = activeLeverIds.flatMap((id) => LEVER_PATHS[id] || []);
    if (activePath.includes("tmm")) activePath.push("truck_equivalent");
    return new Set(activePath);
  }
  return new Set(NODES.filter((item) => {
    const base = nodeValue(baseline, item.id);
    const scenario = nodeValue(current, item.id);
    if (base == null || scenario == null) return base !== scenario;
    return Math.abs(scenario - base) > Math.max(0.000001, Math.abs(base) * 0.000001);
  }).map((item) => item.id));
}

export function renderTree(container, baseline, current, selectedNodeId, onSelect, zoom, activeNodeIds = new Set(), showDirectionalTone = true) {
  const nodesById = Object.fromEntries(NODES.map((item) => [item.id, item]));
  const paths = EDGES.map(([fromId, toId, kind = "driver"]) => edgePath(nodesById[fromId], nodesById[toId], activeNodeIds.has(fromId) && activeNodeIds.has(toId), kind)).join("");
  const buttons = NODES.map((item) => {
    const currentValue = comparisonNodeValue(current, item.id);
    const baselineValue = comparisonNodeValue(baseline, item.id);
    const comparable = currentValue != null && baselineValue != null;
    const delta = comparable ? currentValue - baselineValue : null;
    const changed = activeNodeIds.has(item.id);
    const significant = comparable && isSignificantChange(baselineValue, currentValue);
    const deltaText = significant ? `<span class="node-delta">${signedPercent(delta, baselineValue)}</span>` : "";
    const toneClass = showDirectionalTone ? comparisonTone(item.id, baselineValue, currentValue) : "";
    const displayUnit = compactNodeUnit(item.id, item.unit);
    return `
      <button class="tree-node ${item.id === selectedNodeId ? "selected" : ""} ${changed ? "active-path" : ""} ${toneClass}" type="button"
        data-node-id="${item.id}" style="left:${item.x}px;top:${item.y}px" title="${NODE_INFO[item.id][1]}">
        <span class="node-title">${item.label}${deltaText}</span>
        <span class="node-values" aria-label="Baseline and scenario values">
          <span class="node-value-pair node-value-baseline"><small>Base | ${displayUnit}</small><strong>${formatNodeValue(baselineValue, item.unit)}</strong></span>
          <span class="node-value-pair node-value-scenario"><small>Scen. | ${displayUnit}</small><strong>${formatNodeValue(currentValue, item.unit)}</strong></span>
        </span>
      </button>`;
  }).join("");

  container.innerHTML = `
    <div class="tree-stage" style="transform:scale(${zoom})">
      <svg class="tree-lines" width="${TREE_WIDTH}" height="${TREE_HEIGHT}" viewBox="0 0 ${TREE_WIDTH} ${TREE_HEIGHT}" aria-hidden="true">${paths}</svg>
      ${buttons}
    </div>`;
  container.style.width = `${TREE_WIDTH * zoom}px`;
  container.style.height = `${TREE_HEIGHT * zoom}px`;
  container.querySelectorAll("[data-node-id]").forEach((button) => button.addEventListener("click", () => onSelect(button.dataset.nodeId)));
}

export function comparisonNodeValue(model, nodeId) {
  const value = nodeValue(model, nodeId);
  if (value == null || !ANNUALIZED_TOTALS.has(nodeId)) return value;
  const days = Number(model?.day_count) || 0;
  return days > 0 ? value / days * 365 : value;
}

export function comparisonNodeUnit(nodeId, unit = "") {
  if (!ANNUALIZED_TOTALS.has(nodeId)) return unit;
  return nodeId === "tmm" ? "t/year" : "h/year";
}

export function compactNodeUnit(nodeId, unit) {
  const comparisonUnit = comparisonNodeUnit(nodeId, unit);
  return {
    "t/year": "t/yr", "h/year": "h/yr", "t/cycle": "t/cycle", "min/cycle": "min/cycle", "avg trucks": "avg trucks"
  }[comparisonUnit] || comparisonUnit;
}

export function comparisonTone(nodeId, baselineValue, scenarioValue) {
  if (NEUTRAL_COMPARISON.has(nodeId) || !isSignificantChange(baselineValue, scenarioValue)) return "";
  const delta = scenarioValue - baselineValue;
  const better = LOWER_IS_BETTER.has(nodeId) ? delta < 0 : delta > 0;
  return better ? "tone-positive" : "tone-negative";
}

function isSignificantChange(baselineValue, scenarioValue) {
  if (baselineValue == null || scenarioValue == null) return false;
  const delta = Math.abs(scenarioValue - baselineValue);
  if (delta < 0.000001) return false;
  return baselineValue === 0 ? true : delta / Math.abs(baselineValue) >= 0.0005;
}

export function formatNodeValue(value, unit) {
  if (value == null) return "n/a";
  if (unit === "%") return `${formatNumber(value * 100, 1)}%`;
  if (unit === "t") return formatCompact(value);
  if (["avg trucks", "trucks"].includes(unit)) return `${formatNumber(value, 1)}`;
  if (unit === "t/WT h") return `${formatNumber(value, 1)}`;
  if (unit === "t/cycle") return `${formatNumber(value, 1)}`;
  if (unit === "min/cycle") return `${formatNumber(value, 2)}`;
  if (unit === "km/cycle") return `${formatNumber(value, 2)}`;
  if (unit === "km/h") return `${formatNumber(value, 1)}`;
  return formatCompact(value);
}

export function nodeUnit(nodeId) {
  const unit = NODES.find((item) => item.id === nodeId)?.unit || "";
  return comparisonNodeUnit(nodeId, unit);
}

function node(id, label, x, y, type, unit) {
  return { id, label, x, y, type, unit };
}

function edgePath(from, to, active, kind = "driver") {
  if (kind === "output") {
    const fromX = from.x + 105;
    const fromY = from.y + 66;
    const toX = to.x + 105;
    const toY = to.y;
    const middleY = fromY + (toY - fromY) * 0.5;
    return `<path class="tree-line output ${active ? "active" : ""}" d="M ${fromX} ${fromY} V ${middleY} H ${toX} V ${toY}" />`;
  }

  const fromX = from.x;
  const fromY = from.y + 33;
  const toX = to.x + 210;
  const toY = to.y + 33;
  const middle = toX + (fromX - toX) * 0.45;
  return `<path class="tree-line ${kind === "context" ? "context" : ""} ${active ? "active" : ""}" d="M ${toX} ${toY} H ${middle} V ${fromY} H ${fromX}" />`;
}

function formatCompact(value) {
  const absolute = Math.abs(Number(value) || 0);
  if (absolute >= 1_000_000) return `${formatNumber(value / 1_000_000, 2)}M`;
  if (absolute >= 1_000) return `${formatNumber(value / 1_000, 1)}k`;
  return formatNumber(value, 1);
}

function formatNumber(value, decimals) {
  return new Intl.NumberFormat("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value) || 0);
}

function signedPercent(delta, baseline) {
  if (Math.abs(baseline) < 0.05) return "New";
  const value = delta / baseline * 100;
  return `${value >= 0 ? "+" : ""}${formatNumber(value, 1)}%`;
}