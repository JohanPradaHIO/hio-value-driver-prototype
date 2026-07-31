import { loadFacts, filterFacts, sourceRange, uniqueValues, completeMonths, monthBounds, sourceLabel, isPlanSource, comparePeriodCoverage } from "./data.mjs?v=20260731-v5-19";
import { COMPONENTS, LEVERS, emptyAssumptions, aggregateModel, aggregateLikeForLike, aggregateByFleetMode, nodeValue, truckEquivalent } from "./model.mjs?v=20260731-v5-19";
import { NODE_INFO, TREE_WIDTH, renderTree, changedNodeIds, comparisonNodeValue, nodeUnit, formatNodeValue } from "./tree.mjs?v=20260731-v5-19";

const state = {
  facts: [],
  selectedFleets: [],
  selectedModes: [],
  baselineSource: "actual",
  baselineStart: "",
  baselineEnd: "",
  comparisonMode: "custom",
  comparisonStart: "",
  comparisonEnd: "",
  assumptions: emptyAssumptions(),
  selectedNodeId: "tmm",
  zoom: 0.72,
  sort: { field: "current", direction: -1 },
  view: null
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    state.facts = await loadFacts();
    if (!state.facts.length) throw new Error("No model rows were loaded.");
    setDefaults();
    populateSourceSelect();
    renderFilters();
    bindControls();
    renderLevers();
    render();
  } catch (error) {
    const fatal = document.getElementById("fatalError");
    fatal.hidden = false;
    fatal.textContent = `V5 could not start: ${error.message}`;
    console.error(error);
  }
}

function setDefaults() {
  state.selectedFleets = uniqueValues(state.facts, "fleet_display_name");
  state.selectedModes = uniqueValues(state.facts.filter((row) => row.source_type === "actual"), "ahs_mode");
  const months = completeMonths(state.facts, "actual");
  const comparisonMonth = months.at(-1);
  const baselineMonth = months.at(-2) || comparisonMonth;
  if (baselineMonth && comparisonMonth) {
    const baseline = monthBounds(baselineMonth);
    const comparison = monthBounds(comparisonMonth);
    state.baselineStart = baseline.start;
    state.baselineEnd = baseline.end;
    state.comparisonStart = comparison.start;
    state.comparisonEnd = comparison.end;
  } else {
    const range = sourceRange(state.facts, "actual");
    state.baselineStart = range.min;
    state.baselineEnd = range.max;
    state.comparisonStart = range.min;
    state.comparisonEnd = range.max;
  }
}

function populateSourceSelect() {
  const select = document.getElementById("baselineSource");
  const sources = uniqueValues(state.facts, "source_type");
  select.innerHTML = sources.map((source) => `<option value="${source}">${sourceLabel(source)}</option>`).join("");
  select.value = state.baselineSource;
}

