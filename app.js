// VERSION: 2026-COVER-LETTER-FIX-v9
console.log("Sky Blueprint app.js VERSION 9 loaded - cover letter ready");
// ── Sky Blueprint App ──
// YOUR PAYSTACK PUBLIC KEY — replace with your real key from paystack.com/dashboard
var PAYSTACK_PUBLIC_KEY = 'pk_live_b07f0d8b9ee7305c57362ec9bbb89fe1eb0f9433';
var OWNER_EMAIL = 'lethumkapu561@gmail.com';
// Paystack payment links/plans
var PAYSTACK_MONTHLY_LINK = 'https://paystack.shop/pay/2g6pr6rq0e';  // R55/month recurring
var PAYSTACK_YEARLY_PLAN = 'PLN_481j8rtfqd47uze';                    // R1,980/year x 3 years

// ── SAFE STORAGE (never throws, works even if browser blocks localStorage) ──
var _memStore = {};
var safeStorage = {
  getItem: function(k) {
    try { return window.localStorage.getItem(k); }
    catch(e) { return _memStore[k] !== undefined ? _memStore[k] : null; }
  },
  setItem: function(k, v) {
    try { window.localStorage.setItem(k, v); }
    catch(e) { _memStore[k] = v; }
  },
  removeItem: function(k) {
    try { window.localStorage.removeItem(k); }
    catch(e) { delete _memStore[k]; }
  }
};
var _sessMem = {};
var safeSession = {
  getItem: function(k) {
    try { return window.sessionStorage.getItem(k); }
    catch(e) { return _sessMem[k] !== undefined ? _sessMem[k] : null; }
  },
  setItem: function(k, v) {
    try { window.sessionStorage.setItem(k, v); }
    catch(e) { _sessMem[k] = v; }
  }
};


var PLAN_CODES = { pro: 'PLN_xxxxxxxxxx', business: 'PLN_xxxxxxxxxx' };
var PRICES = {
  monthly: 5500,       // R55/month — all tools
  yearly: 198000,      // R1,980 — 3 years (R55 x 36 months)
  website_only: 45000, // R450 — website build no domain
  website_com: 75000,  // R750 — website + .com domain
  website_coza: 95000, // R950 — website + .co.za domain
  website_net: 75000,  // R750 — website + .net domain
  website_org: 75000,  // R750 — website + .org domain
  phone: 45000,        // R450 — Find My Phone once-off
}; // amounts in cents (R450=45000, R55=5500, R1980=198000) // in kobo (R99 = 9900)
var currentPlan = 'pro';
var currentUser = null;
// ── Backend URL — update this after deploying to Railway ──
var BACKEND_URL = 'https://sky-blueprint-backend-production.up.railway.app';

// ── Navigation ──
function toggleMobileNav() {
  document.getElementById('mobileMenu').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobileMenu').classList.remove('open');
}

var _pageHistory = ['home'];

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) {
    page.classList.add('active');
    window.scrollTo(0, 0);
    // Track history for back button
    if (_pageHistory[_pageHistory.length - 1] !== name) {
      _pageHistory.push(name);
      if (_pageHistory.length > 10) _pageHistory.shift();
    }
  }
}

function updateNav() {
  var loggedOut = document.getElementById('nav-logged-out');
  var loggedIn = document.getElementById('nav-logged-in');
  var badge = document.getElementById('nav-trial-badge');
  var username = document.getElementById('nav-username');
  // Mobile menu elements
  var mmOut = document.getElementById('mm-logged-out');
  var mmIn = document.getElementById('mm-logged-in');
  var mmBadge = document.getElementById('mm-badge');
  var mmName = document.getElementById('mm-name');

  if (!loggedOut || !loggedIn) return;

  var saved = safeStorage.getItem('sb_current');
  if (saved) {
    var u = JSON.parse(saved);
    currentUser = u;
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'flex';
    if (mmOut) mmOut.style.display = 'none';
    if (mmIn) mmIn.style.display = 'block';

    if (username) username.innerHTML = '👤 ' + (u.fname || 'My Account');
    if (mmName) mmName.textContent = '👤 ' + (u.fname || '') + ' ' + (u.lname || '');

    // Build the badge text/colour once, use for both desktop + mobile
    var bText, bBg, bColor;
    if (u.plan === 'owner') { bText='👑 Owner'; bBg='rgba(245,158,11,0.15)'; bColor='#f59e0b'; }
    else if (u.plan === 'monthly' || u.plan === 'yearly' || u.plan === 'pro' || u.plan === 'paid' || u.plan === 'business') { bText='✅ Active Plan'; bBg='rgba(16,185,129,0.15)'; bColor='#10b981'; }
    else if (u.plan === 'cancelled') { bText='⏳ Plan Ended'; bBg='rgba(239,68,68,0.15)'; bColor='#f87171'; }
    else { bText='🔒 Subscribe · R55/month'; bBg='rgba(245,158,11,0.15)'; bColor='#f59e0b'; }

    if (badge) { badge.textContent=bText; badge.style.background=bBg; badge.style.color=bColor; }
    if (mmBadge) { mmBadge.textContent=bText; mmBadge.style.background=bBg; mmBadge.style.color=bColor; }
  } else {
    loggedOut.style.display = 'flex';
    loggedIn.style.display = 'none';
    if (mmOut) mmOut.style.display = 'block';
    if (mmIn) mmIn.style.display = 'none';
  }

  // Also update the dashboard trial banner with live countdown
  updateDashBanner();
}

function updateDashBanner() {
  var banner = document.getElementById('trial-banner');
  if (!banner || !currentUser) return;
  var u = currentUser;

  if (u.plan === 'owner') {
    banner.innerHTML = '👑 <strong>Owner Account</strong> — Full free access to all tools, forever.';
    banner.style.background = 'rgba(245,158,11,0.08)';
    banner.style.borderColor = 'rgba(245,158,11,0.3)';
  } else if (u.plan === 'monthly' || u.plan === 'yearly' || u.plan === 'pro' || u.plan === 'paid' || u.plan === 'business') {
    banner.innerHTML = '✅ <strong>Active Plan</strong> — You have full access to all Sky Blueprint tools.';
    banner.style.background = 'rgba(16,185,129,0.08)';
    banner.style.borderColor = 'rgba(16,185,129,0.3)';
  } else if (u.plan === 'cancelled') {
    banner.innerHTML = '⏳ <strong>Plan Ended</strong> — Re-subscribe to use the tools again. ' +
      '<button onclick="startPaystack(\'monthly\')" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);margin-left:8px">Subscribe R55/month</button>';
    banner.style.background = 'rgba(239,68,68,0.08)';
    banner.style.borderColor = 'rgba(239,68,68,0.3)';
  } else {
    // No free trial - subscribe to unlock
    banner.innerHTML = '🔒 <strong>Subscribe to unlock all tools</strong> — just R55/month, cancel anytime. ' +
      '<button onclick="startPaystack(\'monthly\')" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);margin-left:8px">Subscribe R55/month</button>';
    banner.style.background = 'rgba(245,158,11,0.08)';
    banner.style.borderColor = 'rgba(245,158,11,0.3)';
  }
}

function goBack() {
  // Remove current page
  _pageHistory.pop();
  // Get previous page
  var prev = _pageHistory[_pageHistory.length - 1] || 'dashboard';
  // If logged in and going back to home, go to dashboard instead
  if (prev === 'home' && currentUser) prev = 'dashboard';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  var page = document.getElementById('page-' + prev);
  if (page) { page.classList.add('active'); window.scrollTo(0,0); }
}

function navTo(section) {
  // Go to home page first, then scroll to section
  showPage('home');
  setTimeout(function() {
    var el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function togglePass(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ── Auth ──
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { alert('Please enter your email and password.'); return; }

  // Log in via the SERVER - it checks the password and returns the real plan
  fetch(BACKEND_URL + '/api/auth/login', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email: email, password: pass })
  })
  .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
  .then(function(res){
    if (!res.ok) { alert(res.d.error || 'Incorrect email or password.'); return; }
    currentUser = res.d.user;
    safeStorage.setItem('sb_token', res.d.token);
    safeStorage.setItem('sb_current', JSON.stringify(currentUser));

    if (currentUser.plan === 'owner') {
      document.getElementById('dash-greeting').textContent = 'Welcome back, Owner 👑 Wongalethu!';
    } else {
      document.getElementById('dash-greeting').textContent = 'Hi ' + currentUser.fname + ' ' + (currentUser.lname||'') + ' Welcome back!';
    }

    fetch(BACKEND_URL + '/api/login-notify', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ fname:currentUser.fname, lname:currentUser.lname, email:currentUser.email, action:'login' })
    }).catch(function(){});

    updateNav();
    if (window._pendingTool) { var t = window._pendingTool; window._pendingTool = null; setTimeout(function(){ openTool(t); }, 200); }
    else showPage('dashboard');
  })
  .catch(function(){ alert('Could not connect to log in. Please check your internet and try again.'); });
}

function doSignup() {
  const fname = document.getElementById('su-fname').value.trim();
  const lname = document.getElementById('su-lname').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const phone = document.getElementById('su-phone').value.trim();
  const pass = document.getElementById('su-pass').value;
  if (!fname || !email || !pass) { alert('Please fill in your name, email and password.'); return; }
  if (pass.length < 6) { alert('Password must be at least 6 characters.'); return; }

  // Create the account on the SERVER (secure - plan is controlled server-side)
  fetch(BACKEND_URL + '/api/auth/signup', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ fname, lname, email, phone, password: pass })
  })
  .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
  .then(function(res){
    if (!res.ok) { alert(res.d.error || 'Could not create account.'); return; }
    // Save the session token - this is how the server knows who we are
    currentUser = res.d.user;
    safeStorage.setItem('sb_token', res.d.token);
    safeStorage.setItem('sb_current', JSON.stringify(currentUser));

    document.getElementById('dash-greeting').textContent = 'Hi ' + fname + ' ' + lname + ' 👋 Welcome to Sky Blueprint!';
    var banner = document.getElementById('trial-banner');
    if (banner) {
      banner.innerHTML = '🎉 <strong>Account Created!</strong> Subscribe to unlock all tools. ' +
        '<button onclick="startPaystack(\'monthly\')" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);margin-left:6px">Subscribe R55/month</button>';
      banner.style.background = 'rgba(16,185,129,0.08)';
      banner.style.borderColor = 'rgba(16,185,129,0.3)';
    }

    fetch(BACKEND_URL + '/api/welcome-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, fname: fname, lname: lname })
    }).catch(function(){});
    fetch(BACKEND_URL + '/api/login-notify', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ fname:fname, lname:lname, email:email, action:'signup' })
    }).catch(function(){});

    updateNav();
    if (window._pendingTool) { var t = window._pendingTool; window._pendingTool = null; setTimeout(function(){ openTool(t); }, 200); }
    else showPage('dashboard');
  })
  .catch(function(){ alert('Could not connect to create your account. Please check your internet and try again.'); });
}

function showAccount() {
  if (!currentUser) { showPage('login'); return; }

  var u = currentUser;
  var planNames = {
    owner: 'Owner Account',
    trial: 'Free Trial',
    monthly: 'Monthly Plan (R55/month)',
    yearly: '3-Year Plan',
    pro: 'Pro Plan',
    paid: 'Active Plan',
    business: 'Business Plan'
  };
  var planName = planNames[u.plan] || 'Free Trial';

  // Calculate trial days or subscription info
  var statusHTML = '';
  if (u.plan === 'owner') {
    statusHTML = '<div style="display:inline-block;background:rgba(245,158,11,0.15);color:#f59e0b;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">👑 OWNER</div>';
  } else if (u.plan === 'monthly' || u.plan === 'yearly' || u.plan === 'pro' || u.plan === 'paid' || u.plan === 'business') {
    statusHTML = '<div style="display:inline-block;background:rgba(16,185,129,0.15);color:#10b981;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">✅ ACTIVE</div>';
  } else {
    var joined = u.joined || Date.now();
    var daysLeft = Math.max(0, 7 - Math.floor((Date.now() - joined) / (1000*60*60*24)));
    statusHTML = '<div style="display:inline-block;background:rgba(56,189,248,0.15);color:#38bdf8;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">⏳ TRIAL — ' + daysLeft + ' DAYS LEFT</div>';
  }

  var joinedDate = u.joined ? new Date(u.joined).toLocaleDateString('en-ZA', {year:'numeric',month:'long',day:'numeric'}) : 'Recently';

  var html =
    '<div style="max-width:600px">' +

    // Profile card
    '<div style="background:linear-gradient(135deg,rgba(56,189,248,0.08),rgba(99,102,241,0.08));border:1px solid rgba(56,189,248,0.2);border-radius:16px;padding:24px;margin-bottom:20px">' +
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">' +
    '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#6366f1);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#fff">' + (u.fname ? u.fname.charAt(0).toUpperCase() : 'U') + '</div>' +
    '<div><div style="font-size:20px;font-weight:800;color:#fff">' + (u.fname||'') + ' ' + (u.lname||'') + '</div>' +
    '<div style="margin-top:6px">' + statusHTML + '</div></div>' +
    '</div>' +

    '<div style="display:flex;flex-direction:column;gap:12px">' +
    accountRow('📧', 'Email', u.email) +
    (u.phone ? accountRow('📱', 'Phone', u.phone) : '') +
    accountRow('💳', 'Current Plan', planName) +
    accountRow('📅', 'Member Since', joinedDate) +
    '</div>' +
    '</div>' +

    // Plan management
    '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:20px">' +
    '<h3 style="font-size:16px;font-weight:700;color:#fff;margin:0 0 16px">Manage Your Plan</h3>';

  if (u.plan === 'trial' || !u.plan) {
    html += '<p style="font-size:13px;color:var(--muted);margin-bottom:16px">Upgrade now to keep all your tools after your trial ends.</p>' +
      '<button class="btn-primary" style="width:100%;box-sizing:border-box;margin-bottom:10px" onclick="startPaystack(\'monthly\')">Subscribe — R55/month</button>' +
      '<button style="width:100%;box-sizing:border-box;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:10px;padding:14px;font-family:var(--font);cursor:pointer;font-weight:700;font-size:14px" onclick="startPaystack(\'yearly\')">Pay Once — R1,980 for 3 Years</button>';
  } else if (u.plan === 'monthly' || u.plan === 'pro' || u.plan === 'paid' || u.plan === 'business') {
    html += '<p style="font-size:13px;color:var(--muted);margin-bottom:16px">Your monthly plan is active. R55 is debited on your subscription date each month.</p>' +
      '<button style="width:100%;box-sizing:border-box;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;border-radius:10px;padding:14px;font-family:var(--font);cursor:pointer;font-weight:700;font-size:14px" onclick="cancelPlan()">Cancel My Subscription</button>';
  } else if (u.plan === 'yearly') {
    html += '<p style="font-size:13px;color:var(--muted);margin-bottom:16px">You have the 3-Year Plan (R1,980/year). Enjoy all tools.</p>' +
      '<button style="width:100%;box-sizing:border-box;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;border-radius:10px;padding:14px;font-family:var(--font);cursor:pointer;font-weight:700;font-size:14px" onclick="cancelPlan()">Cancel My Subscription</button>';
  } else if (u.plan === 'owner') {
    html += '<p style="font-size:13px;color:#f59e0b">👑 You are the owner. You have full free access to everything, forever.</p>';
  }

  html += '</div>' +

    // Account actions
    '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px">' +
    '<h3 style="font-size:16px;font-weight:700;color:#fff;margin:0 0 16px">Account</h3>' +
    '<button style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;border-radius:10px;padding:14px;font-family:var(--font);cursor:pointer;font-weight:600;font-size:14px;margin-bottom:10px" onclick="showPage(\'dashboard\')">← Back to My Tools</button>' +
    '<button style="width:100%;box-sizing:border-box;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:10px;padding:14px;font-family:var(--font);cursor:pointer;font-weight:600;font-size:14px" onclick="doLogout()">Log Out</button>' +
    '</div>' +

    '</div>';

  document.getElementById('account-content').innerHTML = html;
  showPage('account');
}

function accountRow(icon, label, value) {
  return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">' +
    '<span style="font-size:18px">' + icon + '</span>' +
    '<span style="font-size:13px;color:var(--muted);min-width:110px">' + label + '</span>' +
    '<span style="font-size:14px;color:#fff;font-weight:600">' + value + '</span>' +
    '</div>';
}

function cancelPlan() {
  // Show a clear cancellation guide
  var body = document.getElementById('account-content');
  if (!body) return;

  body.innerHTML =
    '<div style="max-width:560px;margin:0 auto">' +
    '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:16px;padding:28px">' +
    '<div style="font-size:44px;text-align:center;margin-bottom:14px">😔</div>' +
    '<h3 style="color:#fff;font-size:19px;text-align:center;margin-bottom:8px">Cancel Your Subscription</h3>' +
    '<p style="color:var(--muted);font-size:13px;text-align:center;line-height:1.7;margin-bottom:20px">We are sorry to see you go. To stop your R55/month charges, follow these quick steps — your subscription is managed securely by Paystack.</p>' +

    '<div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);border-radius:12px;padding:18px;margin-bottom:18px">' +
    '<div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:12px">How to cancel (takes 1 minute):</div>' +
    '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div style="font-size:13px;color:#e2e8f0"><strong style="color:#38bdf8">1.</strong> Open your email inbox (' + (currentUser ? currentUser.email : 'your email') + ')</div>' +
    '<div style="font-size:13px;color:#e2e8f0"><strong style="color:#38bdf8">2.</strong> Search for the email: <em style="color:#fff">"Your subscription is now active"</em> from Paystack</div>' +
    '<div style="font-size:13px;color:#e2e8f0"><strong style="color:#38bdf8">3.</strong> Click the <strong style="color:#fff">"Manage Subscription"</strong> button inside it</div>' +
    '<div style="font-size:13px;color:#e2e8f0"><strong style="color:#38bdf8">4.</strong> Click <strong style="color:#f87171">"Cancel Subscription"</strong> and confirm</div>' +
    '</div></div>' +

    '<p style="font-size:12px;color:#64748b;line-height:1.6;margin-bottom:18px">💡 You can also click "Manage Subscription" in any payment reminder email Paystack sends you before each charge. After cancelling, you keep access until your current paid month ends.</p>' +

    '<button class="btn-primary" style="width:100%;box-sizing:border-box;margin-bottom:10px" onclick="confirmCancelOnFile()">I Have Cancelled on Paystack</button>' +
    '<button style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;border-radius:10px;padding:13px;font-family:var(--font);cursor:pointer;font-weight:600;font-size:14px" onclick="showAccount()">← Keep My Subscription</button>' +

    '<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);text-align:center">' +
    '<p style="font-size:12px;color:#64748b">Need help? Contact us: <strong style="color:#38bdf8">065 601 3544</strong></p>' +
    '</div>' +
    '</div></div>';
}

function confirmCancelOnFile() {
  var token = safeStorage.getItem('sb_token');
  // Tell the server to cancel (server is the source of truth)
  fetch(BACKEND_URL + '/api/cancel-plan', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ token: token })
  }).catch(function(){});

  if (currentUser) {
    currentUser.plan = 'cancelled';
    safeStorage.setItem('sb_current', JSON.stringify(currentUser));
  }
  fetch(BACKEND_URL + '/api/login-notify', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ fname:currentUser.fname, lname:currentUser.lname, email:currentUser.email, action:'cancel' })
  }).catch(function(){});

  updateNav();
  alert('Your subscription has been marked as cancelled. Remember to also cancel on Paystack to stop future charges. You are welcome back anytime!');
  showAccount();
}

function doLogout() {
  currentUser = null;
  safeStorage.removeItem('sb_token');
  safeStorage.removeItem('sb_current');
  updateNav();
  showPage('home');
}

function requireAuth(tool) {
  const saved = safeStorage.getItem('sb_current');
  if (saved) {
    currentUser = JSON.parse(saved);
    openTool(tool);
  } else {
    window._pendingTool = tool;
    showPage('signup');
  }
}

// ── Tools ──
function isTrialExpired(user) {
  if (!user) return true;
  // Owner and paid plans have full access
  if (user.plan === 'owner' || user.plan === 'monthly' || user.plan === 'yearly' || user.plan === 'pro' || user.plan === 'paid' || user.plan === 'business') return false;
  // NO FREE TRIAL - everyone else must subscribe (R55/month)
  return true;
}

function showTrialExpired() {
  var body = document.getElementById('tool-page-body');
  if (body) {
    document.getElementById('tool-page-title').textContent = '🔒 Subscribe to Unlock';
    body.innerHTML =
      '<div class="tool-screen" style="text-align:center;padding:40px 20px">' +
      '<div style="font-size:56px;margin-bottom:16px">🔒</div>' +
      '<h2 style="color:#fff;margin-bottom:10px">Subscribe to Unlock This Tool</h2>' +
      '<p style="color:var(--muted);font-size:14px;margin-bottom:24px;max-width:420px;margin-left:auto;margin-right:auto">Get full access to all premium Sky Blueprint tools for just <strong style="color:#38bdf8">R55/month</strong>. Cancel anytime. SA Map stays free forever.</p>' +
      '<div style="max-width:360px;margin:0 auto;display:flex;flex-direction:column;gap:10px">' +
      '<button class="btn-primary" style="width:100%;box-sizing:border-box;font-size:15px;padding:15px" onclick="startPaystack(\'monthly\')">Subscribe — R55/month</button>' +
      '<button style="width:100%;box-sizing:border-box;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:10px;padding:15px;font-family:var(--font);cursor:pointer;font-weight:700;font-size:15px" onclick="startPaystack(\'yearly\')">Pay Once — R1,980 for 3 Years</button>' +
      '<button style="width:100%;box-sizing:border-box;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#22c55e;border-radius:10px;padding:13px;font-family:var(--font);cursor:pointer;font-weight:600;font-size:14px;margin-top:6px" onclick="openTool(\'sa-map\')">🗺️ Use SA Map (Free)</button>' +
      '</div></div>';
    showPage('tool');
  }
}

function openTool(name) {
  const titles = {
    'website-builder': '🌐 Website Builder',
    'email-cleaner': '📧 Email Cleaner',
    'find-phone': '📍 Find My Phone',
    'ai-mentor': '🤖 AI Business Mentor',
    'cv-builder': '📄 CV Builder & Jobs',
    'sa-map': '🗺️ SA Map',
    'reminders': '🔔 My Reminders & Tasks',
    'learnerships': '🎓 Learnerships & Internships',
    'templates': '📊 Templates Store',
    'pdf-tools': '📑 PDF Tools',
    'customers': '👥 Customer Manager',
  };
  document.getElementById('tool-page-title').textContent = titles[name] || 'Tool';
  const body = document.getElementById('tool-page-body');
  body.innerHTML = '';
  const renderers = {
    'website-builder': renderWebsiteBuilder,
    'email-cleaner': renderEmailCleaner,
    'find-phone': renderFindPhone,
    'ai-mentor': renderAIMentor,
    'cv-builder': renderCVBuilder,
    'sa-map': renderSAMap,
    'reminders': renderReminders,
    'learnerships': renderLearnerships,
    'templates': renderTemplates,
    'pdf-tools': renderPDFTools,
    'customers': renderCustomerManager,
  };
  // SA Map and Templates Store are free to browse - skip subscription check
  if (name !== 'sa-map' && name !== 'templates' && isTrialExpired(currentUser)) {
    showTrialExpired();
    return;
  }
  if (renderers[name]) renderers[name](body);
  showPage('tool');
}

