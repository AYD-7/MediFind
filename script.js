/**
 * MediFind — Main JavaScript
 * Health Risk Predictor + Hospital Locator
 * Vanilla JS, no frameworks, no backend
 */

/* =============================================
   UTILITIES & SHARED
   ============================================= */

// ---- Theme Toggle ----
function initTheme() {
  const saved = localStorage.getItem('MediFind-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.body.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('MediFind-theme', next);
  updateThemeIcon(next);
}

// ---- Preloader ----
function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.classList.add('hidden');
    }, 1200);
  });
}

// ---- Navbar scroll effect ----
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ---- Mobile Menu ----
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  // Close on link click
  mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });
}

// ---- Scroll Reveal ----
function initReveal() {
  const elements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ---- Stat Counter Animation ----
function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        const target = parseInt(entry.target.dataset.target);
        animateCounter(entry.target, 0, target, 1500);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

function animateCounter(el, start, end, duration) {
  const startTime = performance.now();
  function update(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = end;
  }
  requestAnimationFrame(update);
}

/* =============================================
   HEALTH RISK PREDICTOR
   ============================================= */

let currentStep = 1;
let riskResult = null;

function initPredictor() {
  if (!document.getElementById('healthForm')) return;

  // Show saved banner if result exists
  checkSavedResult();

  // BMI auto-calculate
  const weightInput = document.getElementById('weight');
  const heightInput = document.getElementById('height');
  if (weightInput && heightInput) {
    weightInput.addEventListener('input', updateBMI);
    heightInput.addEventListener('input', updateBMI);
  }

  // Symptom score preview
  document.querySelectorAll('input[name="symptoms"]').forEach(cb => {
    cb.addEventListener('change', updateSymptomScore);
  });

  // Step navigation
  document.querySelectorAll('.next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next);
      navigateStep(next);
    });
  });

  document.querySelectorAll('.prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = parseInt(btn.dataset.prev);
      navigateStep(prev, false);
    });
  });

  // Form submit
  document.getElementById('healthForm').addEventListener('submit', (e) => {
    e.preventDefault();
    analyzeRisk();
  });

  // Saved result buttons
  const viewSavedBtn = document.getElementById('viewSavedBtn');
  const clearSavedBtn = document.getElementById('clearSavedBtn');
  if (viewSavedBtn) viewSavedBtn.addEventListener('click', showSavedResult);
  if (clearSavedBtn) clearSavedBtn.addEventListener('click', clearSavedResult);
}

function navigateStep(stepNum, forward = true) {
  // Validate before going forward
  if (forward && !validateStep(currentStep)) return;

  // Update step classes
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`step${stepNum}`);
  if (target) {
    target.classList.add('active');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Update progress steps
  document.querySelectorAll('.ps-step').forEach((step, idx) => {
    const num = idx + 1;
    step.classList.remove('active', 'done');
    if (num < stepNum) step.classList.add('done');
    else if (num === stepNum) step.classList.add('active');
  });

  document.querySelectorAll('.ps-line').forEach((line, idx) => {
    if (idx < stepNum - 1) line.classList.add('done');
    else line.classList.remove('done');
  });

  currentStep = stepNum;
}

function validateStep(step) {
  let valid = true;

  if (step === 1) {
    const age = document.getElementById('age').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const gender = document.querySelector('input[name="gender"]:checked');

    if (!age || age < 1 || age > 120) {
      showError('ageError', 'Please enter a valid age (1–120)');
      valid = false;
    } else hideError('ageError');

    if (!gender) {
      showError('genderError', 'Please select your gender');
      valid = false;
    } else hideError('genderError');

    if (!weight || weight < 20 || weight > 300) {
      showError('weightError', 'Please enter a valid weight (20–300 kg)');
      valid = false;
    } else hideError('weightError');

    if (!height || height < 100 || height > 250) {
      showError('heightError', 'Please enter a valid height (100–250 cm)');
      valid = false;
    } else hideError('heightError');
  }

  return valid;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.classList.remove('visible'); }
}

