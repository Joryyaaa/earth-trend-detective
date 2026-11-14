# Data coverage and scientific status

## Data actually connected to the website
The website requests NASA POWER monthly **point** data through:
https://power.larc.nasa.gov/docs/services/api/temporal/monthly/

Currently requested:
- T2M — 2 m near-surface air temperature (annual day-weighted mean, °C)
- PRECTOTCORR — corrected precipitation (monthly daily-rate × days; sum across year, mm/year)
- RH2M — 2 m relative humidity (annual day-weighted mean, %)
- WS2M — 2 m wind speed (annual day-weighted mean, m/s)

Requested window: 1981–2025, when complete years are available. Data are fetched by each visitor's browser for the selected location; the repository does not contain downloaded raw NASA files. Availability depends on the NASA POWER service and parameter coverage.

The selectable defaults are point coordinates near Tabuk, Riyadh, New York, Tokyo, London and Sydney. Clicking the globe can select another point. A NASA POWER point is NOT the average for an administrative region.

## Implemented analyses
- Historical annual chart, two locations or two periods at the same point
- Descriptive least-squares rate of change
- Exploratory Mann–Kendall trend p-value with tie correction and serial-correlation warning (NOT a rigorous autocorrelation-adjusted significance test)
- Experimental autoregressive ridge time-series forecast with chronological holdout against a persistence baseline (one-step validation; multi-year forecasts are not separately validated)
- Guided, rule-based data assistant summarizing the same current observations and calculations. This is not an open-ended LLM API.

## Not yet connected
The user's two research documents describe data families and an acquisition plan; they are not files of observations.

MERRA-2 specific archived collections, GPM IMERG gridded rainfall, MODIS land-surface temperature, MODIS vegetation, GLDAS, AIRS and OMI are NOT currently integrated. Historical satellite imagery, true regional spatial averages, continuous maps/heatmaps, causal attribution and validated climate-scenario forecasts are also NOT implemented.

## Scientific cautions
Globe textures are visual basemaps, not maps of environmental change. Clicking or zooming focuses a location and its point summary; it does not reveal pixel-scale historical environmental changes. For area maps, collect a georeferenced NASA gridded dataset and validate its spatial and temporal resolutions.

## Reference challenge
https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/

## New interactive visualizations (November 2026)
- Time Travel: a year slider, two historical sparklines, year markers, and comparative value bars sourced from complete annual NASA POWER point summaries. Its annual sampling is not a sequence of historical satellite photographs.
- Sampled Spatial Heat Layer: clicking **Generate NASA Heatmap** requests a 3-by-3 neighborhood (up to nine NASA POWER point datasets) around either selected globe's current coordinate, using 0.5° latitude and 0.625° longitude steps for the chosen year and variable. The colored points are scaled only among the returned samples. This is a sparse local point-sample visualization, **not** a continuous interpolated grid, a true gridded remote-sensing heatmap, or an area-weighted regional average. NASA API requests may be slow or rate-limited. Use **Remove heat layer** to restore the original selected-point marker.
- Future development: a true spatially complete heatmap should use a downloaded, documented gridded collection with source resolution, metadata, quality screening, and spatially valid rendering.
