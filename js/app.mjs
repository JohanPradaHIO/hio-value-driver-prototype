import { loadFacts, filterFacts, sourceRange, uniqueValues, defaultActualBasePeriod, defaultPlanBasePeriod, sourceLabel, isPlanSource, hasIndependentComparisonPeriod } from "./data.mjs?v=20260828-v6-2";
import { COMPONENTS, LEVERS, emptyAssumptions, aggregateModel, aggregateByFleetMode, nodeValue, truckEquivalent } from "./model.mjs?v=20260828-v6-2";
import { NODE_INFO, TREE_WIDTH, renderTree, changedNodeIds, comparisonNodeValue, comparisonTone, nodeUnit, formatNodeValue } from "./tree.mjs?v=20260828-v6-2";
import { buildDailyAdditiveEvidence } from "./daily-evidence.mjs?v=20260828-v6-2";
import { buildFleetAdditiveEvidence } from "./fleet-evidence.mjs?v=20260828-v6-2";
import { buildMtpDailyTmmEvidence, buildMtpFleetTmmEvidence, buildMtpTmmBasis } from "./mtp-evidence.mjs?v=20260828-v6-2";

const PERIOD_EVIDENCE_NODES = {
  tmm: { field: "modelled_tmm", label: "TMM", unit: "tonnes" },
  working_time: { field: "working_time", label: "Working Time", unit: "hours" },
  operating_time: { field: "operating_time", label: "Operating Time", unit: "hours" },
  operating_delay: { field: "operating_delay", label: "Operating Delay", unit: "hours" },
  available_time: { field: "available_time", label: "Available Time", unit: "hours" },
  operating_standby: { field: "operating_standby", label: "Operating Standby", unit: "hours" },
  scheduled_loss: { field: "scheduled_loss", label: "Scheduled Loss", unit: "hours" },
  unscheduled_loss: { field: "unscheduled_loss", label: "Unscheduled Loss", unit: "hours" }
};

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
    fatal.textContent = `The application could not start: ${error.message}`;
    console.error(error);
  }
}

function setDefaults() {
  state.selectedFleets = uniqueValues(state.facts, "fleet_display_name");
  state.selectedModes = uniqueValues(state.facts.filter((row) => row.source_type === "actual"), "ahs_mode");
  const period = defaultActualBasePeriod(state.facts);
  state.baselineStart = period.start;
  state.baselineEnd = period.end;
  state.comparisonStart = period.start;
  state.comparisonEnd = period.end;
  synchronizeComparisonPeriod();
}

function populateSourceSelect() {
  const select = document.getElementById("baselineSource");
  const sources = uniqueValues(state.facts, "source_type");
  select.innerHTML = sources.map((source) => `<option value="${source}">${sourceLabel(source)}</option>`).join("");
  select.value = state.baselineSource;
}