function updateBMI() {
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const preview = document.getElementById('bmiPreview');

  if (!weight || !height || height < 100) { if (preview) preview.style.display = 'none'; return; }

  const bmi = weight / Math.pow(height / 100, 2);
  const bmiVal = document.getElementById('bmiValue');
  const bmiCat = document.getElementById('bmiCategory');
  const bmiMarker = document.getElementById('bmiMarker');

  if (bmiVal) bmiVal.textContent = bmi.toFixed(1);

  let cat = '', color = '', pct = 0;
  if (bmi < 18.5) { cat = 'Underweight'; color = '#38bdf8'; pct = Math.min((bmi / 18.5) * 25, 25); }
  else if (bmi < 25) { cat = 'Normal Weight'; color = '#22c55e'; pct = 25 + ((bmi - 18.5) / 6.5) * 25; }
  else if (bmi < 30) { cat = 'Overweight'; color = '#f59e0b'; pct = 50 + ((bmi - 25) / 5) * 25; }
  else { cat = 'Obese'; color = '#ef4444'; pct = 75 + Math.min(((bmi - 30) / 10) * 25, 25); }

  if (bmiCat) { bmiCat.textContent = cat; bmiCat.style.color = color; }
  if (bmiMarker) bmiMarker.style.left = `${Math.min(pct, 98)}%`;
  if (preview) preview.style.display = 'block';
}

function updateSymptomScore() {
  let score = 0;
  document.querySelectorAll('input[name="symptoms"]:checked').forEach(cb => {
    score += parseInt(cb.dataset.score || 0);
  });

  const bar = document.getElementById('symptomScoreBar');
  const num = document.getElementById('symptomScoreNum');
  if (bar) bar.style.width = `${Math.min((score / 80) * 100, 100)}%`;
  if (num) num.textContent = score;
}

/* ---- Risk Scoring Logic ---- */
function analyzeRisk() {
  const submitBtn = document.getElementById('submitBtn');
  const loader = submitBtn?.querySelector('.btn-loader');
  const btnText = submitBtn?.querySelector('i:first-child');

  // Show loading state
  if (submitBtn) submitBtn.disabled = true;
  if (loader) loader.style.display = 'inline-block';

  setTimeout(() => {
    const data = collectFormData();
    const { score, breakdown } = calculateScore(data);
    const level = classifyRisk(score);

    riskResult = { score, level, breakdown, data, timestamp: new Date().toISOString() };

    // Save to localStorage
    localStorage.setItem('MediFind-last-result', JSON.stringify(riskResult));

    // Reset button
    if (submitBtn) submitBtn.disabled = false;
    if (loader) loader.style.display = 'none';

    // Show results
    showResults(riskResult);

    // If high risk, redirect to hospital locator
    if (level === 'high') {
      localStorage.setItem('MediFind-high-risk', 'true');
      setTimeout(() => {
        window.location.href = 'locator.html';
      }, 3500);
    }
  }, 1800); // simulate processing
}

function collectFormData() {
  const age = parseInt(document.getElementById('age').value) || 0;
  const weight = parseFloat(document.getElementById('weight').value) || 0;
  const height = parseFloat(document.getElementById('height').value) || 0;
  const gender = document.querySelector('input[name="gender"]:checked')?.value || 'other';
  const smoking = document.getElementById('smoking')?.value || 'never';
  const activity = document.querySelector('input[name="activity"]:checked')?.value || 'light';

  const symptoms = [];
  document.querySelectorAll('input[name="symptoms"]:checked').forEach(cb => {
    symptoms.push({ value: cb.value, score: parseInt(cb.dataset.score || 0) });
  });

  const conditions = [];
  document.querySelectorAll('input[name="conditions"]:checked').forEach(cb => {
    conditions.push({ value: cb.value, score: parseInt(cb.dataset.score || 0) });
  });

  const bmi = height > 0 ? weight / Math.pow(height / 100, 2) : 0;

  return { age, weight, height, gender, smoking, activity, symptoms, conditions, bmi };
}

