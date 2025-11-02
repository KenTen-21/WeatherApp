function setStatus(state, message) {
  const badge = document.getElementById('statusBadge');
  const msg = document.getElementById('statusMsg');
  badge.className = 'status ' + state;
  // Capitalize first letter for badge text
  badge.textContent = state.charAt(0).toUpperCase() + state.slice(1);
  msg.textContent = message || '';
}

document.getElementById('get').addEventListener('click', async () => {
  const city = document.getElementById('city').value;
  const result = document.getElementById('result');
  setStatus('loading', 'Looking up ' + city + '…');
  result.textContent = '';
  try {
    const res = await fetch(`/api/forecast?city=${encodeURIComponent(city)}`);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(res.status + ' ' + txt);
    }
    const data = await res.json();
    const t = new Date();
    setStatus('ok', 'Ready — updated ' + t.toLocaleTimeString());
    // Render a friendly summary and hourly table
    function renderHourlyTable(hourly) {
      if (!hourly || !hourly.length) return '<div class="muted">No hourly data available</div>';
      // build table rows
      const rows = hourly.map(h => {
        const timeStr = (() => {
          try { return new Date(h.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
          catch (e) { return h.time }
        })();
        const temp = (h.temp_c === null || h.temp_c === undefined) ? '—' : (Math.round(h.temp_c * 10)/10) + '°C';
        const prob = (h.precip_prob === null || h.precip_prob === undefined) ? '—' : (h.precip_prob + '%');
        const mm = (h.precip_mm === null || h.precip_mm === undefined) ? '—' : (Math.round(h.precip_mm*10)/10 + ' mm');
        const wind = (h.wind_kph === null || h.wind_kph === undefined) ? '—' : (Math.round(h.wind_kph*10)/10 + ' kph');
        return `<tr><td class="time">${timeStr}</td><td class="temp">${temp}</td><td class="precip">${prob}</td><td class="precip-mm">${mm}</td><td class="wind">${wind}</td></tr>`;
      }).join('\n');
      return `
        <div class="hourly-wrapper">
          <table class="hourly-table">
            <thead><tr><th>Time</th><th>Temp</th><th>Precip %</th><th>Precip mm</th><th>Wind</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    const scoreHtml = data.umbrellaScore !== undefined ? `<div class="score">Umbrella score: <strong>${data.umbrellaScore}</strong></div>` : '';
    const alertsHtml = (data.alerts && data.alerts.length) ? `<div class="alerts">Alerts: ${data.alerts.map(a => a.type + ' (' + a.prob + '%)').join(', ')}</div>` : '';
    result.innerHTML = `
      <div class="forecast-summary card">
        ${scoreHtml}
        ${alertsHtml}
        <div class="daily-summary">${data.summary || ''}</div>
      </div>
      ${renderHourlyTable(data.hourly || [])}
    `;
  } catch (err) {
    setStatus('error', err.message || 'Error fetching forecast');
    result.textContent = '';
  }
});
