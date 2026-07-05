// Sky Blueprint Backend Server v2
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow ALL origins - fixes the connection error
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Handle preflight requests
app.options('*', cors());

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({ 
    status: 'Sky Blueprint Backend is running', 
    version: '2.0.0',
    message: 'Connected successfully!'
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ── SPAM DETECTION ──
const SPAM_KEYWORDS = [
  'won','winner','prize','lottery','congratulations','claim now',
  'click here','free money','urgent','million','inheritance',
  'bitcoin','casino','gambling','cheap meds','prescription',
  'make money fast','work from home earn','limited time offer',
  'act now','unsubscribe','bulk','promo','flashsale','win-prizes',
  '!!!','free gift','no deposit','double your money','guaranteed income',
  'nigerian','prince','viagra','enlargement','weight loss miracle'
];

const IMPORTANT_SENDERS = [
  'sars','bank','absa','fnb','nedbank','standard bank','capitec',
  'paystack','payfast','shopify','amazon','google','microsoft',
  'uif','department','government','gov.za','municipality',
  'vodacom','mtn','telkom','cellc','rain','discovery',
  'hospital','clinic','doctor','school','university','college',
  'linkedin','indeed','pnet','youthmobi','facebook','twitter'
];

function isSpam(email) {
  const subject = (email.subject || '').toLowerCase();
  const from = (email.from || '').toLowerCase();
  const text = (email.text || '').toLowerCase();

  for (const imp of IMPORTANT_SENDERS) {
    if (from.includes(imp)) return false;
  }

  let score = 0;
  for (const kw of SPAM_KEYWORDS) {
    if (subject.includes(kw)) score += 2;
    if (text.includes(kw)) score += 1;
  }

  const capsRatio = (subject.match(/[A-Z]/g) || []).length / (subject.length || 1);
  if (capsRatio > 0.5) score += 2;
  if ((subject.match(/!/g) || []).length > 2) score += 2;

  return score >= 3;
}

// ── EMAIL SCAN ──
app.post('/api/scan-emails', async (req, res) => {
  const { provider, email, password } = req.body;

  if (!provider || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Provider, email and password required' 
    });
  }

  try {
    const Imap = require('imap');
    const { simpleParser } = require('mailparser');

    const configs = {
      gmail: { host: 'imap.gmail.com', port: 993 },
      outlook: { host: 'outlook.office365.com', port: 993 },
      yahoo: { host: 'imap.mail.yahoo.com', port: 993 }
    };

    const cfg = configs[provider] || configs.gmail;
    // Gmail/Yahoo app passwords must have spaces removed
    const cleanPassword = password ? password.replace(/\s+/g, '') : '';
    const imap = new Imap({
      user: email,
      password: cleanPassword,
      host: cfg.host,
      port: cfg.port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 10000
    });

    const important = [];
    const spam = [];

    await new Promise((resolve, reject) => {
      imap.once('ready', function() {
        imap.openBox('INBOX', true, function(err, box) {
          if (err) return reject(err);

          const total = box.messages.total;
          if (total === 0) {
            imap.end();
            return resolve();
          }

          const start = Math.max(1, total - 49);
          const fetch = imap.seq.fetch(`${start}:${total}`, {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'],
            struct: false
          });

          const emails = [];

          fetch.on('message', function(msg, seqno) {
            let header = '';
            let uid = seqno;

            msg.on('body', function(stream) {
              let buf = '';
              stream.on('data', c => buf += c.toString('utf8'));
              stream.once('end', () => { header = buf; });
            });

            msg.once('attributes', a => { uid = a.uid; });
            msg.once('end', () => { emails.push({ header, uid }); });
          });

          fetch.once('end', async function() {
            for (const e of emails) {
              try {
                const parsed = await simpleParser(e.header);
                const emailData = {
                  uid: e.uid,
                  from: parsed.from?.text || 'Unknown',
                  subject: parsed.subject || '(No subject)',
                  date: parsed.date ? new Date(parsed.date).toLocaleDateString('en-ZA') : '',
                  text: ''
                };
                if (isSpam(emailData)) {
                  spam.push(emailData);
                } else {
                  important.push(emailData);
                }
              } catch(pe) { /* skip */ }
            }
            imap.end();
          });

          fetch.once('error', reject);
        });
      });

      imap.once('error', reject);
      imap.once('end', resolve);
      imap.connect();
    });

    res.json({
      success: true,
      provider,
      email,
      important: important.reverse(),
      spam: spam.reverse(),
      total: important.length + spam.length
    });

  } catch(err) {
    console.error('Email error:', err.message);
    const isAuth = err.message && (
      err.message.includes('auth') || 
      err.message.includes('Invalid') ||
      err.message.includes('LOGIN') ||
      err.message.includes('credentials')
    );
    res.status(401).json({
      success: false,
      error: 'Connection failed',
      message: isAuth 
        ? 'Wrong email or password. For Gmail use an App Password from myaccount.google.com/apppasswords'
        : 'Could not connect. Check your internet and try again. Error: ' + err.message
    });
  }
});