function calculateScore(data) {
  let score = 0;
  const breakdown = {};

  // 1. Age Score
  let ageScore = 0;
  if (data.age >= 65) ageScore = 20;
  else if (data.age >= 50) ageScore = 12;
  else if (data.age >= 40) ageScore = 6;
  else if (data.age >= 18) ageScore = 2;
  else ageScore = 5; // children — some risk
  score += ageScore;
  breakdown.age = ageScore;

  // 2. BMI Score
  let bmiScore = 0;
  if (data.bmi > 0) {
    if (data.bmi < 18.5 || data.bmi >= 35) bmiScore = 12;
    else if (data.bmi >= 30) bmiScore = 8;
    else if (data.bmi >= 25) bmiScore = 4;
    else bmiScore = 0;
  }
  score += bmiScore;
  breakdown.bmi = bmiScore;

  // 3. Symptom Score
  let symptomScore = 0;
  data.symptoms.forEach(s => { if (s.value !== 'none') symptomScore += s.score; });
  score += symptomScore;
  breakdown.symptoms = symptomScore;

  // 4. Conditions Score
  let conditionScore = 0;
  data.conditions.forEach(c => { if (c.value !== 'none') conditionScore += c.score; });
  score += conditionScore;
  breakdown.conditions = conditionScore;

  // 5. Smoking Score
  let smokingScore = 0;
  if (data.smoking === 'current') smokingScore = 12;
  else if (data.smoking === 'former') smokingScore = 5;
  score += smokingScore;
  breakdown.smoking = smokingScore;

  // 6. Activity Score (lower activity = higher risk)
  let activityScore = 0;
  if (data.activity === 'sedentary') activityScore = 8;
  else if (data.activity === 'light') activityScore = 4;
  else if (data.activity === 'moderate') activityScore = 1;
  else activityScore = 0;
  score += activityScore;
  breakdown.activity = activityScore;

  return { score, breakdown };
}

function classifyRisk(score) {
  if (score >= 61) return 'high';
  if (score >= 31) return 'medium';
  return 'low';
}

