vendor

v142.39 offline application dependencies:
- supabase.js: @supabase/supabase-js 2.117.2 UMD bundle (MIT; SUPABASE-LICENSE).
  Source: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js
- chart.js: Chart.js 4.5.1 UMD bundle (MIT; CHART-LICENSE.md).
  Source: https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js
Supabase is loaded locally to keep startup independent of CDN connectivity.
Chart.js is retained for old-release compatibility; current startup and offline
preparation do not load it. The obsolete sample-data chart controller was removed.

Document PDF exporter audit update (v143.70):
- jspdf.umd.min.js: jsPDF 4.2.1, MIT; full upstream copyright header retained.
  Source: https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js
  SHA-256: e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54
  Upstream releases: https://github.com/parallax/jsPDF/releases/tag/v4.2.1
  Replaces 2.5.2. Application uses canvas PNG embedding and blob output only.
  Loaded on document download; unrelated to blank-route startup latency.