// ── DELETE SPAM ──
app.post('/api/delete-spam', async (req, res) => {
  const { provider, email, password, uids } = req.body;
  if (!uids || uids.length === 0) {
    return res.json({ success: true, deleted: 0 });
  }

  try {
    const Imap = require('imap');
    const configs = {
      gmail: { host: 'imap.gmail.com', port: 993 },
      outlook: { host: 'outlook.office365.com', port: 993 },
      yahoo: { host: 'imap.mail.yahoo.com', port: 993 }
    };
    const cfg = configs[provider] || configs.gmail;
    const imap = new Imap({
      user: email, password,
      host: cfg.host, port: cfg.port,
      tls: true, tlsOptions: { rejectUnauthorized: false }
    });

    await new Promise((resolve, reject) => {
      imap.once('ready', function() {
        imap.openBox('INBOX', false, function(err) {
          if (err) return reject(err);
          imap.addFlags(uids, ['\\Deleted'], function(err) {
            if (err) return reject(err);
            imap.expunge(function(err) {
              if (err) return reject(err);
              imap.end();
            });
          });
        });
      });
      imap.once('error', reject);
      imap.once('end', resolve);
      imap.connect();
    });

    res.json({ success: true, deleted: uids.length });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CV JOB MATCHING ──
app.post('/api/match-jobs', (req, res) => {
  const { cvText, jobTitle, location } = req.body;
  if (!cvText) return res.status(400).json({ error: 'CV text required' });

  const cv = cvText.toLowerCase();
  let level = 'entry';
  let levelLabel = 'Entry Level';

  if (cv.includes('phd') || cv.includes('doctorate')) {
    level = 'executive'; levelLabel = 'Executive / PhD Level';
  } else if (cv.includes('masters') || cv.includes('master\'s')) {
    level = 'senior'; levelLabel = 'Senior / Masters Level';
  } else if (cv.includes('honours') || cv.includes('honor')) {
    level = 'senior'; levelLabel = 'Senior Specialist Level';
  } else if (cv.includes('degree') || cv.includes('bcom') || cv.includes('bsc') || cv.includes('bachelor')) {
    level = 'mid'; levelLabel = 'Graduate / Mid Level';
  } else if (cv.includes('diploma') || cv.includes('n6') || cv.includes('trade') || cv.includes('artisan')) {
    level = 'trade'; levelLabel = 'Trade / Technical Level';
  } else if (cv.includes('n4') || cv.includes('n5')) {
    level = 'trade'; levelLabel = 'Technical Level';
  } else if (cv.includes('matric') || cv.includes('grade 12')) {
    level = 'entry'; levelLabel = 'Entry Level (Matric)';
  }

  const q = encodeURIComponent(jobTitle || 'jobs');
  const l = encodeURIComponent(location || 'South Africa');
  const lq = encodeURIComponent(levelLabel);

  const advice = {
    entry: 'Apply for junior, learnership and entry-level positions only. Do not waste time applying for senior or management roles.',
    trade: 'Apply for artisan, technician and skilled trade positions. These are in very high demand in South Africa!',
    mid: 'Apply for specialist, graduate and professional roles requiring 2-5 years experience.',
    senior: 'Apply for management, team lead and senior specialist roles.',
    executive: 'Apply for director, C-suite, academic and executive positions.'
  };

  res.json({
    success: true,
    level,
    levelLabel,
    advice: advice[level],
    searchUrls: {
      linkedin: `https://www.linkedin.com/jobs/search/?keywords=${q}+${lq}&location=${l}`,
      indeed: `https://za.indeed.com/jobs?q=${q}&l=${l}`,
      pnet: `https://www.pnet.co.za/jobs/${encodeURIComponent((jobTitle||'jobs').toLowerCase())}/south-africa/`,
      youthmobi: `https://youthmobi.com/jobs?q=${q}&location=${l}`
    }
  });
});



// ── EMAIL NOTIFICATIONS ──
// Using nodemailer with Gmail SMTP (free, reliable)
// To activate: add GMAIL_USER and GMAIL_PASS to Railway environment variables

async function sendEmail(to, subject, htmlBody) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.log('EMAIL NOT SENT - Missing RESEND_API_KEY in Railway variables');
      console.log('Would send to:', to, '| Subject:', subject);
      return false;
    }

    // Resend uses HTTPS - works on Railway (Gmail SMTP is blocked by Railway)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sky Blueprint <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: htmlBody
      })
    });

    const result = await response.json();
    if (response.ok) {
      console.log('EMAIL SENT to:', to, '| Subject:', subject, '| ID:', result.id);
      return true;
    } else {
      console.log('EMAIL FAILED:', JSON.stringify(result));
      return false;
    }
  } catch(err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

// ── ENDPOINT: Welcome email on registration ──
app.post('/api/welcome-email', async (req, res) => {
  const { email, fname, lname } = req.body;
  if (!email || !fname) return res.status(400).json({ error: 'Email and name required' });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060914;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:32px;font-weight:800;color:#38bdf8">Sky Blueprint</div>
        <div style="font-size:14px;color:#64748b">Your Digital Life, Unified</div>
      </div>
      <h2 style="color:#fff;margin-bottom:12px">Welcome to Sky Blueprint, \${fname}! 🎉</h2>
      <p style="color:#94a3b8;line-height:1.7;margin-bottom:20px">
        Thank you for joining Sky Blueprint — South Africa's all-in-one digital platform. 
        Your account has been created successfully.
      </p>
      <div style="background:#0f1629;border-radius:12px;padding:20px;margin-bottom:20px">
        <h3 style="color:#38bdf8;margin-bottom:12px">Your 7-Day Free Trial is Active!</h3>
        <p style="color:#94a3b8;font-size:14px;margin-bottom:16px">You have full access to all 6 tools for 7 days — no credit card needed.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="color:#e2e8f0;font-size:14px">🌐 Website Builder</div>
          <div style="color:#e2e8f0;font-size:14px">📧 Email Cleaner</div>
          <div style="color:#e2e8f0;font-size:14px">📍 Find My Phone</div>
          <div style="color:#e2e8f0;font-size:14px">🤖 AI Business Mentor</div>
          <div style="color:#e2e8f0;font-size:14px">📄 CV Builder & Jobs</div>
          <div style="color:#e2e8f0;font-size:14px">🗺️ SA Map (Always Free)</div>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:20px">
        <a href="https://lethumkapu561-sketch.github.io/Sky-Blueprint" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Go to Sky Blueprint</a>
      </div>
      <p style="color:#475569;font-size:12px;text-align:center">After 7 days, subscribe for only R55/month to keep full access.</p>
      <p style="color:#475569;font-size:12px;text-align:center;margin-top:8px">Questions? Contact us: lethumkapu561@gmail.com | 065 601 3544</p>
    </div>
  `;

  await sendEmail(email, 'Welcome to Sky Blueprint! Your account is ready', html);
  res.json({ success: true, message: 'Welcome email sent' });
});

// ── ENDPOINT: Subscription reminder ──
app.post('/api/remind-subscription', async (req, res) => {
  const { email, fname, daysLeft, amount } = req.body;
  if (!email || !fname) return res.status(400).json({ error: 'Required fields missing' });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060914;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:32px;font-weight:800;color:#38bdf8">Sky Blueprint</div>
      </div>
      <h2 style="color:#fff;margin-bottom:12px">Hi \${fname}, your subscription renews in \${daysLeft} day\${daysLeft === 1 ? '' : 's'}</h2>
      <p style="color:#94a3b8;line-height:1.7;margin-bottom:20px">
        Your Sky Blueprint subscription will automatically renew for <strong style="color:#38bdf8">R\${amount || 55}/month</strong>. 
        Your card on file will be charged via Paystack.
      </p>
      <div style="background:#0f1629;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
        <div style="font-size:36px;font-weight:800;color:#fff">R\${amount || 55}</div>
        <div style="color:#64748b;font-size:14px">Monthly Subscription</div>
      </div>
      <div style="text-align:center;margin-bottom:20px">
        <a href="https://lethumkapu561-sketch.github.io/Sky-Blueprint" style="background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Manage My Subscription</a>
      </div>
      <p style="color:#475569;font-size:12px;text-align:center">To cancel, log into Sky Blueprint and contact support before renewal date.</p>
      <p style="color:#475569;font-size:12px;text-align:center;margin-top:8px">Questions? lethumkapu561@gmail.com | 065 601 3544</p>
    </div>
  `;

  await sendEmail(email, 'Sky Blueprint — Your subscription renews in ' + daysLeft + ' day(s)', html);
  res.json({ success: true, message: 'Reminder sent' });
});



// ── WEBSITE ORDER - emails owner full details ──
app.post('/api/website-order', async (req, res) => {
  const order = req.body;
  
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060914;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:28px;font-weight:800;color:#38bdf8">Sky Blueprint</div>
        <div style="font-size:14px;color:#64748b">New Website Order Received!</div>
      </div>
      <div style="background:#0f1629;border-radius:12px;padding:20px;margin-bottom:16px">
        <h2 style="color:#10b981;margin:0 0 16px">New Website Order</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px;width:140px">Customer Name:</td><td style="color:#fff;font-weight:600;font-size:13px">${order.name}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Phone:</td><td style="color:#38bdf8;font-weight:600;font-size:13px">${order.phone}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Email:</td><td style="color:#38bdf8;font-size:13px">${order.email}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Business Name:</td><td style="color:#fff;font-weight:700;font-size:14px">${order.business}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Category:</td><td style="color:#fff;font-size:13px">${order.category}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Location:</td><td style="color:#fff;font-size:13px">${order.city}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Domain:</td><td style="color:#f59e0b;font-weight:600;font-size:13px">${order.domain}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Colour Theme:</td><td style="color:#fff;font-size:13px">${order.colorTheme}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px;font-weight:700">TOTAL TO CHARGE:</td><td style="color:#10b981;font-weight:800;font-size:16px">${order.totalCharge}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Order Time:</td><td style="color:#fff;font-size:13px">${order.orderTime}</td></tr>
        </table>
      </div>
      <div style="background:#0f1629;border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="color:#64748b;font-size:12px;margin-bottom:8px">BUSINESS DESCRIPTION:</div>
        <div style="color:#e2e8f0;font-size:13px;line-height:1.6">${order.description}</div>
      </div>
      ${order.extraRequests ? '<div style="background:#0f1629;border-radius:12px;padding:16px;margin-bottom:16px"><div style="color:#64748b;font-size:12px;margin-bottom:8px">SPECIAL REQUESTS:</div><div style="color:#e2e8f0;font-size:13px;line-height:1.6">' + order.extraRequests + '</div></div>' : ''}
      <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:16px">
        <div style="color:#38bdf8;font-weight:700;font-size:13px;margin-bottom:8px">ACTION REQUIRED:</div>
        <div style="color:#94a3b8;font-size:13px">1. Contact ${order.name} on ${order.phone} within 24 hours to confirm<br>2. Build website within 72 hours<br>3. Purchase domain if needed: ${order.domain}<br>4. Collect payment: <strong style="color:#10b981">${order.totalCharge}</strong></div>
      </div>
    </div>`;

  await sendEmail('lethumkapu561@gmail.com', 'NEW WEBSITE ORDER - ' + order.business + ' (' + order.totalCharge + ')', html);
  res.json({ success: true });
});



// ── LOGIN NOTIFICATION - tells owner when someone logs in ──
app.post('/api/login-notify', async (req, res) => {
  const { fname, lname, email, action } = req.body;

  var actionTitles = {
    signup: { sub: 'New Account Created!', head: '🎉 New Customer Registered', color: '#10b981', desc: 'Created new account (7-day trial started)' },
    login: { sub: 'User Login', head: '👤 Customer Logged In', color: '#38bdf8', desc: 'Logged into existing account' },
    cancel: { sub: 'Subscription Cancelled', head: '⚠️ Customer Cancelled Plan', color: '#ef4444', desc: 'Cancelled their subscription' },
    'subscribe-monthly': { sub: 'New Paid Subscriber!', head: '💰 New MONTHLY Subscriber (R55/month)', color: '#10b981', desc: 'Subscribed to Monthly plan - R55/month recurring' },
    'subscribe-yearly': { sub: 'New Paid Subscriber!', head: '💰 New 3-YEAR Subscriber (R1,980/year)', color: '#10b981', desc: 'Subscribed to 3-Year plan - R1,980/year' }
  };
  var at = actionTitles[action] || actionTitles.login;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060914;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:28px;font-weight:800;color:#38bdf8">Sky Blueprint</div>
        <div style="font-size:14px;color:#64748b">${at.sub}</div>
      </div>
      <div style="background:#0f1629;border-radius:12px;padding:20px">
        <h2 style="color:${at.color};margin:0 0 16px">${at.head}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px;width:120px">Name:</td><td style="color:#fff;font-weight:600;font-size:14px">${fname || ''} ${lname || ''}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Email:</td><td style="color:#38bdf8;font-size:13px">${email}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Action:</td><td style="color:#fff;font-size:13px">${at.desc}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Time:</td><td style="color:#fff;font-size:13px">${new Date().toLocaleString('en-ZA', {timeZone:'Africa/Johannesburg'})}</td></tr>
        </table>
      </div>
    </div>`;

  var subjects = { signup: 'NEW SIGNUP', login: 'LOGIN', cancel: 'CANCELLED PLAN', 'subscribe-monthly': 'NEW PAID SUBSCRIBER (Monthly R55)', 'subscribe-yearly': 'NEW PAID SUBSCRIBER (3-Year R1980)' };
  await sendEmail('lethumkapu561@gmail.com', (subjects[action] || 'ACTIVITY') + ' - ' + email, html);
  res.json({ success: true });
});



// ── LEARNERSHIP EMAIL - sends opportunities to the user ──
app.post('/api/learnership-email', async (req, res) => {
  const { name, email, field, province, type, opportunities } = req.body;

  const oppsHtml = (opportunities || []).map(function(o) {
    return '<div style="background:#0f1629;border-radius:10px;padding:16px;margin-bottom:12px">' +
      '<div style="color:#38bdf8;font-weight:700;font-size:15px;margin-bottom:6px">' + o.name + '</div>' +
      '<div style="color:#94a3b8;font-size:13px;margin-bottom:10px">' + o.desc + '</div>' +
      '<a href="' + o.url + '" style="display:inline-block;background:#38bdf8;color:#fff;text-decoration:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600">Apply Now →</a>' +
      '</div>';
  }).join('');

  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060914;color:#e2e8f0;padding:32px;border-radius:16px">' +
    '<div style="text-align:center;margin-bottom:24px">' +
    '<div style="font-size:28px;font-weight:800;color:#38bdf8">Sky Blueprint</div>' +
    '<div style="font-size:14px;color:#64748b">Your Learnership & Internship Matches</div>' +
    '</div>' +
    '<p style="color:#e2e8f0;font-size:15px">Hi ' + name + ',</p>' +
    '<p style="color:#94a3b8;font-size:14px;line-height:1.6">Here are the best ' + (type === 'both' ? 'learnership and internship' : type) + ' opportunities for you in <strong style="color:#fff">' + field + '</strong> (' + province + '). Click any link to apply directly:</p>' +
    '<div style="margin:20px 0">' + oppsHtml + '</div>' +
    '<div style="background:rgba(56,189,248,0.08);border-radius:10px;padding:16px;margin-top:16px">' +
    '<div style="color:#38bdf8;font-weight:700;font-size:13px;margin-bottom:8px">💡 Tips to get selected:</div>' +
    '<div style="color:#94a3b8;font-size:13px;line-height:1.7">• Complete your full profile on each site<br>• Apply early — positions close fast<br>• Have your CV and ID ready (use our CV Builder!)<br>• Apply to multiple opportunities to increase your chances</div>' +
    '</div>' +
    '<p style="color:#64748b;font-size:12px;margin-top:20px;text-align:center">Sent by Sky Blueprint — Your Digital Life, Unified</p>' +
    '</div>';

  await sendEmail(email, 'Your Learnership & Internship Matches - Sky Blueprint', html);
  // Also notify owner
  await sendEmail('lethumkapu561@gmail.com', 'Learnership search by ' + name + ' (' + email + ')', '<p>' + name + ' (' + email + ') searched for ' + type + ' in ' + field + ', ' + province + '</p>');
  res.json({ success: true });
});



// ── REVIEWS ──
const fs = require('fs');
const REVIEWS_FILE = '/tmp/sky_reviews.json';

function readReviews() {
  try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')); }
  catch(e) { return []; }
}
function writeReviews(list) {
  try { fs.writeFileSync(REVIEWS_FILE, JSON.stringify(list)); } catch(e) {}
}

// Get all reviews
app.get('/api/reviews', (req, res) => {
  res.json({ reviews: readReviews() });
});

// Post a new review
app.post('/api/reviews', async (req, res) => {
  const { rating, name, city, text } = req.body;
  if (!rating || !name || !text) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  var reviews = readReviews();
  var review = {
    rating: Math.max(1, Math.min(5, parseInt(rating))),
    name: String(name).substring(0, 60),
    city: String(city || '').substring(0, 60),
    text: String(text).substring(0, 500),
    date: new Date().toISOString()
  };
  reviews.push(review);
  writeReviews(reviews);

  // Notify owner of new review
  try {
    await sendEmail('lethumkapu561@gmail.com', 'New Sky Blueprint Review (' + review.rating + ' stars)',
      '<div style="font-family:Arial,sans-serif"><h2>New Review Posted</h2>' +
      '<p><strong>Rating:</strong> ' + review.rating + ' / 5 stars</p>' +
      '<p><strong>Name:</strong> ' + review.name + '</p>' +
      '<p><strong>City:</strong> ' + (review.city||'Not given') + '</p>' +
      '<p><strong>Review:</strong> "' + review.text + '"</p></div>');
  } catch(e) {}

  res.json({ success: true });
});



// ── REVIEWS - stored in memory (simple, resets on redeploy) ──
var siteReviews = [];

app.get('/api/get-reviews', (req, res) => {
  res.json({ reviews: siteReviews });
});

app.post('/api/add-review', async (req, res) => {
  const { name, city, rating, text } = req.body;
  if (!name || !rating || !text) return res.status(400).json({ error: 'missing fields' });

  const review = { name: name, city: city || '', rating: parseInt(rating), text: text, date: Date.now() };
  siteReviews.unshift(review);
  // Keep max 100 reviews
  if (siteReviews.length > 100) siteReviews = siteReviews.slice(0, 100);

  // Notify owner of new review
  try {
    const stars = '★'.repeat(review.rating);
    await sendEmail('lethumkapu561@gmail.com', 'New Review (' + review.rating + '★) from ' + name,
      '<div style="font-family:Arial,sans-serif;padding:20px;background:#060914;color:#e2e8f0;border-radius:12px">' +
      '<h2 style="color:#38bdf8">New Sky Blueprint Review</h2>' +
      '<p style="color:#fbbf24;font-size:20px">' + stars + '</p>' +
      '<p><strong>' + name + '</strong>' + (city ? ' from ' + city : '') + '</p>' +
      '<p style="color:#94a3b8;font-style:italic">"' + text + '"</p>' +
      '</div>');
  } catch(e) {}

  res.json({ success: true, reviews: siteReviews });
});



// ── TEMPLATE ORDER - notify owner when someone buys a template ──
app.post('/api/template-order', async (req, res) => {
  const { templateName, price, email, name } = req.body;
  try {
    await sendEmail('lethumkapu561@gmail.com', 'TEMPLATE SALE: ' + templateName + ' (R' + price + ')',
      '<div style="font-family:Arial,sans-serif;padding:20px;background:#060914;color:#e2e8f0;border-radius:12px">' +
      '<h2 style="color:#10b981">💰 New Template Purchase</h2>' +
      '<p><strong>Template:</strong> ' + templateName + '</p>' +
      '<p><strong>Price:</strong> R' + price + '</p>' +
      '<p><strong>Buyer:</strong> ' + (name||'') + '</p>' +
      '<p><strong>Email:</strong> ' + email + '</p>' +
      '<p style="color:#f59e0b;margin-top:16px">⚠️ ACTION: Email the template file to ' + email + '</p>' +
      '</div>');
  } catch(e) {}
  res.json({ success: true });
});



// ═══════════════════════════════════════════════════════════
//  SECURE ACCOUNTS + PAYMENT VERIFICATION SYSTEM
//  Real server-side accounts. Payment verified via Paystack.
// ═══════════════════════════════════════════════════════════
const path = require('path');

// Persistent storage. On Railway, set a Volume mounted at /data for true persistence.
// Falls back to local file if no volume (works, but resets on redeploy without a volume).
const DATA_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DB_FILE = path.join(DATA_DIR, 'accounts.json');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { users: {}, sessions: {} }; }
}
function saveDB(db) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); }
  catch (e) { console.log('DB save error:', e.message); }
}