/* ---- Show Results ---- */
function showResults(result) {
  navigateStep(4, false);

  const { score, level, breakdown } = result;
  const card = document.getElementById('resultCard');
  if (!card) return;

  const configs = {
    low: {
      icon: 'fa-shield-heart', iconClass: 'low',
      badge: 'Low Risk', badgeClass: 'low',
      title: 'You\'re in Good Shape!',
      sub: 'Your health indicators suggest a low risk level. Keep maintaining your healthy habits.',
      color: 'var(--green)',
      recs: [
        { icon: 'fa-apple-whole', text: 'Maintain a balanced diet rich in fruits and vegetables.' },
        { icon: 'fa-dumbbell', text: 'Keep up regular physical activity — aim for 150 min/week.' },
        { icon: 'fa-calendar-check', text: 'Schedule routine checkups every 6–12 months.' },
        { icon: 'fa-water', text: 'Stay hydrated and prioritize 7–9 hours of sleep.' },
      ]
    },
    medium: {
      icon: 'fa-triangle-exclamation', iconClass: 'medium',
      badge: 'Medium Risk', badgeClass: 'medium',
      title: 'Some Concerns Noted',
      sub: 'Your inputs indicate a moderate risk. Monitor your symptoms and consider consulting a doctor.',
      color: 'var(--orange)',
      recs: [
        { icon: 'fa-stethoscope', text: 'Schedule a consultation with your doctor soon.' },
        { icon: 'fa-pills', text: 'If you have existing conditions, ensure medication compliance.' },
        { icon: 'fa-ban-smoking', text: 'Avoid smoking and reduce alcohol consumption.' },
        { icon: 'fa-person-walking', text: 'Increase physical activity gradually — even short walks help.' },
      ]
    },
    high: {
      icon: 'fa-circle-exclamation', iconClass: 'high',
      badge: 'High Risk', badgeClass: 'high',
      title: 'Immediate Attention Needed',
      sub: 'Your health profile indicates a high risk level. Please seek medical care immediately.',
      color: 'var(--red)',
      recs: [
        { icon: 'fa-phone-volume', text: 'Call emergency services (112/911) if you feel critically ill.' },
        { icon: 'fa-hospital', text: 'Redirecting you to the Hospital Locator in 4 seconds…' },
        { icon: 'fa-person-walking-arrow-right', text: 'Do not drive yourself — ask someone to take you to hospital.' },
        { icon: 'fa-list-check', text: 'Bring your medication list and ID to the hospital.' },
      ]
    }
  };

  const cfg = configs[level];
  const maxScore = 120;
  const pct = Math.min((score / maxScore) * 100, 100);
  const gaugeOffset = 314 - (pct / 100) * 220; // partial circle

  card.innerHTML = `
    <div class="result-header ${level}">
      <div class="result-icon ${cfg.iconClass}">
        <i class="fas ${cfg.icon}"></i>
      </div>
      <div class="result-badge ${cfg.badgeClass}">${cfg.badge}</div>
      <h2 class="result-title">${cfg.title}</h2>
      <p class="result-sub">${cfg.sub}</p>
    </div>
    <div class="result-body">
      <div class="result-score-section">
        <svg viewBox="0 0 120 120" width="130" height="130" class="result-gauge">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="10"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="${cfg.color}" stroke-width="10"
            stroke-dasharray="${(pct / 100) * 314} 314"
            stroke-dashoffset="78" stroke-linecap="round"
            style="transition: stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1);"/>
          <text x="60" y="55" text-anchor="middle" font-family="Syne,sans-serif" font-size="22" font-weight="700" fill="var(--text)">${score}</text>
          <text x="60" y="73" text-anchor="middle" font-size="9" fill="var(--muted)">Risk Score</text>
        </svg>
        <div class="score-breakdown">
          <h4>Score Breakdown</h4>
          ${renderBreakdownItem('Age Factor', breakdown.age, 20)}
          ${renderBreakdownItem('BMI Score', breakdown.bmi, 12)}
          ${renderBreakdownItem('Symptoms', breakdown.symptoms, 80)}
          ${renderBreakdownItem('Conditions', breakdown.conditions, 60)}
          ${renderBreakdownItem('Smoking', breakdown.smoking, 12)}
          ${renderBreakdownItem('Activity Level', breakdown.activity, 8)}
        </div>
      </div>

      <div class="result-recommendations">
        <h4>Recommendations</h4>
        ${cfg.recs.map(r => `
          <div class="rec-item">
            <i class="fas ${r.icon}" style="color:${cfg.color}"></i>
            <span>${r.text}</span>
          </div>
        `).join('')}
      </div>

      <div class="result-actions">
        ${level === 'high' ? `
          <a href="locator.html" class="btn-primary">
            <i class="fas fa-hospital"></i> Find Hospitals Now
          </a>
        ` : `
          <a href="locator.html" class="btn-secondary">
            <i class="fas fa-map-marker-alt"></i> Find Hospitals
          </a>
        `}
        <button class="btn-secondary" onclick="retakeAssessment()">
          <i class="fas fa-rotate-left"></i> Retake Assessment
        </button>
        <button class="btn-secondary" onclick="window.print()">
          <i class="fas fa-print"></i> Print
        </button>
      </div>
    </div>
  `;

  // If high risk, show countdown alert
  if (level === 'high') {
    showHighRiskCountdown();
  }

  // Scroll to results
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBreakdownItem(label, value, max) {
  const pct = Math.min((value / max) * 100, 100);
  let color = 'var(--green)';
  if (pct > 66) color = 'var(--red)';
  else if (pct > 33) color = 'var(--orange)';
  return `
    <div class="sb-item">
      <span>${label}</span>
      <div class="sb-bar"><div class="sb-fill" style="width:${pct}%; background:${color};"></div></div>
      <strong>${value}</strong>
    </div>
  `;
}

function showHighRiskCountdown() {
  let count = 4;
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 2rem; right: 2rem; z-index: 9000;
    background: var(--red); color: white; border-radius: 16px;
    padding: 1.25rem 1.5rem; max-width: 320px;
    box-shadow: 0 8px 32px rgba(239,68,68,0.4);
    animation: slideUpFade 0.4s ease;
    font-family: var(--font-body);
  `;
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
      <i class="fas fa-circle-exclamation" style="font-size:1.25rem;"></i>
      <strong style="font-size:0.9375rem;">High Health Risk Detected!</strong>
    </div>
    <p style="font-size:0.8125rem;opacity:0.9;margin-bottom:0.75rem;">
      Please visit a nearby hospital immediately. Redirecting in <strong id="countdown">${count}</strong> seconds…
    </p>
    <a href="locator.html" style="display:inline-flex;align-items:center;gap:0.5rem;background:rgba(255,255,255,0.2);color:white;padding:0.5rem 1rem;border-radius:8px;font-size:0.8125rem;font-weight:700;text-decoration:none;">
      <i class="fas fa-hospital"></i> Go Now
    </a>
  `;
  document.body.appendChild(toast);

  const interval = setInterval(() => {
    count--;
    const el = document.getElementById('countdown');
    if (el) el.textContent = count;
    if (count <= 0) clearInterval(interval);
  }, 1000);
}

function retakeAssessment() {
  // Reset form
  document.getElementById('healthForm')?.reset();
  // Go back to step 1
  navigateStep(1, false);
  // Clear BMI preview
  const bmiPreview = document.getElementById('bmiPreview');
  if (bmiPreview) bmiPreview.style.display = 'none';
  // Reset score bar
  const bar = document.getElementById('symptomScoreBar');
  if (bar) bar.style.width = '0%';
  const num = document.getElementById('symptomScoreNum');
  if (num) num.textContent = '0';
}

/* ---- Saved Results ---- */
function checkSavedResult() {
  const saved = localStorage.getItem('MediFind-last-result');
  const banner = document.getElementById('savedBanner');
  if (saved && banner) banner.style.display = 'flex';
}

function showSavedResult() {
  const saved = localStorage.getItem('MediFind-last-result');
  if (!saved) return;
  const result = JSON.parse(saved);
  navigateStep(4, false);
  showResults(result);
}

function clearSavedResult() {
  localStorage.removeItem('MediFind-last-result');
  const banner = document.getElementById('savedBanner');
  if (banner) banner.style.display = 'none';
}

/* =============================================
   HOSPITAL LOCATOR
   ============================================= */

let map = null;
let userMarker = null;
let hospitalMarkers = [];
let userLocation = null;
let allHospitals = [];
let selectedHospitalIdx = null;

function initLocator() {
  if (!document.querySelector('.locator-page')) return;

  // Check if redirected from high-risk result
  if (localStorage.getItem('MediFind-high-risk') === 'true') {
    const banner = document.getElementById('highRiskBanner');
    if (banner) banner.style.display = 'block';
    localStorage.removeItem('MediFind-high-risk');
    // Auto-trigger location
    setTimeout(() => locateUser(), 500);
  }

  // Init Leaflet map
  initMap();

  // Button bindings
  bindLocatorButtons();

  // Search
  const searchInput = document.getElementById('hospitalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', filterHospitals);
  }

  // Sort
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', sortHospitals);
  }

  // Radius filter
  const radiusFilter = document.getElementById('radiusFilter');
  if (radiusFilter) {
    radiusFilter.addEventListener('change', () => {
      if (userLocation) fetchNearbyHospitals(userLocation.lat, userLocation.lng);
    });
  }

  // High risk banner close
  const hrbClose = document.getElementById('hrbClose');
  if (hrbClose) hrbClose.addEventListener('click', () => {
    document.getElementById('highRiskBanner').style.display = 'none';
  });

  // Hospital detail close
  const hdClose = document.getElementById('hdClose');
  if (hdClose) hdClose.addEventListener('click', () => {
    document.getElementById('hospitalDetail').style.display = 'none';
  });
}