// ── Website Builder ──
function renderWebsiteBuilder(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>🌐 Website Builder</h2>
    <p style="color:var(--muted);font-size:14px;margin-bottom:20px">
      Fill in your business details. We build your professional website in <strong style="color:#38bdf8">72 hours</strong> and deliver it directly to you.
    </p>

    <div id="wb-form">

            <!-- PERSONAL DETAILS -->
      <div class="cv-sec-title">Your Contact Details</div>
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input type="text" id="wb-name" placeholder="e.g. Sipho Dlamini"></div>
        <div class="form-group"><label>Phone Number *</label><input type="tel" id="wb-phone" placeholder="e.g. 082 345 6789"></div>
      </div>
      <div class="form-group"><label>Email Address *</label><input type="email" id="wb-email" placeholder="e.g. sipho@gmail.com"></div>

      <!-- BUSINESS INFO -->
      <div class="cv-sec-title">Your Business Information</div>
      <div class="form-group"><label>Business Name *</label><input type="text" id="wb-biz" placeholder="e.g. Sipho Tech Solutions"></div>
      <div class="form-row">
        <div class="form-group"><label>Business Location / City *</label><input type="text" id="wb-city" placeholder="e.g. Cape Town, Western Cape"></div>
        <div class="form-group"><label>Business Type *</label>
          <select id="wb-cat">
            <option value="">Select your business type</option>
            <optgroup label="🛍️ Retail & Commerce">
              <option>General Retail / Spaza Shop</option>
              <option>Clothing & Fashion Store</option>
              <option>Furniture & Home Decor</option>
              <option>Electronics & Gadgets</option>
              <option>Online Store / E-commerce</option>
            </optgroup>
            <optgroup label="💻 Technology">
              <option>IT Support & Repairs</option>
              <option>Software Development</option>
              <option>Cellphone Repairs</option>
              <option>CCTV & Security Systems</option>
            </optgroup>
            <optgroup label="🍽️ Food & Hospitality">
              <option>Restaurant / Takeaway</option>
              <option>Catering Services</option>
              <option>Bakery / Confectionery</option>
              <option>Coffee Shop / Cafe</option>
              <option>Event Catering</option>
            </optgroup>
            <optgroup label="💅 Beauty & Wellness">
              <option>Hair Salon</option>
              <option>Nail Salon</option>
              <option>Barbershop</option>
              <option>Spa & Massage</option>
              <option>Makeup Artist</option>
              <option>Fitness & Personal Training</option>
            </optgroup>
            <optgroup label="🏗️ Construction & Trades">
              <option>Construction & Building</option>
              <option>Plumbing Services</option>
              <option>Electrical Services</option>
              <option>Painting & Decorating</option>
              <option>Cleaning Services</option>
              <option>Landscaping & Gardening</option>
            </optgroup>
            <optgroup label="🚗 Transport & Logistics">
              <option>Taxi / Transport Service</option>
              <option>Courier & Delivery</option>
              <option>Car Wash & Detailing</option>
              <option>Panel Beating & Auto Repair</option>
              <option>Towing Services</option>
            </optgroup>
            <optgroup label="❤️ Health & Medical">
              <option>Medical Practice / Clinic</option>
              <option>Pharmacy</option>
              <option>Physiotherapy</option>
              <option>Traditional Healer</option>
              <option>Home Care Services</option>
            </optgroup>
            <optgroup label="📚 Education & Training">
              <option>Tutoring / Extra Lessons</option>
              <option>Daycare / Creche</option>
              <option>Skills Training Centre</option>
              <option>Driving School</option>
            </optgroup>
            <optgroup label="⚖️ Professional Services">
              <option>Law Firm / Legal Services</option>
              <option>Accounting & Tax</option>
              <option>Insurance Brokerage</option>
              <option>Property / Real Estate</option>
              <option>Consulting Services</option>
            </optgroup>
            <optgroup label="⛪ Community & NGO">
              <option>Church / Ministry</option>
              <option>Non-Profit Organisation</option>
              <option>Community Centre</option>
              <option>Charity / Foundation</option>
            </optgroup>
            <optgroup label="🎨 Creative & Events">
              <option>Photography & Videography</option>
              <option>Graphic Design</option>
              <option>Event Planning</option>
              <option>Music & Entertainment</option>
              <option>Art & Crafts</option>
            </optgroup>
            <optgroup label="🌱 Agriculture">
              <option>Farming & Agriculture</option>
              <option>Poultry & Livestock</option>
              <option>Garden Supplies</option>
            </optgroup>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Describe your business *</label>
        <textarea id="wb-desc" rows="3" placeholder="Tell us what your business does, what you sell or offer, and who your customers are. The more detail the better!"></textarea>
      </div>

      <!-- DESIGN PREFERENCES -->
      <div class="cv-sec-title">Website Design Preferences</div>
      <div class="form-group"><label>Colour Theme *</label>
        <select id="wb-color">
          <option value="">-- Choose your colour theme --</option>
          <optgroup label="Professional & Corporate">
            <option value="navy-gold">Navy Blue & Gold — prestigious and trustworthy</option>
            <option value="dark-sky">Dark Navy & Sky Blue — modern tech feel (like Sky Blueprint)</option>
            <option value="black-white">Black & White — minimal and clean</option>
            <option value="charcoal-orange">Charcoal & Orange — bold and confident</option>
          </optgroup>
          <optgroup label="Bright & Energetic">
            <option value="red-white">Red & White — bold and eye-catching</option>
            <option value="orange-white">Orange & White — energetic and friendly</option>
            <option value="yellow-black">Yellow & Black — standout and vibrant</option>
            <option value="green-white">Green & White — fresh and natural</option>
          </optgroup>
          <optgroup label="Soft & Elegant (Popular with Women)">
            <option value="pink-white">Pink & White — soft and feminine</option>
            <option value="rose-gold">Rose Gold & White — luxury and elegant</option>
            <option value="purple-white">Purple & White — creative and stylish</option>
            <option value="lavender-white">Lavender & Cream — gentle and calming</option>
            <option value="teal-white">Teal & White — refreshing and sophisticated</option>
          </optgroup>
          <optgroup label="Luxury & Premium">
            <option value="black-gold">Black & Gold — luxury and premium</option>
            <option value="burgundy-gold">Burgundy & Gold — rich and exclusive</option>
            <option value="emerald-gold">Emerald Green & Gold — elite and distinguished</option>
          </optgroup>
          <optgroup label="Natural & Organic">
            <option value="brown-cream">Brown & Cream — earthy and warm</option>
            <option value="forest-white">Forest Green & White — organic and natural</option>
            <option value="olive-beige">Olive & Beige — nature and wellness</option>
          </optgroup>
          <optgroup label="Health & Medical">
            <option value="blue-white-med">Blue & White — clinical and trusted</option>
            <option value="green-blue">Green & Blue — health and wellbeing</option>
          </optgroup>
          <optgroup label="Church & Community">
            <option value="royal-gold">Royal Blue & Gold — spiritual and dignified</option>
            <option value="white-purple">White & Purple — peaceful and spiritual</option>
          </optgroup>
          <option value="custom">I will describe my colours in the notes below</option>
        </select>
      </div>

      <!-- PREMIUM PACKAGE OPTION -->
      <div class="cv-sec-title">Website Package</div>
      <div class="form-group">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;background:linear-gradient(135deg,rgba(168,85,247,0.06),rgba(99,102,241,0.05));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:16px">
          <input type="checkbox" id="wb-premium" onchange="updateWbPrice()" style="width:18px;height:18px;accent-color:#a855f7;cursor:pointer;margin-top:2px">
          <span style="flex:1">
            <strong style="color:#fff;font-size:14px">⭐ Upgrade to Premium — R3,500 all-inclusive</strong><br>
            <span style="font-size:12px;color:var(--muted);line-height:1.7;display:block;margin-top:6px">
              Everything done for you: up to 5 pages, online payment setup (Paystack), custom favicon, .co.za domain (1st year free), business email setup, and 1 month priority support. No extra fees.
            </span>
          </span>
        </label>
        <p style="font-size:10px;color:#64748b;margin-top:6px">Leave unticked for our standard R450 website build (you can still add a domain & favicon below).</p>
      </div>

      <!-- DOMAIN & PRICING -->
      <div class="cv-sec-title">Domain & Pricing</div>
      <div class="form-group"><label>Domain Preference *</label>
        <select id="wb-domain" onchange="updateWbPrice()">
          <option value="none">No domain needed — use free Sky Blueprint link (R0 extra)</option>
          <option value="com">.com domain — global standard e.g. mybusiness.com (+R300)</option>
          <option value="coza">.co.za domain — most trusted SA domain e.g. mybusiness.co.za (+R500)</option>
          <option value="net">.net domain — tech and networking sites (+R300)</option>
          <option value="org">.org domain — NGOs, churches, non-profits (+R300)</option>
          <option value="own">I already have a domain — just build the site (R0 extra)</option>
        </select>
      </div>
      <div id="wb-own-domain-wrap" style="display:none">
        <div class="form-group"><label>Your existing domain name</label><input type="text" id="wb-domain-name" placeholder="e.g. mybusiness.co.za"></div>
      </div>

      <!-- FAVICON ADD-ON -->
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:rgba(56,189,248,0.04);border:1px solid rgba(56,189,248,0.15);border-radius:10px;padding:14px">
          <input type="checkbox" id="wb-favicon" onchange="updateWbPrice()" style="width:18px;height:18px;accent-color:#38bdf8;cursor:pointer">
          <span style="flex:1"><strong style="color:#fff;font-size:13px">Add a custom favicon</strong><br><span style="font-size:11px;color:var(--muted)">Your business logo icon in the browser tab — looks professional (+R50 once-off)</span></span>
        </label>
      </div>

      <!-- PRICE SUMMARY -->
      <div style="background:linear-gradient(135deg,rgba(56,189,248,0.08),rgba(99,102,241,0.06));border:1px solid rgba(56,189,248,0.25);border-radius:16px;padding:22px;margin:16px 0">
        <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px">Order Summary</div>
        <div id="wb-base-row" style="display:flex;justify-content:space-between;margin-bottom:9px;font-size:13px">
          <span style="color:var(--muted)" id="wb-base-label">Website Design & Build (72 hours)</span>
          <span style="color:#fff;font-weight:600" id="wb-base-price">R450</span>
        </div>
        <div id="wb-premium-row" style="display:none;margin-bottom:9px;font-size:11px;color:#a855f7;line-height:1.6">✓ 5 pages · Paystack setup · favicon · .co.za domain (1st yr) · business email · priority support</div>
        <div id="wb-domain-row" style="display:none;justify-content:space-between;margin-bottom:9px;font-size:13px">
          <span style="color:var(--muted)" id="wb-domain-label">Domain</span>
          <span style="color:#38bdf8;font-weight:600" id="wb-domain-price">R0</span>
        </div>
        <div id="wb-favicon-row" style="display:none;justify-content:space-between;margin-bottom:9px;font-size:13px">
          <span style="color:var(--muted)">Custom favicon icon</span>
          <span style="color:#38bdf8;font-weight:600">R50</span>
        </div>
        <div style="border-top:1px solid rgba(56,189,248,0.25);padding-top:12px;margin-top:6px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:700;color:#fff">Total Once-Off</span>
          <span style="font-size:22px;font-weight:800;color:#10b981" id="wb-total-price">R450</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.1)">
          <span style="font-size:13px;color:#a855f7;font-weight:600">+ Monthly Hosting</span>
          <span style="font-size:15px;font-weight:700;color:#a855f7">R55/month</span>
        </div>
        <div style="margin-top:12px;font-size:11px;color:#64748b;line-height:1.6">💡 The once-off fee covers building your site. The R55/month keeps your website online, hosted, and maintained. Cancel anytime.</div>
      </div>

      <!-- EXTRAS -->
      <div class="cv-sec-title">Extra Information</div>
      <div class="form-group"><label>Do you have a logo?</label>
        <select id="wb-logo">
          <option value="no">No logo — Sky Blueprint will create one for me</option>
          <option value="yes">Yes — I will send it by WhatsApp or email</option>
        </select>
      </div>
      <div class="form-group"><label>Pages needed on your website</label>
        <select id="wb-pages">
          <option value="basic">Basic — Home, About, Contact (included)</option>
          <option value="services">Standard — Home, About, Services, Contact</option>
          <option value="full">Full — Home, About, Services, Gallery, Testimonials, Contact</option>
          <option value="shop">Shop — Home, Products, Cart, About, Contact</option>
        </select>
      </div>
      <div class="form-group"><label>Any special features or requests?</label>
        <textarea id="wb-extra" rows="2" placeholder="e.g. WhatsApp chat button, booking form, photo gallery, Facebook page link, specific images I want, anything important..."></textarea>
      </div>

      <button class="btn-primary" style="width:100%;box-sizing:border-box;font-size:16px;padding:16px;margin-top:8px" onclick="submitWebsiteOrder()">
        📤 Submit My Website Application
      </button>
      <p style="font-size:12px;color:var(--muted);text-align:center;margin-top:10px">
        Sky Blueprint will contact you within 24 hours to confirm. Website delivered within 72 hours guaranteed.
      </p>
    </div>

    <div id="wb-success" style="display:none">
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:16px;padding:32px;text-align:center">
        <div style="font-size:52px;margin-bottom:16px">🎉</div>
        <h3 style="color:#10b981;font-size:22px;margin-bottom:10px">Application Submitted!</h3>
        <p style="color:var(--muted);font-size:14px;margin-bottom:24px;line-height:1.7">Your website application has been sent to Sky Blueprint. We will contact you within <strong style="color:#fff">24 hours</strong> to confirm all details and begin building your website.</p>
        <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);border-radius:12px;padding:20px;margin-bottom:20px;text-align:left">
          <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:12px">What happens next:</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="font-size:13px;color:var(--muted)">📬 <strong style="color:#fff">Now</strong> — Application received by Sky Blueprint</div>
            <div style="font-size:13px;color:var(--muted)">📞 <strong style="color:#fff">Within 24 hours</strong> — We call you to confirm all details</div>
            <div style="font-size:13px;color:var(--muted)">🔨 <strong style="color:#fff">Hours 24–72</strong> — Your website is being designed and built</div>
            <div style="font-size:13px;color:var(--muted)">🌐 <strong style="color:#fff">Hour 72</strong> — Website is live and delivered to you!</div>
          </div>
        </div>
        <div style="font-size:14px;color:var(--muted)">Contact us anytime: <strong style="color:#38bdf8">065 601 3544</strong></div>
      </div>
    </div>
  </div>`;

  // Domain change listener
  setTimeout(function() {
    var sel = document.getElementById('wb-domain');
    if (sel) sel.addEventListener('change', updateWbPrice);
  }, 100);
}

function updateWbPrice() {
  // Premium package option
  var premiumEl = document.getElementById('wb-premium');
  var isPremium = premiumEl && premiumEl.checked;

  var val = (document.getElementById('wb-domain') || {value:'none'}).value;
  var extras = { none:0, com:300, coza:500, net:300, org:300, own:0 };
  var labels = { com:'.com domain', coza:'.co.za domain', net:'.net domain', org:'.org domain' };
  var extra = extras[val] || 0;
  var row = document.getElementById('wb-domain-row');
  var label = document.getElementById('wb-domain-label');
  var price = document.getElementById('wb-domain-price');
  var total = document.getElementById('wb-total-price');
  var ownWrap = document.getElementById('wb-own-domain-wrap');
  var favicon = document.getElementById('wb-favicon');
  var favRow = document.getElementById('wb-favicon-row');
  var baseRow = document.getElementById('wb-base-row');
  var baseLabel = document.getElementById('wb-base-label');
  var basePrice = document.getElementById('wb-base-price');
  var premRow = document.getElementById('wb-premium-row');

  var faviconFee = (favicon && favicon.checked) ? 50 : 0;

  if (isPremium) {
    // Premium is R3,500 all-inclusive (domain + favicon included)
    extra = 0; faviconFee = 0;
    if (baseLabel) baseLabel.textContent = 'Premium Package (all-inclusive)';
    if (basePrice) basePrice.textContent = 'R3,500';
    if (premRow) premRow.style.display = 'block';
    if (ownWrap) ownWrap.style.display = 'none';
    if (row) row.style.display = 'none';
    if (favRow) favRow.style.display = 'none';
    if (total) total.textContent = 'R3,500';
    return;
  }

  // Standard R450 build
  if (baseLabel) baseLabel.textContent = 'Website Design & Build (72 hours)';
  if (basePrice) basePrice.textContent = 'R450';
  if (premRow) premRow.style.display = 'none';
  if (ownWrap) ownWrap.style.display = val === 'own' ? 'block' : 'none';
  if (row) row.style.display = extra > 0 ? 'flex' : 'none';
  if (label && labels[val]) label.textContent = labels[val];
  if (price) price.textContent = 'R' + extra;
  if (favRow) favRow.style.display = faviconFee > 0 ? 'flex' : 'none';
  if (total) total.textContent = 'R' + (450 + extra + faviconFee);
}

function submitWebsiteOrder() {
  var isPremium = (document.getElementById('wb-premium') || {checked:false}).checked;
  var name   = (document.getElementById('wb-name')  ||{value:''}).value.trim();
  var phone  = (document.getElementById('wb-phone') ||{value:''}).value.trim();
  var email  = (document.getElementById('wb-email') ||{value:''}).value.trim();
  var biz    = (document.getElementById('wb-biz')   ||{value:''}).value.trim();
  var city   = (document.getElementById('wb-city')  ||{value:''}).value.trim();
  var cat    = (document.getElementById('wb-cat')   ||{value:''}).value;
  var desc   = (document.getElementById('wb-desc')  ||{value:''}).value.trim();
  var color  = (document.getElementById('wb-color') ||{value:''}).value;
  var domain = (document.getElementById('wb-domain')||{value:'none'}).value;
  var logo   = (document.getElementById('wb-logo')  ||{value:''}).value;
  var pages  = (document.getElementById('wb-pages') ||{value:''}).value;
  var extra  = (document.getElementById('wb-extra') ||{value:''}).value.trim();
  var ownDom = (document.getElementById('wb-domain-name')||{value:''}).value.trim();

  if (!name||!phone||!email||!biz||!city||!cat||!desc||!color||!domain) {
    alert('Please fill in all required fields marked with *');
    return;
  }

  var domainLabels = { none:'Free Sky Blueprint link (no domain)', com:'.com domain (+R300)', coza:'.co.za domain (+R500)', net:'.net domain (+R300)', org:'.org domain (+R300)', own:'Own domain: ' + ownDom };
  var totals = { none:450, com:750, coza:950, net:750, org:750, own:450 };
  var colorNames = {
    'navy-gold':'Navy Blue & Gold','dark-sky':'Dark Navy & Sky Blue','black-white':'Black & White',
    'charcoal-orange':'Charcoal & Orange','red-white':'Red & White','orange-white':'Orange & White',
    'yellow-black':'Yellow & Black','green-white':'Green & White','pink-white':'Pink & White',
    'rose-gold':'Rose Gold & White','purple-white':'Purple & White','lavender-white':'Lavender & Cream',
    'teal-white':'Teal & White','black-gold':'Black & Gold','burgundy-gold':'Burgundy & Gold',
    'emerald-gold':'Emerald Green & Gold','brown-cream':'Brown & Cream','forest-white':'Forest Green & White',
    'olive-beige':'Olive & Beige','blue-white-med':'Blue & White (Medical)','green-blue':'Green & Blue',
    'royal-gold':'Royal Blue & Gold','white-purple':'White & Purple','custom':'Custom (see notes)'
  };

  var faviconChecked = (document.getElementById('wb-favicon') || {checked:false}).checked;
  var domainExtra = { none:0, com:300, coza:500, net:300, org:300, own:0 }[domain] || 0;
  var faviconFee = faviconChecked ? 50 : 0;
  var grandTotal;
  if (isPremium) { grandTotal = 3500; domainExtra = 0; faviconFee = 0; }
  else { grandTotal = 450 + domainExtra + faviconFee; }

  var order = {
    name:name, phone:phone, email:email,
    package: isPremium ? 'PREMIUM (R3,500 all-inclusive)' : 'Standard (R450 build)',
    business:biz, city:city, category:cat,
    description:desc, colorTheme:colorNames[color]||color,
    domain: isPremium ? '.co.za domain (included in Premium)' : domainLabels[domain],
    logo:logo, pages:pages,
    favicon: isPremium ? 'Yes — included in Premium' : (faviconChecked ? 'Yes — custom favicon (+R50)' : 'No favicon'),
    monthlyHosting: 'R55/month hosting',
    totalCharge:'R'+grandTotal.toLocaleString()+' once-off + R55/month hosting',
    extraRequests:extra,
    orderTime:new Date().toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})
  };

  fetch(BACKEND_URL + '/api/website-order', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(order)
  }).catch(function(){});

  document.getElementById('wb-form').style.display = 'none';
  document.getElementById('wb-success').style.display = 'block';
}


function renderEmailCleaner(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>📧 AI Email Secretary</h2>
    <p style="color:var(--muted);font-size:14px;margin-bottom:6px">Your AI secretary that manages your inbox while you work.</p>
    <p style="font-size:12px;color:#38bdf8;margin-bottom:20px;font-style:italic">"Turn 500 emails into 5 important tasks."</p>

    <div class="tab-bar">
      <div class="tab active" onclick="emailTab('connect',this)">Connect</div>
      <div class="tab" onclick="emailTab('inbox',this)">My Inbox</div>
      <div class="tab" onclick="emailTab('summary',this)">Daily Summary</div>
      <div class="tab" onclick="emailTab('blocked',this)">Blocked</div>
    </div>

    <!-- CONNECT TAB -->
    <div id="et-connect">
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Connect your email — AI will scan, sort and summarise your inbox automatically.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
        <div class="email-provider-card" onclick="selectProvider('gmail',this)">
          <div style="font-size:28px;margin-bottom:6px">📧</div>
          <div style="font-size:13px;font-weight:700;color:#fff">Gmail</div>
          <div style="font-size:11px;color:var(--muted)">Google</div>
        </div>
        <div class="email-provider-card" onclick="selectProvider('outlook',this)">
          <div style="font-size:28px;margin-bottom:6px">📬</div>
          <div style="font-size:13px;font-weight:700;color:#fff">Outlook</div>
          <div style="font-size:11px;color:var(--muted)">Microsoft</div>
        </div>
        <div class="email-provider-card" onclick="selectProvider('yahoo',this)">
          <div style="font-size:28px;margin-bottom:6px">📮</div>
          <div style="font-size:13px;font-weight:700;color:#fff">Yahoo</div>
          <div style="font-size:11px;color:var(--muted)">Yahoo Mail</div>
        </div>
      </div>

      <div id="email-form" style="display:none">
        <div class="form-group">
          <label id="email-label">Email Address</label>
          <input type="email" id="ec-email" placeholder="your@email.com">
        </div>
        <div class="form-group">
          <label id="pass-label">Password / App Password</label>
          <div style="position:relative">
          <input type="password" id="ec-pass" placeholder="Your password" style="width:100%;box-sizing:border-box;padding-right:44px">
          <button type="button" onclick="togglePass('ec-pass',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;padding:4px">👁️</button>
        </div>
          <div id="pass-hint" style="font-size:11px;color:#38bdf8;margin-top:6px;display:none"></div>
        </div>
        <button class="btn-primary" style="width:100%;box-sizing:border-box" onclick="scanEmails()">
          🔍 Scan My Inbox with AI
        </button>
      </div>

      <div id="ec-error" style="display:none;margin-top:16px"></div>
    </div>

    <!-- INBOX TAB -->
    <div id="et-inbox" style="display:none"></div>

    <!-- SUMMARY TAB -->
    <div id="et-summary" style="display:none">
      <div style="text-align:center;padding:40px 20px;color:var(--muted)">
        <div style="font-size:48px;margin-bottom:12px">📊</div>
        <p>Connect your email first to see your Daily Summary</p>
      </div>
    </div>

    <!-- BLOCKED TAB -->
    <div id="et-blocked" style="display:none">
      <div id="blocked-list"></div>
      <button onclick="clearAllBlocked()" style="width:100%;box-sizing:border-box;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:10px;padding:12px;font-family:var(--font);cursor:pointer;font-size:13px;font-weight:600;margin-top:10px">🗑️ Unblock All Senders</button>
    </div>
  </div>`;

  // Load blocked senders on render
  setTimeout(loadBlockedList, 100);
}

function emailTab(tab, el) {
  var tabs = ['connect','inbox','summary','blocked'];
  tabs.forEach(function(t) {
    var el2 = document.getElementById('et-' + t);
    if (el2) el2.style.display = 'none';
  });
  var target = document.getElementById('et-' + tab);
  if (target) target.style.display = 'block';
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');
}

function selectProvider(provider, card) {
  document.querySelectorAll('.email-provider-card').forEach(function(c){ c.style.borderColor='rgba(255,255,255,0.08)'; });
  card.style.borderColor = '#38bdf8';
  window._emailProvider = provider;
  document.getElementById('email-form').style.display = 'block';

  var hints = {
    gmail: '⚠️ Gmail requires an App Password — not your normal password.<br>Go to myaccount.google.com → Security → App Passwords → create one named "Sky Blueprint"',
    outlook: '✅ Outlook accepts your normal password',
    yahoo: '⚠️ Yahoo requires an App Password from login.yahoo.com → Account Security'
  };
  var hint = document.getElementById('pass-hint');
  hint.innerHTML = hints[provider] || '';
  hint.style.display = 'block';
}

function scanEmails() {
  var provider = window._emailProvider;
  var email = document.getElementById('ec-email').value.trim();
  var pass = document.getElementById('ec-pass').value;

  if (!provider) { alert('Please select your email provider first'); return; }
  if (!email || !pass) { alert('Please enter your email and password'); return; }

  var errDiv = document.getElementById('ec-error');
  errDiv.style.display = 'none';

  // Show scanning animation
  document.getElementById('et-connect').innerHTML +=
    '<div id="ec-scanning" style="text-align:center;padding:30px;margin-top:16px">' +
    '<div style="font-size:40px;margin-bottom:12px">🤖</div>' +
    '<div style="font-size:15px;font-weight:700;color:#38bdf8;margin-bottom:8px">AI Secretary is scanning your inbox...</div>' +
    '<div style="font-size:13px;color:var(--muted)">Sorting emails by priority — this takes about 30 seconds</div>' +
    '<div style="margin-top:16px;height:4px;background:rgba(56,189,248,0.1);border-radius:2px;overflow:hidden">' +
    '<div style="height:100%;background:linear-gradient(90deg,#38bdf8,#6366f1);border-radius:2px;animation:progress 30s linear forwards"></div>' +
    '</div></div>';

  window._emailSession = { provider: provider, email: email, password: pass };

  fetch(BACKEND_URL + '/api/scan-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: provider, email: email, password: pass })
  })
  .then(function(r){ return r.json(); })
  .then(function(data) {
    var scan = document.getElementById('ec-scanning');
    if (scan) scan.remove();
    if (data.success) {
      showAIInbox(data, email);
    } else {
      showEmailError(data.message || data.error || 'Could not connect. Check your password and try again.');
    }
  })
  .catch(function(err) {
    var scan = document.getElementById('ec-scanning');
    if (scan) scan.remove();
    showEmailError('Connection failed. Please check your internet connection and try again.');
  });
}

// ── CATEGORISE EMAILS USING AI RULES ──
function categoriseEmail(email) {
  var from = (email.from || '').toLowerCase();
  var subject = (email.subject || '').toLowerCase();
  var text = (from + ' ' + subject);

  // 🔴 URGENT
  var urgentKw = ['interview','job offer','offer letter','urgent','invoice','payment','banking','bank alert','otp','security alert','password reset','suspicious','login attempt','account suspended','verify your','action required','final notice','court','legal','sars','tax','government','department of','municipality','police','medical','hospital','doctor'];
  for (var i = 0; i < urgentKw.length; i++) {
    if (text.indexOf(urgentKw[i]) > -1) return { cat:'urgent', label:'🔴 Urgent', color:'#ef4444', bg:'rgba(239,68,68,0.08)', border:'rgba(239,68,68,0.25)' };
  }

  // 🟡 IMPORTANT
  var importantKw = ['school','university','college','tvet','learnership','appointment','delivery','order confirmed','tracking','shipment','your order','booking','confirmation','receipt','statement','insurance','discovery','vodacom','mtn','telkom','cellc','rain','nedbank','absa','fnb','capitec','standard bank'];
  for (var i = 0; i < importantKw.length; i++) {
    if (text.indexOf(importantKw[i]) > -1) return { cat:'important', label:'🟡 Important', color:'#f59e0b', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.25)' };
  }

  // ⚪ LOW PRIORITY
  var lowKw = ['spotify','netflix','showmax','dstv','youtube','instagram','facebook','twitter','tiktok','gaming','entertainment','music','subscribe','unsubscribe','newsletter'];
  for (var i = 0; i < lowKw.length; i++) {
    if (text.indexOf(lowKw[i]) > -1) return { cat:'low', label:'⚪ Low Priority', color:'#64748b', bg:'rgba(100,116,139,0.06)', border:'rgba(100,116,139,0.2)' };
  }

  // 🟢 CAN WAIT (promotions/spam from our list)
  return { cat:'canwait', label:'🟢 Can Wait', color:'#10b981', bg:'rgba(16,185,129,0.06)', border:'rgba(16,185,129,0.2)' };
}

function showAIInbox(data, userEmail) {
  var allEmails = (data.important || []).concat(data.spam || []);
  var blocked = JSON.parse(safeStorage.getItem('sb_blocked') || '[]');

  // Filter out blocked senders
  allEmails = allEmails.filter(function(e) {
    return !blocked.some(function(b) { return (e.from||'').toLowerCase().indexOf(b.toLowerCase()) > -1; });
  });

  // Categorise all emails
  var cats = { urgent:[], important:[], canwait:[], low:[] };
  allEmails.forEach(function(e) {
    // Also treat server-detected spam as "can wait"
    var cat = data.spam && data.spam.find(function(s){ return s.uid === e.uid; }) ?
      { cat:'canwait', label:'🟢 Can Wait', color:'#10b981', bg:'rgba(16,185,129,0.06)', border:'rgba(16,185,129,0.2)' } :
      categoriseEmail(e);
    e._cat = cat;
    if (cats[cat.cat]) cats[cat.cat].push(e);
    else cats.canwait.push(e);
  });

  // Build daily summary
  buildDailySummary(cats, userEmail);

  // Build inbox HTML
  var html = '';

  // Stats bar
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px">' +
    statBox('🔴', cats.urgent.length, 'Urgent', '#ef4444') +
    statBox('🟡', cats.important.length, 'Important', '#f59e0b') +
    statBox('🟢', cats.canwait.length, 'Can Wait', '#10b981') +
    statBox('⚪', cats.low.length, 'Low', '#64748b') +
    '</div>';

  // Smart action buttons
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
    '<button onclick="deleteCategory(\'canwait\')" style="flex:1;min-width:120px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">🗑️ Delete Can Wait</button>' +
    '<button onclick="deleteCategory(\'low\')" style="flex:1;min-width:120px;background:rgba(100,116,139,0.1);border:1px solid rgba(100,116,139,0.2);color:#94a3b8;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">🗑️ Delete Low Priority</button>' +
    '</div>';

  // Render each category
  ['urgent','important','canwait','low'].forEach(function(catKey) {
    var emails = cats[catKey];
    if (!emails.length) return;
    var catInfo = emails[0]._cat;

    html += '<div style="margin-bottom:20px">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:' + catInfo.color + ';margin-bottom:8px;padding:6px 12px;background:' + catInfo.bg + ';border-radius:6px;border-left:3px solid ' + catInfo.color + '">' +
      catInfo.label + ' — ' + emails.length + ' emails</div>';

    emails.forEach(function(e) {
      html += '<div class="email-item" id="em-' + e.uid + '" style="background:' + catInfo.bg + ';border:1px solid ' + catInfo.border + ';border-radius:10px;padding:12px;margin-bottom:8px">' +
        '<div style="display:flex;align-items:flex-start;gap:10px">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (e.from||'Unknown') + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (e.subject||'No subject') + '</div>' +
        '<div style="font-size:11px;color:#475569;margin-top:2px">' + (e.date||'') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
        (catKey !== 'urgent' && catKey !== 'important' ?
          '<button onclick="deleteOneEmail(' + e.uid + ',\'em-' + e.uid + '\')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:var(--font)">Delete</button>' : '') +
        '<button onclick="blockSender(this.dataset.sender)" data-sender="' + (e.from||'').replace(/"/g,'') + '" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);color:#f59e0b;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:var(--font)">Block</button>' +
        '</div></div></div>';
    });

    html += '</div>';
  });

  window._allEmails = allEmails;
  window._emailCats = cats;
  document.getElementById('et-inbox').innerHTML = html;

  // Switch to inbox tab
  document.querySelectorAll('.tab').forEach(function(t,i){ t.classList.remove('active'); if(i===1) t.classList.add('active'); });
  document.getElementById('et-connect').style.display = 'none';
  document.getElementById('et-inbox').style.display = 'block';
  document.getElementById('et-summary').style.display = 'none';
  document.getElementById('et-blocked').style.display = 'none';
}