// Password hashing with salt (never store plain passwords)
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return check === hash;
}
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

const OWNER_EMAIL_BE = 'lethumkapu561@gmail.com';

// ── SIGN UP ──
app.post('/api/auth/signup', (req, res) => {
  const { fname, lname, email, phone, password } = req.body;
  if (!fname || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = loadDB();
  const key = email.toLowerCase().trim();
  if (db.users[key]) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });

  const { salt, hash } = hashPassword(password);
  const isOwner = key === OWNER_EMAIL_BE.toLowerCase();
  db.users[key] = {
    fname, lname: lname || '', email: key, phone: phone || '',
    salt, hash,
    plan: isOwner ? 'owner' : 'trial',
    joined: Date.now()
  };
  const token = makeToken();
  db.sessions[token] = { email: key, created: Date.now() };
  saveDB(db);

  const u = db.users[key];
  res.json({ success: true, token, user: { fname: u.fname, lname: u.lname, email: u.email, phone: u.phone, plan: u.plan, joined: u.joined } });
});

// ── LOG IN ──
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password' });

  const db = loadDB();
  const key = email.toLowerCase().trim();

  // Owner shortcut
  if (key === OWNER_EMAIL_BE.toLowerCase()) {
    if (!db.users[key]) {
      const { salt, hash } = hashPassword(password);
      db.users[key] = { fname:'Wongalethu', lname:'Mkapu', email:key, phone:'0656013544', salt, hash, plan:'owner', joined:Date.now() };
    }
    db.users[key].plan = 'owner';
    const token = makeToken();
    db.sessions[token] = { email: key, created: Date.now() };
    saveDB(db);
    const u = db.users[key];
    return res.json({ success: true, token, user: { fname:u.fname, lname:u.lname, email:u.email, phone:u.phone, plan:'owner', joined:u.joined } });
  }

  const user = db.users[key];
  if (!user) return res.status(401).json({ error: 'Incorrect email or password' });
  if (!verifyPassword(password, user.salt, user.hash)) return res.status(401).json({ error: 'Incorrect email or password' });

  const token = makeToken();
  db.sessions[token] = { email: key, created: Date.now() };
  saveDB(db);
  res.json({ success: true, token, user: { fname:user.fname, lname:user.lname, email:user.email, phone:user.phone, plan:user.plan, joined:user.joined } });
});

