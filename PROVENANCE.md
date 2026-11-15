# Current data provenance

This review build supersedes the monthly/one-step descriptions in the original DATA_SOURCES.md.
The implemented source is NASA POWER daily point API, explicitly UTC, requested 1981-01-01 to
2025-12-31, seven parameters: T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, PRECTOTCORR, ALLSKY_SFC_SW_DWN.

Temperature, humidity, wind and solar are complete-year daily arithmetic means. Maximum/minimum
temperature variables mean the annual average of DAILY maxima/minima; they are not the mean
of monthly extremes. Annual precipitation is the sum of daily mm/day values. Missing, null,
non-numeric and NASA fill values never become zero. A year/month is shown only when complete
for that variable. Availability is variable-specific, and forecast validation rejects gaps.

Monthly climatology averages the same calendar month's complete summaries over the selected
years; rainfall is the mean monthly total, not the total across all years. This corrects the
factor-of-25 inconsistency in the attached research document's monthly precipitation table.
No numbers from that document were blindly imported.

Raw NASA JSON and derived annual/monthly/quality summaries are included under data/ for:
Tabuk 28.3838,36.5662; New York 40.7,-74; Madinah 24.4709,39.6122.
Each derived file records retrieval time, source URL, API metadata, coordinates, raw filename,
and SHA-256 digest. Snapshots are only used when a live request fails or times out and are
visibly labeled; other locations never borrow a different coordinate's data.

Forecast model: existing AR(2) ridge with chronological rolling-origin validation for the actual
selected 1/3/5-year horizon, eight recent targets for a 45-year series. Overlapping multi-year
errors are not statistically independent. Persistence is the last observation at each origin.
All forecasts remain exploratory, including those that beat the baseline. No calibrated prediction
interval or percentage confidence is manufactured. Physically impossible outputs are withheld
consistently before presentation or export.

Historical crop scenarios: daily Hargreaves ET0 (FAO-56 equations 21, 23–25, 52), Ra converted
from MJ/m²/day to equivalent evaporation using 0.408, then monthly sums. User supplies crop name,
monthly-mean temperature band, constant Kc, irrigation efficiency, and effective-rain fraction.
For each complete historical month, I=max(0,Kc*ET0-effectiveFraction*rain)/efficiency; these monthly
scenario amounts are averaged across the selected years. The temperature check is only the
user-specified band predicate, not a validated crop suitability verdict. No soil-water storage,
growth stages, local calibration or future water forecast is implied.

References:
- https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- https://www.fao.org/4/x0490e/x0490e07.htm

Heat layers use sparse daily NASA point samples with one shared scale, not continuous rasters.
USGS earthquake observations and static PB2002 boundaries remain distinct sources, not geological
hazard forecasts. Other NASA research collections have not been added without actual data.