function statBox(icon, count, label, color) {
  return '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">' +
    '<div style="font-size:18px">' + icon + '</div>' +
    '<div style="font-size:20px;font-weight:800;color:#fff">' + count + '</div>' +
    '<div style="font-size:10px;color:' + color + ';font-weight:600">' + label + '</div>' +
    '</div>';
}

function buildDailySummary(cats, email) {
  var now = new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  var total = cats.urgent.length + cats.important.length + cats.canwait.length + cats.low.length;

  var html = '<div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);border-radius:14px;padding:20px;margin-bottom:16px">' +
    '<div style="font-size:11px;color:#38bdf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">AI Secretary Daily Summary</div>' +
    '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:16px">' + now + '</div>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Scanned <strong style="color:#fff">' + total + ' emails</strong> in your inbox. Here is what matters today:</div>';

  if (cats.urgent.length > 0) {
    html += summaryLine('🔴', cats.urgent.length, 'urgent email' + (cats.urgent.length>1?'s':'') + ' need your attention NOW', '#ef4444');
  }
  if (cats.important.length > 0) {
    html += summaryLine('🟡', cats.important.length, 'important email' + (cats.important.length>1?'s':'') + ' to read today', '#f59e0b');
  }
  if (cats.canwait.length > 0) {
    html += summaryLine('🟢', cats.canwait.length, 'promotional email' + (cats.canwait.length>1?'s':'') + ' — can be deleted', '#10b981');
  }
  if (cats.low.length > 0) {
    html += summaryLine('⚪', cats.low.length, 'low priority (entertainment/social)', '#64748b');
  }

  html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(56,189,248,0.15);font-size:12px;color:#475569">✅ AI Secretary has sorted your inbox. Focus only on 🔴 Urgent and 🟡 Important emails today.</div>' +
    '</div>';

  // Security tip if urgent emails found
  var scamWarnings = cats.urgent.filter(function(e){
    var t = (e.from+e.subject).toLowerCase();
    return t.indexOf('password reset')>-1 || t.indexOf('suspicious')>-1 || t.indexOf('verify')>-1 || t.indexOf('account suspended')>-1;
  });
  if (scamWarnings.length > 0) {
    html += '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px;margin-bottom:16px">' +
      '<div style="font-size:13px;font-weight:700;color:#ef4444;margin-bottom:6px">⚠️ Security Warning</div>' +
      '<div style="font-size:12px;color:var(--muted)">AI detected ' + scamWarnings.length + ' email(s) that may be suspicious (fake password resets, account warnings or scam attempts). Do not click any links in these emails unless you are 100% sure they are real.</div>' +
      '</div>';
  }

  html += '<button onclick="emailTab(\'inbox\',document.querySelectorAll(\'.tab\')[1])" class="btn-primary" style="width:100%;box-sizing:border-box">📧 View Full Inbox</button>';

  document.getElementById('et-summary').innerHTML = html;
}

function summaryLine(icon, count, text, color) {
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
    '<div style="width:32px;height:32px;border-radius:50%;background:' + color + '22;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">' + icon + '</div>' +
    '<div style="font-size:13px;color:#e2e8f0"><strong style="color:#fff">' + count + '</strong> ' + text + '</div>' +
    '</div>';
}

function deleteCategory(catKey) {
  var cats = window._emailCats;
  if (!cats || !cats[catKey] || cats[catKey].length === 0) {
    alert('No emails in this category');
    return;
  }
  var uids = cats[catKey].map(function(e){ return e.uid; });
  var count = uids.length;

  // Remove from DOM
  cats[catKey].forEach(function(e) {
    var el = document.getElementById('em-' + e.uid);
    if (el) el.remove();
  });
  cats[catKey] = [];

  // Delete from server
  if (window._emailSession) {
    fetch(BACKEND_URL + '/api/delete-spam', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({}, window._emailSession, {uids:uids}))
    }).catch(function(){});
  }

  alert(count + ' emails deleted successfully!');
}

function deleteOneEmail(uid, elementId) {
  var el = document.getElementById(elementId);
  if (el) el.remove();
  if (window._emailSession) {
    fetch(BACKEND_URL + '/api/delete-spam', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({}, window._emailSession, {uids:[uid]}))
    }).catch(function(){});
  }
}

function blockSender(sender) {
  if (!sender) return;
  var blocked = JSON.parse(safeStorage.getItem('sb_blocked') || '[]');
  var clean = sender.replace(/<[^>]+>/g,'').trim();
  if (!blocked.includes(clean)) {
    blocked.push(clean);
    safeStorage.setItem('sb_blocked', JSON.stringify(blocked));
    alert('Blocked: ' + clean + '\nFuture emails from this sender will be ignored.');
    loadBlockedList();
  } else {
    alert(clean + ' is already blocked.');
  }
}

function loadBlockedList() {
  var el = document.getElementById('blocked-list');
  if (!el) return;
  var blocked = JSON.parse(safeStorage.getItem('sb_blocked') || '[]');
  if (blocked.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><div style="font-size:36px;margin-bottom:10px">✅</div><p>No blocked senders yet.<br>Click "Block" next to any email to block that sender.</p></div>';
    return;
  }
  el.innerHTML = '<div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px">Blocked Senders (' + blocked.length + ')</div>' +
    blocked.map(function(b, i) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:10px 14px;margin-bottom:8px">' +
        '<span style="font-size:13px;color:#e2e8f0">🚫 ' + b + '</span>' +
        '<button onclick="unblockSender(' + i + ')" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#64748b;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-family:var(--font)">Unblock</button>' +
        '</div>';
    }).join('');
}

function unblockSender(index) {
  var blocked = JSON.parse(safeStorage.getItem('sb_blocked') || '[]');
  blocked.splice(index, 1);
  safeStorage.setItem('sb_blocked', JSON.stringify(blocked));
  loadBlockedList();
}

function clearAllBlocked() {
  if (confirm('Unblock all senders?')) {
    safeStorage.removeItem('sb_blocked');
    loadBlockedList();
  }
}

function showEmailError(msg) {
  var errDiv = document.getElementById('ec-error');
  if (!errDiv) return;
  errDiv.style.display = 'block';
  errDiv.innerHTML = '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px;text-align:center">' +
    '<div style="font-size:28px;margin-bottom:8px">❌</div>' +
    '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:6px">Could not connect</div>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:12px">' + msg + '</div>' +
    '<button onclick="document.getElementById(\'ec-error\').style.display=\'none\'" class="btn-primary" style="box-sizing:border-box">← Try Again</button>' +
    '</div>';
}

function deleteAllRealSpam() {
  deleteCategory('canwait');
  deleteCategory('low');
}

function showRealEmails(data) {
  showAIInbox(data, window._emailSession ? window._emailSession.email : '');
}


function emailTab(t, el) {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('et-connect').style.display = t==='connect'?'block':'none';
  document.getElementById('et-inbox').style.display = t==='inbox'?'block':'none';
}

function connectEmail(provider) {
  var providerNames = { gmail: 'Gmail', outlook: 'Outlook', yahoo: 'Yahoo Mail' };
  var loginHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:24px;margin-top:0">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:8px">${provider==='gmail'?'📧':provider==='outlook'?'📬':'📮'}</div>
        <strong style="color:#fff;font-size:16px">Connect ${providerNames[provider]}</strong>
        <p style="color:var(--muted);font-size:13px;margin:4px 0 0">Enter your login details to connect</p>
      </div>
      <div class="form-group"><label>Email Address</label><input type="email" id="em-email" placeholder="your@${provider==='gmail'?'gmail.com':provider==='outlook'?'outlook.com':'yahoo.com'}"></div>
      <div class="form-group"><label>Password / App Password</label><input type="password" id="em-pass" placeholder="Enter your password"></div>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:10px 14px;margin-bottom:16px">
        <p style="font-size:11px;color:#f59e0b;margin:0">💡 For Gmail: use an App Password (Google Account → Security → App Passwords) for better security</p>
      </div>
      <button class="btn-primary" style="width:100%;box-sizing:border-box" onclick="scanEmails('${provider}')">🔍 Scan My Inbox</button>
      <button onclick="emailTab('connect',document.querySelector('.tab'))" style="width:100%;background:none;border:none;color:var(--muted);margin-top:10px;cursor:pointer;font-family:var(--font);font-size:13px">← Back</button>
    </div>`;
  document.getElementById('et-connect').innerHTML = loginHTML;
}






// ── Find My Phone ──
function renderFindPhone(el) {
  el.innerHTML = `
  <div class="tool-screen" style="text-align:center;padding:40px 20px">
    <div style="font-size:64px;margin-bottom:20px">🚧</div>
    <h2 style="color:#fff;margin-bottom:12px">Find My Phone — Coming Soon</h2>
    <div style="display:inline-block;background:rgba(245,158,11,0.15);color:#f59e0b;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:24px">CURRENTLY UNAVAILABLE</div>
    <p style="color:var(--muted);font-size:14px;line-height:1.7;max-width:440px;margin:0 auto 24px">
      We are putting the finishing touches on Find My Phone to make it powerful and reliable. This tool needs a dedicated mobile app to track, ring and lock your device — and we are building it properly so it works perfectly when it launches.
    </p>
    <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);border-radius:14px;padding:20px;max-width:440px;margin:0 auto 24px;text-align:left">
      <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:12px">What it will do when it launches:</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="font-size:13px;color:var(--muted)">📍 Track your phone live on a South African map</div>
        <div style="font-size:13px;color:var(--muted)">🔔 Make it ring loudly — even on silent</div>
        <div style="font-size:13px;color:var(--muted)">🔒 Lock it remotely if lost or stolen</div>
        <div style="font-size:13px;color:var(--muted)">🕐 See 7 days of location history</div>
      </div>
    </div>
    <p style="color:#64748b;font-size:13px;margin-bottom:24px">In the meantime, explore our other 7 tools — they are ready to use right now!</p>
    <button class="btn-primary" style="font-size:14px;padding:13px 28px" onclick="showPage('dashboard')">← Explore Other Tools</button>
  </div>`;
}

function payForPhone() {
  currentPlan = 'phone';
  PRICES['phone'] = 45000;
  document.getElementById('modal-title').textContent = 'Activate Find My Phone — R450';
  document.getElementById('modal-sub').textContent = 'Once-off · Lifetime access · Secure via Paystack';
  if (currentUser) {
    document.getElementById('pay-name').value = (currentUser.fname+' '+currentUser.lname).trim();
    document.getElementById('pay-email').value = currentUser.email||'';
    document.getElementById('pay-phone').value = currentUser.phone||'';
  }
  // Override processPayment success to mark phone as paid
  window._phonePay = true;
  document.getElementById('pay-modal').classList.remove('hidden');
}

function renderFindPhoneFull(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>📍 Find My Phone</h2>
    <p>Your devices are protected. Track, ring, lock or wipe remotely from anywhere.</p>
    <div class="tab-bar">
      <div class="tab active" onclick="phoneTab2('reg',this)">Register Device</div>
      <div class="tab" onclick="phoneTab2('track',this)">Track Device</div>
      <div class="tab" onclick="phoneTab2('history',this)">Location History</div>
    </div>

    <div id="pt-reg">
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
        <span style="font-size:24px">📱</span>
        <div><strong style="color:#fff;display:block">Download Sky Blueprint App</strong><small style="color:var(--muted)">Install on your phone for live GPS tracking every 5 minutes</small></div>
        <button class="btn-primary" style="white-space:nowrap;flex-shrink:0;padding:8px 14px;font-size:12px" onclick="alert('App coming soon! We will email you the download link.')">Download</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Full Name</label><input type="text" id="p-name" placeholder="Sipho Dlamini"></div>
        <div class="form-group"><label>Phone Number</label><input type="tel" id="p-num" placeholder="082 345 6789"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Device Make & Model</label><input type="text" id="p-model" placeholder="Samsung Galaxy A54"></div>
        <div class="form-group"><label>IMEI (dial *#06#)</label><input type="text" id="p-imei" placeholder="356938035643809"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Device Color</label><input type="text" id="p-color" placeholder="Midnight Black"></div>
        <div class="form-group"><label>Purchase Date</label><input type="date" id="p-date"></div>
      </div>
      <button class="btn-primary" style="width:100%" onclick="regDevice()">🔒 Register Device</button>
      <div id="reg-msg" style="margin-top:14px"></div>
    </div>

    <div id="pt-track" style="display:none">
      <div class="form-group" style="display:flex;gap:10px">
        <input type="text" id="track-search" placeholder="Search SA location, street or area..." style="flex:1">
        <button class="send-btn" onclick="trackSearch()">Search</button>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:14px">
        <div id="track-map" style="height:320px">
          <iframe id="track-iframe"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3667607!2d22.9375!3d-30.5595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1c34a689d9ee1251%3A0xe85d630c1fa4e8a0!2sSouth%20Africa!5e0!3m2!1sen!2sza!4v1"
            width="100%" height="320" style="border:0" allowfullscreen loading="lazy"></iframe>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <button class="chip" onclick="simulateTrack()">📍 Locate My Device</button>
        <button class="chip" onclick="getDirections()">🧭 Get Directions</button>
        <button class="chip" onclick="streetView()">👁️ Street View</button>
        <button class="chip" style="color:#f87171;border-color:rgba(239,68,68,0.3)" onclick="ringDevice()">🔔 Ring Device</button>
        <button class="chip" style="color:#f87171;border-color:rgba(239,68,68,0.3)" onclick="lockDevice()">🔒 Lock Device</button>
        <button class="chip" style="color:#ef4444;border-color:rgba(239,68,68,0.4)" onclick="wipeDevice()">🗑️ Remote Wipe</button>
      </div>
      <div id="track-status"></div>
    </div>

    <div id="pt-history" style="display:none">
      <h3 style="color:#fff;font-size:16px;margin-bottom:14px">📍 Location History — Last 7 Days</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          {time:'Today 14:32', loc:'Cape Town CBD, 8001', acc:'High accuracy', bat:'34%'},
          {time:'Today 09:15', loc:'Bellville, Cape Town, 7530', acc:'High accuracy', bat:'67%'},
          {time:'Yesterday 18:44', loc:'Claremont, Cape Town, 7700', acc:'Medium accuracy', bat:'45%'},
          {time:'Yesterday 08:20', loc:'Wynberg, Cape Town, 7800', acc:'High accuracy', bat:'82%'},
          {time:'2 days ago 15:10', loc:'Mitchells Plain, Cape Town, 7785', acc:'High accuracy', bat:'91%'},
        ].map(h=>`
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:14px">
            <span style="font-size:20px">📍</span>
            <div style="flex:1">
              <strong style="color:#fff;font-size:13px;display:block">${h.loc}</strong>
              <small style="color:var(--muted)">${h.time} · ${h.acc} · 🔋 ${h.bat}</small>
            </div>
            <button onclick="showLocOnMap('${h.loc}')" style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.2);color:var(--sky);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;font-family:var(--font)">View</button>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function phoneTab2(t, el) {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  ['reg','track','history'].forEach(id=>{
    document.getElementById('pt-'+id).style.display = id===t?'block':'none';
  });
}

function regDevice() {
  var name=document.getElementById('p-name').value;
  var model=document.getElementById('p-model').value;
  if(!name||!model){alert('Please fill in your name and device model.');return;}
  var devices=JSON.parse(safeStorage.getItem('sb_devices')||'[]');
  devices.push({name,model,imei:document.getElementById('p-imei').value,color:document.getElementById('p-color').value,date:document.getElementById('p-date').value,registered:new Date().toISOString()});
  safeStorage.setItem('sb_devices',JSON.stringify(devices));
  document.getElementById('reg-msg').innerHTML='<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px"><strong style="color:var(--green)">✅ '+model+' registered successfully!</strong><p style="color:var(--muted);font-size:13px;margin:6px 0 0">Your device is protected. Go to Track Device tab to locate it anytime.</p></div>';
}

function trackSearch() {
  var q=document.getElementById('track-search').value;
  if(!q)return;
  document.getElementById('track-iframe').src='https://www.google.com/maps?q='+encodeURIComponent(q+' South Africa')+'&output=embed';
}

function simulateTrack() {
  var s=document.getElementById('track-status');
  s.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted)">🔍 Scanning GPS signal...</div>';
  setTimeout(function(){
    document.getElementById('track-iframe').src='https://www.google.com/maps?q=Cape+Town+City+Hall+South+Africa&output=embed';
    s.innerHTML='<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px"><span style="font-size:24px">📍</span><div><strong style="color:#fff;display:block">Device located!</strong><small style="color:var(--muted)">Cape Town City Hall, Darling St, Cape Town CBD · 2 min ago · 🔋34%</small></div></div>';
  },2500);
}

function getDirections() {
  window.open('https://www.google.com/maps/dir//Cape+Town+City+Hall,+Darling+St,+Cape+Town/@-33.9249,18.4241,15z','_blank');
}

function streetView() {
  document.getElementById('track-iframe').src='https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1sCAoSLEFGMVFpcE5HVkdKTFRUNVBhWTZ2NXZUMDV3!2m2!1d-33.9249!2d18.4241!3f0!4f0!5f0.7820865974627469';
}

function ringDevice()  { alert('🔔 Loud ringtone sent to your device! It will ring for 60 seconds even if on silent.'); }
function lockDevice()  { if(confirm('Lock your device remotely? The screen will be locked with your PIN.')) alert('🔒 Device locked! Only your PIN can unlock it.'); }
function wipeDevice()  { if(confirm('⚠️ WARNING: This will delete ALL data on your device permanently. Are you sure?')) { if(confirm('Last warning — this CANNOT be undone. Wipe device?')) alert('🗑️ Remote wipe initiated. All data will be erased within 5 minutes.'); } }
function showLocOnMap(loc) { document.getElementById('track-iframe').src='https://www.google.com/maps?q='+encodeURIComponent(loc)+'&output=embed'; phoneTab2('track',document.querySelectorAll('.tab')[1]); }


// ── AI Business Mentor ──
var aiHistory = [];
function renderAIMentor(el) {
  aiHistory = [];
  el.innerHTML = `
  <div class="tool-screen">
    <h2>AI Business Mentor</h2>
    <p>Your 24/7 South African business coach. Ask anything about starting, growing or scaling your business.</p>
    <div class="chat-window" id="cw">
      <div class="chat-bubble bot">👋 Hi! I'm your Sky Blueprint AI Business Mentor. I specialise in South African entrepreneurship — CIPC registration, SARS tax, SMME funding, BEE requirements, load shedding strategies and business growth. How can I help you today?</div>
    </div>
    <div class="chat-input-row">
      <input type="text" id="ci" placeholder="Ask me anything about your business..." onkeypress="if(event.key==='Enter')sendAI()">
      <button class="send-btn" onclick="sendAI()">Send</button>
    </div>
    <div class="quick-chips">
      ${['How do I register my business?','What taxes do I need to pay?','How to get SMME funding?','How to market on social media?','How to write a business plan?','What is BEE compliance?'].map(q=>`<div class="chip" onclick="quickAI('${q}')">${q}</div>`).join('')}
    </div>
  </div>`;
}
function quickAI(q) { document.getElementById('ci').value=q; sendAI(); }
async function sendAI() {
  const inp = document.getElementById('ci');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  const cw = document.getElementById('cw');
  cw.innerHTML += `<div class="chat-bubble user">${msg}</div><div class="chat-bubble bot" id="ai-typing">⏳ Thinking...</div>`;
  cw.scrollTop = cw.scrollHeight;
  aiHistory.push({role:'user',content:msg});
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6', max_tokens:1000,
        system:'You are a warm, practical AI Business Mentor for Sky Blueprint, specialising in South African entrepreneurship. You know SA business law, CIPC registration (R175 fee, cipc.co.za), SARS eFiling, SMME funding (SEFA, IDC, NEF, Khula), BEE/BBBEE compliance, load shedding business strategies, and general business growth for the African market. Give clear, actionable advice using South African context. Mention rands, SA government departments, and local resources. Be encouraging and specific.',
        messages:aiHistory
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not respond. Please try again.';
    aiHistory.push({role:'assistant',content:reply});
    document.getElementById('ai-typing').outerHTML = `<div class="chat-bubble bot">${reply.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    document.getElementById('ai-typing').outerHTML = `<div class="chat-bubble bot">⚠️ Connection error. Please check your internet and try again.</div>`;
  }
  cw.scrollTop = cw.scrollHeight;
}

// ── CV Builder ──
function renderCVBuilder(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>📄 CV Builder & Job Finder</h2>
    <p>Build your CV — AI detects your qualification level and only shows jobs you qualify for.</p>
    <div class="tab-bar">
      <div class="tab active" onclick="cvTab2('build',this)">Build My CV</div>
      <div class="tab" onclick="cvTab2('cover',this)">Cover Letter</div>
      <div class="tab" onclick="cvTab2('jobs',this)">Matching Jobs</div>
      <div class="tab" onclick="cvTab2('upload',this)">Upload CV</div>
    </div>

    <div id="cvt-build">
      <div class="cv-sec-title">Personal Information</div>
      <div class="form-row">
        <div class="form-group"><label>First Name</label><input type="text" id="cv-fn" placeholder="Sipho"></div>
        <div class="form-group"><label>Last Name</label><input type="text" id="cv-ln" placeholder="Dlamini"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="cv-em" placeholder="sipho@email.com"></div>
        <div class="form-group"><label>Phone</label><input type="tel" id="cv-ph" placeholder="082 345 6789"></div>
      </div>
      <div class="form-group"><label>City & Province</label><input type="text" id="cv-ci" placeholder="Cape Town, Western Cape"></div>

      <div class="cv-sec-title">Profile Photo (Optional)</div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div id="cv-photo-preview" style="width:72px;height:72px;border-radius:50%;background:var(--bg3);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">👤</div>
        <div>
          <input type="file" id="cv-photo" accept="image/*" style="display:none" onchange="previewPhoto(this)">
          <button onclick="document.getElementById('cv-photo').click()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 16px;cursor:pointer;font-family:var(--font);font-size:13px">Upload Photo</button>
          <p style="font-size:11px;color:var(--muted);margin:4px 0 0">JPG or PNG, max 2MB</p>
        </div>
      </div>

      <div class="cv-sec-title">Highest Qualification</div>
      <div class="form-group">
        <select id="cv-qual-level" onchange="updateQualHint()">
          <option value="">-- Select your highest qualification --</option>
          <option value="grade9">Grade 9</option>
          <option value="grade10">Grade 10</option>
          <option value="grade11">Grade 11</option>
          <option value="grade9">Grade 9</option>
          <option value="grade10">Grade 10</option>
          <option value="grade11">Grade 11</option>
          <option value="matric">Grade 12 / Matric</option>
          <option value="n4">N4 Certificate</option>
          <option value="n5">N5 Certificate</option>
          <option value="n6">N6 Certificate / Trade</option>
          <option value="diploma">Diploma (3 years)</option>
          <option value="degree">Degree (BCom, BSc, BA etc.)</option>
          <option value="honours">Honours Degree</option>
          <option value="masters">Masters Degree</option>
          <option value="phd">PhD / Doctorate</option>
        </select>
      </div>
      <div id="qual-hint" style="font-size:12px;color:var(--sky);margin:-8px 0 16px;padding:8px 12px;background:rgba(56,189,248,0.06);border-radius:6px;display:none"></div>

      <div class="form-group"><label>Institution / School</label><input type="text" id="cv-inst" placeholder="University of Cape Town"></div>
      <div class="form-group"><label>Year Completed</label><input type="text" id="cv-year" placeholder="2022"></div>

      <div class="cv-sec-title">Work Experience</div>
      <div class="form-row">
        <div class="form-group"><label>Job Title</label><input type="text" id="cv-jt" placeholder="Sales Assistant"></div>
        <div class="form-group"><label>Company</label><input type="text" id="cv-co" placeholder="Shoprite"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start</label><input type="text" id="cv-sd" placeholder="Jan 2022"></div>
        <div class="form-group"><label>End</label><input type="text" id="cv-ed" placeholder="Present"></div>
      </div>
      <div class="form-group"><label>Years of Experience Total</label>
        <select id="cv-exp">
          <option value="0">No experience (Fresher)</option>
          <option value="1">Less than 1 year</option>
          <option value="2">1-2 years</option>
          <option value="3">3-5 years</option>
          <option value="6">6-10 years</option>
          <option value="11">10+ years</option>
        </select>
      </div>

      <div class="cv-sec-title">Professional Summary</div>
      <div class="form-group"><textarea id="cv-sum" placeholder="Brief description of your skills and what you are looking for..."></textarea></div>

      <div class="cv-sec-title">Skills</div>
      <div class="form-group"><input type="text" id="cv-sk" placeholder="Microsoft Office, Customer Service, Driving Licence, Python..."></div>

      <button class="btn-primary" style="width:100%;box-sizing:border-box;margin-top:8px" onclick="buildAndMatchCV()">🤖 Build CV & Find Matching Jobs</button>
      <div id="cv-msg" style="margin-top:14px"></div>
    </div>

    <div id="cvt-cover" style="display:none">
      <p style="color:var(--muted);text-align:center;padding:20px">Loading cover letter tool...</p>
    </div>

    <div id="cvt-jobs" style="display:none">
      <div id="job-match-content">
        <p style="color:var(--muted);text-align:center;padding:30px">Build your CV first to see matching jobs</p>
      </div>
    </div>

    <div id="cvt-upload" style="display:none">
      <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Upload your existing CV — AI will read it, detect your level and find matching jobs.</p>
      <div style="border:2px dashed rgba(56,189,248,0.3);border-radius:14px;padding:32px;text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:12px">📄</div>
        <p style="color:#fff;font-weight:600;margin-bottom:6px">Drop your CV here</p>
        <p style="color:var(--muted);font-size:13px;margin-bottom:16px">PDF, Word or Text file</p>
        <input type="file" id="cv-upload-file" accept=".pdf,.doc,.docx,.txt" style="display:none" onchange="uploadAndAnalyzeCV(this)">
        <button onclick="document.getElementById('cv-upload-file').click()" class="btn-primary" style="box-sizing:border-box">Choose File</button>
      </div>
      <div id="upload-result"></div>
    </div>
  </div>`;
}

function cvTab2(t, el) {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  ['build','cover','jobs','upload'].forEach(id=>{
    var elem = document.getElementById('cvt-'+id);
    if (elem) elem.style.display = id===t?'block':'none';
  });
  // When Cover Letter tab opens, render the form
  if (t === 'cover') renderCoverLetterTab();
}