// ── GET CURRENT USER (verify token, return real plan from server) ──
app.post('/api/auth/me', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired' });
  const user = db.users[session.email];
  if (!user) return res.status(401).json({ error: 'Account not found' });
  // The plan returned here is the SERVER's truth - cannot be faked by the browser
  res.json({ success: true, user: { fname:user.fname, lname:user.lname, email:user.email, phone:user.phone, plan:user.plan, joined:user.joined } });
});

// ── VERIFY PAYMENT (called after Paystack success - checks with Paystack directly) ──
app.post('/api/verify-payment', async (req, res) => {
  const { reference, token, plan } = req.body;
  if (!reference || !token) return res.status(400).json({ error: 'Missing reference or token' });

  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired, please log in again' });

  // Ask Paystack directly if this payment is real and successful
  const SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!SECRET) {
    console.log('WARNING: PAYSTACK_SECRET_KEY not set in Railway variables');
    return res.status(500).json({ error: 'Payment verification not configured' });
  }

  try {
    const vr = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
      headers: { 'Authorization': 'Bearer ' + SECRET }
    });
    const data = await vr.json();

    if (data && data.status && data.data && data.data.status === 'success') {
      // Payment is REAL. Now mark the user as paid on the SERVER.
      const user = db.users[session.email];
      if (user) {
        user.plan = plan || 'monthly';
        user.lastPayment = { reference, amount: data.data.amount, date: Date.now() };
        saveDB(db);

        // Notify owner of real verified payment
        try {
          await sendEmail(OWNER_EMAIL_BE, 'VERIFIED PAYMENT: ' + user.email + ' (' + (plan||'monthly') + ')',
            '<div style="font-family:Arial,sans-serif;padding:20px;background:#060914;color:#e2e8f0;border-radius:12px">' +
            '<h2 style="color:#10b981">Payment Verified by Paystack</h2>' +
            '<p><strong>Customer:</strong> ' + user.fname + ' ' + user.lname + '</p>' +
            '<p><strong>Email:</strong> ' + user.email + '</p>' +
            '<p><strong>Plan:</strong> ' + (plan||'monthly') + '</p>' +
            '<p><strong>Amount:</strong> R' + (data.data.amount/100).toFixed(2) + '</p>' +
            '<p><strong>Reference:</strong> ' + reference + '</p>' +
            '</div>');
        } catch(e) {}

        return res.json({ success: true, plan: user.plan, user: { fname:user.fname, lname:user.lname, email:user.email, phone:user.phone, plan:user.plan, joined:user.joined } });
      }
      return res.status(404).json({ error: 'User not found' });
    } else {
      return res.status(400).json({ error: 'Payment not successful', paystackStatus: data.data ? data.data.status : 'unknown' });
    }
  } catch (e) {
    console.log('Verify error:', e.message);
    return res.status(500).json({ error: 'Could not verify payment. Please contact support.' });
  }
});