function bindControls() {
  bindValue("baselineSource", "change", (value) => {
    const wasPlan = planScopeActive();
    state.baselineSource = value;
    if (wasPlan !== planScopeActive()) {
      state.selectedFleets = [];
      state.selectedModes = [];
    }
    const range = sourceRange(state.facts, value);
    state.baselineStart = range.min;
    state.baselineEnd = range.max;
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("baselineStart", "change", (value) => {
    state.baselineStart = clampSourceDate(state.baselineSource, value);
    if (state.baselineEnd < state.baselineStart) state.baselineEnd = state.baselineStart;
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("baselineEnd", "change", (value) => {
    state.baselineEnd = clampSourceDate(state.baselineSource, value);
    if (state.baselineStart > state.baselineEnd) state.baselineStart = state.baselineEnd;
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("comparisonMode", "change", (value) => {
    const wasPlan = planScopeActive();
    state.comparisonMode = value;
    if (wasPlan !== planScopeActive()) {
      state.selectedFleets = [];
      state.selectedModes = [];
    }
    if (value !== "custom") {
      const range = sourceRange(state.facts, value);
      if (state.comparisonStart < range.min || state.comparisonEnd > range.max) {
        state.comparisonStart = range.min;
        state.comparisonEnd = range.max;
      }
    }
    syncInputs();
    renderFilters();
    renderLevers();
    render();
  });
  bindValue("comparisonStart", "change", (value) => {
    state.comparisonStart = clampComparisonDate(value);
    if (state.comparisonEnd < state.comparisonStart) state.comparisonEnd = state.comparisonStart;
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("comparisonEnd", "change", (value) => {
    state.comparisonEnd = clampComparisonDate(value);
    if (state.comparisonStart > state.comparisonEnd) state.comparisonStart = state.comparisonEnd;
    syncInputs();
    renderFilters();
    render();
  });

  document.getElementById("resetButton").addEventListener("click", () => {
    state.assumptions = emptyAssumptions();
    state.comparisonMode = "custom";
    setDefaults();
    syncInputs();
    renderFilters();
    renderLevers();
    render();
  });
  document.getElementById("resetLeversButton").addEventListener("click", () => {
    state.assumptions = emptyAssumptions();
    renderLevers();
    render();
  });
  document.getElementById("zoomIn").addEventListener("click", () => setZoom(state.zoom + 0.1));
  document.getElementById("zoomOut").addEventListener("click", () => setZoom(state.zoom - 0.1));
  document.getElementById("zoomFit").addEventListener("click", fitTree);
  bindFilterMenuDismissal();
  syncInputs();
}

function bindValue(id, eventName, handler) {
  document.getElementById(id).addEventListener(eventName, (event) => handler(event.target.value));
}

function bindFilterMenuDismissal() {
  const menus = [...document.querySelectorAll(".filter-menu")];
  menus.forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (menu.open) closeFilterMenus(menu);
    });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".filter-menu")) closeFilterMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFilterMenus();
  });
}

function closeFilterMenus(except = null) {
  document.querySelectorAll(".filter-menu[open]").forEach((menu) => {
    if (menu !== except) menu.open = false;
  });
}

function syncInputs() {
  document.getElementById("baselineSource").value = state.baselineSource;
  const baselineStart = document.getElementById("baselineStart");
  const baselineEnd = document.getElementById("baselineEnd");
  baselineStart.value = state.baselineStart;
  baselineEnd.value = state.baselineEnd;
  const baselineRange = sourceRange(state.facts, state.baselineSource);
  baselineStart.min = baselineRange.min;
  baselineStart.max = baselineRange.max;
  baselineEnd.min = baselineRange.min;
  baselineEnd.max = baselineRange.max;
  document.getElementById("comparisonMode").value = state.comparisonMode;
  document.getElementById("comparisonStart").value = state.comparisonStart;
  document.getElementById("comparisonEnd").value = state.comparisonEnd;
  const disabled = state.comparisonMode === "custom";
  const comparisonStart = document.getElementById("comparisonStart");
  const comparisonEnd = document.getElementById("comparisonEnd");
  comparisonStart.disabled = disabled;
  comparisonEnd.disabled = disabled;
  const range = disabled ? { min: "", max: "" } : sourceRange(state.facts, state.comparisonMode);
  comparisonStart.min = range.min;
  comparisonStart.max = range.max;
  comparisonEnd.min = range.min;
  comparisonEnd.max = range.max;
}

function clampComparisonDate(value) {
  if (state.comparisonMode === "custom") return value;
  return clampSourceDate(state.comparisonMode, value);
}

function clampSourceDate(source, value) {
  const range = sourceRange(state.facts, source);
  return value < range.min ? range.min : value > range.max ? range.max : value;
}

function renderFilters() {
  const planSource = activePlanSource();
  const planActive = Boolean(planSource);
  const periodRows = filterFacts(state.facts, {
    source: state.baselineSource,
    start: state.baselineStart,
    end: state.baselineEnd
  });
  const planRows = planActive ? filterFacts(state.facts, {
    source: planSource,
    start: isPlanSource(state.comparisonMode) ? state.comparisonStart : state.baselineStart,
    end: isPlanSource(state.comparisonMode) ? state.comparisonEnd : state.baselineEnd
  }) : [];
  const planFleets = new Set(uniqueValues(planRows, "fleet_display_name"));
  const fleets = uniqueValues(periodRows, "fleet_display_name")
    .filter((fleet) => !planActive || planFleets.has(fleet));
  state.selectedFleets = state.selectedFleets.filter((fleet) => fleets.includes(fleet));
  if (!state.selectedFleets.length) state.selectedFleets = [...fleets];
  renderFilter("fleet", fleets, state.selectedFleets, (values) => {
    state.selectedFleets = values;
    renderFilters();
    render();
  });
  const fleetRows = periodRows.filter((row) => state.selectedFleets.includes(row.fleet_display_name));
  const modes = uniqueValues(fleetRows, "ahs_mode");
  state.selectedModes = state.selectedModes.filter((mode) => modes.includes(mode));
  if (!state.selectedModes.length) state.selectedModes = [...modes];
  renderFilter("mode", modes, state.selectedModes, (values) => {
    state.selectedModes = values;
    render();
  }, { disabled: planActive });
}

function renderFilter(kind, options, selected, onChange, { singleSelect = false, disabled = false } = {}) {
  const container = document.getElementById(`${kind}Options`);
  const summary = document.getElementById(`${kind}Summary`);
  const menu = summary.closest(".filter-menu");
  menu.classList.toggle("disabled", disabled);
  if (disabled) menu.open = false;
  summary.setAttribute("aria-disabled", String(disabled));
  summary.textContent = disabled ? "Mode unavailable" : selected.length === options.length && !singleSelect ? `All ${kind}s` : selected.join(" + ") || `No ${kind}`;
  container.innerHTML = options.map((option) => `
    <label><input type="${singleSelect ? "radio" : "checkbox"}" ${singleSelect ? `name="${kind}Option"` : ""} value="${escapeHtml(option)}" ${selected.includes(option) ? "checked" : ""}>${escapeHtml(option)}</label>
  `).join("");
  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const values = [...container.querySelectorAll("input:checked")].map((item) => item.value);
      onChange(values);
      const menu = input.closest(".filter-menu");
      if (menu) menu.open = false;
    });
  });
}