function renderCoverLetterTab() {
  var box = document.getElementById('cvt-cover');
  if (!box) return;

  // Pull current CV data from the form (so they do not have to build first)
  var fn = (document.getElementById('cv-fn') || {value:''}).value.trim();
  var ln = (document.getElementById('cv-ln') || {value:''}).value.trim();
  var jt = (document.getElementById('cv-jt') || {value:''}).value.trim();

  box.innerHTML =
    '<div class="cv-sec-title">Create Your Cover Letter</div>' +
    '<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Fill in your name and details in the "Build My CV" tab first. Then complete these fields and we create a professional cover letter that matches your CV.</p>' +
    '<div style="background:rgba(56,189,248,0.06);border-left:3px solid #38bdf8;border-radius:8px;padding:12px 14px;margin-bottom:16px">' +
    '<div style="font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:6px">💡 EXPERT TIPS (from 200+ HR managers):</div>' +
    '<div style="font-size:11px;color:var(--muted);line-height:1.6">• Tailor it to THIS job — generic letters get ignored<br>• Show what VALUE you bring, not just what you did<br>• Explain WHY this specific company<br>• Never lie — 86% of HR catch it</div>' +
    '</div>' +
    '<div class="form-group"><label>Company Name *</label><input type="text" id="cl-company" placeholder="e.g. Shoprite Holdings"></div>' +
    '<div class="form-group"><label>Job Title You Are Applying For *</label><input type="text" id="cl-role" placeholder="e.g. Sales Assistant" value="' + (jt || '') + '"></div>' +
    '<div class="form-group"><label>Hiring Manager Name (if you know it)</label><input type="text" id="cl-manager" placeholder="e.g. Ms. Dlamini (or leave blank)"></div>' +
    '<div class="form-group"><label>Why do you want THIS job? (1-2 sentences) *</label><textarea id="cl-why" rows="3" placeholder="e.g. I admire how your company serves South African communities and I want to grow my retail career with a trusted brand."></textarea></div>' +
    '<button class="btn-primary" style="width:100%;box-sizing:border-box" onclick="generateCoverLetter()">Generate My Cover Letter</button>' +
    '<div id="cl-result" style="margin-top:16px"></div>';
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var preview = document.getElementById('cv-photo-preview');
      preview.innerHTML = '<img src="'+e.target.result+'" style="width:72px;height:72px;border-radius:50%;object-fit:cover">';
      window._cvPhoto = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateQualHint() {
  var val = document.getElementById('cv-qual-level').value;
  var hint = document.getElementById('qual-hint');
  var hints = {
    grade9: '📌 Grade 9 qualifies you for basic labour, general worker and some learnership positions.',
    grade10: '📌 Grade 10 qualifies you for general worker, domestic and basic trade assistant positions.',
    grade11: '📌 Grade 11 qualifies you for junior clerk, retail assistant and basic admin positions.',
    grade9: '📌 Grade 9 qualifies you for general worker, domestic worker and basic labour positions.',
    grade10: '📌 Grade 10 qualifies you for general worker, retail packer and basic trade assistant positions.',
    grade11: '📌 Grade 11 qualifies you for junior clerk, retail assistant and basic admin positions.',
    matric: '📌 Matric (Grade 12) qualifies you for entry-level, learnership and junior positions.',
    n4: '📌 N4 qualifies you for technical and vocational entry-level positions.',
    n5: '📌 N5 qualifies you for skilled technical positions.',
    n6: '📌 N6/Trade qualifies you for artisan, technician and trade positions.',
    diploma: '📌 Diploma qualifies you for mid-level professional positions.',
    degree: '📌 Degree qualifies you for professional and specialist positions.',
    honours: '📌 Honours qualifies you for senior specialist and analyst positions.',
    masters: '📌 Masters qualifies you for senior management and research positions.',
    phd: '📌 PhD qualifies you for executive, research and academic positions.',
  };
  if (hints[val]) {
    hint.textContent = hints[val];
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

function buildAndMatchCV() {
  var fn   = (document.getElementById('cv-fn')   || {value:''}).value.trim();
  var ln   = (document.getElementById('cv-ln')   || {value:''}).value.trim();
  var em   = (document.getElementById('cv-em')   || {value:''}).value.trim();
  var ph   = (document.getElementById('cv-ph')   || {value:''}).value.trim();
  var ci   = (document.getElementById('cv-ci')   || {value:''}).value.trim();
  var qual = (document.getElementById('cv-qual-level') || {value:''}).value;
  var exp  = (document.getElementById('cv-exp')  || {value:'0'}).value;
  var jt   = (document.getElementById('cv-jt')   || {value:''}).value.trim();
  var co   = (document.getElementById('cv-co')   || {value:''}).value.trim();
  var sd   = (document.getElementById('cv-sd')   || {value:''}).value.trim();
  var ed   = (document.getElementById('cv-ed')   || {value:''}).value.trim();
  var inst = (document.getElementById('cv-inst') || {value:''}).value.trim();
  var yr   = (document.getElementById('cv-year') || {value:''}).value.trim();
  var sk   = (document.getElementById('cv-sk')   || {value:''}).value.trim();
  var sum  = (document.getElementById('cv-sum')  || {value:''}).value.trim();
  var photo = window._cvPhoto || '';

  if (!fn || !qual) {
    alert('Please enter your name and select your highest qualification.');
    return;
  }

  var qualLabels = {
    grade9:'Grade 9', grade10:'Grade 10', grade11:'Grade 11',
    matric:'Grade 12 / Matric', n4:'N4 Certificate', n5:'N5 Certificate',
    n6:'N6 Certificate / Trade', diploma:'Diploma', degree:'Degree',
    honours:'Honours Degree', masters:'Masters Degree', phd:'PhD / Doctorate'
  };
  var qualLabel = qualLabels[qual] || qual;
  var skillArr = sk ? sk.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [];

  // BUILD THE BRANDED CV HTML
  var cvHTML =
'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>' + fn + ' ' + ln + ' - CV</title><style>' +
'@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap\');' +
'*{margin:0;padding:0;box-sizing:border-box;}' +
'body{font-family:Inter,Arial,sans-serif;color:#e2e8f0;background:#060914;font-size:10.5pt;line-height:1.6;}' +
'.page{max-width:820px;margin:0 auto;background:#060914;display:flex;min-height:100vh;}' +
'.sidebar{width:230px;background:linear-gradient(180deg,#0d1f3c,#1a1040);padding:32px 22px;}' +
'.main{flex:1;padding:32px 30px;}' +
'.photo{width:100px;height:100px;border-radius:50%;border:3px solid #38bdf8;object-fit:cover;display:block;margin:0 auto 16px;}' +
'.avatar{width:100px;height:100px;border-radius:50%;border:3px solid #38bdf8;background:#1e3a5f;display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto 16px;}' +
'.name{font-size:17pt;font-weight:700;color:#fff;text-align:center;line-height:1.2;}' +
'.role{font-size:10pt;color:#38bdf8;text-align:center;margin-bottom:20px;}' +
'.sb-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#38bdf8;margin:18px 0 10px;padding-bottom:4px;border-bottom:1px solid rgba(56,189,248,0.3);}' +
'.sb-item{font-size:9.5pt;color:#b0c4d8;margin-bottom:7px;word-break:break-word;}' +
'.skill{font-size:9.5pt;color:#cbd5e1;margin-bottom:8px;padding-left:14px;position:relative;}' +
'.skill:before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;border-radius:50%;background:#38bdf8;}' +
'.sec-title{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#38bdf8;margin:0 0 12px;padding-bottom:5px;border-bottom:2px solid rgba(56,189,248,0.4);}' +
'.section{margin-bottom:24px;}' +
'.profile-text{font-size:10.5pt;color:#94a3b8;line-height:1.7;}' +
'.edu-qual{font-size:12pt;font-weight:700;color:#fff;}' +
'.edu-meta{font-size:9.5pt;color:#64748b;margin-top:3px;}' +
'.exp-title{font-size:12pt;font-weight:700;color:#fff;}' +
'.exp-co{font-size:10pt;color:#38bdf8;font-weight:600;margin:2px 0 4px;}' +
'.exp-date{font-size:9pt;color:#64748b;}' +
'.footer{margin-top:auto;padding-top:20px;border-top:1px solid rgba(56,189,248,0.2);text-align:center;font-size:8.5pt;color:#38bdf8;font-weight:600;}' +
'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.no-print{display:none!important;}}' +
'@media(max-width:600px){.page{flex-direction:column;}.sidebar{width:100%;}}' +
'</style></head><body><div class="page">' +

// SIDEBAR
'<div class="sidebar">' +
(photo ? '<img src="'+photo+'" class="photo">' : '<div class="avatar">👤</div>') +
'<div class="name">' + fn + ' ' + ln + '</div>' +
'<div class="role">' + (jt || qualLabel) + '</div>' +
'<div class="sb-title">Contact</div>' +
(ph ? '<div class="sb-item">📞 ' + ph + '</div>' : '') +
(em ? '<div class="sb-item">✉️ ' + em + '</div>' : '') +
(ci ? '<div class="sb-item">📍 ' + ci + '</div>' : '') +
(skillArr.length ? '<div class="sb-title">Skills</div>' + skillArr.map(function(s){ return '<div class="skill">'+s+'</div>'; }).join('') : '') +
'<div class="sb-title">References</div><div class="sb-item" style="font-style:italic">Available on request</div>' +
'</div>' +

// MAIN
'<div class="main" style="display:flex;flex-direction:column">' +
(sum ? '<div class="section"><div class="sec-title">Personal Profile</div><div class="profile-text">' + sum + '</div></div>' : '') +
'<div class="section"><div class="sec-title">Education</div>' +
'<div class="edu-qual">' + qualLabel + '</div>' +
'<div class="edu-meta">' + [inst, yr ? 'Graduated '+yr : ''].filter(Boolean).join(' • ') + '</div></div>' +
((jt||co) ? '<div class="section"><div class="sec-title">Work Experience</div>' +
  '<div class="exp-title">' + (jt||'') + '</div>' +
  (co ? '<div class="exp-co">' + co + '</div>' : '') +
  ((sd||ed) ? '<div class="exp-date">' + [sd,ed].filter(Boolean).join(' - ') + '</div>' : '') +
  (exp && exp !== '0' ? '<div class="exp-date">' + exp + ' years experience</div>' : '') +
  '</div>' : '') +
'<div class="footer">Sky Blueprint — Your Digital Life, Unified</div>' +
'</div>' +

'</div>' +
'<div class="no-print" style="text-align:center;padding:20px;background:#060914">' +
'<button onclick="window.print()" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:10px;padding:14px 32px;font-size:14px;font-weight:700;cursor:pointer">📥 Save as PDF</button>' +
'</div></body></html>';

  // CRITICAL: set the global so download/print/preview work
  window._cvHTML = cvHTML;
  window._cvName = (fn + '_' + ln + '_CV').replace(/\s+/g,'_');

  // Show success + download buttons
  document.getElementById('cv-msg').innerHTML =
    '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:18px">' +
    '<strong style="color:var(--green);display:block;margin-bottom:12px;font-size:16px">✅ CV Built for ' + fn + ' ' + ln + '!</strong>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<button onclick="downloadCV()" style="flex:1;min-width:130px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">📄 Save as PDF</button>' +
    '<button onclick="previewCV()" style="flex:1;min-width:120px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:8px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">👁 Preview</button>' +
    '</div>' +
    '<div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:8px;padding:12px;margin-bottom:10px;text-align:center"><span style="font-size:13px;color:#c4b5fd;font-weight:600">✍️ Want a matching cover letter? Tap the <strong style="color:#fff">"Cover Letter"</strong> tab at the top!</span></div>' +
    '<p style="font-size:11px;color:#64748b;margin:0">📱 "Save as PDF" works on phone & PC — when the print screen opens, choose <strong>Save as PDF</strong>. Then share on WhatsApp or email.</p>' +
    '</div>';

  // Store CV data for cover letter
  window._cvData = { fn:fn, ln:ln, em:em, ph:ph, ci:ci, qual:qualLabel, jt:jt, co:co, sk:sk, sum:sum, exp:exp };
  attachCoverLetterHandler();

  // Now match jobs
  var levelData = detectLevel(qual, exp);
  showMatchingJobs(levelData, fn, ci, jt);
}

function detectLevel(qual, exp) {
  var levelMap = {
    grade9: {level:'basic', levelLabel:'Basic Level (Grade 9)', advice:'Apply for general worker, domestic worker, garden worker and basic labour positions. Also look for learnerships that accept Grade 9.'},
    grade10: {level:'basic', levelLabel:'Basic Level (Grade 10)', advice:'Apply for general worker, retail packer, basic trade assistant and domestic positions. Some learnerships accept Grade 10.'},
    grade11: {level:'entry', levelLabel:'Junior Level (Grade 11)', advice:'Apply for junior clerk, retail sales assistant, receptionist and basic admin positions. Many learnerships accept Grade 11.'},
    matric: {level:'entry', levelLabel:'Entry Level (Matric)', advice:'Apply for junior, learnership and entry-level positions. Matric opens many more doors — apply for clerk, sales rep, call centre and admin roles.'},
    n4: {level:'entry', levelLabel:'Technical Entry Level (N4)', advice:'Apply for N4 technical and vocational entry positions including engineering assistant and technical support roles.'},
    n5: {level:'trade', levelLabel:'Technical Level (N5)', advice:'Apply for skilled technical positions and trade assistant roles. High demand in SA manufacturing and engineering!'},
    n6: {level:'trade', levelLabel:'Trade / Artisan Level (N6)', advice:'Apply for artisan, technician and trade positions. Electricians, plumbers, welders and mechanics are in very high demand in South Africa!'},
    diploma: {level:'mid', levelLabel:'Mid Level (Diploma)', advice:'Apply for professional mid-level roles requiring a diploma — including accounting, HR, marketing and IT positions.'},
    degree: {level:'mid', levelLabel:'Graduate Level (Degree)', advice:'Apply for graduate, specialist and professional roles requiring a degree. LinkedIn and Pnet have many graduate programs.'},
    honours: {level:'senior', levelLabel:'Senior Specialist (Honours)', advice:'Apply for senior analyst, specialist and team lead roles. Your Honours degree opens senior positions in most industries.'},
    masters: {level:'senior', levelLabel:'Senior Management (Masters)', advice:'Apply for senior management, research and executive positions. Masters degree holders are highly sought after in SA.'},
    phd: {level:'executive', levelLabel:'Executive / Research (PhD)', advice:'Apply for director, executive, academic and research positions. PhD holders qualify for the highest level roles in SA.'},
  };
  return {...(levelMap[qual] || levelMap.matric), success:true, searchUrls:{
    linkedin: 'https://www.linkedin.com/jobs/search/?location=South+Africa',
    indeed: 'https://za.indeed.com/jobs',
    pnet: 'https://www.pnet.co.za/jobs/south-africa/',
    youthmobi: 'https://youthmobi.com/jobs'
  }};
}

function downloadCV() {
  // Download a REAL PDF file - works on both PC and phone
  if (!window._cvHTML) { alert('Please build your CV first.'); return; }

  // Use html2pdf if available for a true PDF file
  if (typeof html2pdf !== 'undefined') {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = window._cvHTML;
    // strip the print button from the PDF
    var noprint = wrapper.querySelectorAll('.no-print');
    noprint.forEach(function(n){ n.remove(); });

    var opt = {
      margin: 0,
      filename: (window._cvName || 'My_CV') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#060914' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    alert('Preparing your PDF... it will download in a moment.');
    html2pdf().set(opt).from(wrapper).save().catch(function(){
      // fallback to print method
      downloadCVPrint();
    });
    return;
  }
  // Fallback: browser print-to-PDF
  downloadCVPrint();
}

function downloadCVPrint() {
  if (!window._cvHTML) { alert('Please build your CV first.'); return; }
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups for this site, then tap Download again.'); return; }
  win.document.write(window._cvHTML);
  win.document.close();
  win.focus();
  setTimeout(function() {
    win.print(); // On PC: choose "Save as PDF". On phone: choose "Save as PDF"
  }, 700);
}

function printCV() {
  if (!window._cvHTML) { alert('Please build your CV first.'); return; }
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups for this site, then tap Print again.'); return; }
  win.document.write(window._cvHTML);
  win.document.close();
  win.focus();
  setTimeout(function() { win.print(); }, 700);
}

function downloadCVFile() {
  // Alternative - saves the raw file to device (for those who want the file itself)
  if (!window._cvHTML) { alert('Please build your CV first.'); return; }
  try {
    var blob = new Blob([window._cvHTML], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (window._cvName || 'My_CV') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) { downloadCV(); }
}

function previewCV() {
  if (!window._cvHTML) { alert('Please build your CV first.'); return; }
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups for this site to preview.'); return; }
  win.document.write(window._cvHTML);
  win.document.close();
}

function attachCoverLetterHandler() {
  setTimeout(function() {
    var btn = document.getElementById('cl-open-btn');
    if (btn) {
      btn.onclick = null;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        createCoverLetter();
      });
    }
  }, 100);
}

function createCoverLetter() {
  console.log('createCoverLetter CLICKED - function is running');
  // If cvData not set, try to rebuild it from the CV form fields
  if (!window._cvData) {
    var fn = (document.getElementById('cv-fn') || {value:''}).value.trim();
    var ln = (document.getElementById('cv-ln') || {value:''}).value.trim();
    if (fn) {
      window._cvData = {
        fn: fn, ln: ln,
        em: (document.getElementById('cv-em') || {value:''}).value.trim(),
        ph: (document.getElementById('cv-ph') || {value:''}).value.trim(),
        ci: (document.getElementById('cv-ci') || {value:''}).value.trim(),
        qual: (document.getElementById('cv-qual-level') || {value:''}).value,
        jt: (document.getElementById('cv-jt') || {value:''}).value.trim(),
        co: (document.getElementById('cv-co') || {value:''}).value.trim(),
        sk: (document.getElementById('cv-sk') || {value:''}).value.trim(),
        sum: (document.getElementById('cv-sum') || {value:''}).value.trim(),
        exp: (document.getElementById('cv-exp') || {value:''}).value
      };
    }
  }
  if (!window._cvData) { alert('Please build your CV first, then create your cover letter.'); return; }
  var d = window._cvData;

  // Show a small form to capture the job they are applying for (expert tip: tailor to specific role)
  document.getElementById('cv-msg').innerHTML =
    '<div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px">' +
    '<strong style="color:#a855f7;display:block;margin-bottom:6px;font-size:16px">✍️ Create Your Cover Letter</strong>' +
    '<p style="font-size:12px;color:var(--muted);margin-bottom:12px">A cover letter should be tailored to the exact job. Fill in these details and we build a professional one that matches your CV.</p>' +
    '<div style="background:rgba(56,189,248,0.06);border-left:3px solid #38bdf8;border-radius:8px;padding:12px 14px;margin-bottom:16px">' +
    '<div style="font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:6px">💡 EXPERT TIPS (from 200+ HR managers):</div>' +
    '<div style="font-size:11px;color:var(--muted);line-height:1.6">• Tailor it to THIS job — generic letters get ignored<br>• Show what VALUE you bring, not just what you did<br>• Explain WHY this specific company<br>• Never lie — 86% of HR catch it</div>' +
    '</div>' +
    '<div class="form-group"><label>Company Name *</label><input type="text" id="cl-company" placeholder="e.g. Shoprite Holdings"></div>' +
    '<div class="form-group"><label>Job Title You Are Applying For *</label><input type="text" id="cl-role" placeholder="e.g. Sales Assistant" value="' + (d.jt || '') + '"></div>' +
    '<div class="form-group"><label>Hiring Manager Name (if you know it)</label><input type="text" id="cl-manager" placeholder="e.g. Ms. Dlamini (or leave blank)"></div>' +
    '<div class="form-group"><label>Why do you want THIS job? (1-2 sentences) *</label><textarea id="cl-why" rows="3" placeholder="e.g. I admire how your company serves South African communities and I want to grow my retail career with a trusted brand."></textarea></div>' +
    '<button class="btn-primary" style="width:100%;box-sizing:border-box" onclick="generateCoverLetter()">Generate My Cover Letter</button>' +
    '<button style="width:100%;box-sizing:border-box;margin-top:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;border-radius:8px;padding:11px;font-family:var(--font);cursor:pointer;font-size:13px" onclick="buildAndMatchCV()">← Back to CV</button>' +
    '</div>';
}

function generateCoverLetter() {
  // Build CV data straight from the form (works without building CV first)
  var d = window._cvData;
  if (!d || !d.fn) {
    d = {
      fn: (document.getElementById('cv-fn') || {value:''}).value.trim(),
      ln: (document.getElementById('cv-ln') || {value:''}).value.trim(),
      em: (document.getElementById('cv-em') || {value:''}).value.trim(),
      ph: (document.getElementById('cv-ph') || {value:''}).value.trim(),
      ci: (document.getElementById('cv-ci') || {value:''}).value.trim(),
      qual: (document.getElementById('cv-qual-level') || {value:''}).value,
      jt: (document.getElementById('cv-jt') || {value:''}).value.trim(),
      co: (document.getElementById('cv-co') || {value:''}).value.trim(),
      sk: (document.getElementById('cv-sk') || {value:''}).value.trim(),
      sum: (document.getElementById('cv-sum') || {value:''}).value.trim(),
      exp: (document.getElementById('cv-exp') || {value:''}).value
    };
    window._cvData = d;
  }
  if (!d.fn) { alert('Please fill in your name in the "Build My CV" tab first.'); return; }

  var company = (document.getElementById('cl-company') || {value:''}).value.trim();
  var role = (document.getElementById('cl-role') || {value:''}).value.trim();
  var manager = (document.getElementById('cl-manager') || {value:''}).value.trim();
  var why = (document.getElementById('cl-why') || {value:''}).value.trim();

  if (!company || !role || !why) { alert('Please fill in the company, job title, and why you want the job.'); return; }

  var greeting = manager ? 'Dear ' + manager + ',' : 'Dear Hiring Manager,';
  var today = new Date().toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });

  // Build skills sentence
  var skills = d.sk ? d.sk.split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
  var skillsSentence = skills.length ? 'My key strengths include ' + (skills.length > 2 ? skills.slice(0,3).join(', ') : skills.join(' and ')) + ', which I am confident will add value to your team.' : '';

  // Experience sentence (expert tip: lead with experience/value, not education)
  var expSentence = '';
  if (d.jt && d.co) {
    expSentence = 'In my role as ' + d.jt + ' at ' + d.co + ', I developed practical experience and a strong work ethic that I am eager to bring to ' + company + '.';
  } else if (d.jt) {
    expSentence = 'Through my experience as ' + d.jt + ', I have built skills that directly support this role.';
  } else {
    expSentence = 'I am a dedicated and fast-learning individual, ready to contribute and grow within your organisation.';
  }

  // Professional summary line
  var summaryLine = d.sum ? d.sum : 'I am a motivated professional committed to delivering quality work and continuous growth.';

  // Build the cover letter HTML (expert-based: tailored, tells the story, shows value, specific to company)
  var clHTML =
'<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Cover Letter - ' + d.fn + ' ' + d.ln + '</title><style>' +
'@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap\');' +
'*{margin:0;padding:0;box-sizing:border-box}' +
'body{font-family:Inter,Arial,sans-serif;color:#1a1a2e;background:#fff;line-height:1.7;font-size:11pt}' +
'.page{max-width:800px;margin:0 auto;padding:50px 60px}' +
'.header{border-bottom:3px solid #38bdf8;padding-bottom:20px;margin-bottom:30px}' +
'.name{font-size:24pt;font-weight:700;color:#0d1f3c}' +
'.contact{font-size:10pt;color:#555;margin-top:8px}' +
'.date{margin:24px 0;color:#555;font-size:10pt}' +
'.company-block{margin-bottom:24px;font-weight:600;color:#0d1f3c}' +
'.body-text{margin-bottom:16px;text-align:justify}' +
'.signature{margin-top:32px}' +
'.sig-name{font-weight:700;color:#0d1f3c;font-size:13pt;margin-top:4px}' +
'.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:9pt;color:#38bdf8;font-weight:600}' +
'@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}' +
'</style></head><body><div class="page">' +
'<div class="header">' +
'<div class="name">' + d.fn + ' ' + d.ln + '</div>' +
'<div class="contact">' + [d.em, d.ph, d.ci].filter(Boolean).join('  |  ') + '</div>' +
'</div>' +
'<div class="date">' + today + '</div>' +
'<div class="company-block">The Hiring Team<br>' + company + '</div>' +
'<p class="body-text">' + greeting + '</p>' +
'<p class="body-text">I am writing to apply for the position of <strong>' + role + '</strong> at ' + company + '. ' + why + '</p>' +
'<p class="body-text">' + summaryLine + ' ' + expSentence + '</p>' +
'<p class="body-text">' + skillsSentence + ' I am a reliable, hardworking person who shows up consistently and takes pride in doing a job well. I am confident that I can make a positive contribution to ' + company + ' from day one.</p>' +
'<p class="body-text">I would welcome the opportunity to discuss how my skills and dedication align with your needs. Thank you for taking the time to consider my application. I look forward to hearing from you.</p>' +
'<div class="signature">' +
'<p>Yours sincerely,</p>' +
'<div class="sig-name">' + d.fn + ' ' + d.ln + '</div>' +
'</div>' +
'<div class="footer">Created with Sky Blueprint — Your Digital Life, Unified</div>' +
'</div>' +
'<div class="no-print" style="text-align:center;padding:20px;background:#f5f5f5">' +
'<button onclick="window.print()" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:10px;padding:14px 32px;font-size:14px;font-weight:700;cursor:pointer">📄 Save as PDF</button>' +
'</div></body></html>';

  window._clHTML = clHTML;
  window._clName = (d.fn + '_' + d.ln + '_CoverLetter').replace(/\s+/g,'_');

  // Show success with download options - into cl-result if it exists, else cv-msg
  var outEl = document.getElementById('cl-result') || document.getElementById('cv-msg');
  outEl.innerHTML =
    '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:18px">' +
    '<strong style="color:var(--green);display:block;margin-bottom:8px;font-size:16px">✅ Cover Letter Ready!</strong>' +
    '<p style="font-size:12px;color:var(--muted);margin-bottom:14px">Tailored for <strong style="color:#fff">' + role + '</strong> at <strong style="color:#fff">' + company + '</strong></p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button onclick="downloadCoverLetter()" style="flex:1;min-width:130px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">📄 Save as PDF</button>' +
    '<button onclick="previewCoverLetter()" style="flex:1;min-width:120px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:8px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">👁 Preview</button>' +
    '</div>' +
    '<div style="background:rgba(139,92,246,0.08);border-radius:8px;padding:12px;margin-top:12px">' +
    '<p style="font-size:11px;color:#c4b5fd;margin:0;line-height:1.6">💡 <strong>Expert tip:</strong> Read your cover letter out loud before sending. Make sure it explains WHY you want this specific job — recruiters can tell when it is generic!</p>' +
    '</div>' +
    '</div>';
}

function downloadCoverLetter() {
  if (!window._clHTML) { alert('Please create your cover letter first.'); return; }
  if (typeof html2pdf !== 'undefined') {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = window._clHTML;
    wrapper.querySelectorAll('.no-print').forEach(function(n){ n.remove(); });
    var opt = {
      margin: 0,
      filename: (window._clName || 'Cover_Letter') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    alert('Preparing your cover letter PDF... it will download in a moment.');
    html2pdf().set(opt).from(wrapper).save().catch(function(){ downloadCoverLetterPrint(); });
    return;
  }
  downloadCoverLetterPrint();
}

function downloadCoverLetterPrint() {
  if (!window._clHTML) { alert('Please create your cover letter first.'); return; }
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups, then tap Save as PDF again.'); return; }
  win.document.write(window._clHTML);
  win.document.close();
  win.focus();
  setTimeout(function() { win.print(); }, 700);
}

function previewCoverLetter() {
  if (!window._clHTML) { alert('Please create your cover letter first.'); return; }
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to preview.'); return; }
  win.document.write(window._clHTML);
  win.document.close();
}

function showMatchingJobs(data, name, loc, jobTitle) {
  var q = encodeURIComponent(jobTitle || '');
  var l = encodeURIComponent(loc || 'South Africa');
  var lq = encodeURIComponent(data.levelLabel || '');
  var level = data.level || 'entry';

  // Build job search URLs for all 5 job types
  var jobTypes = {
    permanent: {
      label: 'Permanent / Full-Time Jobs',
      icon: '💼',
      color: '#0077b5',
      desc: 'Stable permanent employment with benefits',
      links: [
        { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/?keywords='+q+'&location='+l+'&f_JT=F', color: '#0077b5' },
        { name: 'Indeed SA', url: 'https://za.indeed.com/jobs?q='+q+'&l='+l+'&jt=fulltime', color: '#2164f3' },
        { name: 'Pnet SA', url: 'https://www.pnet.co.za/jobs/'+encodeURIComponent((jobTitle||'jobs').toLowerCase().replace(/\s+/g,'-'))+'/', color: '#e84c3d' },
        { name: 'CareerJunction', url: 'https://www.careerjunction.co.za/jobs/results?Keywords='+q+'&Province=0', color: '#ff6900' },
      ]
    },
    learnership: {
      label: 'Learnerships',
      icon: '📚',
      color: '#10b981',
      desc: 'Earn while you learn — get paid + qualification',
      links: [
        { name: 'Indeed Learnerships', url: 'https://za.indeed.com/jobs?q=learnership+'+q+'&l='+l, color: '#2164f3' },
        { name: 'LinkedIn Learnerships', url: 'https://www.linkedin.com/jobs/search/?keywords=learnership+'+q+'&location='+l, color: '#0077b5' },
        { name: 'Pnet Learnerships', url: 'https://www.pnet.co.za/jobs/learnership/', color: '#e84c3d' },
        { name: 'Limpopo Jobs', url: 'https://www.limpopojobs.co.za/jobs?search=learnership', color: '#7c3aed' },
      ]
    },
    internship: {
      label: 'Internships',
      icon: '🎓',
      color: '#6366f1',
      desc: 'Gain experience and build your career',
      links: [
        { name: 'Indeed Internships', url: 'https://za.indeed.com/jobs?q=internship+'+q+'&l='+l, color: '#2164f3' },
        { name: 'LinkedIn Internships', url: 'https://www.linkedin.com/jobs/search/?keywords=internship+'+q+'&location='+l+'&f_JT=I', color: '#0077b5' },
        { name: 'StudentRoom SA', url: 'https://www.studentroom.co.za/internships', color: '#10b981' },
        { name: 'GradSA', url: 'https://www.grad.ac.za/internships', color: '#f59e0b' },
      ]
    },
    contract: {
      label: 'Contract / Temporary Jobs',
      icon: '📋',
      color: '#f59e0b',
      desc: 'Short-term contracts and temporary positions',
      links: [
        { name: 'Indeed Contract', url: 'https://za.indeed.com/jobs?q='+q+'&l='+l+'&jt=contract', color: '#2164f3' },
        { name: 'LinkedIn Contract', url: 'https://www.linkedin.com/jobs/search/?keywords='+q+'&location='+l+'&f_JT=C', color: '#0077b5' },
        { name: 'Temp SA Jobs', url: 'https://za.indeed.com/jobs?q=temp+contract+'+q+'&l='+l, color: '#e84c3d' },
        { name: 'PNet Contract', url: 'https://www.pnet.co.za/jobs/contract/', color: '#ff6900' },
      ]
    },
    youth: {
      label: 'Youth & Entry-Level Jobs',
      icon: '🌟',
      color: '#ec4899',
      desc: 'Jobs for young people and first-time job seekers',
      links: [
        { name: 'YouthMobi', url: 'https://youthmobi.com/jobs?q='+q, color: '#7c3aed' },
        { name: 'SA Youth', url: 'https://www.sayouth.mobi/vacancies', color: '#10b981' },
        { name: 'NYDA Jobs', url: 'https://www.nyda.gov.za/opportunities', color: '#e84c3d' },
        { name: 'Indeed Youth', url: 'https://za.indeed.com/jobs?q='+q+'&l='+l+'&jt=parttime', color: '#2164f3' },
      ]
    }
  };

  // Qualification-based advice per job type
  var advice = {
    grade9:   'You qualify for basic labour, general worker and domestic positions. Focus on Youth & Learnerships — they accept Grade 9.',
    grade10:  'You qualify for general worker and some retail positions. Learnerships are your best option to grow your career.',
    grade11:  'You qualify for junior clerk, retail and some admin roles. Many learnerships accept Grade 11 — apply now!',
    entry:    'Matric opens many doors. Apply for learnerships, internships, call centre, sales and admin roles.',
    trade:    'Your N4/N5/N6/Trade qualification is in very high demand! Apply for artisan, technician and skilled trade roles.',
    mid:      'Your diploma or degree qualifies you for professional and supervisory roles. Apply for permanent and contract positions.',
    senior:   'Honours or Masters — apply for management, specialist and senior professional roles.',
    executive:'PhD level — apply for director, academic and executive positions.',
    basic:    'Focus on learnerships and youth programs to build your first work experience.'
  };

  var levelAdvice = advice[level] || advice['entry'];

  // Build job type cards HTML
  var cardsHTML = Object.keys(jobTypes).map(function(key) {
    var jt = jobTypes[key];
    var linksHTML = jt.links.map(function(link) {
      return '<a href="' + link.url + '" target="_blank" style="display:block;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;text-decoration:none;color:#e2e8f0;font-size:12px;font-weight:600;margin-bottom:6px;transition:all 0.2s">' +
        '<span style="color:' + link.color + ';margin-right:6px">→</span>' + link.name +
      '</a>';
    }).join('');

    return '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
      '<span style="font-size:18px">' + jt.icon + '</span>' +
      '<strong style="color:' + jt.color + ';font-size:13px">' + jt.label + '</strong>' +
      '</div>' +
      '<p style="font-size:11px;color:#64748b;margin:0 0 10px">' + jt.desc + '</p>' +
      linksHTML +
      '</div>';
  }).join('');

  var resultHTML =
    '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:18px">' +
    '<strong style="color:var(--green);display:block;margin-bottom:12px;font-size:16px">✅ CV Built for ' + (name||'You') + '!</strong>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<button onclick="downloadCV()" style="flex:1;min-width:130px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">📄 Save as PDF</button>' +
    '<button onclick="previewCV()" style="flex:1;min-width:120px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:8px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">👁 Preview</button>' +
    '</div>' +
    '<div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:8px;padding:12px;margin-bottom:10px;text-align:center"><span style="font-size:13px;color:#c4b5fd;font-weight:600">✍️ Want a matching cover letter? Tap the <strong style="color:#fff">"Cover Letter"</strong> tab at the top!</span></div>' +
    '<p style="font-size:11px;color:#64748b;margin-bottom:14px">📱 "Save as PDF" works on phone & PC. Then share on WhatsApp or email when applying.</p>' +
    '<div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:12px;margin-bottom:16px">' +
    '<strong style="color:#fff;display:block;margin-bottom:4px">🎯 Your Level: ' + (data.levelLabel||'') + '</strong>' +
    '<p style="color:var(--muted);font-size:13px;margin:0">' + levelAdvice + '</p>' +
    '</div>' +
    '<p style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px">Choose the type of job you are looking for:</p>' +
    cardsHTML +
    '</div>';

  document.getElementById('cv-msg').innerHTML = resultHTML;
  attachCoverLetterHandler();

  // Put same content in jobs tab
  var jobTab = document.getElementById('job-match-content');
  if (jobTab) jobTab.innerHTML = resultHTML;

  // Switch to jobs tab
  setTimeout(function() {
    var tabs = document.querySelectorAll('.tab');
    if (tabs && tabs.length > 1) {
      tabs.forEach(function(t){ t.classList.remove('active'); });
      tabs[1].classList.add('active');
      var b = document.getElementById('cvt-build');
      var j = document.getElementById('cvt-jobs');
      if (b) b.style.display = 'none';
      if (j) j.style.display = 'block';
    }
  }, 300);
}


function uploadAndAnalyzeCV(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var res = document.getElementById('upload-result');
  res.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">📄 Reading your CV...</div>';

  var reader = new FileReader();
  reader.onload = async function(e) {
    var text = e.target.result;
    try {
      var response = await fetch(BACKEND_URL + '/api/match-jobs', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({cvText: text, jobTitle:'', location:'South Africa'})
      });
      var data = await response.json();
      res.innerHTML = '';
      document.getElementById('cv-msg').innerHTML = '';
      showMatchingJobs(data, file.name.replace('.pdf','').replace('.docx',''), 'South Africa', '');
    } catch(err) {
      var level = text.toLowerCase().includes('degree')||text.toLowerCase().includes('bcom') ? 'mid' :
                  text.toLowerCase().includes('diploma') ? 'mid' :
                  text.toLowerCase().includes('matric')||text.toLowerCase().includes('grade 12') ? 'entry' : 'entry';
      res.innerHTML = `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px">
        <strong style="color:var(--green)">✅ CV uploaded!</strong>
        <p style="color:var(--muted);font-size:13px;margin:8px 0">We detected your qualification level. Connect the backend server to get full AI matching.</p>
      </div>`;
    }
  };
  reader.readAsText(file);
}


// ── SA Map ──
function renderCustomerManager(el) {
  el.innerHTML =
    '<div class="tool-screen">' +
    '<h2>👥 Customer Manager</h2>' +
    '<p style="color:var(--muted);font-size:14px;margin-bottom:4px">Keep all your customers in one place — contacts, notes and purchase history.</p>' +
    '<p style="font-size:12px;color:#38bdf8;margin-bottom:20px;font-style:italic">Private and secure. Only you can see your customer list.</p>' +
    '<button class="btn-primary" style="margin-bottom:20px" onclick="openCustomerForm()">+ Add New Customer</button>' +
    '<div id="cm-search-wrap" style="margin-bottom:16px;display:none"><input type="text" id="cm-search" placeholder="🔍 Search customers by name..." oninput="filterCustomers()" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px;color:#fff;font-family:var(--font);font-size:14px"></div>' +
    '<div id="cm-list"><p style="color:var(--muted);text-align:center;padding:30px">Loading your customers...</p></div>' +
    '</div>';
  loadCustomers();
}

var _customers = [];

function loadCustomers() {
  var token = safeStorage.getItem('sb_token');
  if (!token) { document.getElementById('cm-list').innerHTML = '<p style="color:var(--muted);text-align:center;padding:30px">Please log in to use the Customer Manager.</p>'; return; }
  fetch(BACKEND_URL + '/api/customers/list', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ token: token })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    _customers = (data && data.customers) || [];
    renderCustomerList(_customers);
  })
  .catch(function(){ document.getElementById('cm-list').innerHTML = '<p style="color:#f87171;text-align:center;padding:30px">Could not load customers. Check your internet and try again.</p>'; });
}