function bindLocatorButtons() {
  ['locateBtn', 'locateBtnSidebar', 'locateBtnMap', 'retryBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', locateUser);
  });

  const hdFocus = document.getElementById('hdFocus');
  if (hdFocus) hdFocus.addEventListener('click', () => {
    if (selectedHospitalIdx !== null && allHospitals[selectedHospitalIdx]) {
      const h = allHospitals[selectedHospitalIdx];
      map.setView([h.lat, h.lng], 17, { animate: true });
    }
  });
}

function initMap() {
  if (typeof L === 'undefined') return;

  map = L.map('map', {
    center: [6.5244, 3.3792], // Default: Lagos
    zoom: 13,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
}

function locateUser() {
  if (!navigator.geolocation) {
    showLocatorError('Geolocation is not supported by your browser.');
    return;
  }

  showLocatorLoading();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      userLocation = { lat: latitude, lng: longitude };

      // Hide map overlay
      const overlay = document.getElementById('mapOverlay');
      if (overlay) overlay.style.display = 'none';

      // Place user marker
      if (userMarker) map.removeLayer(userMarker);

      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:20px;height:20px;border-radius:50%;
          background:#0ea5e9;border:3px solid white;
          box-shadow:0 2px 8px rgba(14,165,233,0.5);
          position:relative;
        ">
          <div style="
            width:40px;height:40px;border-radius:50%;
            background:rgba(14,165,233,0.2);
            position:absolute;top:-10px;left:-10px;
            animation:pulseRing 2s ease-out infinite;
          "></div>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      userMarker = L.marker([latitude, longitude], { icon: userIcon })
        .addTo(map)
        .bindPopup('<div class="popup-title">📍 Your Location</div>');

      map.setView([latitude, longitude], 14, { animate: true });

      // Fetch nearby hospitals
      fetchNearbyHospitals(latitude, longitude);
    },
    (error) => {
      let msg = 'Location access denied.';
      if (error.code === error.TIMEOUT) msg = 'Location request timed out. Please try again.';
      else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location unavailable. Check your device settings.';
      showLocatorError(msg);
    },
    { timeout: 15000, enableHighAccuracy: true }
  );
}