function bindControls() {
  bindValue("baselineSource", "change", (value) => {
    state.baselineSource = value;
    const period = isPlanSource(value)
      ? defaultPlanBasePeriod(state.facts, value)
      : defaultActualBasePeriod(state.facts);
    state.baselineStart = period.start;
    state.baselineEnd = period.end;
    synchronizeComparisonPeriod();
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("baselineStart", "change", (value) => {
    state.baselineStart = clampSourceDate(state.baselineSource, value);
    if (state.baselineEnd < state.baselineStart) state.baselineEnd = state.baselineStart;
    synchronizeComparisonPeriod();
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("baselineEnd", "change", (value) => {
    state.baselineEnd = clampSourceDate(state.baselineSource, value);
    if (state.baselineStart > state.baselineEnd) state.baselineStart = state.baselineEnd;
    synchronizeComparisonPeriod();
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("comparisonMode", "change", (value) => {
    state.comparisonMode = value;
    if (hasIndependentComparisonPeriod(state.baselineSource, value)) {
      const range = sourceRange(state.facts, value);
      if (state.comparisonStart < range.min || state.comparisonEnd > range.max) {
        state.comparisonStart = range.min;
        state.comparisonEnd = range.max;
      }
    }
    synchronizeComparisonPeriod();
    syncInputs();
    renderFilters();
    renderLevers();
    render();
  });
  bindValue("comparisonStart", "change", (value) => {
    if (comparisonPeriodIsIndependent()) {
      state.comparisonStart = clampComparisonDate(value);
      if (state.comparisonEnd < state.comparisonStart) state.comparisonEnd = state.comparisonStart;
    } else {
      synchronizeComparisonPeriod();
    }
    syncInputs();
    renderFilters();
    render();
  });
  bindValue("comparisonEnd", "change", (value) => {
    if (comparisonPeriodIsIndependent()) {
      state.comparisonEnd = clampComparisonDate(value);
      if (state.comparisonStart > state.comparisonEnd) state.comparisonStart = state.comparisonEnd;
    } else {
      synchronizeComparisonPeriod();
    }
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
  bindTreePan();
  bindTreeWheelZoom();
  syncInputs();
}

function bindValue(id, eventName, handler) {
  document.getElementById(id).addEventListener(eventName, (event) => handler(event.target.value));
}

function bindTreePan() {
  const viewport = document.getElementById("treeViewport");
  const dragThreshold = 8;
  let pan = null;

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("[data-node-id]")) return;
    pan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      moved: false
    };
    try { viewport.setPointerCapture(event.pointerId); } catch {}
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!pan || event.pointerId !== pan.pointerId) return;
    const deltaX = event.clientX - pan.startX;
    const deltaY = event.clientY - pan.startY;
    if (!pan.moved && Math.hypot(deltaX, deltaY) < dragThreshold) return;
    pan.moved = true;
    viewport.classList.add("is-panning");
    viewport.scrollLeft = pan.scrollLeft - deltaX;
    viewport.scrollTop = pan.scrollTop - deltaY;
    event.preventDefault();
  });

  const endPan = (event) => {
    if (!pan || event.pointerId !== pan.pointerId) return;
    try { viewport.releasePointerCapture(event.pointerId); } catch {}
    viewport.classList.remove("is-panning");
    pan = null;
  };
  viewport.addEventListener("pointerup", endPan);
  viewport.addEventListener("pointercancel", endPan);
}
function bindTreeWheelZoom() {
  const viewport = document.getElementById("treeViewport");
  const wheelStep = 0.08;

  viewport.addEventListener("wheel", (event) => {
    const direction = Math.sign(event.deltaY || event.deltaX);
    if (!direction) return;
    event.preventDefault();
    const bounds = viewport.getBoundingClientRect();
    setZoom(state.zoom - direction * wheelStep, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
  }, { passive: false });
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
  const disabled = !comparisonPeriodIsIndependent();
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
  return clampSourceDate(state.comparisonMode, value);
}

function comparisonPeriodIsIndependent() {
  return hasIndependentComparisonPeriod(state.baselineSource, state.comparisonMode);
}

function synchronizeComparisonPeriod() {
  if (!comparisonPeriodIsIndependent()) {
    state.comparisonStart = state.baselineStart;
    state.comparisonEnd = state.baselineEnd;
    return;
  }
  state.comparisonStart = clampSourceDate(state.comparisonMode, state.comparisonStart);
  state.comparisonEnd = clampSourceDate(state.comparisonMode, state.comparisonEnd);
  if (state.comparisonEnd < state.comparisonStart) state.comparisonEnd = state.comparisonStart;
}

function clampSourceDate(source, value) {
  const range = sourceRange(state.facts, source);
  return value < range.min ? range.min : value > range.max ? range.max : value;
}

function renderFilters() {
  const planActive = planScopeActive();
  const baselineRows = filterFacts(state.facts, {
    source: state.baselineSource,
    start: state.baselineStart,
    end: state.baselineEnd
  });
  const comparisonRows = state.comparisonMode === "custom" ? [] : filterFacts(state.facts, {
    source: state.comparisonMode,
    start: state.comparisonStart,
    end: state.comparisonEnd
  });
  const scopeRows = [...baselineRows, ...comparisonRows];
  const fleets = filterOptions(scopeRows, "fleet_display_name", state.selectedFleets);
  renderFilter("fleet", fleets, state.selectedFleets, (values) => {
    state.selectedFleets = values.length ? values : [...fleets];
    renderFilters();
    render();
  });
  const modes = filterOptions(scopeRows.filter((row) => !isPlanSource(row.source_type)), "ahs_mode", state.selectedModes);
  renderFilter("mode", modes, state.selectedModes, (values) => {
    state.selectedModes = values.length ? values : [...modes];
    render();
  }, { disabled: planActive });
}

function filterOptions(rows, field, selected) {
  return [...new Set([...uniqueValues(rows, field), ...selected])].sort();
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
      <div class="lever-baseline">Base ${unavailable ? "n/a" : formatNumber(baselineValue, ["h", "km/h"].includes(baselineUnit) ? 1 : 2)} ${baselineUnit}</div>
    </div>`;
}

function render() {
  let baselineRows = currentBaselineRows();
  const planComparison = planScopeActive();
  let comparisonRows = state.comparisonMode === "custom" ? baselineRows : filterFacts(state.facts, {
    source: state.comparisonMode,
    start: state.comparisonStart,
    end: state.comparisonEnd,
    fleets: state.selectedFleets,
    modes: planComparison ? [] : state.selectedModes
  });
  const baseline = aggregateModel(baselineRows);
  const observedCurrent = state.comparisonMode === "custom"
    ? aggregateModel(baselineRows, state.assumptions)
    : aggregateModel(comparisonRows);
  const sameActualScope = state.baselineSource === "actual"
    && state.comparisonMode === "actual"
    && state.baselineStart === state.comparisonStart
    && state.baselineEnd === state.comparisonEnd;
  const current = observedCurrent;
  const performanceComparison = true;
  baseline.truck_equivalent = 0;
  current.truck_equivalent = truckEquivalent(baseline, current);

  state.view = { baselineRows, comparisonRows, baseline, current, sameActualScope, planComparison, performanceComparison };
  renderComparisonNotice();
  renderSummary(baseline, current, performanceComparison);
  const hasActiveLever = state.comparisonMode === "custom" && Object.values(state.assumptions).some((value) => Math.abs(value) > 0.000001);
  const activeNodes = changedNodeIds(baseline, current, hasActiveLever, state.assumptions);
  renderTree(document.getElementById("treeCanvas"), baseline, current, state.selectedNodeId, selectNode, state.zoom, activeNodes, performanceComparison);
  renderDetails();
}

function renderComparisonNotice() {
  const notice = document.getElementById("comparisonNotice");
  notice.hidden = true;
  notice.textContent = "";
}

function currentBaselineRows() {
  return filterFacts(state.facts, {
    source: state.baselineSource,
    start: state.baselineStart,
    end: state.baselineEnd,
    fleets: state.selectedFleets,
    modes: planScopeActive() ? [] : state.selectedModes
  });
}


function renderSummary(baseline, current, performanceComparison) {
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
  const scenarioBadge = state.comparisonMode === "custom" ? "Custom"
    : isPlanSource(state.comparisonMode) || isPlanSource(state.baselineSource) ? sourceLabel(state.comparisonMode)
      : state.view.sameActualScope ? "Same scope"
        : sourceLabel(state.comparisonMode);
  const deltaBadge = !performanceComparison ? "Not comparable" : deltaTone === "" ? "No change" : deltaTone === "positive" ? "Better" : "Worse";

  const groups = [
    ["Base", "", [
      ["Annualized TMM", baselineAnnualized, "t/year", ""],
      ["TMM / day", baselinePerDay, `t/day | ${baselineDays} days`, ""]
    ]],
    ["Scenario", scenarioBadge, [
      ["Annualized TMM", scenarioAnnualized, "t/year", ""],
      ["TMM / day", scenarioPerDay, `t/day | ${scenarioDays} days`, ""]
    ]],
    ["Delta", deltaBadge, [
      ["Annualized delta", annualizedDelta, `${formatSignedPct(deltaPct)} vs Base`, deltaTone],
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
  renderAdditivePeriodOverview(baseline, current);
  renderDailyAdditiveEvidence(baselineRows, comparisonRows, baseline, current);
  renderFleetAdditiveEvidence(baselineRows, comparisonRows, baseline, current);

  let rows;
  if (state.selectedNodeId === "gross_cycle") {
    rows = COMPONENTS.map((component) => detailRow(
      component.label,
      baseline.components[component.id] || 0,
      current.components[component.id] || 0,
      "min/cycle"
    ));
  } else {
    const groupByFleet = state.view.planComparison;
    const baselineGroups = groupByFleet ? aggregateByFleet(baselineRows) : aggregateByFleetMode(baselineRows);
    const currentGroups = groupByFleet
      ? aggregateByFleet(comparisonRows)
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
        : base ? comparisonNodeValue(base, state.selectedNodeId) : null;
      const currentValue = state.selectedNodeId === "truck_equivalent"
        ? base && next ? truckEquivalent(base, next) : 0
        : next ? comparisonNodeValue(next, state.selectedNodeId) : null;
      return detailRow(groupByFleet ? fleet : `${fleet} / ${mode}`, baselineValue, currentValue, nodeUnit(state.selectedNodeId));
    });
  }
  rows.sort((left, right) => compareDetail(left, right));
  renderDetailTable(rows);
}

function renderAdditivePeriodOverview(baseline, current) {
  const container = document.getElementById("detailOverview");
  const contract = periodEvidenceContract();
  if (!contract) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const baselineValue = evidencePeriodValue(baseline, state.baselineSource, contract);
  const currentValue = evidencePeriodValue(current, state.comparisonMode, contract);
  const comparableCoverage = contract.completeCoverage;
  const delta = !comparableCoverage || baselineValue == null || currentValue == null ? null : currentValue - baselineValue;
  const deltaPct = delta == null || !baselineValue ? null : delta / baselineValue;
  const direction = delta == null ? "" : comparisonTone(state.selectedNodeId, baselineValue, currentValue);
  const deltaClass = direction === "tone-positive" ? "positive" : direction === "tone-negative" ? "negative" : "";
  const calendarDays = inclusiveDays(state.baselineStart, state.baselineEnd);
  const fleetScope = state.selectedFleets.join(" + ");
  const baseLabel = evidenceSourceLabel(state.baselineSource, contract, "period");
  const scenarioLabel = evidenceSourceLabel(state.comparisonMode, contract, "period");
  container.hidden = false;
  container.innerHTML = `
    <div class="detail-overview-grid">
      ${periodMetric(`Base | ${baseLabel}`, baselineValue, evidenceMetricDetail(state.baselineSource, contract), "", "base")}
      ${periodMetric(`Scenario | ${scenarioLabel}`, currentValue, evidenceMetricDetail(state.comparisonMode, contract), "", "scenario")}
      ${periodMetric("Delta", delta, contract.unit, deltaClass, "delta", true)}
      ${periodMetric("Delta %", deltaPct, "vs Base", deltaClass, "delta-pct", true, true)}
    </div>
    <div class="detail-overview-scope">
      <span>${escapeHtml(formatPeriod(state.baselineStart, state.baselineEnd))}</span>
      <span>${calendarDays} ${calendarDays === 1 ? "day" : "days"}</span>
      <span>${escapeHtml(fleetScope)}</span>
    </div>
    ${renderMtpBasis(contract)}`;
}

function renderDailyAdditiveEvidence(baselineRows, comparisonRows, baseline, current) {
  const container = document.getElementById("dailyEvidence");
  const contract = periodEvidenceContract();
  if (!contract) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const evidence = contract.kind === "mtp-derived"
    ? buildMtpDailyTmmEvidence({
        actualRows: state.baselineSource === "actual" ? baselineRows : comparisonRows,
        mtpBasis: contract.mtpBasis,
        baselineSource: state.baselineSource,
        actualTotal: (state.baselineSource === "actual" ? baseline : current)[contract.field],
        start: state.baselineStart,
        end: state.baselineEnd,
        valueField: contract.field
      })
    : buildDailyAdditiveEvidence({
        baselineRows,
        comparisonRows,
        baselineTotal: baseline[contract.field],
        comparisonTotal: current[contract.field],
        start: state.baselineStart,
        end: state.baselineEnd,
        valueField: contract.field
      });
  if (!evidence.eligible) {
    container.hidden = true;
    container.innerHTML = "";
    if (!evidence.missingBaselineDates.length && !evidence.missingComparisonDates.length) {
      console.error(`Daily ${contract.label} evidence failed reconciliation.`, evidence.residuals);
    }
    return;
  }

  const baseLabel = `Base | ${evidenceSourceLabel(state.baselineSource, contract, "daily")}`;
  const scenarioLabel = `Scenario | ${evidenceSourceLabel(state.comparisonMode, contract, "daily")}`;
  const dailyHeading = contract.kind === "mtp-derived"
    ? `Daily ${contract.label} vs MTP derived target pace`
    : `Daily ${contract.label} evidence`;
  const cumulativeLabel = contract.kind === "mtp-derived" ? "Cumulative Delta vs MTP pace" : "Cumulative Delta";
  container.hidden = false;
  container.innerHTML = `
    <div class="daily-evidence-heading">
      <h3>${escapeHtml(dailyHeading)}</h3>
      <span>${escapeHtml(baseLabel)} / ${escapeHtml(scenarioLabel)}</span>
    </div>
    <div class="daily-chart-wrap">${renderDailyChart(evidence.rows, baseLabel, scenarioLabel, contract)}</div>
    <div class="daily-table-wrap">
      <table>
        <thead><tr>
          <th>Date</th>
          <th class="numeric">${escapeHtml(baseLabel)}</th>
          <th class="numeric">${escapeHtml(scenarioLabel)}</th>
          <th class="numeric">Delta</th>
          <th class="numeric">${escapeHtml(cumulativeLabel)}</th>
        </tr></thead>
        <tbody>${evidence.rows.map((row) => `
          <tr data-daily-date="${row.date}" data-base="${row.baseline ?? ""}" data-scenario="${row.scenario ?? ""}" data-delta="${row.delta ?? ""}" data-cumulative-delta="${row.cumulativeDelta ?? ""}">
            <td>${escapeHtml(formatChartDate(row.date))}</td>
            <td class="numeric">${rawEvidenceValue(row.baseline)}</td>
            <td class="numeric">${rawEvidenceValue(row.scenario)}</td>
            <td class="numeric daily-delta-cell ${row.delta == null ? "neutral" : deltaCellClass(row.delta)}">${row.delta == null ? "n/a" : signedNumber(row.delta)}</td>
            <td class="numeric daily-delta-cell ${row.cumulativeDelta == null ? "neutral" : deltaCellClass(row.cumulativeDelta)}">${row.cumulativeDelta == null ? "n/a" : signedNumber(row.cumulativeDelta)}</td>
          </tr>`).join("")}</tbody>
      </table>
    </div>`;
}

function periodEvidenceContract() {
  const sources = new Set([state.baselineSource, state.comparisonMode]);
  const nodeContract = PERIOD_EVIDENCE_NODES[state.selectedNodeId];
  if (!nodeContract || sources.size !== 2 || !sources.has("actual")) return null;
  const nativeDailyPlan = sources.has("weekly")
    || (state.selectedNodeId === "tmm" && sources.has("stmp"));
  if (nativeDailyPlan
    && state.baselineStart === state.comparisonStart
    && state.baselineEnd === state.comparisonEnd) {
    const { baselineRows, comparisonRows } = state.view;
    return {
      ...nodeContract,
      kind: "native-daily",
      mtpBasis: null,
      completeCoverage: hasCompleteDailyCoverage(baselineRows, nodeContract.field)
        && hasCompleteDailyCoverage(comparisonRows, nodeContract.field)
    };
  }
  if (sources.has("mtp")
    && state.baselineStart === state.comparisonStart
    && state.baselineEnd === state.comparisonEnd) {
    const mtpRows = filterFacts(state.facts, {
      source: "mtp",
      fleets: state.selectedFleets,
      modes: []
    });
    const mtpBasis = buildMtpTmmBasis({
      mtpRows,
      start: state.baselineStart,
      end: state.baselineEnd,
      valueField: nodeContract.field
    });
    return mtpBasis.eligible ? { ...nodeContract, kind: "mtp-derived", mtpBasis, completeCoverage: mtpBasis.completeCoverage } : null;
  }
  return null;
}

function hasCompleteDailyCoverage(rows, field) {
  const valuesByDate = new Map();
  rows.forEach((row) => {
    if (!valuesByDate.has(row.activity_date)) valuesByDate.set(row.activity_date, []);
    valuesByDate.get(row.activity_date).push(row);
  });
  for (const date of calendarDates(state.baselineStart, state.baselineEnd)) {
    const dateRows = valuesByDate.get(date);
    if (!dateRows?.length || aggregateModel(dateRows)[field] == null) return false;
  }
  return true;
}

function evidenceSourceLabel(source, contract, context) {
  if (contract.kind !== "mtp-derived") return sourceLabel(source);
  if (source === "actual") return "Actuals observed";
  if (source === "mtp" && context === "daily") return "MTP derived pace";
  if (source === "mtp" && contract.mtpBasis.nativeFullMonth) return "MTP monthly target";
  if (source === "mtp") return "MTP derived target";
  return sourceLabel(source);
}

function evidenceMetricDetail(source, contract) {
  if (contract.kind !== "mtp-derived") return contract.unit;
  if (source === "actual") return `${contract.unit} · observed`;
  return `${contract.unit} · ${contract.mtpBasis.nativeFullMonth ? "monthly target" : "derived target"}`;
}

function evidencePeriodValue(model, source, contract) {
  return contract.kind === "mtp-derived" && source === "mtp"
    ? contract.mtpBasis.selectedTarget
    : model[contract.field];
}

function renderMtpBasis(contract) {
  if (contract.kind !== "mtp-derived") return "";
  const compactUnit = contract.unit === "tonnes" ? "t" : contract.unit;
  return `
    <div class="detail-overview-scope detail-overview-basis">
      <span>MTP basis: monthly target</span>
      ${contract.mtpBasis.segments.map((segment) => segment.supported
        ? `<span>${escapeHtml(formatMonth(segment.month))}: ${formatCompact(segment.monthlyTarget)} ${escapeHtml(compactUnit)} target · ${segment.selectedDays}/${segment.daysInMonth} days · ${formatCompact(segment.dailyTargetPace)} ${escapeHtml(compactUnit)}/day</span>`
        : `<span>${escapeHtml(formatMonth(segment.month))}: n/a</span>`).join("")}
    </div>`;
}

function formatMonth(month) {
  return new Intl.DateTimeFormat("en-AU", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));
}

function renderDailyChart(rows, baseLabel, scenarioLabel, contract) {
  const width = 900;
  const height = 470;
  const left = 70;
  const right = 18;
  const plotWidth = width - left - right;
  const x = (index) => rows.length === 1 ? left + plotWidth / 2 : left + index / (rows.length - 1) * plotWidth;
  const dailyTop = 38;
  const dailyHeight = 125;
  const deltaTop = 215;
  const deltaHeight = 78;
  const cumulativeTop = 345;
  const cumulativeHeight = 78;
  const dailyMax = Math.max(1, ...rows.flatMap((row) => [row.baseline, row.scenario]).filter((value) => value != null)) * 1.05;
  const deltaMax = Math.max(1, ...rows.map((row) => row.delta).filter((value) => value != null).map(Math.abs)) * 1.05;
  const cumulativeMax = Math.max(1, ...rows.map((row) => row.cumulativeDelta).filter((value) => value != null).map(Math.abs)) * 1.05;
  const dailyY = (value) => dailyTop + dailyHeight - value / dailyMax * dailyHeight;
  const deltaZero = deltaTop + deltaHeight / 2;
  const deltaY = (value) => deltaZero - value / deltaMax * deltaHeight / 2;
  const cumulativeZero = cumulativeTop + cumulativeHeight / 2;
  const cumulativeY = (value) => cumulativeZero - value / cumulativeMax * cumulativeHeight / 2;
  const basePath = linePath(rows.map((row) => row.baseline), x, dailyY);
  const scenarioPath = linePath(rows.map((row) => row.scenario), x, dailyY);
  const cumulativePath = linePath(rows.map((row) => row.cumulativeDelta), x, cumulativeY);
  const barWidth = Math.max(1.2, Math.min(12, plotWidth / Math.max(1, rows.length) * 0.64));
  const labelIndexes = chartLabelIndexes(rows.length);
  const dailyPanelTitle = contract.kind === "mtp-derived" ? `Daily ${escapeHtml(contract.label)} vs MTP pace` : `Daily ${escapeHtml(contract.label)}`;
  const deltaPanelTitle = contract.kind === "mtp-derived" ? "Daily Delta vs MTP pace" : "Daily Delta";
  const cumulativePanelTitle = contract.kind === "mtp-derived" ? "Cumulative Delta vs MTP pace" : "Cumulative Delta";

  return `
    <svg class="daily-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily Base and Scenario ${escapeHtml(contract.label)}, daily Delta and cumulative Delta">
      ${chartPanel(left, dailyTop, plotWidth, dailyHeight, dailyPanelTitle, ["0", formatCompact(dailyMax / 2), formatCompact(dailyMax)])}
      <line x1="${width - 250}" y1="18" x2="${width - 225}" y2="18" class="base-line"/><text x="${width - 219}" y="21" class="legend-label">${escapeHtml(baseLabel)}</text>
      <line x1="${width - 125}" y1="18" x2="${width - 100}" y2="18" class="scenario-line"/><text x="${width - 94}" y="21" class="legend-label">${escapeHtml(scenarioLabel)}</text>
      <path d="${basePath}" class="base-line"/>
      <path d="${scenarioPath}" class="scenario-line"/>
      ${rows.map((row, index) => `
        ${row.baseline == null ? "" : `<circle cx="${x(index)}" cy="${dailyY(row.baseline)}" r="2.2" class="base-point"><title>${escapeHtml(`${row.date} ${baseLabel}: ${formatNumber(row.baseline, 0)} ${contract.unit}`)}</title></circle>`}
        ${row.scenario == null ? "" : `<circle cx="${x(index)}" cy="${dailyY(row.scenario)}" r="2.2" class="scenario-point"><title>${escapeHtml(`${row.date} ${scenarioLabel}: ${formatNumber(row.scenario, 0)} ${contract.unit}`)}</title></circle>`}`).join("")}
      ${chartPanel(left, deltaTop, plotWidth, deltaHeight, deltaPanelTitle, [`-${formatCompact(deltaMax)}`, "0", `+${formatCompact(deltaMax)}`], true)}
      ${rows.map((row, index) => {
        if (row.delta == null) return "";
        const y = deltaY(row.delta);
        return `<rect x="${x(index) - barWidth / 2}" y="${Math.min(y, deltaZero)}" width="${barWidth}" height="${Math.max(1, Math.abs(deltaZero - y))}" class="${row.delta >= 0 ? "delta-positive" : "delta-negative"}"><title>${escapeHtml(`${row.date} Delta: ${signedNumber(row.delta)} ${contract.unit}`)}</title></rect>`;
      }).join("")}
      ${chartPanel(left, cumulativeTop, plotWidth, cumulativeHeight, cumulativePanelTitle, [`-${formatCompact(cumulativeMax)}`, "0", `+${formatCompact(cumulativeMax)}`], true)}
      <path d="${cumulativePath}" class="cumulative-line"/>
      ${labelIndexes.map((index) => `<text x="${x(index)}" y="451" text-anchor="middle">${escapeHtml(formatChartDate(rows[index].date))}</text>`).join("")}
    </svg>`;
}

function chartPanel(left, top, width, height, title, labels, centered = false) {
  const yPositions = [top + height, top + height / 2, top];
  return `
    <text x="${left}" y="${top - 10}" class="panel-title">${title}</text>
    <rect x="${left}" y="${top}" width="${width}" height="${height}" class="panel-background"/>
    ${yPositions.map((y, index) => `<line x1="${left}" y1="${y}" x2="${left + width}" y2="${y}" class="${centered && index === 1 ? "zero-line" : "grid-line"}"/><text x="${left - 8}" y="${y + 4}" text-anchor="end">${labels[index]}</text>`).join("")}`;
}

function linePath(values, x, y) {
  let drawing = false;
  return values.map((value, index) => {
    if (value == null) {
      drawing = false;
      return "";
    }
    const command = drawing ? "L" : "M";
    drawing = true;
    return `${command} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`;
  }).filter(Boolean).join(" ");
}

function chartLabelIndexes(length) {
  if (length <= 1) return [0];
  return [...new Set([0, Math.round((length - 1) * 0.25), Math.round((length - 1) * 0.5), Math.round((length - 1) * 0.75), length - 1])];
}

function formatChartDate(value) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function signedNumber(value) {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 0)}`;
}

function renderFleetAdditiveEvidence(baselineRows, comparisonRows, baseline, current) {
  const container = document.getElementById("fleetEvidence");
  const contract = periodEvidenceContract();
  if (!contract) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const evidence = contract.kind === "mtp-derived"
    ? buildMtpFleetTmmEvidence({
        actualRows: state.baselineSource === "actual" ? baselineRows : comparisonRows,
        mtpBasis: contract.mtpBasis,
        fleets: state.selectedFleets,
        baselineSource: state.baselineSource,
        actualTotal: (state.baselineSource === "actual" ? baseline : current)[contract.field],
        valueField: contract.field
      })
    : buildFleetAdditiveEvidence({
        baselineRows,
        comparisonRows,
        fleets: state.selectedFleets,
        baselineTotal: baseline[contract.field],
        comparisonTotal: current[contract.field],
        valueField: contract.field
      });
  if (!evidence.eligible) {
    container.hidden = true;
    container.innerHTML = "";
    console.error(`Fleet ${contract.label} evidence failed reconciliation.`, evidence.residuals);
    return;
  }

  const baseLabel = `Base | ${evidenceSourceLabel(state.baselineSource, contract, "period")}`;
  const scenarioLabel = `Scenario | ${evidenceSourceLabel(state.comparisonMode, contract, "period")}`;
  const sortedRows = [...evidence.rows].sort(compareFleetEvidence);
  container.hidden = false;
  container.innerHTML = `
    <div class="detail-subsection-heading">
      <h3>Real-period Fleet ${escapeHtml(contract.label)}</h3>
      <span>${escapeHtml(baseLabel)} / ${escapeHtml(scenarioLabel)}</span>
    </div>
    <div class="fleet-table-wrap">
      <table>
        <thead><tr>
          <th>Fleet</th>
          <th class="numeric">${escapeHtml(baseLabel)}</th>
          <th class="numeric">${escapeHtml(scenarioLabel)}</th>
          <th class="numeric">Delta</th>
        </tr></thead>
        <tbody>
          ${sortedRows.map((row) => fleetEvidenceRow(row)).join("")}
          ${fleetEvidenceRow({
            fleet: "Total",
            baseline: evidence.totals.baseline,
            scenario: evidence.totals.scenario,
            delta: contract.completeCoverage ? evidence.totals.delta : null
          }, true)}
        </tbody>
      </table>
    </div>`;
}

function fleetEvidenceRow(row, total = false) {
  return `
    <tr class="${total ? "fleet-total-row" : ""}" data-fleet="${escapeHtml(row.fleet)}" data-base="${row.baseline ?? ""}" data-scenario="${row.scenario ?? ""}" data-delta="${row.delta ?? ""}">
      <td>${escapeHtml(row.fleet)}</td>
      <td class="numeric">${rawEvidenceValue(row.baseline)}</td>
      <td class="numeric">${rawEvidenceValue(row.scenario)}</td>
      <td class="numeric daily-delta-cell ${row.delta == null ? "neutral" : deltaCellClass(row.delta)}">${row.delta == null ? "n/a" : signedNumber(row.delta)}</td>
    </tr>`;
}

function rawEvidenceValue(value) {
  return value == null ? "n/a" : formatNumber(value, 0);
}

function compareFleetEvidence(left, right) {
  const { field, direction } = state.sort;
  if (field === "label") return left.fleet.localeCompare(right.fleet) * direction;
  const fleetField = field === "current" ? "scenario" : field;
  return ((left[fleetField] ?? Number.NEGATIVE_INFINITY) - (right[fleetField] ?? Number.NEGATIVE_INFINITY)) * direction;
}

function deltaCellClass(value) {
  return value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
}

function periodMetric(label, value, detail, className, role, signed = false, percentage = false) {
  const display = value == null ? "n/a"
    : percentage ? formatSignedPct(value)
      : signed ? `${value > 0 ? "+" : ""}${formatNumber(value, 0)}`
        : formatNumber(value, 0);
  return `
    <div class="detail-overview-metric ${className}" data-evidence-role="${role}" data-raw-value="${value ?? ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${display}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>`;
}

function inclusiveDays(start, end) {
  if (!start || !end) return 0;
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

function formatPeriod(start, end) {
  const formatter = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${formatter.format(new Date(`${start}T00:00:00Z`))} - ${formatter.format(new Date(`${end}T00:00:00Z`))}`;
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
  const heading = document.getElementById("breakdownHeading");
  if (!rows.length) {
    heading.innerHTML = "";
    container.innerHTML = '<div class="empty-state">No rows are available for this node and scope.</div>';
    return;
  }
  const annualized = rows.some((row) => row.unit === "t/year" || row.unit === "h/year");
  const baselineHeading = annualized ? "Base (annualized)" : "Base";
  const comparisonHeading = annualized ? "Scenario (annualized)" : "Scenario";
  const deltaHeading = annualized ? "Delta (annualized)" : "Delta";
  const breakdownType = state.selectedNodeId === "gross_cycle"
    ? "Component breakdown"
    : state.view.planComparison ? "Fleet comparison" : "Fleet / Mode comparison";
  heading.innerHTML = `
    <h3>${annualized ? `Annualized ${breakdownType}` : breakdownType}</h3>
    <span>Base / ${escapeHtml(scenarioDisplayLabel())}</span>`;
  container.innerHTML = `
    <table>
      <thead><tr>
        <th data-sort="label">Breakdown</th>
        <th class="numeric" data-sort="baseline">${baselineHeading}</th>
        <th class="numeric" data-sort="current">${comparisonHeading}</th>
        <th class="numeric" data-sort="delta">${deltaHeading}</th>
      </tr></thead>
      <tbody>${rows.map((row) => `
        <tr><td>${escapeHtml(row.label)}</td><td class="numeric">${formatNodeValue(row.baseline, row.unit)}</td><td class="numeric">${formatNodeValue(row.current, row.unit)}</td><td class="numeric daily-delta-cell ${annualizedDeltaClass(row)}">${formatSignedNode(row.delta, row.unit)}</td></tr>
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

function scenarioDisplayLabel() {
  return state.comparisonMode === "custom" ? "Custom" : sourceLabel(state.comparisonMode);
}

function annualizedDeltaClass(row) {
  if (row.delta == null) return "neutral";
  const direction = comparisonTone(state.selectedNodeId, row.baseline, row.current);
  return direction === "tone-positive" ? "positive" : direction === "tone-negative" ? "negative" : "neutral";
}

function compareDetail(left, right) {
  const { field, direction } = state.sort;
  if (field === "label") return left.label.localeCompare(right.label) * direction;
  return ((left[field] ?? Number.NEGATIVE_INFINITY) - (right[field] ?? Number.NEGATIVE_INFINITY)) * direction;
}

function setZoom(value, anchor = null) {
  const previousZoom = state.zoom;
  const nextZoom = Math.max(0.4, Math.min(1.1, value));
  const viewport = document.getElementById("treeViewport");
  const anchorPoint = anchor && viewport ? {
    x: (viewport.scrollLeft + anchor.x) / previousZoom,
    y: (viewport.scrollTop + anchor.y) / previousZoom
  } : null;

  state.zoom = nextZoom;
  document.getElementById("zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
  render();
  if (anchorPoint && viewport) {
    viewport.scrollLeft = anchorPoint.x * nextZoom - anchor.x;
    viewport.scrollTop = anchorPoint.y * nextZoom - anchor.y;
  }
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