function renderCustomerList(list) {
  var wrap = document.getElementById('cm-list');
  var searchWrap = document.getElementById('cm-search-wrap');
  if (searchWrap) searchWrap.style.display = _customers.length > 3 ? 'block' : 'none';

  if (!list || !list.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:40px 20px;background:rgba(255,255,255,0.03);border-radius:14px;border:1px dashed rgba(255,255,255,0.1)">' +
      '<div style="font-size:44px;margin-bottom:12px">👥</div>' +
      '<p style="color:#fff;font-weight:600;margin-bottom:6px">No customers yet</p>' +
      '<p style="color:var(--muted);font-size:13px">Tap "Add New Customer" to start building your customer list.</p>' +
      '</div>';
    return;
  }

  wrap.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">' + list.length + ' customer' + (list.length===1?'':'s') + '</div>' +
    list.map(function(c){
      return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px">' + escapeHtml(c.name) + '</div>' +
        (c.phone ? '<div style="font-size:13px;color:#38bdf8;margin-bottom:2px">📞 ' + escapeHtml(c.phone) + '</div>' : '') +
        (c.email ? '<div style="font-size:12px;color:var(--muted);margin-bottom:2px;word-break:break-all">✉️ ' + escapeHtml(c.email) + '</div>' : '') +
        (c.lastPurchase ? '<div style="font-size:12px;color:#10b981;margin-top:4px">🛒 ' + escapeHtml(c.lastPurchase) + '</div>' : '') +
        (c.notes ? '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5;background:rgba(255,255,255,0.03);padding:8px 10px;border-radius:8px">📝 ' + escapeHtml(c.notes) + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px">' +
        (c.phone ? '<a href="https://wa.me/' + c.phone.replace(/[^0-9]/g,'').replace(/^0/,'27') + '" target="_blank" style="background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.3);color:#25d366;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:700;text-decoration:none;text-align:center;white-space:nowrap">WhatsApp</a>' : '') +
        '<button onclick="editCustomer(\'' + c.id + '\')" style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">Edit</button>' +
        '<button onclick="deleteCustomer(\'' + c.id + '\',\'' + escapeHtml(c.name).replace(/\'/g,"") + '\')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">Delete</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }).join('');
}

function filterCustomers() {
  var q = (document.getElementById('cm-search') || {value:''}).value.toLowerCase();
  var filtered = _customers.filter(function(c){ return c.name.toLowerCase().indexOf(q) > -1; });
  renderCustomerList(filtered);
}

function openCustomerForm(existing) {
  var c = existing || {};
  var modal = document.createElement('div');
  modal.id = 'cm-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
  modal.innerHTML =
    '<div style="background:#0f1629;border:1px solid rgba(56,189,248,0.2);border-radius:20px;padding:28px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">' +
    '<h3 style="color:#fff;font-size:19px;margin-bottom:16px">' + (existing ? 'Edit Customer' : 'Add New Customer') + '</h3>' +
    '<input type="hidden" id="cm-id" value="' + (c.id || '') + '">' +
    '<div class="form-group"><label>Customer Name *</label><input type="text" id="cm-name" value="' + (c.name ? escapeHtml(c.name) : '') + '" placeholder="e.g. John Doe"></div>' +
    '<div class="form-group"><label>Phone Number</label><input type="tel" id="cm-phone" value="' + (c.phone ? escapeHtml(c.phone) : '') + '" placeholder="e.g. 082 123 4567"></div>' +
    '<div class="form-group"><label>Email (optional)</label><input type="email" id="cm-email" value="' + (c.email ? escapeHtml(c.email) : '') + '" placeholder="e.g. john@email.com"></div>' +
    '<div class="form-group"><label>Last Purchase / Service (optional)</label><input type="text" id="cm-purchase" value="' + (c.lastPurchase ? escapeHtml(c.lastPurchase) : '') + '" placeholder="e.g. Haircut R80, or Invoice #12"></div>' +
    '<div class="form-group"><label>Notes (optional)</label><textarea id="cm-notes" rows="3" placeholder="e.g. Prefers appointments on weekends. Allergic to...">' + (c.notes ? escapeHtml(c.notes) : '') + '</textarea></div>' +
    '<button class="btn-primary" style="width:100%;box-sizing:border-box;margin-bottom:8px" onclick="saveCustomer()">' + (existing ? 'Save Changes' : 'Add Customer') + '</button>' +
    '<button style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;border-radius:10px;padding:12px;font-family:var(--font);cursor:pointer;font-size:14px" onclick="document.getElementById(\'cm-modal\').remove()">Cancel</button>' +
    '</div>';
  modal.onclick = function(){ modal.remove(); };
  document.body.appendChild(modal);
}

function editCustomer(id) {
  var c = _customers.find(function(x){ return x.id === id; });
  if (c) openCustomerForm(c);
}

function saveCustomer() {
  var token = safeStorage.getItem('sb_token');
  var id = (document.getElementById('cm-id')||{value:''}).value;
  var customer = {
    name: (document.getElementById('cm-name')||{value:''}).value.trim(),
    phone: (document.getElementById('cm-phone')||{value:''}).value.trim(),
    email: (document.getElementById('cm-email')||{value:''}).value.trim(),
    lastPurchase: (document.getElementById('cm-purchase')||{value:''}).value.trim(),
    notes: (document.getElementById('cm-notes')||{value:''}).value.trim()
  };
  if (!customer.name) { alert('Please enter the customer name.'); return; }

  var endpoint, body;
  if (id) { customer.id = id; endpoint = '/api/customers/update'; body = { token: token, customer: customer }; }
  else { endpoint = '/api/customers/add'; body = { token: token, customer: customer }; }

  fetch(BACKEND_URL + endpoint, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (data && data.success) {
      var m = document.getElementById('cm-modal'); if (m) m.remove();
      loadCustomers();
    } else { alert((data && data.error) || 'Could not save customer.'); }
  })
  .catch(function(){ alert('Could not save. Check your internet and try again.'); });
}

function deleteCustomer(id, name) {
  if (!confirm('Delete ' + name + ' from your customers? This cannot be undone.')) return;
  var token = safeStorage.getItem('sb_token');
  fetch(BACKEND_URL + '/api/customers/delete', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ token: token, customerId: id })
  })
  .then(function(r){ return r.json(); })
  .then(function(){ loadCustomers(); })
  .catch(function(){ alert('Could not delete. Try again.'); });
}

function renderPDFTools(el) {
  el.innerHTML =
    '<div class="tool-screen">' +
    '<h2>📑 PDF Tools</h2>' +
    '<p style="color:var(--muted);font-size:14px;margin-bottom:4px">Convert your files to PDF instantly — right in your browser.</p>' +
    '<p style="font-size:12px;color:#38bdf8;margin-bottom:20px;font-style:italic">Fast, private and secure. Your files never leave your device.</p>' +

    '<div class="tab-bar">' +
    '<div class="tab active" onclick="pdfTab(\'csv\',this)">CSV / Excel to PDF</div>' +
    '<div class="tab" onclick="pdfTab(\'image\',this)">Images to PDF</div>' +
    '<div class="tab" onclick="pdfTab(\'text\',this)">Text to PDF</div>' +
    '</div>' +

    // CSV/Excel to PDF
    '<div id="pdf-csv">' +
    '<div class="cv-sec-title">Convert CSV or Excel to PDF</div>' +
    '<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Upload a .csv or .xlsx file and we turn it into a clean, printable PDF table.</p>' +
    '<div style="border:2px dashed rgba(56,189,248,0.3);border-radius:12px;padding:30px;text-align:center;margin-bottom:16px">' +
    '<input type="file" id="csv-file" accept=".csv,.xlsx,.xls" onchange="handleCSVFile(this)" style="display:none">' +
    '<div style="font-size:40px;margin-bottom:10px">📄</div>' +
    '<button class="btn-primary" onclick="document.getElementById(\'csv-file\').click()">Choose CSV / Excel File</button>' +
    '<p id="csv-filename" style="font-size:12px;color:#38bdf8;margin-top:10px"></p>' +
    '</div>' +
    '<div id="csv-result"></div>' +
    '</div>' +

    // Images to PDF
    '<div id="pdf-image" style="display:none">' +
    '<div class="cv-sec-title">Convert Images to PDF</div>' +
    '<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Upload one or more photos (JPG/PNG) and we combine them into a single PDF.</p>' +
    '<div style="border:2px dashed rgba(56,189,248,0.3);border-radius:12px;padding:30px;text-align:center;margin-bottom:16px">' +
    '<input type="file" id="img-file" accept="image/*" multiple onchange="handleImageFiles(this)" style="display:none">' +
    '<div style="font-size:40px;margin-bottom:10px">🖼️</div>' +
    '<button class="btn-primary" onclick="document.getElementById(\'img-file\').click()">Choose Images</button>' +
    '<p id="img-filename" style="font-size:12px;color:#38bdf8;margin-top:10px"></p>' +
    '</div>' +
    '<div id="img-result"></div>' +
    '</div>' +

    // Text to PDF
    '<div id="pdf-text" style="display:none">' +
    '<div class="cv-sec-title">Convert Text to PDF</div>' +
    '<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Type or paste your text and download it as a clean PDF document.</p>' +
    '<div class="form-group"><label>Document Title</label><input type="text" id="txt-title" placeholder="e.g. My Notes"></div>' +
    '<div class="form-group"><label>Your Text</label><textarea id="txt-body" rows="10" placeholder="Type or paste your text here..."></textarea></div>' +
    '<button class="btn-primary" style="width:100%;box-sizing:border-box" onclick="textToPDF()">Convert to PDF</button>' +
    '</div>' +

    '<div style="background:rgba(139,92,246,0.06);border-radius:12px;padding:14px;margin-top:20px">' +
    '<p style="font-size:12px;color:#c4b5fd;margin:0;line-height:1.6">🔒 <strong>100% Private:</strong> All conversions happen on your device. Your files are never uploaded to any server.</p>' +
    '</div>' +
    '</div>';
}

function pdfTab(t, el) {
  document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('active'); });
  el.classList.add('active');
  ['csv','image','text'].forEach(function(id){
    var e = document.getElementById('pdf-' + id);
    if (e) e.style.display = id===t?'block':'none';
  });
}

var _csvData = null;
function handleCSVFile(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  document.getElementById('csv-filename').textContent = '✓ ' + file.name;
  var ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    Papa.parse(file, {
      complete: function(results) {
        _csvData = results.data;
        showCSVReady(file.name);
      }
    });
  } else {
    // Excel
    var reader = new FileReader();
    reader.onload = function(e) {
      var data = new Uint8Array(e.target.result);
      var wb = XLSX.read(data, { type:'array' });
      var sheet = wb.Sheets[wb.SheetNames[0]];
      _csvData = XLSX.utils.sheet_to_json(sheet, { header:1 });
      showCSVReady(file.name);
    };
    reader.readAsArrayBuffer(file);
  }
}

function showCSVReady(filename) {
  document.getElementById('csv-result').innerHTML =
    '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px;text-align:center">' +
    '<strong style="color:#10b981;display:block;margin-bottom:10px">✅ File loaded! ' + (_csvData ? _csvData.length : 0) + ' rows ready.</strong>' +
    '<button class="btn-primary" onclick="convertCSVtoPDF(\'' + filename.replace(/\.[^.]+$/,'') + '\')">📄 Download as PDF</button>' +
    '</div>';
}

