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
40 languages cover the added role output and planner; original scientific interface still contains English.
Translations need native-language review before public release. Voice coverage depends on browser/device;
no substitute-language voice is used. No disaster prediction or crop optimization is claimed.
No other NASA collections from the research have been silently represented as downloaded.