/**
 * Fetch hospitals using Overpass API (OpenStreetMap) — completely free, no key needed
 */
async function fetchNearbyHospitals(lat, lng) {
  showLocatorLoading();
  clearHospitalMarkers();

  const radius = parseInt(document.getElementById('radiusFilter')?.value || 5000);

  // Overpass API query — fetches hospitals, clinics, doctors nearby
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      node["healthcare"="hospital"](around:${radius},${lat},${lng});
      node["healthcare"="clinic"](around:${radius},${lat},${lng});
    );
    out body center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();

    const elements = data.elements || [];

    // Process and deduplicate
    const hospitals = elements
      .filter(el => el.lat || (el.center && el.center.lat))
      .map((el) => {
        const elLat = el.lat || el.center.lat;
        const elLng = el.lon || el.center.lon;
        const name = el.tags?.name || el.tags?.['name:en'] || 'Unnamed Medical Facility';
        const address = buildAddress(el.tags);
        const dist = haversineDistance(lat, lng, elLat, elLng);
        return {
          id: el.id,
          name,
          address,
          lat: elLat,
          lng: elLng,
          distance: dist,
          type: el.tags?.amenity || el.tags?.healthcare || 'hospital',
        };
      })
      .filter(h => h.name !== 'Unnamed Medical Facility' || h.distance < 2000)
      .sort((a, b) => a.distance - b.distance);

    // Remove duplicates by proximity (within 50m)
    const deduped = [];
    hospitals.forEach(h => {
      const dup = deduped.find(d => haversineDistance(d.lat, d.lng, h.lat, h.lng) < 50);
      if (!dup) deduped.push(h);
    });

    allHospitals = deduped;

    if (allHospitals.length === 0) {
      // Fallback: show generated hospitals near user if none found
      allHospitals = generateFallbackHospitals(lat, lng);
    }

    renderHospitalList(allHospitals);
    plotHospitalMarkers(allHospitals);

  } catch (err) {
    console.error('Overpass API error:', err);
    // Use fallback hospitals
    allHospitals = generateFallbackHospitals(lat, lng);
    renderHospitalList(allHospitals);
    plotHospitalMarkers(allHospitals);
  }
}