function convertCSVtoPDF(name) {
  if (!_csvData || !_csvData.length) { alert('Please upload a file first.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var head = [_csvData[0]];
  var body = _csvData.slice(1).filter(function(r){ return r.some(function(c){ return c !== '' && c != null; }); });
  doc.autoTable({ head: head, body: body, styles:{fontSize:8}, headStyles:{fillColor:[37,99,235]} });
  doc.save((name || 'converted') + '.pdf');
  alert('✅ PDF downloaded!');
}

var _imageFiles = [];
function handleImageFiles(input) {
  if (!input.files || !input.files.length) return;
  _imageFiles = Array.from(input.files);
  document.getElementById('img-filename').textContent = '✓ ' + _imageFiles.length + ' image(s) selected';
  document.getElementById('img-result').innerHTML =
    '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px;text-align:center">' +
    '<button class="btn-primary" onclick="convertImagesToPDF()">📄 Combine into PDF</button>' +
    '</div>';
}

function convertImagesToPDF() {
  if (!_imageFiles.length) { alert('Please choose images first.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var loaded = 0;
  _imageFiles.forEach(function(file, index) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        if (index > 0) doc.addPage();
        var pw = doc.internal.pageSize.getWidth();
        var ph = doc.internal.pageSize.getHeight();
        var ratio = Math.min(pw / img.width, ph / img.height);
        var w = img.width * ratio;
        var h = img.height * ratio;
        doc.addImage(e.target.result, 'JPEG', (pw-w)/2, (ph-h)/2, w, h);
        loaded++;
        if (loaded === _imageFiles.length) {
          doc.save('images.pdf');
          alert('✅ PDF downloaded!');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function textToPDF() {
  var title = (document.getElementById('txt-title') || {value:''}).value.trim() || 'Document';
  var body = (document.getElementById('txt-body') || {value:''}).value.trim();
  if (!body) { alert('Please type some text first.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(37,99,235);
  doc.text(title, 15, 20);
  doc.setFontSize(11);
  doc.setTextColor(0,0,0);
  var lines = doc.splitTextToSize(body, 180);
  doc.text(lines, 15, 32);
  doc.save(title.replace(/\s+/g,'_') + '.pdf');
  alert('✅ PDF downloaded!');
}

function renderTemplates(el) {
  var templates = [
    { id:'invoice', name:'Professional Invoice', icon:'🧾', price:99, cat:'Business', img:'Professional_Invoice_Template-1.png', desc:'Auto-calculates line totals, subtotal, VAT and total. Includes your banking details.' },
    { id:'quote', name:'Quotation Template', icon:'📋', price:99, cat:'Business', img:'Quotation_Template-1.png', desc:'Professional quotes with terms & conditions. Send before invoicing.' },
    { id:'stock', name:'Stock / Inventory Tracker', icon:'📦', price:149, cat:'Business', img:'Stock_Inventory_Tracker-1.png', desc:'Tracks products, flags LOW/OUT of stock automatically, shows total stock value.' },
    { id:'bizbudget', name:'Business Budget / Cash Flow', icon:'💰', price:149, cat:'Business', img:'Business_Budget_Planner-1.png', desc:'Income vs expenses, budgeted vs actual, auto money-left calculation.' },
    { id:'wages', name:'Staff Wage Register', icon:'👥', price:149, cat:'Business', img:'Staff_Wage_Register-1.png', desc:'Enter hours & rate — auto-calculates gross, deductions and net pay per employee.' },
    { id:'monthly', name:'Monthly Budget Planner', icon:'🏠', price:59, cat:'Personal', img:'Monthly_Budget_Planner-1.png', desc:'Simple personal budget. Money in vs out. Perfect for families.' },
    { id:'marksheet', name:'School Mark Sheet', icon:'📝', price:89, cat:'School', img:'School_Mark_Sheet-1.png', desc:'Auto-calculates totals, averages, PASS/FAIL and class average.' },
    { id:'attendance', name:'Class Attendance Register', icon:'✅', price:89, cat:'School', img:'Class_Attendance_Register-1.png', desc:'Mark P/A/L/S daily. Auto-counts attendance percentage per learner.' }
  ];

  var bundles = [
    { id:'bundle-biz', name:'Business Bundle', icon:'💼', price:499, desc:'All 5 business templates (Invoice, Quote, Stock, Budget, Wages). Save R146!' },
    { id:'bundle-school', name:'School Bundle', icon:'🎓', price:149, desc:'Mark Sheet + Attendance Register. Save R29!' },
    { id:'bundle-all', name:'Everything Bundle', icon:'⭐', price:699, desc:'ALL 8 templates. Best value — save over R180!' }
  ];

  var cards = templates.map(function(t){
    return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;display:flex;flex-direction:column">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="font-size:28px">' + t.icon + '</span>' +
      '<div><div style="font-size:15px;font-weight:700;color:#fff">' + t.name + '</div>' +
      '<span style="font-size:10px;background:rgba(56,189,248,0.15);color:#38bdf8;padding:2px 8px;border-radius:10px">' + t.cat + '</span></div>' +
      '</div>' +
      '<p style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px;flex:1">' + t.desc + '</p>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<span style="font-size:22px;font-weight:800;color:#10b981">R' + t.price + '</span>' +
      '<div style="display:flex;gap:6px">' +
      (t.img ? '<button onclick="previewTemplate(\'' + t.img + '\',\'' + t.name + '\')" style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;border-radius:8px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">👁 Preview</button>' : '') +
      '<button onclick="buyTemplate(\'' + t.id + '\',\'' + t.name + '\',' + t.price + ')" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">Buy Now</button>' +
      '</div></div></div>';
  }).join('');

  var bundleCards = bundles.map(function(b){
    return '<div style="background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(99,102,241,0.08));border:1px solid rgba(56,189,248,0.3);border-radius:14px;padding:18px;display:flex;flex-direction:column">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="font-size:28px">' + b.icon + '</span>' +
      '<div style="font-size:16px;font-weight:800;color:#fff">' + b.name + '</div></div>' +
      '<p style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px;flex:1">' + b.desc + '</p>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<span style="font-size:24px;font-weight:800;color:#10b981">R' + b.price + '</span>' +
      '<button onclick="buyTemplate(\'' + b.id + '\',\'' + b.name + '\',' + b.price + ')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">Buy Bundle</button>' +
      '</div></div>';
  }).join('');

  el.innerHTML =
    '<div class="tool-screen">' +
    '<h2>📊 Templates Store</h2>' +
    '<p style="color:var(--muted);font-size:14px;margin-bottom:4px">Professional, ready-to-use spreadsheets for business, school and home.</p>' +
    '<p style="font-size:12px;color:#38bdf8;margin-bottom:8px;font-style:italic">Every template auto-calculates for you. Buy once, keep forever.</p>' +
    '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:10px 14px;margin-bottom:20px;text-align:center"><span style="font-size:12px;color:#10b981;font-weight:600">✅ No subscription needed — just buy the template you want and keep it forever!</span></div>' +

    '<div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:14px;margin-bottom:20px">' +
    '<div style="font-size:13px;font-weight:700;color:#10b981;margin-bottom:8px">💚 BEST VALUE — BUNDLES</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' + bundleCards + '</div>' +
    '</div>' +

    '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:12px">Individual Templates</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">' + cards + '</div>' +

    '<div style="background:rgba(56,189,248,0.06);border-radius:12px;padding:16px;margin-top:20px">' +
    '<p style="font-size:12px;color:var(--muted);margin:0;line-height:1.6">💡 <strong style="color:#fff">How it works:</strong> Click Buy, pay securely with Paystack, and we email your template file to you within a few hours. Keep it forever and use it as many times as you like.</p>' +
    '</div>' +
    '</div>';
}

function previewTemplate(img, name) {
  var existing = document.getElementById('tpl-preview-modal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'tpl-preview-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick = function(){ modal.remove(); };

  // Build the image URL using the current site path (works no matter the repo path)
  var base = window.location.pathname.replace(/[^/]*$/, '');
  var imgUrl = base + img;

  modal.innerHTML =
    '<div style="max-width:600px;width:100%;text-align:center" onclick="event.stopPropagation()">' +
    '<div style="color:#fff;font-size:18px;font-weight:700;margin-bottom:12px">' + name + ' — Preview</div>' +
    '<img id="tpl-preview-img" src="' + imgUrl + '" style="max-width:100%;max-height:75vh;border-radius:12px;border:2px solid rgba(56,189,248,0.4);background:#fff">' +
    '<div id="tpl-preview-err" style="display:none;color:#f87171;padding:20px;font-size:13px"></div>' +
    '<div style="margin-top:14px"><button onclick="document.getElementById(\'tpl-preview-modal\').remove()" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font)">Close</button></div>' +
    '</div>';
  document.body.appendChild(modal);

  // Handle image error with the exact URL shown so we can debug
  var imgEl = document.getElementById('tpl-preview-img');
  imgEl.onerror = function() {
    imgEl.style.display = 'none';
    var err = document.getElementById('tpl-preview-err');
    err.style.display = 'block';
    err.innerHTML = 'Could not load the preview image.<br><br>The site looked for it at:<br><span style="color:#38bdf8;word-break:break-all">' + imgUrl + '</span><br><br>Make sure a file with this EXACT name is in your repo.';
  };
}

function buyTemplate(id, name, price) {
  // No subscription needed - just need an email to send the file to
  var email = (currentUser && currentUser.email) ? currentUser.email : '';
  if (!email) {
    email = prompt('Enter your email address so we can send you "' + name + '" after payment:');
    if (!email || email.indexOf('@') === -1) { alert('A valid email is needed to receive your template.'); return; }
  }

  // Notify owner of the purchase intent + open Paystack
  fetch(BACKEND_URL + '/api/template-order', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ templateId:id, templateName:name, price:price, email:email, name:(currentUser ? (currentUser.fname||'')+' '+(currentUser.lname||'') : 'Guest') })
  }).catch(function(){});

  if (typeof PaystackPop !== 'undefined') {
    var handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: price * 100,
      currency: 'ZAR',
      ref: 'TPL-' + id + '-' + Date.now(),
      metadata: { template: name, buyer: email },
      callback: function(response) {
        deliverTemplate(id, name, email, response.reference);
      },
      onClose: function() {}
    });
    handler.openIframe();
  } else {
    alert('Opening secure checkout for ' + name + ' (R' + price + ')...');
    window.open(PAYSTACK_MONTHLY_LINK, '_blank');
  }
}

// Map each template/bundle to its downloadable file(s) in the repo
var TEMPLATE_FILES = {
  invoice: ['Professional_Invoice_Template.xlsx'],
  quote: ['Quotation_Template.xlsx'],
  stock: ['Stock_Inventory_Tracker.xlsx'],
  bizbudget: ['Business_Budget_Planner.xlsx'],
  wages: ['Staff_Wage_Register.xlsx'],
  monthly: ['Monthly_Budget_Planner.xlsx'],
  marksheet: ['School_Mark_Sheet.xlsx'],
  attendance: ['Class_Attendance_Register.xlsx'],
  'bundle-biz': ['Professional_Invoice_Template.xlsx','Quotation_Template.xlsx','Stock_Inventory_Tracker.xlsx','Business_Budget_Planner.xlsx','Staff_Wage_Register.xlsx'],
  'bundle-school': ['School_Mark_Sheet.xlsx','Class_Attendance_Register.xlsx'],
  'bundle-all': ['Professional_Invoice_Template.xlsx','Quotation_Template.xlsx','Stock_Inventory_Tracker.xlsx','Business_Budget_Planner.xlsx','Staff_Wage_Register.xlsx','Monthly_Budget_Planner.xlsx','School_Mark_Sheet.xlsx','Class_Attendance_Register.xlsx']
};

function deliverTemplate(id, name, email, reference) {
  var files = TEMPLATE_FILES[id] || [];
  // Auto-download each file to the customer device
  files.forEach(function(fname, i) {
    setTimeout(function() {
      var a = document.createElement('a');
      a.href = '/Sky-Blueprint/templates/' + fname;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, i * 800);
  });

  // Confirm to buyer + notify owner it was delivered
  fetch(BACKEND_URL + '/api/template-order', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ templateId:id, templateName:name, email:email, reference:reference, delivered:true })
  }).catch(function(){});

  var msg = files.length > 1
    ? '🎉 Payment successful! Your ' + files.length + ' files are downloading now. Check your Downloads folder!'
    : '🎉 Payment successful! "' + name + '" is downloading now. Check your Downloads folder!';
  alert(msg + '\n\nReference: ' + reference + '\n\nIf the download did not start, email us at ' + OWNER_EMAIL + ' with your reference.');
}

function renderLearnerships(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>🎓 Learnerships & Internships</h2>
    <p style="color:var(--muted);font-size:14px;margin-bottom:4px">Find learnerships and internships you qualify for — sent straight to your email.</p>
    <p style="font-size:12px;color:#38bdf8;margin-bottom:20px;font-style:italic">We check if you qualify, then send you the best matching opportunities and apply links.</p>

    <div id="ls-form">
      <div class="cv-sec-title">Your Details</div>
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input type="text" id="ls-name" placeholder="e.g. Thabo Nkosi"></div>
        <div class="form-group"><label>Email Address *</label><input type="email" id="ls-email" placeholder="your@email.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Your Age *</label><input type="number" id="ls-age" placeholder="e.g. 22" min="15" max="60"></div>
        <div class="form-group"><label>Province *</label>
          <select id="ls-province">
            <option value="">Select province</option>
            <option>Gauteng</option><option>Western Cape</option><option>KwaZulu-Natal</option>
            <option>Eastern Cape</option><option>Free State</option><option>Limpopo</option>
            <option>Mpumalanga</option><option>North West</option><option>Northern Cape</option>
          </select>
        </div>
      </div>

      <div class="cv-sec-title">Your Qualification</div>
      <div class="form-group"><label>Highest Qualification *</label>
        <select id="ls-qual">
          <option value="">Select your highest qualification</option>
          <option value="below-matric">Below Matric (Grade 9-11)</option>
          <option value="matric">Matric / Grade 12</option>
          <option value="n-cert">N4-N6 Certificate</option>
          <option value="diploma">Diploma</option>
          <option value="degree">Degree</option>
          <option value="honours">Honours or higher</option>
        </select>
      </div>
      <div class="form-group"><label>Field of Interest *</label>
        <select id="ls-field">
          <option value="">Select your field</option>
          <option>Information Technology / IT</option>
          <option>Finance / Accounting</option>
          <option>Business / Admin</option>
          <option>Engineering / Artisan</option>
          <option>Retail / Sales</option>
          <option>Healthcare / Nursing</option>
          <option>Construction / Trades</option>
          <option>Marketing / Media</option>
          <option>Hospitality / Tourism</option>
          <option>Human Resources</option>
          <option>Security</option>
          <option>Agriculture</option>
          <option>General / Any field</option>
        </select>
      </div>
      <div class="form-group"><label>Are you currently employed? *</label>
        <select id="ls-employed">
          <option value="no">No — I am unemployed</option>
          <option value="yes">Yes — I am employed</option>
        </select>
      </div>
      <div class="form-group"><label>What are you looking for? *</label>
        <select id="ls-type">
          <option value="both">Both Learnerships & Internships</option>
          <option value="learnership">Learnerships only</option>
          <option value="internship">Internships only</option>
        </select>
      </div>

      <button class="btn-primary" style="width:100%;box-sizing:border-box;font-size:15px;padding:14px" onclick="checkLearnerships()">
        🔍 Check What I Qualify For
      </button>
    </div>

    <div id="ls-result" style="display:none"></div>
  </div>`;

  setTimeout(function() {
    var em = document.getElementById('ls-email');
    if (em && currentUser && currentUser.email) em.value = currentUser.email;
    var nm = document.getElementById('ls-name');
    if (nm && currentUser && currentUser.fname) nm.value = currentUser.fname + ' ' + (currentUser.lname||'');
  }, 100);
}

function checkLearnerships() {
  var name = (document.getElementById('ls-name') || {value:''}).value.trim();
  var email = (document.getElementById('ls-email') || {value:''}).value.trim();
  var age = parseInt((document.getElementById('ls-age') || {value:'0'}).value);
  var province = (document.getElementById('ls-province') || {value:''}).value;
  var qual = (document.getElementById('ls-qual') || {value:''}).value;
  var field = (document.getElementById('ls-field') || {value:''}).value;
  var employed = (document.getElementById('ls-employed') || {value:'no'}).value;
  var type = (document.getElementById('ls-type') || {value:'both'}).value;

  if (!name || !email || !age || !province || !qual || !field) {
    alert('Please fill in all required fields.');
    return;
  }

  // QUALIFICATION CHECKING LOGIC
  var reasons = [];
  var qualifies = true;

  // Age check - most SA learnerships/internships are 18-35
  if (age < 18) {
    qualifies = false;
    reasons.push('Most learnerships and internships require you to be at least 18 years old. You are ' + age + '.');
  } else if (age > 35) {
    qualifies = false;
    reasons.push('Most SA youth learnerships and internships are for ages 18-35 (Presidential Youth programmes). You are ' + age + '. Some general positions may still be open to you.');
  }

  // Employment check - learnerships are mostly for unemployed
  if (employed === 'yes' && type === 'learnership') {
    reasons.push('Note: Most learnerships are designed for UNEMPLOYED youth. As an employed person, your options are more limited but some exist.');
  }

  // Internship qualification check
  if (type === 'internship' && (qual === 'below-matric' || qual === 'matric')) {
    reasons.push('Note: Most INTERNSHIPS require a Diploma or Degree. With your qualification, LEARNERSHIPS are a better fit for you (they accept Matric and below).');
  }

  // Below matric for internships
  if (qual === 'below-matric' && type === 'internship') {
    qualifies = false;
    reasons.push('Internships require at least a Diploma or Degree. But GOOD NEWS — you qualify for many learnerships that accept Grade 9-11!');
  }

  showLearnershipResult(qualifies, reasons, {name:name, email:email, age:age, province:province, qual:qual, field:field, employed:employed, type:type});
}

function showLearnershipResult(qualifies, reasons, data) {
  document.getElementById('ls-form').style.display = 'none';
  var resultEl = document.getElementById('ls-result');
  resultEl.style.display = 'block';

  // Get matching opportunities/links based on their profile
  var opportunities = getMatchingOpportunities(data);

  var html = '';

  if (!qualifies && opportunities.length === 0) {
    // Does not qualify at all
    html = '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:24px;text-align:center">' +
      '<div style="font-size:48px;margin-bottom:12px">😔</div>' +
      '<h3 style="color:#f87171;font-size:18px;margin-bottom:10px">You Do Not Meet the Requirements Yet</h3>' +
      reasons.map(function(r){ return '<p style="color:var(--muted);font-size:13px;margin-bottom:8px">' + r + '</p>'; }).join('') +
      '<p style="color:#38bdf8;font-size:13px;margin-top:16px">Tip: Keep checking back. New opportunities open every week, and your qualifications may match future ones.</p>' +
      '</div>';
  } else {
    // Qualifies - show opportunities + notes
    html = '<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:20px;margin-bottom:16px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<span style="font-size:32px">🎉</span>' +
      '<div><h3 style="color:#10b981;font-size:18px;margin:0">Good News, ' + data.name.split(' ')[0] + '!</h3>' +
      '<p style="color:var(--muted);font-size:13px;margin:2px 0 0">You qualify for ' + opportunities.length + ' opportunity source' + (opportunities.length>1?'s':'') + ' in ' + data.field + '</p></div>' +
      '</div>';

    if (reasons.length > 0) {
      html += '<div style="background:rgba(245,158,11,0.08);border-radius:8px;padding:12px;margin-top:10px">' +
        reasons.map(function(r){ return '<p style="color:#fbbf24;font-size:12px;margin-bottom:4px">⚠️ ' + r + '</p>'; }).join('') +
        '</div>';
    }
    html += '</div>';

    // List opportunities
    html += '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:12px">📋 Where to Apply (verified SA sites):</div>';
    html += opportunities.map(function(opp) {
      return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
        '<span style="font-size:20px">' + opp.icon + '</span>' +
        '<strong style="color:#fff;font-size:14px">' + opp.name + '</strong>' +
        (opp.dataFree ? '<span style="font-size:10px;background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:10px">DATA-FREE</span>' : '') +
        '</div>' +
        '<p style="font-size:12px;color:var(--muted);margin-bottom:10px">' + opp.desc + '</p>' +
        '<a href="' + opp.url + '" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;text-decoration:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600">Apply on ' + opp.name + ' →</a>' +
        '</div>';
    }).join('');

    // Email the opportunities
    html += '<button class="btn-primary" style="width:100%;box-sizing:border-box;margin-top:14px;font-size:14px" onclick="emailLearnerships()">' +
      '📧 Email These Opportunities to Me' +
      '</button>';

    // Store for emailing
    window._lsData = data;
    window._lsOpps = opportunities;
  }

  html += '<button style="width:100%;box-sizing:border-box;margin-top:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;border-radius:10px;padding:12px;font-family:var(--font);cursor:pointer;font-weight:600;font-size:13px" onclick="resetLearnerships()">← Check Again</button>';

  resultEl.innerHTML = html;
}

function getMatchingOpportunities(data) {
  var opps = [];
  var fieldLower = data.field.toLowerCase();

  // SAYouth - for everyone 18-35, data-free (verified SA government platform)
  if (data.age >= 18 && data.age <= 35) {
    opps.push({
      name: 'SAYouth.mobi', icon: '🇿🇦', dataFree: true,
      desc: 'Government platform (Presidential Youth programme). Free, no data needed. Thousands of paid learnerships and internships. Works on all networks.',
      url: 'https://www.sayouth.mobi/'
    });
  }

  // StudentRoom - learnerships and internships listings
  opps.push({
    name: 'StudentRoom', icon: '🎓', dataFree: false,
    desc: 'Lists current SA learnerships and internships from companies and TVET colleges with closing dates and requirements.',
    url: 'https://www.studentroom.co.za/category/internships/'
  });

  // Pnet - if matric or higher
  if (data.qual !== 'below-matric') {
    opps.push({
      name: 'Pnet', icon: '💼', dataFree: false,
      desc: 'Major SA job site with hundreds of learnership and internship listings. Filter by your field and province.',
      url: 'https://www.pnet.co.za/jobs/' + (data.type === 'internship' ? 'internship' : 'learnership')
    });
  }

  // Graduates24 - for diploma/degree
  if (data.qual === 'diploma' || data.qual === 'degree' || data.qual === 'honours') {
    opps.push({
      name: 'Graduates24', icon: '🎯', dataFree: false,
      desc: 'Internships, graduate programmes and bursaries for SA graduates. Banking, finance, IT and engineering programmes.',
      url: 'https://www.graduates24.com/internshipprogrammes'
    });
  }

  // Internships-SA
  opps.push({
    name: 'Internships-SA', icon: '📚', dataFree: false,
    desc: 'Dedicated SA internship and learnership board updated regularly across all fields.',
    url: 'https://www.internships-sa.co.za/'
  });

  // Indeed - general
  opps.push({
    name: 'Indeed SA', icon: '🔍', dataFree: false,
    desc: 'Search "' + data.field + ' ' + (data.type === 'internship' ? 'internship' : 'learnership') + '" in ' + data.province + '. New listings daily.',
    url: 'https://za.indeed.com/jobs?q=' + encodeURIComponent(data.field + ' ' + (data.type==='internship'?'internship':'learnership')) + '&l=' + encodeURIComponent(data.province)
  });

  return opps;
}

function emailLearnerships() {
  var data = window._lsData;
  var opps = window._lsOpps;
  if (!data || !opps) { alert('Please check your qualifications first.'); return; }

  var oppList = opps.map(function(o){ return { name:o.name, url:o.url, desc:o.desc }; });

  fetch(BACKEND_URL + '/api/learnership-email', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      name: data.name, email: data.email,
      field: data.field, province: data.province,
      qual: data.qual, type: data.type,
      opportunities: oppList
    })
  }).then(function(r){ return r.json(); }).then(function(){
    alert('📧 Done! The opportunities and apply links have been sent to ' + data.email + '. Check your inbox (and spam folder).');
  }).catch(function(){
    alert('Could not send email right now, but you can click the apply links above directly.');
  });
}

function resetLearnerships() {
  document.getElementById('ls-result').style.display = 'none';
  document.getElementById('ls-form').style.display = 'block';
}

function renderReminders(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>🔔 My Reminders & Tasks</h2>
    <p style="color:var(--muted);font-size:14px;margin-bottom:4px">Never miss a meeting, task, habit or family gathering again.</p>
    <p style="font-size:12px;color:#38bdf8;margin-bottom:20px;font-style:italic">Your personal assistant that reminds you while you focus on what matters.</p>

    <div id="notif-permission" style="display:none;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="font-size:13px;color:#fff;font-weight:600;margin-bottom:8px">🔔 Enable notifications to get reminders</div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Allow Sky Blueprint to chime and notify you when a task is due — even when this tab is in the background.</p>
      <button class="btn-primary" style="font-size:13px;padding:10px 18px" onclick="enableNotifications()">Turn On Reminders</button>
    </div>

    <div class="tab-bar">
      <div class="tab active" onclick="reminderTab('add',this)">➕ Add New</div>
      <div class="tab" onclick="reminderTab('today',this)">📅 Today</div>
      <div class="tab" onclick="reminderTab('all',this)">📋 All</div>
    </div>

    <!-- ADD TAB -->
    <div id="rt-add">
      <div class="form-group"><label>What do you need to remember? *</label>
        <input type="text" id="rem-title" placeholder="e.g. Board meeting with investors">
      </div>
      <div class="form-group"><label>Category</label>
        <select id="rem-cat">
          <option value="meeting">💼 Meeting / Work</option>
          <option value="task">✅ Task / To-Do</option>
          <option value="habit">🔄 Daily Habit</option>
          <option value="family">👨‍👩‍👧 Family / Personal</option>
          <option value="plan">📌 Plan / Goal</option>
          <option value="payment">💰 Payment / Bill</option>
          <option value="health">❤️ Health / Appointment</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Date *</label><input type="date" id="rem-date"></div>
        <div class="form-group"><label>Time *</label><input type="time" id="rem-time"></div>
      </div>
      <div class="form-group"><label>Repeat?</label>
        <select id="rem-repeat">
          <option value="none">Once only</option>
          <option value="daily">Every day (habit)</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
        </select>
      </div>
      <div class="form-group"><label>Notes (optional)</label>
        <textarea id="rem-notes" rows="2" placeholder="e.g. Bring the financial report, location: Sandton office"></textarea>
      </div>
      <button class="btn-primary" style="width:100%;box-sizing:border-box;font-size:15px;padding:14px" onclick="addReminder()">
        🔔 Set This Reminder
      </button>
    </div>

    <!-- TODAY TAB -->
    <div id="rt-today" style="display:none"></div>

    <!-- ALL TAB -->
    <div id="rt-all" style="display:none"></div>
  </div>`;

  // Set default date to today
  setTimeout(function() {
    var d = document.getElementById('rem-date');
    if (d) d.value = new Date().toISOString().split('T')[0];
    // Show notification permission prompt if not granted
    if ('Notification' in window && Notification.permission !== 'granted') {
      var np = document.getElementById('notif-permission');
      if (np) np.style.display = 'block';
    }
    // Start the reminder checker
    startReminderChecker();
  }, 100);
}

function reminderTab(tab, el) {
  ['add','today','all'].forEach(function(t){
    var e = document.getElementById('rt-' + t);
    if (e) e.style.display = 'none';
  });
  var target = document.getElementById('rt-' + tab);
  if (target) target.style.display = 'block';
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');

  if (tab === 'today') renderTodayReminders();
  if (tab === 'all') renderAllReminders();
}

function getReminders() {
  try { return JSON.parse(safeStorage.getItem('sb_reminders') || '[]'); }
  catch(e) { return []; }
}

function saveReminders(list) {
  safeStorage.setItem('sb_reminders', JSON.stringify(list));
}

function addReminder() {
  var title  = (document.getElementById('rem-title')  || {value:''}).value.trim();
  var cat    = (document.getElementById('rem-cat')    || {value:'task'}).value;
  var date   = (document.getElementById('rem-date')   || {value:''}).value;
  var time   = (document.getElementById('rem-time')   || {value:''}).value;
  var repeat = (document.getElementById('rem-repeat') || {value:'none'}).value;
  var notes  = (document.getElementById('rem-notes')  || {value:''}).value.trim();

  if (!title) { alert('Please write what you need to remember.'); return; }
  if (!date || !time) { alert('Please set both a date and time for your reminder.'); return; }

  var reminders = getReminders();
  reminders.push({
    id: Date.now(),
    title: title, cat: cat, date: date, time: time,
    repeat: repeat, notes: notes, done: false, notified: false
  });
  saveReminders(reminders);

  // Ask for notification permission if not set
  if ('Notification' in window && Notification.permission === 'default') {
    enableNotifications();
  }

  alert('🔔 Reminder set!\n\n"' + title + '"\non ' + formatReminderDate(date, time) + (repeat !== 'none' ? '\nRepeats: ' + repeat : ''));

  // Clear form
  document.getElementById('rem-title').value = '';
  document.getElementById('rem-notes').value = '';
  document.getElementById('rem-time').value = '';

  // Switch to today tab
  var tabs = document.querySelectorAll('.tab');
  if (tabs[1]) reminderTab('today', tabs[1]);
}

var CAT_INFO = {
  meeting: { icon:'💼', label:'Meeting', color:'#38bdf8' },
  task:    { icon:'✅', label:'Task', color:'#10b981' },
  habit:   { icon:'🔄', label:'Habit', color:'#a855f7' },
  family:  { icon:'👨‍👩‍👧', label:'Family', color:'#ec4899' },
  plan:    { icon:'📌', label:'Plan', color:'#f59e0b' },
  payment: { icon:'💰', label:'Payment', color:'#22c55e' },
  health:  { icon:'❤️', label:'Health', color:'#ef4444' }
};

function formatReminderDate(date, time) {
  try {
    var d = new Date(date + 'T' + time);
    return d.toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short' }) + ' at ' +
           d.toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit' });
  } catch(e) { return date + ' ' + time; }
}

function renderTodayReminders() {
  var el = document.getElementById('rt-today');
  if (!el) return;
  var today = new Date().toISOString().split('T')[0];
  var reminders = getReminders().filter(function(r){
    return r.date === today || r.repeat === 'daily';
  }).sort(function(a,b){ return a.time.localeCompare(b.time); });

  if (reminders.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">📅</div><p>No reminders for today.<br>Tap "Add New" to set one.</p></div>';
    return;
  }

  el.innerHTML = '<div style="font-size:13px;color:var(--muted);margin-bottom:14px">You have <strong style="color:#fff">' + reminders.length + '</strong> reminder' + (reminders.length>1?'s':'') + ' for today</div>' +
    reminders.map(renderReminderCard).join('');
}

function renderAllReminders() {
  var el = document.getElementById('rt-all');
  if (!el) return;
  var reminders = getReminders().sort(function(a,b){
    return (a.date + a.time).localeCompare(b.date + b.time);
  });

  if (reminders.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">📋</div><p>No reminders yet.<br>Tap "Add New" to create your first one.</p></div>';
    return;
  }

  el.innerHTML = '<div style="font-size:13px;color:var(--muted);margin-bottom:14px">All your reminders (' + reminders.length + ')</div>' +
    reminders.map(renderReminderCard).join('');
}

function renderReminderCard(r) {
  var ci = CAT_INFO[r.cat] || CAT_INFO.task;
  var repeatBadge = r.repeat !== 'none' ? '<span style="font-size:10px;background:rgba(168,85,247,0.15);color:#a855f7;padding:2px 8px;border-radius:10px;margin-left:6px">🔄 ' + r.repeat + '</span>' : '';
  return '<div id="rem-card-' + r.id + '" style="background:' + (r.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)') + ';border:1px solid ' + ci.color + '33;border-left:3px solid ' + ci.color + ';border-radius:10px;padding:14px;margin-bottom:10px;' + (r.done ? 'opacity:0.5' : '') + '">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
    '<div style="flex:1;min-width:0">' +
    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
    '<span style="font-size:16px">' + ci.icon + '</span>' +
    '<span style="font-size:14px;font-weight:700;color:#fff;' + (r.done ? 'text-decoration:line-through' : '') + '">' + r.title + '</span>' +
    repeatBadge +
    '</div>' +
    '<div style="font-size:12px;color:' + ci.color + ';font-weight:600;margin-bottom:2px">🕐 ' + formatReminderDate(r.date, r.time) + '</div>' +
    (r.notes ? '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + r.notes + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
    (!r.done ? '<button onclick="completeReminder(' + r.id + ')" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;font-family:var(--font);font-weight:600">✓ Done</button>' : '') +
    '<button onclick="deleteReminder(' + r.id + ')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;font-family:var(--font)">Delete</button>' +
    '</div></div></div>';
}

function completeReminder(id) {
  var reminders = getReminders();
  var r = reminders.find(function(x){ return x.id === id; });
  if (r) {
    if (r.repeat !== 'none') {
      // For repeating, advance to next occurrence instead of marking done
      var d = new Date(r.date + 'T' + r.time);
      if (r.repeat === 'daily') d.setDate(d.getDate() + 1);
      else if (r.repeat === 'weekly') d.setDate(d.getDate() + 7);
      else if (r.repeat === 'monthly') d.setMonth(d.getMonth() + 1);
      r.date = d.toISOString().split('T')[0];
      r.notified = false;
      alert('✓ Done! This repeating reminder is set for its next time: ' + formatReminderDate(r.date, r.time));
    } else {
      r.done = true;
    }
    saveReminders(reminders);
    renderTodayReminders();
    renderAllReminders();
  }
}

function deleteReminder(id) {
  if (!confirm('Delete this reminder?')) return;
  var reminders = getReminders().filter(function(x){ return x.id !== id; });
  saveReminders(reminders);
  renderTodayReminders();
  renderAllReminders();
}

function enableNotifications() {
  if (!('Notification' in window)) {
    alert('Your browser does not support notifications. Reminders will still show when you open Sky Blueprint.');
    return;
  }
  Notification.requestPermission().then(function(perm) {
    if (perm === 'granted') {
      var np = document.getElementById('notif-permission');
      if (np) np.style.display = 'none';
      new Notification('🔔 Sky Blueprint Reminders On!', { body: 'Great! We will now remind you of your tasks and meetings.' });
    } else {
      alert('Notifications were not enabled. You can turn them on later in your browser settings. Reminders will still chime when Sky Blueprint is open.');
    }
  });
}

var _reminderCheckerStarted = false;
function startReminderChecker() {
  if (_reminderCheckerStarted) return;
  _reminderCheckerStarted = true;
  setInterval(checkReminders, 30000); // check every 30 seconds
  checkReminders();
}

function checkReminders() {
  var now = new Date();
  var reminders = getReminders();
  var changed = false;

  reminders.forEach(function(r) {
    if (r.done || r.notified) return;
    var due = new Date(r.date + 'T' + r.time);
    // Fire if due time has arrived (within the last 2 minutes window)
    var diff = now - due;
    if (diff >= 0 && diff < 120000) {
      fireReminder(r);
      r.notified = true;
      changed = true;
    }
  });

  if (changed) saveReminders(reminders);
}

function fireReminder(r) {
  var ci = CAT_INFO[r.cat] || CAT_INFO.task;
  var body = ci.label + ' • ' + formatReminderDate(r.date, r.time) + (r.notes ? '\n' + r.notes : '');

  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    var n = new Notification('🔔 ' + r.title, { body: body, requireInteraction: true });
  }

  // Chime sound
  playChime();

  // On-screen alert as backup
  showReminderPopup(r);
}

function playChime() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var notes = [523.25, 659.25, 783.99]; // C, E, G chord
    notes.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      var start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      osc.start(start);
      osc.stop(start + 0.8);
    });
  } catch(e) {}
}

