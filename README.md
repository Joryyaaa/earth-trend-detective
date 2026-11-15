# Earth System Detective

Prediction Lab update based on upstream main f83d03ffa2da54ebde4661822bb8b2277b2f0a6b.

Website: https://joryyaaa.github.io/earth-trend-detective/#prediction-lab

All prediction tools live in Prediction Lab; the 40-language selector is in the header.
The two original globes and historical tools remain. For local development, serve the repository root over HTTP, for example with python3 -m http.server.

## Implemented

- Existing autoregressive ridge model repaired, including historical horizon alignment.
- NASA POWER daily UTC data, seven variables, complete-year aggregation and seasonal patterns.
- Seven role modes, optional age bands, simple/scientific explanations, 40 text languages.
- Speech playback/pause/resume/replay/stop/speed using available device voices.
- Text/JSON role reports, source provenance and labeled verified snapshots for three locations.
- Optional crop-temperature screening and historical irrigation scenarios from explicit user inputs.
  These use daily Hargreaves ET0, precipitation, Kc, efficiency and effective-rain assumptions.
  They require local calibration and omit soil storage and growth stages; not future prescriptions.
- Engineer historical daily temperature extremes and counts above 35°C, not site certification
  or geological hazard predictions. Existing USGS observations and static plate geometry remain.

## Tested

63 real-data forecasting runs (three locations, seven variables, 1/3/5-year horizons), alignment,
missing/fill values, leap years, precipitation seasonality consistency, FAO reference radiation,
irrigation arithmetic and 40 complete language-pack structures.
Interactive checks cover language/role changes, audio controls, calculations and export.

## Limitations

Experimental estimates are not NASA predictions. RMSE is not a calibrated prediction interval.
Point data are not citywide averages. Ask AI remains rule-based, not an LLM.
40 offline language vocabularies now cover navigation, controls, observation summaries, charts, Prediction Lab, guided assistant output and exported reports. Scientific identifiers, units and proper names retain their notation.
Translations need native-language review before public release. Voice coverage depends on browser/device;
no substitute-language voice is used. No disaster prediction or crop optimization is claimed.
No other NASA collections from the research have been silently represented as downloaded.


## Global language and role evidence update

Build `20261115-platform-roles-2` extends the header selector across all views. Role-specific evidence is calculated from the same NASA observations: seasonal wet/dry months for farmers, observed heat peaks and days above 35°C for engineers, structured student reports, and sample completeness / model backtests for scientific roles. Age groups change presentation precision, comparison windows and explanatory detail, never the fitted forecast. Farmer inputs remain explicit and historical scenarios are not operational crop prescriptions.

Additional checks: `node tests/personalization.cjs` verifies all 40 dictionaries and scientific disclosures, 35 role/age combinations, invariant forecast values, and actual Tabuk heat and seasonal metrics. Browser checks cover all 40 switches, Arabic/French report and chat updates, 1/3/5-year horizons, mobile layout, and downloaded HTML/JSON reports. No translation API is called at runtime. Native-speaker review is still recommended.

Prediction Lab also includes its own location and factor selectors. Select one of the two loaded points, both points, or load a supported city into Earth 01; choose one of seven variables or all seven. Every displayed variable uses the same existing autoregressive model and separate horizon-specific validation with physical-value guards. All-indicator mode is a set of independent forecasts, not a claim of comprehensive hazard prediction.
