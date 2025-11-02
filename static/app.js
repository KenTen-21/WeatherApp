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
  const rows = hourly.map(h => {
    const timeStr = (() => { try { return new Date(h.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return h.time } })();
    const tempValC = (h.temp_c === null || h.temp_c === undefined) ? null : Math.round(h.temp_c * 10)/10;
    const displayTemp = tempValC === null ? '—' : (currentUnit === 'C' ? (tempValC + '°C') : (cToF(tempValC) + '°F'));
    const prob = (h.precip_prob === null || h.precip_prob === undefined) ? '—' : (h.precip_prob + '%');
    const mm = (h.precip_mm === null || h.precip_mm === undefined) ? '—' : (Math.round(h.precip_mm*10)/10 + ' mm');
    const wind = (h.wind_kph === null || h.wind_kph === undefined) ? '—' : (Math.round(h.wind_kph*10)/10 + ' kph');
    const color = tempColor(tempValC);
    const textColor = (tempValC !== null && tempValC >= 15) ? '#ffffff' : '#0f172a';
    const tempStyle = color ? `style="background:${color};color:${textColor};"` : '';
    return `<tr><td class="time">${timeStr}</td><td class="temp" ${tempStyle}>${displayTemp}</td><td class="precip">${prob}</td><td class="precip-mm">${mm}</td><td class="wind">${wind}</td></tr>`;
  }).join('\n');
  return `
    <div class="hourly-wrapper card">
      <table class="hourly-table">
        <thead><tr><th>Time</th><th>Temp</th><th>Precip %</th><th>Precip mm</th><th>Wind</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderForecast(data){
  const result = document.getElementById('result');
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
      const txt = await res.text();
      throw new Error(res.status + ' ' + txt);
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