function activePlanSource() {
  return isPlanSource(state.comparisonMode) ? state.comparisonMode
    : isPlanSource(state.baselineSource) ? state.baselineSource
      : null;
}

function planScopeActive() {
  return Boolean(activePlanSource());
}

function renderLevers() {
  const container = document.getElementById("leverControls");
  const disabled = state.comparisonMode !== "custom";
  const baseline = state.view?.baseline || aggregateModel(currentBaselineRows());
  const groups = [...new Set(LEVERS.map((lever) => lever.group))];
  container.innerHTML = groups.map((group) => `
    <section class="lever-group">
      <h3>${group}</h3>
      ${LEVERS.filter((lever) => lever.group === group).map((lever) => leverMarkup(lever, baseline, disabled)).join("")}
    </section>
  `).join("");
  document.getElementById("leverModeNote").textContent = disabled
    ? "Choose Custom scenario to adjust the levers."
    : "Move a control to test a practical improvement or deterioration.";
  container.querySelectorAll("input[type=range]").forEach((input) => {
    input.addEventListener("input", () => {
      state.assumptions[input.dataset.leverId] = Number(input.value);
      const output = document.getElementById(`value-${input.dataset.leverId}`);
      output.textContent = formatSignedPct(Number(input.value));
      render();
    });
  });
}

function leverMarkup(lever, baseline, disabled) {
  const value = state.assumptions[lever.id] || 0;
  const baselineValue = nodeValue(baseline, lever.baseline);
  const unavailable = baselineValue == null;
  const controlDisabled = disabled || unavailable;
  const baselineUnit = lever.unit || (lever.baseline === "payload" ? "t/cycle" : lever.group === "Working Time" ? "h" : "min/cycle");
  const help = baselineUnit === "km/h" ? "Positive increases speed"
    : baselineUnit === "km/cycle" ? "Positive shortens distance"
      : lever.direction === "reduction" ? "Positive recovers time" : "Positive increases payload";
  return `
    <div class="lever-control ${controlDisabled ? "disabled" : ""}">
      <div class="lever-label"><span>${lever.label}</span><output id="value-${lever.id}" class="lever-value">${formatSignedPct(value)}</output></div>
      <input type="range" data-lever-id="${lever.id}" min="${lever.min}" max="${lever.max}" step="${lever.step}" value="${value}" ${controlDisabled ? "disabled" : ""} title="${help}">
      <div class="lever-baseline">Baseline ${unavailable ? "n/a" : formatNumber(baselineValue, ["h", "km/h"].includes(baselineUnit) ? 1 : 2)} ${baselineUnit}</div>
    </div>`;
}

