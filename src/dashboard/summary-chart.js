// ==============================================================================


// ==============================================================================
// JS 6: DASHBOARD CHART CONTROLLER
// ==============================================================================
let chartInstance = null;
function initSummaryChart() {
  if(typeof Chart==='undefined')return;
  const canvas = document.getElementById('summaryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{ label: 'Revenue', data: [2000, 2500, 3200, 4100, 4800], borderColor: '#059669', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateChart() {
  if (chartInstance) chartInstance.update();
}
