# Haul Fleet Value Driver Tree - Review Copy

Static GitHub Pages review build of the V5 Working-Net prototype.

## Disclaimer

This is a prototype review copy only. Data shown is included for prototype evaluation and is not approved for operational, financial, planning, production, mine-performance or reporting decisions.

## Published Scope

- V5 Baseline / Scenario / Delta workflow.
- Actuals, MTP, STMP and Roy Hill Weekly comparison sources.
- Observed source/date/fleet/mode comparisons without automatic coverage normalization or warning banners.
- Multi-fleet and mode filters.
- Working-Time x Net-Rate value-driver tree.
- Explicit Weekly Cyclone Standby and governed combined-Queue behavior.
- Number of Trucks shown as an explanatory TMM branch.
- Truck Equivalent shown as a derived scenario output.
- Only the static frontend and its required V5 CSV packages are included.
- Actuals contain 2,271 validated daily Fleet x Mode rows through 2026-07-31.

## Model Note

Truck Equivalent converts the annualized TMM difference into baseline average-truck capacity:

`(Scenario annualized TMM - Baseline annualized TMM) / (Baseline annualized TMM / Baseline average trucks)`

Number of Trucks is visible as operational context but is not currently multiplied into the V5 TMM calculation.