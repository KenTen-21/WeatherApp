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
    const tempC = (h.temp_c === null || h.temp_c === undefined) ? null : h.temp_c;
    const tempDisplay = (currentUnit === 'F' && tempC !== null) ? cToF(tempC) + '°F' : (tempC !== null ? tempC + '°C' : '—');
    const score = (h.umbrellaScore === null || h.umbrellaScore === undefined) ? '—' : h.umbrellaScore;
    const prob = (h.precip_prob === null || h.precip_prob === undefined) ? '—' : (h.precip_prob + '%');
    const mm = (h.precip_mm === null || h.precip_mm === undefined) ? '—' : (Math.round(h.precip_mm*10)/10 + ' mm');
    const wind = (h.wind_kph === null || h.wind_kph === undefined) ? '—' : (Math.round(h.wind_kph*10)/10 + ' kph');
    const humidity = (h.humidity === null || h.humidity === undefined) ? '—' : (h.humidity + '%');
    // compute wind chill in C when applicable (T <= 10°C and wind > 4.8 kph)
    let windChillDisplay = '—';
    if(tempC !== null && h.wind_kph !== null && h.wind_kph !== undefined){
      const v = h.wind_kph;
      if(tempC <= 10 && v > 4.8){
        // Wind chill formula (C): 13.12 + 0.6215*T - 11.37*v^0.16 + 0.3965*T*v^0.16
        const wcC = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(v, 0.16) + 0.3965 * tempC * Math.pow(v, 0.16);
        windChillDisplay = (currentUnit === 'F') ? (cToF(Math.round(wcC*10)/10) + '°F') : (Math.round(wcC*10)/10 + '°C');
      }
    }
    const timeStr = (()=>{ try { return new Date(h.time).toLocaleString([], { hour: '2-digit', minute: '2-digit' }); } catch(e){ return h.time } })();
    const tempColorStyle = tempC !== null ? `style="color: ${tempColor(tempC)}"` : '';
    return `
      <tr data-idx="${idx}">
        <td class="hour-time" data-idx="${idx}" tabindex="0">${timeStr}</td>
        <td class="hour-temp" ${tempColorStyle}>${tempDisplay}<div class="temp-sub">${humidity} ${wind !== '—' ? '· ' + wind : ''} ${windChillDisplay !== '—' ? '· WC ' + windChillDisplay : ''}</div></td>
        <td><span class="score-pill" data-idx="${idx}">${score}</span></td>
        <td>${prob}</td>
        <td>${mm}</td>
        <td>${h.condition && h.condition.text ? h.condition.text : ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="hourly-table">
      <thead><tr><th>Time</th><th>Temp</th><th>Score</th><th>Precip %</th><th>Precip mm</th><th>Condition</th></tr></thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Floating card that shows concise details near the clicked row
function showHourCard(evt){
  const el = evt.currentTarget || evt.target;
  const idx = el.getAttribute('data-idx');
  if(idx === null) return;
  const tr = el.closest('tr');
  if(!tr) return;
  // remove any existing card
  const existing = document.querySelector('.hour-card');
  if(existing){
    const prev = existing.getAttribute('data-idx');
    if(String(prev) === String(idx)){
      existing.remove();
      tr.classList.remove('selected');
      return;
    }
    const prevRow = document.querySelector('.hourly-table tr.selected');
    if(prevRow) prevRow.classList.remove('selected');
    existing.remove();
  }
  if(!lastData || !lastData.hourly || !lastData.hourly[idx]) return;
  const h = lastData.hourly[idx];
  const score = (h.umbrellaScore === null || h.umbrellaScore === undefined) ? '—' : h.umbrellaScore;
  const prob = (h.precip_prob === null || h.precip_prob === undefined) ? '—' : (h.precip_prob + '%');
  const mm = (h.precip_mm === null || h.precip_mm === undefined) ? '—' : (Math.round(h.precip_mm*10)/10 + ' mm');
  const wind = (h.wind_kph === null || h.wind_kph === undefined) ? '—' : (Math.round(h.wind_kph*10)/10 + ' kph');
  const humidity = (h.humidity === null || h.humidity === undefined) ? '—' : (h.humidity + '%');
  // compute wind chill display for card (same rules as table)
  let windChillDisplay = '—';
  const tempC = (h.temp_c === null || h.temp_c === undefined) ? null : h.temp_c;
  if(tempC !== null && h.wind_kph !== null && h.wind_kph !== undefined){
    const v = h.wind_kph;
    if(tempC <= 10 && v > 4.8){
      const wcC = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(v, 0.16) + 0.3965 * tempC * Math.pow(v, 0.16);
      windChillDisplay = (currentUnit === 'F') ? (cToF(Math.round(wcC*10)/10) + '°F') : (Math.round(wcC*10)/10 + '°C');
    }
  }
  const timeStr = (()=>{ try { return new Date(h.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e){ return h.time } })();

  const card = document.createElement('div');
  card.className = 'hour-card card';
  card.setAttribute('data-idx', idx);
  card.innerHTML = `
    <button class="hour-card-close" aria-label="Close">×</button>
    <div class="hour-card-row"><strong>${timeStr}</strong></div>
    <div class="hour-card-row"><span class="label">Precip %</span><span class="value">${prob}</span></div>
    <div class="hour-card-row"><span class="label">Precip mm</span><span class="value">${mm}</span></div>
    <div class="hour-card-row"><span class="label">Wind</span><span class="value">${wind}</span></div>
    <div class="hour-card-row"><span class="label">Wind chill</span><span class="value">${windChillDisplay}</span></div>
    <div class="hour-card-row"><span class="label">Umbrella</span><span class="value">${score}</span></div>
  `;
  document.body.appendChild(card);

  // position
  const rect = tr.getBoundingClientRect();
  const cardWidth = 260;
  const spaceRight = window.innerWidth - rect.right;
  if(spaceRight > cardWidth + 16){
    card.style.position = 'absolute';
    card.style.left = (rect.right + window.scrollX + 8) + 'px';
    card.style.top = (rect.top + window.scrollY) + 'px';
  } else if (rect.left > cardWidth + 16){
    card.style.position = 'absolute';
    card.style.left = Math.max(8, rect.left + window.scrollX - cardWidth - 8) + 'px';
    card.style.top = (rect.top + window.scrollY) + 'px';
  } else {
    card.style.position = 'fixed';
    card.style.left = '50%';
    card.style.transform = 'translateX(-50%)';
    card.style.bottom = '16px';
    card.style.top = 'auto';
  }

  tr.classList.add('selected');
  card.querySelector('.hour-card-close').addEventListener('click', ()=>{ card.remove(); tr.classList.remove('selected'); });
  setTimeout(()=>{
    const onDocClick = (ev)=>{
      if(!card.contains(ev.target) && !tr.contains(ev.target)){
        card.remove(); tr.classList.remove('selected'); document.removeEventListener('click', onDocClick);
      }
    };
    document.addEventListener('click', onDocClick);
  }, 50);
}

function attachHourlyClickHandlers(){
  const times = document.querySelectorAll('.hour-time');
  times.forEach(t => {
    t.addEventListener('click', showHourCard);
    t.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHourCard(e); } });
  });
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