function render() {
  let baselineRows = currentBaselineRows();
  const comparisonRows = state.comparisonMode === "custom" ? baselineRows : filterFacts(state.facts, {
    source: state.comparisonMode,
    start: state.comparisonStart,
    end: state.comparisonEnd,
    fleets: state.selectedFleets,
    modes: state.selectedModes
  });
  if (isPlanSource(state.comparisonMode)) {
    const planFleets = new Set(comparisonRows.map((row) => row.fleet_display_name));
    baselineRows = baselineRows.filter((row) => planFleets.has(row.fleet_display_name));
  }
  const baseline = aggregateModel(baselineRows);
  const observedCurrent = state.comparisonMode === "custom"
    ? aggregateModel(baselineRows, state.assumptions)
    : aggregateModel(comparisonRows);
  const coverage = state.comparisonMode === "custom"
    ? { valid: true, keys: [], missingBaseline: [], missingComparison: [], incompleteBaseline: [], incompleteComparison: [] }
    : comparePeriodCoverage(
      baselineRows, comparisonRows, state.baselineStart, state.baselineEnd,
      state.comparisonStart, state.comparisonEnd
    );
  const useLikeForLike = state.comparisonMode === "actual" && coverage.valid;
  const current = useLikeForLike ? aggregateLikeForLike(baselineRows, comparisonRows, { comparisonDays: coverage.comparisonDays }) : observedCurrent;
  const performanceComparison = state.comparisonMode === "custom" || isPlanSource(state.comparisonMode) || useLikeForLike;
  baseline.truck_equivalent = 0;
  current.truck_equivalent = truckEquivalent(baseline, current);

  state.view = { baselineRows, comparisonRows, baseline, current, observedCurrent, coverage, useLikeForLike, performanceComparison };
  renderComparisonNotice(coverage);
  renderSummary(baseline, current, performanceComparison, coverage, useLikeForLike);
  const hasActiveLever = state.comparisonMode === "custom" && Object.values(state.assumptions).some((value) => Math.abs(value) > 0.000001);
  const activeNodes = changedNodeIds(baseline, current, hasActiveLever, state.assumptions);
  renderTree(document.getElementById("treeCanvas"), baseline, current, state.selectedNodeId, selectNode, state.zoom, activeNodes, performanceComparison);
  renderDetails();
}

function renderComparisonNotice(coverage) {
  const notice = document.getElementById("comparisonNotice");
  if (isPlanSource(state.comparisonMode)) {
    notice.hidden = true;
    notice.textContent = "";
    return;
  }
  if (state.comparisonMode === "custom" || coverage.valid) {
    notice.hidden = true;
    notice.textContent = "";
    return;
  }
  const issues = [
    ...coverage.missingBaseline.map((key) => `${key}: no reference data`),
    ...coverage.missingComparison.map((key) => `${key}: no comparison data`),
    ...coverage.incompleteBaseline.map((key) => `${key}: incomplete reference period`),
    ...coverage.incompleteComparison.map((key) => `${key}: incomplete comparison period`)
  ];
  notice.textContent = `Some selected data is incomplete (${issues.join("; ")}). Values remain visible, but improvement colours are paused.`;
  notice.hidden = false;
}

function currentBaselineRows() {
  return filterFacts(state.facts, {
    source: state.baselineSource,
    start: state.baselineStart,
    end: state.baselineEnd,
    fleets: state.selectedFleets,
    modes: state.selectedModes
  });
}


