# NASA POWER data acquisition — 20 global cities

The project currently requests **real NASA POWER monthly point data** on demand, but it does not ship an offline 20-city dataset. For a reproducible complete extraction, use the [Colab extractor provided in the project handoff] or run the API URL template below for each city.

Source endpoint: `https://power.larc.nasa.gov/api/temporal/monthly/point`

Parameters: `T2M,PRECTOTCORR,RH2M,WS2M`, `community=AG`, `start=1981`, `end=2025`, `format=JSON`.

Example for Tabuk:
```
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR,RH2M,WS2M&community=AG&latitude=28.3838&longitude=36.5662&start=1981&end=2025&format=JSON
```

**Integrity requirements**

- Store the original NASA JSON for each city, including metadata and parameter units.
- Verify 20/20 successful API responses and expected 540 monthly records per city (1981–2025).
- Preserve missing/fill values as missing; never fabricate or interpolate without labeling.
- Calculate annual temperature, humidity, and wind using day-weighted monthly means; for precipitation, verify source units before converting monthly rates into annual totals.
- Do not describe point/gridded estimates as whole-city or administrative-region averages.
- Do not describe the dashboard's exploratory trend p-values as autocorrelation-corrected significance.
- Do not describe model-generated forecasts as NASA forecasts.

The 20 city coordinates are defined by the `region1` and `region2` selectors in `index.html` and their display names in `nasa-power.js`.

This document is a provenance and extraction plan, **not proof that the raw 20-city dataset has been downloaded**.
