// Unit handling: Celsius or Fahrenheit (persist in localStorage)
let currentUnit = (localStorage.getItem('ua_unit') || 'C');
let lastData = null; // store last fetched data so we can re-render when unit changes
const cityInput = document.getElementById('city');

// remove invalid marker when user starts typing
if (cityInput) {
  cityInput.addEventListener('input', () => cityInput.classList.remove('invalid'));
  // allow Enter key to submit
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const btn = document.getElementById('get');
      if (btn) btn.click();
    }
  });
}

function setUnit(u){
  currentUnit = u === 'F' ? 'F' : 'C';
  localStorage.setItem('ua_unit', currentUnit);
  // update button classes
  const bC = document.getElementById('unitC');
  const bF = document.getElementById('unitF');
  if(bC && bF){
    bC.classList.toggle('active', currentUnit === 'C');
    bF.classList.toggle('active', currentUnit === 'F');
  }
  // re-render last data if present
  if(lastData) renderForecast(lastData);
}

function cToF(c){ return Math.round((c * 9/5 + 32) * 10) / 10; }

function setStatus(state, message) {
  const badge = document.getElementById('statusBadge');
  const msg = document.getElementById('statusMsg');
  badge.className = 'status ' + state;
  // Capitalize first letter for badge text
  badge.textContent = state.charAt(0).toUpperCase() + state.slice(1);
  msg.textContent = message || '';
}
// render helpers use currentUnit
function renderHourlyTable(hourly){
  if (!hourly || !hourly.length) return '<div class="muted">No hourly data available</div>';
  function tempColor(temp){
    if (temp === null || temp === undefined || isNaN(temp)) return '';
    const min=-10, max=40;
    const t = Math.max(min, Math.min(max, temp));
    const ratio = (t - min) / (max - min);
    const hue = Math.round(240 - ratio * 240);
    return `hsl(${hue} 75% 50%)`;
  }
  const rows = hourly.map((h, idx) => {
    const timeStr = (() => { try { return new Date(h.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return h.time } })();
    const tempValC = (h.temp_c === null || h.temp_c === undefined) ? null : Math.round(h.temp_c * 10)/10;
    const displayTemp = tempValC === null ? '—' : (currentUnit === 'C' ? (tempValC + '°C') : (cToF(tempValC) + '°F'));
    const prob = (h.precip_prob === null || h.precip_prob === undefined) ? '—' : (h.precip_prob + '%');
    const mm = (h.precip_mm === null || h.precip_mm === undefined) ? '—' : (Math.round(h.precip_mm*10)/10 + ' mm');
    const wind = (h.wind_kph === null || h.wind_kph === undefined) ? '—' : (Math.round(h.wind_kph*10)/10 + ' kph');
    const scoreVal = (h.umbrellaScore === null || h.umbrellaScore === undefined) ? null : (h.umbrellaScore);
    function scoreColor(score){
      if (score === null || score === undefined || isNaN(score)) return '';
      const s = Math.max(0, Math.min(100, score));
      // Map 0 (green) -> 100 (red): hue from 120 (green) to 0 (red)
      const hue = Math.round((1 - s/100) * 120);
      return `hsl(${hue} 80% 45%)`;
    }
    const scoreColorStyle = scoreVal === null ? '' : `style="background:${scoreColor(scoreVal)};color:${scoreVal>=50? '#ffffff' : '#0f172a'};padding:6px 8px;border-radius:999px;font-weight:700;display:inline-flex;align-items:center;gap:8px;"`;
    const umbrellaHtml = scoreVal === null ? '—' : (`<span class="score-pill" ${scoreColorStyle}><span class="umbrella-emoji">☂️</span><span class="score-val">${scoreVal}</span>${scoreVal>=50? '<span class="bring"> • Bring</span>' : ''}</span>`);
    const color = tempColor(tempValC);
    const textColor = (tempValC !== null && tempValC >= 15) ? '#ffffff' : '#0f172a';
    const tempStyle = color ? `style="background:${color};color:${textColor};"` : '';
    return `<tr data-idx="${idx}"><td class="time clickable">${timeStr}</td><td class="temp" ${tempStyle}>${displayTemp}</td><td class="precip">${prob}</td><td class="precip-mm">${mm}</td><td class="wind">${wind}</td><td class="score">${umbrellaHtml}</td></tr>`;
  }).join('\n');
  return `
    <div class="hourly-wrapper card">
      <table class="hourly-table">
        <thead><tr><th>Time</th><th>Temp</th><th>Precip %</th><th>Precip mm</th><th>Wind</th><th>Umbrella</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Attach click handlers to the hourly table to toggle per-hour details
function attachHourlyClickHandlers(){
  const tbody = document.querySelector('.hourly-table tbody');
  if(!tbody) return;
  // event delegation: clicking on a time cell toggles details
  tbody.onclick = function(e){
    const td = e.target.closest('td.time');
    if(!td || !tbody.contains(td)) return;
    const tr = td.closest('tr');
    if(!tr) return;
    const idx = parseInt(tr.getAttribute('data-idx'));
    toggleHourDetails(tr, idx);
  };
}

function toggleHourDetails(tr, idx){
  // remove any existing details row
  const existing = document.querySelector('.hour-details');
  if(existing){
    // if the existing details belong to the same row, just remove and return
    const prev = tr.nextElementSibling;
    if(prev && prev.classList && prev.classList.contains('hour-details')){
      // closing the same row: remove details and unselect the row
      prev.remove();
      tr.classList.remove('selected');
      return;
    }
    // remove selected marker from the previous row that had details
    const prevRow = existing.previousElementSibling;
    if(prevRow && prevRow.classList) prevRow.classList.remove('selected');
    existing.remove();
  }
  // build details row
  if(!lastData || !lastData.hourly || !lastData.hourly[idx]) return;
  const h = lastData.hourly[idx];
  const score = (h.umbrellaScore === null || h.umbrellaScore === undefined) ? '—' : h.umbrellaScore;
  const prob = (h.precip_prob === null || h.precip_prob === undefined) ? '—' : (h.precip_prob + '%');
  const mm = (h.precip_mm === null || h.precip_mm === undefined) ? '—' : (Math.round(h.precip_mm*10)/10 + ' mm');
  const wind = (h.wind_kph === null || h.wind_kph === undefined) ? '—' : (Math.round(h.wind_kph*10)/10 + ' kph');
  const when = (() => { try { return new Date(h.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e){ return h.time } })();
  const action = (typeof score === 'number' && score >= 60) ? 'Bring an umbrella.' : (typeof score === 'number' && score >= 40) ? 'Consider an umbrella.' : 'No umbrella needed.';

  const detailsTr = document.createElement('tr');
  detailsTr.className = 'hour-details';
  const td = document.createElement('td');
  td.colSpan = 6;
  td.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span class="label">Time</span><span class="value">${when}</span></div>
      <div class="detail-item"><span class="label">Score</span><span class="value">${score}</span></div>
      <div class="detail-item"><span class="label">Precip chance</span><span class="value">${prob}</span></div>
      <div class="detail-item"><span class="label">Precip amount</span><span class="value">${mm}</span></div>
      <div class="detail-item"><span class="label">Wind</span><span class="value">${wind}</span></div>
      <div class="detail-item"><span class="label">Action</span><span class="value">${action}</span></div>
    </div>
  `;
  detailsTr.appendChild(td);
  tr.parentNode.insertBefore(detailsTr, tr.nextSibling);
  // mark this row as selected to change the score pill appearance
  tr.classList.add('selected');
  // scroll the details into view
  detailsTr.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderForecast(data){
  const result = document.getElementById('result');
  const scoreHtml = data.umbrellaScore !== undefined ? `<div class="score">Umbrella score: <strong>${data.umbrellaScore}</strong></div>` : '';

  // Render alerts in a readable card with percent badge, human label and action
  function formatAlert(a){
    const when = a && a.time ? (new Date(a.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : '';
    const prob = (a && (a.prob !== undefined)) ? `${a.prob}%` : '';
    const typeLabel = (a && a.type === 'rain_likely') ? 'Rain likely' : (a && a.type ? a.type.replace(/_/g,' ') : 'Alert');
    const action = (a && a.prob >= 60) ? 'Bring an umbrella.' : ((a && a.prob >= 40) ? 'Consider an umbrella.' : 'Be aware of possible rain.');
    const severityClass = (a && a.prob >= 60) ? 'danger' : ((a && a.prob >= 40) ? 'loading' : 'idle');
    return `
      <div class="alert-item">
        <span class="alert-badge ${severityClass}">${prob}</span>
        <div class="alert-body">
          <div class="alert-title">${typeLabel}</div>
          <div class="alert-time">${when}</div>
          <div class="alert-action">${action}</div>
        </div>
      </div>
    `;
  }

  const alertsHtml = (data.alerts && data.alerts.length) ? `<div class="alerts card"><h3>Alerts</h3>${data.alerts.map(formatAlert).join('')}</div>` : '';
  result.innerHTML = `
    <div class="forecast-summary card">
      ${scoreHtml}
      ${alertsHtml}
      <div class="daily-summary">${data.summary || ''}</div>
    </div>
    ${renderHourlyTable(data.hourly || [])}
  `;
  // wire up click handlers for the newly rendered hourly table
  attachHourlyClickHandlers();
}

// hook up unit buttons
const bC = document.getElementById('unitC');
const bF = document.getElementById('unitF');
if(bC && bF){
  bC.addEventListener('click', ()=> setUnit('C'));
  bF.addEventListener('click', ()=> setUnit('F'));
  // initialize
  setUnit(currentUnit);
}

document.getElementById('get').addEventListener('click', async () => {
  const city = (cityInput && cityInput.value) ? cityInput.value : '';
  if(!city || !city.trim()){
    // visually mark the input and focus it for quick correction
    if (cityInput) {
      cityInput.classList.add('invalid');
      cityInput.focus();
    }
    setStatus('error','Please enter a city name');
    return;
  }
  const result = document.getElementById('result');
  setStatus('loading', 'Looking up ' + city + '…');
  result.textContent = '';
  try {
    const res = await fetch(`/api/forecast?city=${encodeURIComponent(city)}`);
    if (!res.ok) {
      // Try to parse JSON error detail from FastAPI; otherwise fall back to text
      let bodyText = null;
      try {
        const errJson = await res.json();
        // FastAPI wraps errors in { detail: ... }
        const det = errJson && errJson.detail ? errJson.detail : errJson;
        if (det && typeof det === 'object') {
          // show the human message if present
          bodyText = det.message || det.error || JSON.stringify(det);
          // expose a helpful link if provided
          if (det.nominatim_search) {
            const link = `<div style="margin-top:8px"><a href="${det.nominatim_search}" target="_blank">Search for \"${city}\" on OpenStreetMap (suggestions)</a></div>`;
            document.getElementById('result').innerHTML = `<div class="card">${bodyText}${link}</div>`;
          }
        } else {
          bodyText = JSON.stringify(det || errJson);
        }
      } catch (e) {
        bodyText = await res.text();
      }
      throw new Error(res.status + ' ' + (bodyText || 'Error'));
    }
    const data = await res.json();
    lastData = data;
    const t = new Date();
    setStatus('ok', 'Ready — updated ' + t.toLocaleTimeString());
    renderForecast(data);
  } catch (err) {
    setStatus('error', err.message || 'Error fetching forecast');
    result.textContent = '';
  }
});