// ── PAYSTACK WEBHOOK (Paystack calls this directly - most secure) ──
app.post('/api/paystack-webhook', express.json(), (req, res) => {
  const SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (SECRET) {
    // Verify the webhook really came from Paystack
    const hash = crypto.createHmac('sha512', SECRET).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('Invalid signature');
    }
  }
  const event = req.body;
  if (event && event.event === 'charge.success') {
    const email = (event.data.customer && event.data.customer.email || '').toLowerCase();
    const db = loadDB();
    if (db.users[email]) {
      db.users[email].plan = db.users[email].plan === 'yearly' ? 'yearly' : 'monthly';
      db.users[email].lastPayment = { reference: event.data.reference, amount: event.data.amount, date: Date.now() };
      saveDB(db);
      console.log('Webhook: activated', email);
    }
  }
  res.sendStatus(200);
});

// ── CANCEL PLAN ──
app.post('/api/cancel-plan', (req, res) => {
  const { token } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired' });
  const user = db.users[session.email];
  if (user) {
    user.plan = 'cancelled';
    saveDB(db);
  }
  res.json({ success: true });
});

// ── OWNER: list all accounts (protected by owner check) ──
app.post('/api/admin/users', (req, res) => {
  const { token } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const requester = db.users[session.email];
  if (!requester || requester.plan !== 'owner') return res.status(403).json({ error: 'Owner access only' });
  const list = Object.values(db.users).map(u => ({ fname:u.fname, lname:u.lname, email:u.email, phone:u.phone, plan:u.plan, joined:u.joined, lastPayment: u.lastPayment || null }));
  res.json({ success: true, users: list });
});

// ── OWNER: manually set a user's plan ──
app.post('/api/admin/set-plan', (req, res) => {
  const { token, targetEmail, newPlan } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const requester = db.users[session.email];
  if (!requester || requester.plan !== 'owner') return res.status(403).json({ error: 'Owner access only' });
  const target = db.users[(targetEmail||'').toLowerCase()];
  if (!target) return res.status(404).json({ error: 'User not found' });
  target.plan = newPlan;
  saveDB(db);
  res.json({ success: true });
});



app.listen(PORT, () => {
  console.log(`Sky Blueprint Backend v2 running on port ${PORT}`);
});