/** Build address string from OSM tags */
function buildAddress(tags = {}) {
  const parts = [];
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }
  if (tags['addr:city']) parts.push(tags['addr:city']);
  else if (tags['addr:state']) parts.push(tags['addr:state']);
  return parts.join(', ') || 'Address not available';
}

/** Haversine distance in meters */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance nicely */
function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Estimate drive time */
function estimateDriveTime(meters) {
  const minutes = Math.round(meters / 400); // ~24km/h average city speed
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

/** Fallback: generate realistic-looking hospitals near user */
function generateFallbackHospitals(lat, lng) {
  const names = [
    'General Hospital', 'Medical Centre', 'University Teaching Hospital',
    'Community Health Centre', 'Specialist Hospital', 'Polyclinic',
    'St. Mary\'s Medical Centre', 'City Hospital', 'Federal Medical Centre',
  ];
  return names.map((name, i) => {
    const angle = (i / names.length) * 2 * Math.PI;
    const d = 300 + Math.random() * 4500;
    const dlat = (d * Math.cos(angle)) / 111320;
    const dlng = (d * Math.sin(angle)) / (111320 * Math.cos(lat * Math.PI / 180));
    return {
      id: i,
      name,
      address: 'Address not available (demo data)',
      lat: lat + dlat,
      lng: lng + dlng,
      distance: d,
      type: 'hospital',
      isFallback: true,
    };
  }).sort((a, b) => a.distance - b.distance);
}

/** Render hospital list in sidebar */
function renderHospitalList(hospitals) {
  const list = document.getElementById('hospitalList');
  const empty = document.getElementById('hsEmpty');
  const loading = document.getElementById('hsLoading');
  const error = document.getElementById('hsError');
  const count = document.getElementById('hospitalCount');

  if (loading) loading.style.display = 'none';
  if (error) error.style.display = 'none';
  if (empty) empty.style.display = 'none';

  if (!list) return;

  if (hospitals.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (count) count.textContent = `${hospitals.length} Hospital${hospitals.length !== 1 ? 's' : ''} Found`;
  list.style.display = 'block';
  list.innerHTML = '';

  hospitals.forEach((h, idx) => {
    const item = document.createElement('div');
    item.className = 'hospital-item';
    item.dataset.idx = idx;
    item.innerHTML = `
      <div class="hi-header">
        <div class="hi-icon"><i class="fas fa-hospital-alt"></i></div>
        <div>
          <div class="hi-name">${escapeHtml(h.name)}</div>
          <div class="hi-address">${escapeHtml(h.address)}</div>
        </div>
      </div>
      <div class="hi-meta">
        <span class="hi-distance"><i class="fas fa-route"></i> ${formatDistance(h.distance)}</span>
        <span class="hi-badge">Open 24/7</span>
      </div>
    `;
    item.addEventListener('click', () => selectHospital(idx));
    list.appendChild(item);
  });
}

/** Plot markers on the map */
function plotHospitalMarkers(hospitals) {
  clearHospitalMarkers();

  const hospitalIcon = (num) => L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:#ef4444;color:white;
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;
      box-shadow:0 2px 8px rgba(239,68,68,0.4);
      font-size:11px;font-weight:700;
      cursor:pointer;
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });

  hospitals.forEach((h, idx) => {
    const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon(idx + 1) })
      .addTo(map)
      .bindPopup(`
        <div class="popup-title">${escapeHtml(h.name)}</div>
        <div class="popup-address">${escapeHtml(h.address)}</div>
        <div class="popup-distance"><i class="fas fa-route"></i> ${formatDistance(h.distance)} away</div>
      `);

    marker.on('click', () => selectHospital(idx));
    hospitalMarkers.push(marker);
  });

  // Fit map to show all hospitals + user
  if (userLocation && hospitals.length > 0) {
    const bounds = L.latLngBounds(
      hospitals.map(h => [h.lat, h.lng]).concat([[userLocation.lat, userLocation.lng]])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function clearHospitalMarkers() {
  hospitalMarkers.forEach(m => map && map.removeLayer(m));
  hospitalMarkers = [];
}

/** Select a hospital — highlight in list, open popup on map, show detail card */
function selectHospital(idx) {
  selectedHospitalIdx = idx;
  const h = allHospitals[idx];
  if (!h) return;

  // Highlight list item
  document.querySelectorAll('.hospital-item').forEach(item => item.classList.remove('active'));
  const listItem = document.querySelector(`.hospital-item[data-idx="${idx}"]`);
  if (listItem) {
    listItem.classList.add('active');
    listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Open map popup
  if (hospitalMarkers[idx]) {
    map.setView([h.lat, h.lng], 16, { animate: true });
    hospitalMarkers[idx].openPopup();
  }

  // Show detail card
  const detail = document.getElementById('hospitalDetail');
  if (detail) {
    document.getElementById('hdName').textContent = h.name;
    document.getElementById('hdAddress').innerHTML = `<i class="fas fa-location-dot"></i> ${h.address}`;
    document.getElementById('hdDistance').textContent = formatDistance(h.distance);
    document.getElementById('hdTime').textContent = estimateDriveTime(h.distance);

    const directionsLink = document.getElementById('hdDirections');
    if (directionsLink) {
      directionsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
    }

    detail.style.display = 'block';
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function filterHospitals() {
  const query = document.getElementById('hospitalSearch')?.value.toLowerCase() || '';
  const filtered = allHospitals.filter(h =>
    h.name.toLowerCase().includes(query) ||
    h.address.toLowerCase().includes(query)
  );
  renderHospitalList(filtered);
}

function sortHospitals() {
  const by = document.getElementById('sortBy')?.value;
  const sorted = [...allHospitals];
  if (by === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => a.distance - b.distance);
  renderHospitalList(sorted);
}

function showLocatorLoading() {
  document.getElementById('hsEmpty') && (document.getElementById('hsEmpty').style.display = 'none');
  document.getElementById('hsLoading') && (document.getElementById('hsLoading').style.display = 'flex');
  document.getElementById('hsError') && (document.getElementById('hsError').style.display = 'none');
  document.getElementById('hospitalList') && (document.getElementById('hospitalList').style.display = 'none');
}

function showLocatorError(msg) {
  document.getElementById('hsEmpty') && (document.getElementById('hsEmpty').style.display = 'none');
  document.getElementById('hsLoading') && (document.getElementById('hsLoading').style.display = 'none');
  const errEl = document.getElementById('hsError');
  const errMsg = document.getElementById('errorMsg');
  if (errEl) errEl.style.display = 'flex';
  if (errMsg) errMsg.textContent = msg;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* =============================================
   INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Shared inits
  initTheme();
  initPreloader();
  initNavbar();
  initMobileMenu();
  initReveal();
  initCounters();

  // Theme toggle button
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Page-specific inits
  initPredictor();
  initLocator();
});