function renderSummary(baseline, current, performanceComparison, coverage, useLikeForLike) {
  const baselineDays = baseline.day_count || 1;
  const scenarioDays = current.day_count || baselineDays;
  const baselinePerDay = baseline.modelled_tmm / baselineDays;
  const scenarioPerDay = current.modelled_tmm / scenarioDays;
  const baselineAnnualized = baselinePerDay * 365;
  const scenarioAnnualized = scenarioPerDay * 365;
  const annualizedDelta = scenarioAnnualized - baselineAnnualized;
  const dailyDelta = scenarioPerDay - baselinePerDay;
  const deltaPct = baselineAnnualized ? annualizedDelta / baselineAnnualized : 0;
  const deltaTone = performanceComparison ? tone(annualizedDelta) : "";
  const scenarioBadge = state.comparisonMode === "custom" ? "Custom" : isPlanSource(state.comparisonMode) ? sourceLabel(state.comparisonMode) : useLikeForLike ? "Comparable scope" : "Available data";
  const deltaBadge = !performanceComparison ? "Period change" : deltaTone === "" ? "No change" : deltaTone === "positive" ? "Better" : "Worse";

  const groups = [
    ["Baseline", "", [
      ["Annualized TMM", baselineAnnualized, "t/year", ""],
      ["TMM / day", baselinePerDay, `t/day | ${baselineDays} days`, ""]
    ]],
    ["Scenario", scenarioBadge, [
      ["Annualized TMM", scenarioAnnualized, "t/year", ""],
      ["TMM / day", scenarioPerDay, `t/day | ${scenarioDays} days`, ""]
    ]],
    ["Delta", deltaBadge, [
      ["Annualized delta", annualizedDelta, `${formatSignedPct(deltaPct)} vs baseline`, deltaTone],
      ["TMM / day delta", dailyDelta, "t/day", deltaTone]
    ]]
  ];

  document.getElementById("summaryBand").innerHTML = groups.map(([title, badge, items]) => `
    <section class="metric-group metric-group-${title.toLowerCase()}">
      <h3>${title}${badge ? `<span>${badge}</span>` : ""}</h3>
      ${items.map(([label, value, detail, className]) => metric(label, value, detail, className)).join("")}
    </section>
  `).join("");
}

function metric(label, value, detail, className) {
  return `<div class="metric ${className}"><div class="metric-label">${label}</div><div class="metric-value">${formatNumber(value, 0)}</div><div class="metric-detail">${detail}</div></div>`;
}

function selectNode(nodeId) {
  state.selectedNodeId = nodeId;
  state.sort = { field: "current", direction: -1 };
  render();
}

function renderDetails() {
  const { baselineRows, comparisonRows, baseline, current } = state.view;
  const [title, formula] = NODE_INFO[state.selectedNodeId];
  document.getElementById("detailTitle").textContent = title;
  document.getElementById("detailFormula").textContent = formula;

  let rows;
  if (state.selectedNodeId === "gross_cycle") {
    rows = COMPONENTS.map((component) => detailRow(
      component.label,
      baseline.components[component.id] || 0,
      current.components[component.id] || 0,
      "min/cycle"
    ));
  } else {
    const groupByFleet = isPlanSource(state.comparisonMode);
    const baselineGroups = groupByFleet ? aggregateByFleet(baselineRows) : aggregateByFleetMode(baselineRows);
    const currentGroups = groupByFleet
      ? aggregateByFleet(comparisonRows)
      : state.view.useLikeForLike
      ? baselineGroups.map((group) => {
        const groupBaselineRows = baselineRows.filter((row) => row.fleet_display_name === group.fleet && row.ahs_mode === group.mode);
        const groupComparisonRows = comparisonRows.filter((row) => row.fleet_display_name === group.fleet && row.ahs_mode === group.mode);
        return { fleet: group.fleet, mode: group.mode, ...aggregateLikeForLike(groupBaselineRows, groupComparisonRows, { comparisonDays: state.view.coverage.comparisonDays }) };
      })
      : state.comparisonMode === "custom"
        ? aggregateByFleetMode(baselineRows, state.assumptions)
        : aggregateByFleetMode(comparisonRows);
    const groupKey = (group) => groupByFleet ? group.fleet : `${group.fleet}|${group.mode}`;
    const keys = [...new Set([...baselineGroups, ...currentGroups].map(groupKey))];
    rows = keys.map((key) => {
      const base = baselineGroups.find((group) => groupKey(group) === key);
      const next = currentGroups.find((group) => groupKey(group) === key);
      const [fleet, mode] = key.split("|");
      const baselineValue = state.selectedNodeId === "truck_equivalent"
        ? 0
        : base ? comparisonNodeValue(base, state.selectedNodeId) : 0;
      const currentValue = state.selectedNodeId === "truck_equivalent"
        ? base && next ? truckEquivalent(base, next) : 0
        : next ? comparisonNodeValue(next, state.selectedNodeId) : 0;
      return detailRow(groupByFleet ? fleet : `${fleet} / ${mode}`, baselineValue, currentValue, nodeUnit(state.selectedNodeId));
    });
  }
  rows.sort((left, right) => compareDetail(left, right));
  renderDetailTable(rows);
}