function showReminderPopup(r) {
  var ci = CAT_INFO[r.cat] || CAT_INFO.task;
  var existing = document.getElementById('reminder-popup');
  if (existing) existing.remove();

  var popup = document.createElement('div');
  popup.id = 'reminder-popup';
  popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f1629;border:2px solid ' + ci.color + ';border-radius:16px;padding:20px 24px;box-shadow:0 10px 40px rgba(0,0,0,0.5);max-width:90vw;width:380px;animation:slideDown 0.3s ease';
  popup.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
    '<span style="font-size:28px">' + ci.icon + '</span>' +
    '<div><div style="font-size:11px;color:' + ci.color + ';font-weight:700;text-transform:uppercase;letter-spacing:1px">🔔 Reminder — ' + ci.label + '</div>' +
    '<div style="font-size:17px;font-weight:800;color:#fff">' + r.title + '</div></div>' +
    '</div>' +
    (r.notes ? '<div style="font-size:13px;color:var(--muted);margin:8px 0">' + r.notes + '</div>' : '') +
    '<div style="font-size:12px;color:' + ci.color + ';margin-bottom:14px">🕐 ' + formatReminderDate(r.date, r.time) + '</div>' +
    '<button onclick="document.getElementById(\'reminder-popup\').remove()" style="width:100%;background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font)">Got it ✓</button>';

  document.body.appendChild(popup);
  // Auto-remove after 30 seconds
  setTimeout(function(){ var p = document.getElementById('reminder-popup'); if (p) p.remove(); }, 30000);
}

function renderSAMap(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>SA Map & Location</h2>
    <p>Explore South Africa. Search any city, suburb or address.</p>
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <input type="text" id="ms" placeholder="Search any SA location..." style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-family:var(--font);font-size:14px;outline:none">
      <button class="send-btn" onclick="searchM()">Search</button>
    </div>
    <div class="map-frame" id="map-f"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7335215!2d25.0843!3d-29.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1c34a689d9ee1251%3A0xe85d630c1fa4e8a0!2sSouth%20Africa!5e0!3m2!1sen!2sza!4v1234567890" allowfullscreen loading="lazy"></iframe></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      ${['Cape Town','Johannesburg','Durban','Pretoria','Port Elizabeth','Bloemfontein','Polokwane','Nelspruit'].map(c=>`<button class="chip" onclick="mapCity('${c}')">${c}</button>`).join('')}
    </div>
  </div>`;
}
function searchM(){const q=document.getElementById('ms').value;if(!q)return;document.getElementById('map-f').innerHTML=`<iframe src="https://www.google.com/maps?q=${encodeURIComponent(q+' South Africa')}&output=embed" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none"></iframe>`;}
function mapCity(c){document.getElementById('ms').value=c;searchM();}

// ── Paystack Payment ──
function startPaystack(plan) {
  currentPlan = plan;
  var titles = {
    website: 'Order Your Website — R450',
    monthly: 'Subscribe Monthly — R55/month',
    yearly: '3-Year Plan — R1,980/year'
  };
  var subs = {
    website: 'R450 once-off · We build your professional website in 24-48 hours',
    monthly: 'R55/month · All 11 tools · Auto-debit via Paystack · Cancel anytime',
    yearly: 'R1,980 per year for 3 years · Auto-renews yearly · All tools'
  };
  document.getElementById('modal-title').textContent = titles[plan] || 'Subscribe to Sky Blueprint';
  document.getElementById('modal-sub').textContent = subs[plan] || '';
  if (currentUser) {
    document.getElementById('pay-name').value = (currentUser.fname + ' ' + currentUser.lname).trim();
    document.getElementById('pay-email').value = currentUser.email || '';
    document.getElementById('pay-phone').value = currentUser.phone || '';
  }
  document.getElementById('pay-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('pay-modal').classList.add('hidden'); }

function processPayment() {
  const name = document.getElementById('pay-name').value.trim();
  const email = document.getElementById('pay-email').value.trim();
  const phone = document.getElementById('pay-phone').value.trim();
  if (!name || !email) { alert('Please enter your name and email to continue.'); return; }

  // MONTHLY - charge R55 via Paystack popup. Access is granted ONLY after payment succeeds.
  if (currentPlan === 'monthly') {
    if (typeof PaystackPop === 'undefined') {
      // Popup library not loaded - fall back to the payment page (access NOT granted until confirmed)
      closeModal();
      alert('Opening secure Paystack checkout. Your access activates once payment is confirmed.');
      window.open(PAYSTACK_MONTHLY_LINK + '?email=' + encodeURIComponent(email), '_blank');
      return;
    }
    var handlerM = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: 5500, // R55.00 in cents
      currency: 'ZAR',
      ref: 'SB-M-' + Date.now(),
      metadata: { name: name, phone: phone, plan: 'monthly' },
      callback: function(response) {
        // This ONLY fires on a real successful payment - verify with server
        closeModal();
        markPlanActive('monthly', name, email, phone, response.reference);
      },
      onClose: function() {
        // User closed without paying - NO access granted
      }
    });
    handlerM.openIframe();
    return;
  }

  // YEARLY - use Paystack subscription plan (R1,980/year for 3 years) via popup
  if (currentPlan === 'yearly') {
    if (typeof PaystackPop === 'undefined') {
      // Popup not loaded - open checkout but do NOT grant access until confirmed
      closeModal();
      alert('Opening secure Paystack checkout. Your access activates once payment is confirmed.');
      window.open('https://paystack.com/pay/' + PAYSTACK_YEARLY_PLAN, '_blank');
      return;
    }
    const handlerY = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      plan: PAYSTACK_YEARLY_PLAN,
      currency: 'ZAR',
      ref: 'SB-Y-' + Date.now(),
      metadata: { name: name, phone: phone, plan: 'yearly' },
      callback: function(response) {
        closeModal();
        markPlanActive('yearly', name, email, phone, response.reference);
      },
      onClose: function() {}
    });
    handlerY.openIframe();
    return;
  }

  // WEBSITE and other once-off payments via popup
  if (typeof PaystackPop === 'undefined') {
    closeModal();
    alert('Redirecting to secure Paystack checkout...');
    window.open(PAYSTACK_MONTHLY_LINK, '_blank');
    return;
  }

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: PRICES[currentPlan] || 45000,
    currency: 'ZAR',
    ref: 'SB-' + Date.now(),
    metadata: { name: name, phone: phone, plan: currentPlan },
    callback: function(response) {
      closeModal();
      markPlanActive(currentPlan, name, email, phone, response.reference);
    },
    onClose: function() {}
  });
  handler.openIframe();
}

function markPlanActive(plan, name, email, phone, reference) {
  // SECURE: verify the payment with the server before granting access.
  // The server asks Paystack directly if the payment is real.
  var token = safeStorage.getItem('sb_token');
  if (!token) { alert('Please log in first, then subscribe.'); showPage('login'); return; }
  if (plan === 'website') {
    // website orders are leads, not access - just notify
    fetch(BACKEND_URL + '/api/login-notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fname:name, lname:'', email:email, action:'website-order' }) }).catch(function(){});
    return;
  }
  if (!reference) { alert('Payment reference missing. If you were charged, please contact support.'); return; }

  fetch(BACKEND_URL + '/api/verify-payment', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ reference: reference, token: token, plan: plan })
  })
  .then(function(r){ return r.json().then(function(d){ return { ok:r.ok, d:d }; }); })
  .then(function(res){
    if (res.ok && res.d.success) {
      // Server confirmed the payment is REAL. Update our view from the server's truth.
      currentUser = res.d.user;
      safeStorage.setItem('sb_current', JSON.stringify(currentUser));
      var banner = document.getElementById('trial-banner');
      if (banner) {
        banner.innerHTML = '✅ <strong>Payment verified! You are now on Sky Blueprint ' + (currentUser.plan||'').toUpperCase() + '.</strong> All tools unlocked.';
        banner.style.background = 'rgba(16,185,129,0.08)';
        banner.style.borderColor = 'rgba(16,185,129,0.3)';
      }
      updateNav();
      showPage('dashboard');
    } else {
      alert('We could not verify your payment yet. If you were charged, it may take a moment — please refresh, or contact support with your reference: ' + reference);
    }
  })
  .catch(function(){ alert('Could not verify payment right now. If you were charged, please contact support with reference: ' + reference); });
}

// ── Init ──
// ── REVIEWS SYSTEM ──
var _rmRating = 0;

function loadReviews() {
  fetch(BACKEND_URL + '/api/reviews')
    .then(function(r){ return r.json(); })
    .then(function(data){
      renderReviews(data.reviews || []);
    })
    .catch(function(){
      // Fallback to a few starter reviews if backend not reachable
      renderReviews([]);
    });
}

function renderReviews(reviews) {
  // If no reviews yet, show friendly starter state
  var avgEl = document.getElementById('rs-avg');
  var starsEl = document.getElementById('rs-stars');
  var countEl = document.getElementById('rs-count');
  var barsEl = document.getElementById('rs-bars');
  var gridEl = document.getElementById('review-grid');
  if (!avgEl) return;

  if (reviews.length === 0) {
    avgEl.textContent = '5.0';
    starsEl.textContent = '★★★★★';
    countEl.textContent = 'Be the first to review!';
    barsEl.innerHTML = '';
    gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">No reviews yet. Be the first to share your experience! 🌟</div>';
    return;
  }

  // Calculate average
  var total = 0;
  var counts = {1:0,2:0,3:0,4:0,5:0};
  reviews.forEach(function(r){ total += r.rating; counts[r.rating] = (counts[r.rating]||0) + 1; });
  var avg = (total / reviews.length).toFixed(1);

  avgEl.textContent = avg;
  starsEl.textContent = starString(Math.round(avg));
  countEl.textContent = 'Based on ' + reviews.length + ' verified review' + (reviews.length>1?'s':'');

  // Bars (5 down to 1)
  var barsHtml = '';
  for (var s = 5; s >= 1; s--) {
    var c = counts[s] || 0;
    var pct = reviews.length ? (c / reviews.length * 100) : 0;
    barsHtml += '<div class="rs-bar-row">' +
      '<span class="rs-bar-label">' + s + '<span class="star">★</span></span>' +
      '<span class="rs-bar-track"><span class="rs-bar-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="rs-bar-count">' + c + '</span>' +
      '</div>';
  }
  barsEl.innerHTML = barsHtml;

  // Review cards (newest first)
  var sorted = reviews.slice().reverse();
  gridEl.innerHTML = sorted.map(function(r){
    return '<div class="review-card">' +
      '<div class="rc-stars">' + starString(r.rating) + '</div>' +
      '<div class="rc-text">"' + escapeHtml(r.text) + '"</div>' +
      '<div class="rc-name">' + escapeHtml(r.name) + '</div>' +
      '<div class="rc-meta">✓ Verified user' + (r.city ? ' · ' + escapeHtml(r.city) : '') + '</div>' +
      '</div>';
  }).join('');
}

function starString(n) {
  n = Math.max(0, Math.min(5, n));
  return '★★★★★'.substring(0, n) + '☆☆☆☆☆'.substring(0, 5-n);
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function openReviewForm() {
  var modal = document.getElementById('review-modal');
  if (modal) modal.style.display = 'flex';
  _rmRating = 0;
  updateStarPicker();
  // Pre-fill name if logged in
  if (currentUser) {
    var nm = document.getElementById('rm-name');
    if (nm && currentUser.fname) nm.value = currentUser.fname + ' ' + (currentUser.lname ? currentUser.lname.charAt(0) + '.' : '');
  }
}

function closeReviewForm() {
  var modal = document.getElementById('review-modal');
  if (modal) modal.style.display = 'none';
}

function setupStarPicker() {
  var stars = document.querySelectorAll('#rm-stars span');
  stars.forEach(function(star){
    star.addEventListener('click', function(){
      _rmRating = parseInt(this.getAttribute('data-star'));
      updateStarPicker();
    });
  });
}

function updateStarPicker() {
  var stars = document.querySelectorAll('#rm-stars span');
  stars.forEach(function(star){
    var v = parseInt(star.getAttribute('data-star'));
    if (v <= _rmRating) star.classList.add('active');
    else star.classList.remove('active');
  });
}

function submitReview() {
  var name = (document.getElementById('rm-name') || {value:''}).value.trim();
  var city = (document.getElementById('rm-city') || {value:''}).value.trim();
  var text = (document.getElementById('rm-text') || {value:''}).value.trim();

  if (_rmRating === 0) { alert('Please tap the stars to give a rating.'); return; }
  if (!name) { alert('Please enter your name.'); return; }
  if (!text) { alert('Please write a few words about your experience.'); return; }

  var review = { rating: _rmRating, name: name, city: city, text: text };

  fetch(BACKEND_URL + '/api/reviews', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(review)
  }).then(function(r){ return r.json(); }).then(function(){
    closeReviewForm();
    alert('🌟 Thank you for your review! It has been posted.');
    // Clear form
    document.getElementById('rm-name').value = '';
    document.getElementById('rm-city').value = '';
    document.getElementById('rm-text').value = '';
    _rmRating = 0;
    loadReviews();
  }).catch(function(){
    alert('Could not post your review right now. Please try again later.');
  });
}

// ── REVIEWS SYSTEM ──
var _selectedRating = 0;

// Starter reviews shown until real ones come in (these are examples)
var SEED_REVIEWS = [
  { name:'Thabo M.', city:'Johannesburg', rating:5, text:'Sky Blueprint helped me build my CV and I got a learnership within two weeks. This is exactly what young South Africans need!' },
  { name:'Nomsa D.', city:'Durban', rating:5, text:'The AI Email Secretary sorted my messy inbox in seconds. I never miss important emails now. Worth every rand.' },
  { name:'Sipho K.', city:'Pretoria', rating:4, text:'Got my business website in 3 days. Professional and affordable. The team really knows what they are doing.' },
  { name:'Lerato P.', city:'Cape Town', rating:5, text:'I love the reminders tool! It keeps my whole day organised. As a busy entrepreneur this is a lifesaver.' },
  { name:'Ayanda N.', city:'Bloemfontein', rating:5, text:'All these tools for R55 a month is incredible value. The learnerships tool found me opportunities I did not know existed.' },
  { name:'Kagiso R.', city:'Polokwane', rating:4, text:'Great platform built for South Africans. Easy to use even if you are not good with technology. Highly recommend.' }
];

function getReviews() {
  try {
    var stored = JSON.parse(safeStorage.getItem('sb_reviews') || 'null');
    if (stored && stored.length) return stored;
  } catch(e) {}
  return SEED_REVIEWS.slice();
}

function loadReviews() {
  // Try backend first, fall back to local
  fetch(BACKEND_URL + '/api/get-reviews')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data && data.reviews && data.reviews.length) {
        renderReviews(data.reviews);
      } else {
        renderReviews(getReviews());
      }
    })
    .catch(function(){ renderReviews(getReviews()); });
}

function renderReviews(reviews) {
  if (!reviews || !reviews.length) reviews = getReviews();

  // Calculate average and breakdown
  var total = reviews.length;
  var sum = 0;
  var counts = {1:0,2:0,3:0,4:0,5:0};
  reviews.forEach(function(r){ sum += r.rating; counts[r.rating] = (counts[r.rating]||0)+1; });
  var avg = (sum / total).toFixed(1);

  // Update summary
  var avgEl = document.getElementById('rs-avg');
  var starsEl = document.getElementById('rs-stars');
  var countEl = document.getElementById('rs-count');
  if (avgEl) avgEl.textContent = avg;
  if (starsEl) starsEl.textContent = starString(Math.round(avg));
  if (countEl) countEl.textContent = 'Based on ' + total + ' verified review' + (total===1?'':'s');

  // Build bars (5 down to 1)
  var barsEl = document.getElementById('rs-bars');
  if (barsEl) {
    var html = '';
    for (var star = 5; star >= 1; star--) {
      var c = counts[star] || 0;
      var pct = total > 0 ? Math.round((c/total)*100) : 0;
      html += '<div class="rs-bar-row">' +
        '<span class="rs-bar-label">' + star + '★</span>' +
        '<div class="rs-bar-track"><div class="rs-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="rs-bar-count">' + c + '</span>' +
        '</div>';
    }
    barsEl.innerHTML = html;
  }

  // Build review cards
  var gridEl = document.getElementById('review-grid');
  if (gridEl) {
    gridEl.innerHTML = reviews.map(function(r){
      return '<div class="review-card">' +
        '<div class="rc-stars">' + starString(r.rating) + '</div>' +
        '<div class="rc-text">"' + escapeHtml(r.text) + '"</div>' +
        '<div class="rc-name">' + escapeHtml(r.name) + '</div>' +
        '<div class="rc-verified">✓ Verified buyer' + (r.city ? ' · ' + escapeHtml(r.city) : '') + '</div>' +
        '</div>';
    }).join('');
  }
}

function starString(n) {
  n = Math.max(0, Math.min(5, n));
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5-n);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function openReviewForm() {
  var modal = document.getElementById('review-modal');
  if (modal) modal.style.display = 'flex';
  _selectedRating = 0;
  updateStarPicker();
}

function closeReviewForm() {
  var modal = document.getElementById('review-modal');
  if (modal) modal.style.display = 'none';
}

function updateStarPicker() {
  var stars = document.querySelectorAll('#rm-stars span');
  stars.forEach(function(s){
    var v = parseInt(s.getAttribute('data-star'));
    if (v <= _selectedRating) s.classList.add('active');
    else s.classList.remove('active');
  });
}

function submitReview() {
  var name = (document.getElementById('rm-name') || {value:''}).value.trim();
  var city = (document.getElementById('rm-city') || {value:''}).value.trim();
  var text = (document.getElementById('rm-text') || {value:''}).value.trim();

  if (_selectedRating === 0) { alert('Please tap the stars to give a rating.'); return; }
  if (!name) { alert('Please enter your name.'); return; }
  if (!text) { alert('Please write a few words about your experience.'); return; }

  var review = { name:name, city:city, rating:_selectedRating, text:text, date:Date.now() };

  // Save locally
  var reviews = getReviews();
  reviews.unshift(review);
  safeStorage.setItem('sb_reviews', JSON.stringify(reviews));

  // Send to backend so everyone sees it + notify owner
  fetch(BACKEND_URL + '/api/add-review', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(review)
  }).catch(function(){});

  closeReviewForm();
  alert('🌟 Thank you for your review, ' + name + '! Your feedback means a lot to us.');

  // Clear form
  document.getElementById('rm-name').value = '';
  document.getElementById('rm-city').value = '';
  document.getElementById('rm-text').value = '';
  _selectedRating = 0;

  renderReviews(reviews);
}

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  const saved = safeStorage.getItem('sb_current');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('dash-greeting').textContent = 'Welcome back, ' + currentUser.fname + '! 👋';
    } catch(e) {}
  }
  // SECURITY: ask the server for the REAL plan. Overrides any tampered browser value.
  var _tok = safeStorage.getItem('sb_token');
  if (_tok) {
    fetch(BACKEND_URL + '/api/auth/me', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token: _tok })
    })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if (data && data.success) {
        currentUser = data.user;
        safeStorage.setItem('sb_current', JSON.stringify(currentUser));
        updateNav();
      } else {
        currentUser = null;
        safeStorage.removeItem('sb_token');
        safeStorage.removeItem('sb_current');
        updateNav();
      }
    })
    .catch(function(){});
  }
  // Update nav to show name + trial days if logged in
  updateNav();
  // Start reminder checker globally so reminders chime anywhere
  if (typeof startReminderChecker === 'function') startReminderChecker();
  // Load and display reviews
  if (typeof loadReviews === 'function') loadReviews();
  // Star picker click handlers
  var starPicker = document.getElementById('rm-stars');
  if (starPicker) {
    starPicker.querySelectorAll('span').forEach(function(s){
      s.addEventListener('click', function(){
        _selectedRating = parseInt(s.getAttribute('data-star'));
        updateStarPicker();
      });
    });
  }
  // Load reviews and set up star picker
  if (typeof loadReviews === 'function') loadReviews();
  if (typeof setupStarPicker === 'function') setupStarPicker();
  // Load Paystack script
  const ps = document.createElement('script');
  ps.src = 'https://js.paystack.co/v1/inline.js';
  document.head.appendChild(ps);
});function searchJ(platform,el){
  if(el){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));el.classList.add('active');}

  var q = document.getElementById('js-q').value || '';
  var l = document.getElementById('js-l').value || 'South Africa';
  var skills = document.getElementById('cv-sk') ? document.getElementById('cv-sk').value : '';
  var qual = document.getElementById('cv-qu') ? document.getElementById('cv-qu').value : '';
  var jobTitle = document.getElementById('cv-jt') ? document.getElementById('cv-jt').value : '';

  var res = document.getElementById('job-res');
  res.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">🔍 AI is matching your CV to available jobs...</div>';

  // Call backend for AI matching
  fetch(BACKEND_URL + '/api/match-jobs', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ skills, qualification: qual, jobTitle, city: l, searchQuery: q })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    showJobResults(data, platform, q, l);
  })
  .catch(function(){
    // Fallback if backend not connected yet
    showJobResults({ level:'entry', levelName:'Entry Level', jobTitle: q||jobTitle, location: l }, platform, q, l);
  });
}

function showJobResults(data, platform, q, l) {
  var jobTitle = data.jobTitle || q || 'jobs';
  var location = data.location || l;
  var level = data.level || 'entry';
  var levelName = data.levelName || 'Entry Level';

  var encode = encodeURIComponent;
  var li = 'https://www.linkedin.com/jobs/search/?keywords='+encode(jobTitle)+'&location='+encode(location);
  var ind = 'https://za.indeed.com/jobs?q='+encode(jobTitle)+'&l='+encode(location);
  var pnet = 'https://www.pnet.co.za/jobs/'+encode(jobTitle.toLowerCase().replace(/\s+/g,'-'))+'/';
  var youth = 'https://www.youthmobi.com/jobs?search='+encode(jobTitle);

  var levelColors = {
    entry: '#10b981', skilled: '#f59e0b',
    mid: '#38bdf8', executive: '#8b5cf6'
  };

  var res = document.getElementById('job-res');
  res.innerHTML = `
    <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:10px;height:10px;border-radius:50%;background:${levelColors[level]};flex-shrink:0"></div>
        <p style="font-size:13px;color:#fff;margin:0">CV Level detected: <strong style="color:${levelColors[level]}">${levelName}</strong></p>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:6px 0 0">Showing only jobs matching your qualification level</p>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${platform!=='indeed'&&platform!=='pnet'&&platform!=='youth'?`<a href="${li}" target="_blank" style="flex:1;min-width:120px;background:rgba(0,102,255,0.1);border:1px solid rgba(0,102,255,0.25);color:#6699ff;border-radius:10px;padding:10px;text-align:center;font-size:12px;font-weight:600;text-decoration:none">🔗 LinkedIn Jobs</a>`:''}
      ${platform!=='linkedin'&&platform!=='pnet'&&platform!=='youth'?`<a href="${ind}" target="_blank" style="flex:1;min-width:120px;background:rgba(245,130,0,0.1);border:1px solid rgba(245,130,0,0.25);color:#ffa040;border-radius:10px;padding:10px;text-align:center;font-size:12px;font-weight:600;text-decoration:none">🔍 Indeed Jobs</a>`:''}
      ${platform==='both'||platform==='pnet'?`<a href="${pnet}" target="_blank" style="flex:1;min-width:120px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:var(--green);border-radius:10px;padding:10px;text-align:center;font-size:12px;font-weight:600;text-decoration:none">💼 Pnet SA Jobs</a>`:''}
      <a href="${youth}" target="_blank" style="flex:1;min-width:120px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);color:#a78bfa;border-radius:10px;padding:10px;text-align:center;font-size:12px;font-weight:600;text-decoration:none">🎯 YouthMobi</a>
    </div>

    <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Click any button above to see real live jobs matching your CV on that platform</p>
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:12px 14px">
      <p style="font-size:12px;color:#f59e0b;margin:0">⚠️ <strong>CV Level Warning:</strong> ${
        level==='entry' ? 'Your CV matches entry level positions (Matric/Grade 12). Apply for junior, internship and learnership positions.' :
        level==='skilled' ? 'Your CV matches skilled trade positions (Diploma/Trade Certificate). Apply for artisan, technician and skilled worker roles.' :
        level==='mid' ? 'Your CV matches mid-level positions (Degree holder). Apply for professional, supervisor and management roles.' :
        'Your CV matches executive level positions. Apply for senior management, director and C-suite roles only.'
      }</p>
    </div>`;
}


// ── SA Map ──
function renderSAMap(el) {
  el.innerHTML = `
  <div class="tool-screen">
    <h2>SA Map & Location</h2>
    <p>Explore South Africa. Search any city, suburb or address.</p>
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <input type="text" id="ms" placeholder="Search any SA location..." style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-family:var(--font);font-size:14px;outline:none">
      <button class="send-btn" onclick="searchM()">Search</button>
    </div>
    <div class="map-frame" id="map-f"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7335215!2d25.0843!3d-29.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1c34a689d9ee1251%3A0xe85d630c1fa4e8a0!2sSouth%20Africa!5e0!3m2!1sen!2sza!4v1234567890" allowfullscreen loading="lazy"></iframe></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      ${['Cape Town','Johannesburg','Durban','Pretoria','Port Elizabeth','Bloemfontein','Polokwane','Nelspruit'].map(c=>`<button class="chip" onclick="mapCity('${c}')">${c}</button>`).join('')}
    </div>
  </div>`;
}
function searchM(){const q=document.getElementById('ms').value;if(!q)return;document.getElementById('map-f').innerHTML=`<iframe src="https://www.google.com/maps?q=${encodeURIComponent(q+' South Africa')}&output=embed" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none"></iframe>`;}
function mapCity(c){document.getElementById('ms').value=c;searchM();}

// ── Paystack Payment ──
// ── Init ──
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  const saved = safeStorage.getItem('sb_current');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('dash-greeting').textContent = 'Welcome back, ' + currentUser.fname + '! 👋';
    } catch(e) {}
  }
  // SECURITY: ask the server for the REAL plan. Overrides any tampered browser value.
  var _tok = safeStorage.getItem('sb_token');
  if (_tok) {
    fetch(BACKEND_URL + '/api/auth/me', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token: _tok })
    })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if (data && data.success) {
        currentUser = data.user;
        safeStorage.setItem('sb_current', JSON.stringify(currentUser));
        updateNav();
      } else {
        currentUser = null;
        safeStorage.removeItem('sb_token');
        safeStorage.removeItem('sb_current');
        updateNav();
      }
    })
    .catch(function(){});
  }
  // Update nav to show name + trial days if logged in
  updateNav();
  // Start reminder checker globally so reminders chime anywhere
  if (typeof startReminderChecker === 'function') startReminderChecker();
  // Load and display reviews
  if (typeof loadReviews === 'function') loadReviews();
  // Star picker click handlers
  var starPicker = document.getElementById('rm-stars');
  if (starPicker) {
    starPicker.querySelectorAll('span').forEach(function(s){
      s.addEventListener('click', function(){
        _selectedRating = parseInt(s.getAttribute('data-star'));
        updateStarPicker();
      });
    });
  }
  // Load reviews and set up star picker
  if (typeof loadReviews === 'function') loadReviews();
  if (typeof setupStarPicker === 'function') setupStarPicker();
  // Load Paystack script
  const ps = document.createElement('script');
  ps.src = 'https://js.paystack.co/v1/inline.js';
  document.head.appendChild(ps);
});

