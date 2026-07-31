export function parseCsv(text) {
  const matrix = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) matrix.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    matrix.push(row);
  }
  if (!matrix.length) return [];

  const headers = matrix.shift();
  return matrix.map((cells) => Object.fromEntries(headers.map((header, index) => [header, coerce(cells[index] ?? "")])));
}

function coerce(value) {
  if (value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

export async function fetchCsv(path, { optional = false } = {}) {
  try {
    const response = await fetch(`${path}?v=20260729-v5-01`);
    if (!response.ok) {
      if (optional) return [];
      throw new Error(`Unable to load ${path} (${response.status})`);
    }
    const text = await response.text();
    return text.trim() ? parseCsv(text) : [];
  } catch (error) {
    if (optional) {
      console.warn(`Optional data source not loaded: ${path}`, error);
      return [];
    }
    throw error;
  }
}