function aggregateByFleet(rows) {
  return uniqueValues(rows, "fleet_display_name").map((fleet) => ({
    fleet,
    mode: "",
    ...aggregateModel(rows.filter((row) => row.fleet_display_name === fleet))
  }));
}

function detailRow(label, baseline, current, unit) {
  return { label, baseline, current, delta: baseline == null || current == null ? null : current - baseline, unit };
}

function renderDetailTable(rows) {
  const container = document.getElementById("detailTable");
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">No rows are available for this node and scope.</div>';
    return;
  }
  const annualized = rows.some((row) => row.unit === "t/year" || row.unit === "h/year");
  const baselineHeading = annualized ? "Baseline (annualized)" : "Baseline";
  const comparisonHeading = annualized ? "Comparison (annualized)" : "Comparison";
  container.innerHTML = `
    <table>
      <thead><tr>
        <th data-sort="label">Breakdown</th>
        <th class="numeric" data-sort="baseline">${baselineHeading}</th>
        <th class="numeric" data-sort="current">${comparisonHeading}</th>
        <th class="numeric" data-sort="delta">Delta</th>
      </tr></thead>
      <tbody>${rows.map((row) => `
        <tr><td>${escapeHtml(row.label)}</td><td class="numeric">${formatNodeValue(row.baseline, row.unit)}</td><td class="numeric">${formatNodeValue(row.current, row.unit)}</td><td class="numeric">${formatSignedNode(row.delta, row.unit)}</td></tr>
      `).join("")}</tbody>
    </table>`;
  container.querySelectorAll("th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const field = header.dataset.sort;
      state.sort = state.sort.field === field ? { field, direction: state.sort.direction * -1 } : { field, direction: field === "label" ? 1 : -1 };
      renderDetails();
    });
  });
}

function compareDetail(left, right) {
  const { field, direction } = state.sort;
  if (field === "label") return left.label.localeCompare(right.label) * direction;
  return ((left[field] ?? Number.NEGATIVE_INFINITY) - (right[field] ?? Number.NEGATIVE_INFINITY)) * direction;
}

function setZoom(value) {
  state.zoom = Math.max(0.4, Math.min(1.1, value));
  document.getElementById("zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
  render();
}

function fitTree() {
  const viewport = document.getElementById("treeViewport");
  if (!viewport) return;
  setZoom(Math.max(0.4, Math.min(0.95, (viewport.clientWidth - 24) / TREE_WIDTH)));
}

function tone(value) {
  if (Math.abs(value) < 0.000001) return "";
  return value > 0 ? "positive" : "negative";
}

function formatSignedNode(value, unit) {
  if (value == null) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNodeValue(value, unit)}`;
}

function formatSignedPct(value) {
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? "+" : ""}${formatNumber(numeric * 100, 1)}%`;
}

function formatCompact(value) {
  const numeric = Number(value) || 0;
  const absolute = Math.abs(numeric);
  if (absolute >= 1_000_000) return `${formatNumber(numeric / 1_000_000, 2)}M`;
  if (absolute >= 1_000) return `${formatNumber(numeric / 1_000, 1)}k`;
  return formatNumber(numeric, 1);
}

function formatNumber(value, decimals = 1) {
  return new Intl.NumberFormat("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}