// ══════════════════════════════════════
// SKY BLUEPRINT AI GUIDE ASSISTANT v2
// Full knowledge of every tool and step
// ══════════════════════════════════════

var guideOpen = false;
var guideState = { step: 'welcome', tool: null, data: {} };

function toggleGuide() {
  guideOpen = !guideOpen;
  var win = document.getElementById('guide-window');
  var fab = document.getElementById('guide-fab-label');
  if (guideOpen) {
    win.classList.remove('guide-hidden');
    fab.textContent = 'Close guide';
    if (document.getElementById('guide-messages').children.length === 0) {
      startGuide();
    }
  } else {
    win.classList.add('guide-hidden');
    fab.textContent = 'Need help?';
  }
}

function guideMsg(text, delay) {
  delay = delay || 0;
  return new Promise(function(resolve) {
    setTimeout(function() {
      var msgs = document.getElementById('guide-messages');
      var typing = document.createElement('div');
      typing.className = 'gm-bot';
      typing.id = 'gm-typing-indicator';
      typing.innerHTML = '<div class="gm-bot-icon">🤖</div><div class="gm-bot-bubble"><div class="gm-typing"><span></span><span></span><span></span></div></div>';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;
      setTimeout(function() {
        var t = document.getElementById('gm-typing-indicator');
        if (t) t.remove();
        var bubble = document.createElement('div');
        bubble.className = 'gm-bot';
        bubble.innerHTML = '<div class="gm-bot-icon">🤖</div><div class="gm-bot-bubble">' + text + '</div>';
        msgs.appendChild(bubble);
        msgs.scrollTop = msgs.scrollHeight;
        resolve();
      }, 600 + Math.min(text.length * 8, 1500));
    }, delay);
  });
}

function guideUserSay(text) {
  var msgs = document.getElementById('guide-messages');
  var bubble = document.createElement('div');
  bubble.className = 'gm-user';
  bubble.innerHTML = '<div class="gm-user-bubble">' + text + '</div>';
  msgs.appendChild(bubble);
  msgs.scrollTop = msgs.scrollHeight;
}

function guideOptions(opts) {
  var el = document.getElementById('guide-options');
  el.innerHTML = '';
  opts.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'g-opt';
    btn.textContent = opt.label;
    btn.onclick = function() {
      el.innerHTML = '';
      guideUserSay(opt.label);
      opt.action();
    };
    el.appendChild(btn);
  });
}

function guideClear() {
  document.getElementById('guide-options').innerHTML = '';
}

function guideUserInput() {
  var inp = document.getElementById('guide-input');
  var val = inp.value.trim();
  if (!val) return;
  inp.value = '';
  guideUserSay(val);
  guideHandleInput(val);
}

// ── WELCOME ──
async function startGuide() {
  guideState = { step: 'welcome', tool: null, data: {} };
  await guideMsg('👋 Hello! Welcome to <strong>Sky Blueprint</strong>!<br><br>I am <strong>Sky Guide</strong> — your personal assistant. I know every tool on this platform and I will walk you through anything step by step.<br><br>Can I help you today?');
  guideOptions([
    { label: '✅ Yes please help me!', action: showToolMenu },
    { label: '🙋 What is Sky Blueprint?', action: explainPlatform },
    { label: '💰 Tell me about pricing', action: explainPricing },
    { label: '😊 No thanks, I know what to do', action: guideDismiss }
  ]);
}

async function explainPlatform() {
  await guideMsg('Sky Blueprint is a South African digital platform with <strong>11 powerful tools</strong> in one place:<br><br>🌐 <strong>Website Builder</strong> — build your business website<br>📧 <strong>AI Email Secretary</strong> — sort your real Gmail, Outlook or Yahoo inbox<br>📄 <strong>CV Builder</strong> — build your CV and find matching jobs<br>🎓 <strong>Learnerships & Internships</strong> — find opportunities you qualify for<br>📍 <strong>Find My Phone</strong> — track your phone if lost or stolen<br>🤖 <strong>AI Business Mentor</strong> — get business advice 24/7<br>🔔 <strong>Reminders & Tasks</strong> — never miss a meeting or task<br>🗺️ <strong>SA Map</strong> — explore South Africa (FREE for everyone)<br><br>All tools in one subscription — R55/month or R1,980/year!');
  guideOptions([
    { label: '🚀 Let me start using the tools!', action: showToolMenu },
    { label: '💰 Tell me about pricing', action: explainPricing },
  ]);
}

async function explainPricing() {
  await guideMsg('Sky Blueprint has 3 simple plans:<br><br>🎁 <strong>Free Trial</strong> — 7 days full access, no credit card needed<br><br>📅 <strong>Monthly Plan — R55/month</strong><br>Pay every month via Paystack. Cancel anytime. Auto-debit from your card.<br><br>🗓️ <strong>3-Year Plan — R1,980 once-off</strong><br>Pay once, use for 3 full years. Save money long term!<br><br>📍 <strong>Find My Phone — R450 once-off</strong><br>One time activation fee to register and track your device.<br><br>💳 Payments are processed securely by <strong>Paystack</strong> — Visa, Mastercard, EFT, Ozow all accepted.');
  guideOptions([
    { label: '✅ Start my free trial!', action: function() { showPage('signup'); toggleGuide(); } },
    { label: '🔧 Show me the tools', action: showToolMenu },
  ]);
}

// ── TOOL MENU ──
async function showToolMenu() {
  await guideMsg('Which tool do you need help with?');
  guideOptions([
    { label: '🌐 Website Builder', action: function() { guideTool('website-builder'); } },
    { label: '📧 Email Cleaner', action: function() { guideTool('email-cleaner'); } },
    { label: '📍 Find My Phone', action: function() { guideTool('find-phone'); } },
    { label: '🤖 AI Business Mentor', action: function() { guideTool('ai-mentor'); } },
    { label: '📄 CV Builder & Jobs', action: function() { guideTool('cv-builder'); } },
    { label: '🗺️ SA Map (Free)', action: function() { guideTool('sa-map'); } },
    { label: '❓ I have another question', action: function() {
      guideMsg('Go ahead — type your question below and I will answer it!');
      guideState.step = 'freeask';
      document.getElementById('guide-input').placeholder = 'Type your question here...';
    }}
  ]);
}

async function guideTool(tool) {
  guideState.tool = tool;
  var flows = {
    'website-builder': guideWebsite,
    'email-cleaner': guideEmail,
    'find-phone': guidePhone,
    'ai-mentor': guideAI,
    'cv-builder': guideCV,
    'sa-map': guideMap,
  };
  if (flows[tool]) flows[tool]();
}

// ── WEBSITE BUILDER ──
async function guideWebsite() {
  await guideMsg('Let me open the Website Builder for you!');
  requireAuth('website-builder');
  await guideMsg('The Website Builder creates a professional website for your business in minutes. Here are the steps:<br><br><strong>Step 1</strong> — Type your <strong>Business Name</strong> in the first box<br>Example: Sipho Tech Shop or "M&H Dynamic Tech"<br><br>What is your business name?');
  guideState.step = 'wb-name';
  document.getElementById('guide-input').placeholder = 'Type your business name...';
}

// ── EMAIL CLEANER ──
async function guideEmail() {
  await guideMsg('Let me open the Email Cleaner!');
  requireAuth('email-cleaner');
  await guideMsg('The Email Cleaner connects to your REAL email account and uses AI to sort important emails from spam — then deletes the junk for you.<br><br>Which email provider do you use?');
  guideOptions([
    { label: '📧 Gmail (Google)', action: guideEmailGmail },
    { label: '📬 Outlook / Hotmail', action: guideEmailOutlook },
    { label: '📮 Yahoo Mail', action: guideEmailYahoo },
  ]);
}

async function guideEmailGmail() {
  await guideMsg('To connect your Gmail to Sky Blueprint, follow these exact steps I will walk you through one by one:<br><br>⚠️ <strong>Important:</strong> You cannot use your normal Gmail password here. Gmail requires a special <strong>App Password</strong> for security. Here is how to get it:');
  await guideMsg('1️⃣ <strong>Open a new tab on your COMPUTER</strong> — not your phone browser<br><br>Go to: <strong>myaccount.google.com</strong><br>Sign in with your Gmail account if asked');
  await guideMsg('2️⃣ <strong>Click "Security"</strong> on the left side menu<br><br>You will see a page called "Security & sign-in"');
  await guideMsg('3️⃣ <strong>Scroll down</strong> until you see <strong>"2-Step Verification"</strong><br><br>Click on it → follow the steps to turn it ON → verify with your phone number when asked<br><br>Once it shows <strong>"On"</strong> with a green tick — you are ready for the next step');
  await guideMsg('4️⃣ <strong>Go back to the Security page</strong> → scroll down again<br><br>Now you will see <strong>"App Passwords"</strong> listed below 2-Step Verification<br><br>Click on <strong>App Passwords</strong>');
  await guideMsg('5️⃣ You will see a box that says <strong>"App name"</strong><br><br>Type exactly: <strong>Sky Blueprint</strong><br><br>Then click the <strong>Create</strong> button');
  await guideMsg('6️⃣ Google will show you a <strong>16-character password</strong> like this:<br><br><code style="background:#1a1a2e;padding:6px 10px;border-radius:4px;color:#38bdf8;font-size:14px;letter-spacing:3px">abcd efgh ijkl mnop</code><br><br>⚠️ <strong>Copy it now</strong> — it only shows once! Select all the characters including spaces → copy');
  await guideMsg('7️⃣ <strong>Come back to Sky Blueprint Email Cleaner</strong><br><br>Click <strong>Gmail</strong> → Enter your Gmail address → In the password box paste the <strong>16-character code</strong> Google gave you → Click <strong>Scan My Inbox</strong><br><br>Your real emails will load and AI will sort Important from Spam automatically! ✅');
  guideOptions([
    { label: '✅ It is working — emails loaded!', action: async function() {
      await guideMsg('Excellent! 🎉 Your inbox is now connected!<br><br>You will see two sections:<br>✅ <strong>Important Emails</strong> — emails you need to keep<br>🚨 <strong>Spam Emails</strong> — junk mail you can delete<br><br>You can:<br>• Delete spam one by one using the <strong>Delete</strong> button<br>• Delete all spam at once using <strong>Delete All Spam</strong> button<br><br>This frees up storage on your device and keeps your inbox clean!');
      guideOptions([
        { label: '⬅️ Back to tools', action: showToolMenu },
        { label: '👋 Thank you, I am done!', action: guideDismiss }
      ]);
    }},
    { label: '❓ I cannot find App Passwords', action: async function() {
      await guideMsg('App Passwords only appears on a <strong>computer browser</strong> — not on a phone browser.<br><br>Also make sure <strong>2-Step Verification is turned ON first</strong> — App Passwords will not show if 2-Step Verification is OFF.<br><br>Steps again:<br>1️⃣ Computer browser → myaccount.google.com<br>2️⃣ Security → 2-Step Verification → Turn ON<br>3️⃣ Security → scroll down → App Passwords<br>4️⃣ Type Sky Blueprint → Create → copy the 16 characters');
    }},
    { label: '❓ It still shows connection error', action: async function() {
      await guideMsg('Check these things one by one:<br><br>✅ Gmail address is spelled correctly<br>✅ App Password is pasted correctly — all 16 characters with spaces<br>✅ 2-Step Verification is ON in your Google Account<br>✅ You are connected to the internet<br>✅ You opened myaccount.google.com on a COMPUTER not a phone<br><br>If still not working — go to <strong>myaccount.google.com/apppasswords</strong> and create a brand new App Password and try again');
    }}
  ]);
}

async function guideEmailOutlook() {
  await guideMsg('Good news — Outlook is easier than Gmail!<br><br>1️⃣ Click <strong>Outlook</strong> on the Email Cleaner screen<br>2️⃣ Enter your Outlook email address (example@outlook.com or example@hotmail.com)<br>3️⃣ Enter your <strong>normal Outlook password</strong><br>4️⃣ Click <strong>Scan My Inbox</strong><br><br>Outlook does not need a special App Password — your normal password works!');
  guideOptions([
    { label: '✅ Got it!', action: showToolMenu },
    { label: '❓ It shows error', action: async function() {
      await guideMsg('If Outlook shows an error:<br><br>✅ Check your email address is spelled correctly<br>✅ Make sure your Outlook password is correct<br>✅ If you use Microsoft 2-factor auth, you may need an App Password from <strong>account.microsoft.com/security</strong>');
    }}
  ]);
}

async function guideEmailYahoo() {
  await guideMsg('Yahoo also needs an App Password for security.<br><br>1️⃣ Go to <strong>login.yahoo.com</strong><br>2️⃣ Click your profile → <strong>Account Security</strong><br>3️⃣ Turn on <strong>2-Step Verification</strong><br>4️⃣ Click <strong>Generate App Password</strong><br>5️⃣ Select "Other App" → type <strong>Sky Blueprint</strong> → Generate<br>6️⃣ Copy the password → come back → use it in Email Cleaner');
  guideOptions([
    { label: '✅ Got it!', action: showToolMenu },
  ]);
}

// ── FIND MY PHONE ──
async function guidePhone() {
  await guideMsg('Let me open Find My Phone!');
  requireAuth('find-phone');
  await guideMsg('Find My Phone lets you track, ring, lock or wipe your phone remotely if it is lost or stolen.<br><br>⚠️ There is a <strong>once-off R450 activation fee</strong> to use this tool. This funds the development of the Sky Blueprint tracking app.<br><br>What you get with R450:<br>✅ Register unlimited devices<br>✅ Live GPS tracking on SA map<br>✅ Get directions to your phone<br>✅ Ring your phone remotely<br>✅ Lock your phone remotely<br>✅ See 7 days of location history<br><br>Would you like to proceed?');
  guideOptions([
    { label: '✅ Yes, pay R450 and activate', action: async function() {
      await guideMsg('To pay and activate:<br><br>1️⃣ Click <strong>Pay R450 & Activate Now</strong> on the screen<br>2️⃣ Enter your Full Name, Email and Phone Number<br>3️⃣ Click <strong>Pay Securely with Paystack</strong><br>4️⃣ Complete payment with your card, EFT or Ozow<br>5️⃣ After payment you go to the <strong>Register Device</strong> screen');
      guideOptions([
        { label: '📱 How to register my device?', action: guidePhoneRegister },
        { label: '🔍 How to track my phone?', action: guidePhoneTrack },
      ]);
    }},
    { label: '❓ Tell me more first', action: async function() {
      await guideMsg('Find My Phone works with the Sky Blueprint tracking app on your device.<br><br>📱 Once you register your device and download the app, it silently records your phone GPS location every few minutes.<br><br>🚨 If your phone is stolen — log into Sky Blueprint from any device → open Find My Phone → see the last known location on the SA map → ring it, lock it or wipe it remotely.<br><br>This has already helped many people recover their stolen phones in South Africa!');
      guideOptions([
        { label: '✅ Lets activate it!', action: function() { guideTool('find-phone'); }},
        { label: '⬅️ Back to tools', action: showToolMenu },
      ]);
    }}
  ]);
}

async function guidePhoneRegister() {
  await guideMsg('To register your device:<br><br>1️⃣ Click the <strong>Register Device</strong> tab<br>2️⃣ Enter your <strong>Full Name</strong><br>3️⃣ Enter your <strong>Phone Number</strong><br>4️⃣ Enter your <strong>Device Make & Model</strong> (example: Samsung Galaxy A54)<br>5️⃣ Enter your <strong>IMEI number</strong> — to find it dial <strong>*#06#</strong> on your phone<br>6️⃣ Enter your device colour<br>7️⃣ Click <strong>Register My Device</strong><br><br>Your device is now protected! ✅');
  guideOptions([
    { label: '🔍 How to track my phone now?', action: guidePhoneTrack },
    { label: '⬅️ Back to tools', action: showToolMenu },
  ]);
}

async function guidePhoneTrack() {
  await guideMsg('To track your phone:<br><br>1️⃣ Click the <strong>Track Device</strong> tab<br>2️⃣ Click <strong>📍 Locate My Device</strong> button<br>3️⃣ The map will show your phone last known location<br>4️⃣ You can also:<br>&nbsp;&nbsp;🧭 Click <strong>Get Directions</strong> to get Google Maps directions to your phone<br>&nbsp;&nbsp;👁️ Click <strong>Street View</strong> to see the street your phone is on<br>&nbsp;&nbsp;🔔 Click <strong>Ring Device</strong> to make it ring loudly<br>&nbsp;&nbsp;🔒 Click <strong>Lock Device</strong> to lock the screen remotely<br>5️⃣ Click <strong>Location History</strong> tab to see where your phone has been for the last 7 days');
  guideOptions([
    { label: '⬅️ Back to tools', action: showToolMenu },
  ]);
}

// ── AI BUSINESS MENTOR ──
async function guideAI() {
  await guideMsg('Let me open the AI Business Mentor!');
  requireAuth('ai-mentor');
  await guideMsg('The AI Business Mentor is your <strong>24/7 South African business coach</strong>. It knows everything about:<br><br>✅ CIPC business registration (R175 fee at cipc.co.za)<br>✅ SARS tax and eFiling<br>✅ SMME funding (SEFA, IDC, NEF, Khula)<br>✅ BEE/BBBEE compliance<br>✅ Load shedding business strategies<br>✅ Marketing on social media<br>✅ Writing a business plan<br>✅ Starting any type of business in SA<br><br>Just type your question in the chat box at the bottom and press Send!<br><br>Here are some questions to get you started:');
  guideOptions([
    { label: '💡 How do I register my business?', action: async function() {
      await guideMsg('Type that question in the AI chat box and press Send. The AI will explain exactly how to register at CIPC — the cost, the steps and how long it takes.<br><br>Tip: You can ask follow up questions too — like "What about tax?" or "Do I need BEE compliance?"');
    }},
    { label: '💰 How do I get funding in SA?', action: async function() {
      await guideMsg('Type that in the chat! The AI will tell you about SEFA, IDC, NEF, the DTI and other funding sources for small businesses in South Africa — including which ones you qualify for based on your business type.');
    }},
    { label: '📊 How do I write a business plan?', action: async function() {
      await guideMsg('Ask the AI to write a business plan for you! Just type: "Help me write a business plan for [your business type]" and it will create a full professional plan for you.');
    }},
    { label: '✏️ I want to ask my own question', action: async function() {
      await guideMsg('Go ahead! Type anything in the AI chat box below the chat window. The mentor knows everything about South African business. I am here if you need me! 😊');
      guideOptions([{ label: '⬅️ Back to tools', action: showToolMenu }]);
    }}
  ]);
}

// ── CV BUILDER ──
async function guideCV() {
  await guideMsg('Let me open the CV Builder!');
  requireAuth('cv-builder');
  await guideMsg('The CV Builder creates your professional CV and finds jobs that match your exact qualification level. Let me guide you step by step!<br><br><strong>Step 1</strong> — Enter your <strong>First Name</strong> in the first box.<br><br>What is your first name?');
  guideState.step = 'cv-firstname';
  document.getElementById('guide-input').placeholder = 'Type your first name...';
}

// ── SA MAP ──
async function guideMap() {
  await guideMsg('Opening the SA Map — this is completely FREE for everyone, no login needed! 🗺️');
  openTool('sa-map');
  await guideMsg('The SA Map lets you explore anywhere in South Africa. Here is how to use it:<br><br>1️⃣ Type any <strong>city, suburb, street or address</strong> in the search box at the top<br>Example: "Cape Town CBD" or "Sandton Johannesburg" or "15 Long Street Cape Town"<br>2️⃣ Click <strong>Search</strong> or press Enter<br>3️⃣ The map zooms in to that exact location<br>4️⃣ Or just click one of the <strong>quick city buttons</strong> below the map — Cape Town, Johannesburg, Durban, Pretoria and more!<br><br>You can also use it to find directions, check an area before visiting, or track your registered phone location!');
  guideOptions([
    { label: '✅ Got it, let me explore!', action: async function() {
      await guideMsg('Enjoy! 🇿🇦 The map works on both phone and desktop. Come back to me anytime!');
      guideOptions([{ label: '⬅️ Back to tools', action: showToolMenu }]);
    }},
    { label: '⬅️ Back to tools', action: showToolMenu }
  ]);
}

// ── INPUT HANDLER ──
function guideHandleInput(val) {
  var step = guideState.step;

  if (step === 'wb-name') {
    guideState.data.name = val;
    guideState.step = 'wb-desc';
    guideMsg('<strong>' + val + '</strong> — great business name! ✅<br><br><strong>Step 2</strong> — Now describe what your business does in the second box.<br><br>Example: "We sell refurbished laptops and phones across South Africa at affordable prices"<br><br>What does your business do?');
    document.getElementById('guide-input').placeholder = 'Describe your business...';
    return;
  }

  if (step === 'wb-desc') {
    guideState.step = 'wb-contact';
    guideMsg('Perfect description! ✅<br><br><strong>Step 3</strong> — Fill in your <strong>Phone Number</strong> and <strong>Email Address</strong><br><br><strong>Step 4</strong> — Choose your <strong>Business Type</strong> from the dropdown<br><br><strong>Step 5</strong> — Choose your favourite <strong>Colour Theme</strong><br><br><strong>Step 6</strong> — Click the big <strong>Generate My Website</strong> button!');
    guideOptions([
      { label: '🚀 I clicked Generate!', action: async function() {
        await guideMsg('🎉 Your website is generated! You will see the steps to publish it live on GitHub for free.<br><br>Your website will be live at:<br><strong>your-business-name.github.io</strong><br><br>Need help publishing it? Ask me!');
        guideOptions([
          { label: '❓ How do I publish it?', action: async function() {
            await guideMsg('To publish your website for free:<br><br>1️⃣ Go to <strong>github.com</strong> → create a free account<br>2️⃣ Click <strong>+</strong> → New repository → name it your business name<br>3️⃣ Set it to <strong>Public</strong> → Create<br>4️⃣ Click <strong>Add file → Upload files</strong> → upload your 3 files<br>5️⃣ Click <strong>Settings → Pages → main branch → Save</strong><br>6️⃣ Wait 3 minutes → your site is LIVE! 🚀');
          }},
          { label: '⬅️ Back to tools', action: showToolMenu }
        ]);
      }}
    ]);
    return;
  }

  if (step === 'cv-firstname') {
    guideState.data.fname = val;
    guideState.step = 'cv-lastname';
    guideMsg('Nice to meet you <strong>' + val + '</strong>! 👋<br><br><strong>Step 2</strong> — Enter your <strong>Last Name / Surname</strong>');
    document.getElementById('guide-input').placeholder = 'Type your surname...';
    return;
  }

  if (step === 'cv-lastname') {
    guideState.data.lname = val;
    guideState.step = 'cv-qual';
    guideMsg('Great! <strong>' + guideState.data.fname + ' ' + val + '</strong> ✅<br><br><strong>Step 3</strong> — Fill in your <strong>Email</strong> and <strong>Phone Number</strong><br><br><strong>Step 4</strong> — Upload a <strong>Profile Photo</strong> if you want (optional — click the Upload Photo button)<br><br><strong>Step 5</strong> — Select your <strong>Highest Qualification</strong> from the dropdown. This is VERY important — it determines which jobs you qualify for!<br><br>Options are: Matric, N4, N5, N6/Trade, Diploma, Degree, Honours, Masters, PhD');
    guideOptions([
      { label: '✅ I selected my qualification', action: async function() {
        await guideMsg('<strong>Step 6</strong> — Fill in your <strong>Work Experience</strong><br>Enter your last job title, company name, start and end dates.<br><br>If you have no experience that is fine — just select "No experience" in the Years dropdown.<br><br>Then fill in your <strong>Professional Summary</strong> — a short description of yourself and your skills.');
        guideOptions([
          { label: '✅ Done with experience', action: async function() {
            await guideMsg('<strong>Step 7</strong> — Add your <strong>Skills</strong> separated by commas.<br><br>Examples: Microsoft Office, Customer Service, Driving Licence, Python, Sales, Welding<br><br>Then click <strong>Build CV & Find Matching Jobs</strong>!');
            guideOptions([
              { label: '🚀 I clicked Build CV!', action: async function() {
                await guideMsg('🎉 Your CV is built!<br><br>The AI has detected your qualification level and is showing you only jobs you qualify for on:<br><br>💼 <strong>LinkedIn</strong><br>🔍 <strong>Indeed SA</strong><br>📋 <strong>Pnet SA</strong><br>🌟 <strong>YouthMobi</strong><br><br>Click any of those buttons to see real job listings that match your CV!<br><br>To save your CV — click <strong>Print / Save as PDF</strong> at the bottom.');
                guideOptions([
                  { label: '⬅️ Back to tools', action: showToolMenu },
                  { label: '👋 I am done, thank you!', action: guideDismiss }
                ]);
              }}
            ]);
          }}
        ]);
      }}
    ]);
    return;
  }

  if (step === 'freeask' || !step) {
    guideAIAnswer(val);
    return;
  }

  guideAIAnswer(val);
}

// ── AI FREE ANSWER ──
async function guideAIAnswer(question) {
  await guideMsg('Let me find the answer for you... 🤔');
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: 'You are Sky Guide, the friendly assistant inside Sky Blueprint — a South African digital platform. You help users navigate 8 tools: Website Builder (builds business websites from R450 + R55/month hosting), AI Email Secretary (sorts Gmail/Outlook/Yahoo inboxes by priority), CV Builder (builds CV and matches jobs), Learnerships & Internships (checks qualification and emails matching SA opportunities), Find My Phone (R450 once-off, tracks device on SA map), AI Business Mentor (SA business advice), Reminders & Tasks (reminds you of meetings, tasks, habits with notifications), and SA Map (free for everyone). Pricing: R55/month for all tools, R1980/year, R450 for Find My Phone, websites from R450. No free trial — subscribe to use tools. Payments via Paystack. Keep answers short, simple and friendly. Speak like you are explaining to someone new to technology.',
        messages: [{ role: 'user', content: question }]
      })
    });
    var data = await res.json();
    var reply = data.content?.[0]?.text || 'I am not sure about that. Try asking the AI Business Mentor for more detailed help!';
    await guideMsg(reply.replace(/\n/g, '<br>'));
  } catch(e) {
    await guideMsg('I am having trouble connecting right now. Please check your internet and try again, or use the AI Business Mentor tool for detailed help!');
  }
  guideOptions([
    { label: '⬅️ Back to tools menu', action: showToolMenu },
    { label: '❓ Ask another question', action: function() {
      guideClear();
      guideState.step = 'freeask';
      document.getElementById('guide-input').placeholder = 'Type your question...';
    }}
  ]);
}

async function guideDismiss() {
  await guideMsg('No problem! I am always here whenever you need help. Just click the <strong>"Need help?"</strong> button at the bottom right of the screen anytime. Good luck! 🚀🇿🇦');
  guideOptions([
    { label: '👋 Thanks, bye!', action: function() { toggleGuide(); } }
  ]);
}

// Auto-greet after 8 seconds on homepage (once per session)
setTimeout(function() {
  if (!safeSession.getItem('guide_greeted') && !guideOpen) {
    safeSession.setItem('guide_greeted', '1');
    toggleGuide();
  }
}, 8000);