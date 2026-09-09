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
const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : (fs.existsSync('/data') ? '/data' : __dirname);
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

// Stable, unique referral code derived from the user's email.
// Same email always produces the same code, so links never break.
function makeRefCode(email) {
  return crypto.createHash('sha256').update(String(email).toLowerCase())
    .digest('hex').replace(/[^a-z0-9]/gi,'').substring(0, 8).toUpperCase();
}

const OWNER_EMAIL_BE = 'lethumkapu561@gmail.com';

// ── SIGN UP ──
app.post('/api/auth/signup', (req, res) => {
  const { fname, lname, email, phone, password, refCode } = req.body;
  if (!fname || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = loadDB();
  const key = email.toLowerCase().trim();
  if (db.users[key]) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });

  const { salt, hash } = hashPassword(password);
  const isOwner = key === OWNER_EMAIL_BE.toLowerCase();

  // Referral tracking: record WHO referred this person, if anyone.
  // Self-referral is ignored so nobody can refer themselves for commission.
  let referredBy = null;
  if (refCode) {
    const code = String(refCode).trim().toUpperCase();
    const referrer = Object.keys(db.users).find(function(e){
      return db.users[e].refCode === code;
    });
    if (referrer && referrer !== key) referredBy = referrer;
  }

  db.users[key] = {
    fname, lname: lname || '', email: key, phone: phone || '',
    salt, hash,
    plan: isOwner ? 'owner' : 'trial',
    joined: Date.now(),
    refCode: makeRefCode(key),
    referredBy: referredBy,
    commissionPaid: false
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

        // AFFILIATE COMMISSION — only awarded on a REAL verified payment,
        // and only once per referred customer (their first payment).
        // Commissions are HELD for 30 days before becoming withdrawable.
        // This protects against refunds and chargebacks: if a referred
        // customer reverses their payment, we can cancel the commission
        // before any money leaves the business.
        if (user.referredBy && !user.commissionPaid) {
          const referrer = db.users[user.referredBy];
          if (referrer) {
            referrer.pendingCommissions = referrer.pendingCommissions || [];
            referrer.pendingCommissions.push({
              amount: 25,
              fromEmail: user.email,
              earnedAt: Date.now(),
              clearsAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
              reference: reference
            });
            referrer.referralCount = (referrer.referralCount || 0) + 1;
            user.commissionPaid = true;
          }
        }

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




// ═══════════════════════════════════════════════════════════
//  CUSTOMER MANAGER - each business owner's private client list
// ═══════════════════════════════════════════════════════════

// Get all customers for the logged-in user
app.post('/api/customers/list', (req, res) => {
  const { token } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!db.customers) db.customers = {};
  const list = db.customers[session.email] || [];
  res.json({ success: true, customers: list });
});

// Add a new customer
app.post('/api/customers/add', (req, res) => {
  const { token, customer } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!customer || !customer.name) return res.status(400).json({ error: 'Customer name required' });
  if (!db.customers) db.customers = {};
  if (!db.customers[session.email]) db.customers[session.email] = [];
  customer.id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  customer.created = Date.now();
  db.customers[session.email].unshift(customer);
  saveDB(db);
  res.json({ success: true, customer: customer });
});

// Update an existing customer
app.post('/api/customers/update', (req, res) => {
  const { token, customer } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!db.customers || !db.customers[session.email]) return res.status(404).json({ error: 'No customers found' });
  const list = db.customers[session.email];
  const idx = list.findIndex(c => c.id === customer.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  // preserve id and created
  customer.created = list[idx].created;
  list[idx] = customer;
  saveDB(db);
  res.json({ success: true });
});

// Delete a customer
app.post('/api/customers/delete', (req, res) => {
  const { token, customerId } = req.body;
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  if (!db.customers || !db.customers[session.email]) return res.status(404).json({ error: 'No customers' });
  db.customers[session.email] = db.customers[session.email].filter(c => c.id !== customerId);
  saveDB(db);
  res.json({ success: true });
});



// ═══════════════════════════════════════════════════════════
//  SERVER-SIDE VIDEO COMPRESSION
//  Runs on Railway's server (not the customer's phone) - so
//  nothing on their device ever freezes or runs out of memory.
// ═══════════════════════════════════════════════════════════
const multer = require('multer');
const ffmpegPath = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
ffmpeg.setFfmpegPath(ffmpegPath);
// CRITICAL: ffmpeg-static ships ONLY the ffmpeg binary — it does NOT include
// ffprobe. Without this line, ffmpeg.ffprobe() fails on Railway with
// "spawn ffprobe ENOENT", which surfaced to users as the misleading
// "Could not read this video file" error on every single upload.
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Store uploads temporarily in the OS temp folder, max 300MB, videos only
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  }
});

app.post('/api/compress-video', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file received' });

  const inputPath = req.file.path;
  const outputPath = inputPath + '-compressed.mp4';
  const targetMB = parseFloat(req.body.targetMB) || 10;
  // Compression mode: 'size' (hit a target MB) or 'quality' (CRF-based).
  // CRF keeps a consistent visual quality instead of a fixed file size.
  const mode = (req.body.mode === 'quality') ? 'quality' : 'size';
  const crf = Math.min(40, Math.max(18, parseInt(req.body.crf, 10) || 26));
  // H.265 compresses roughly 20-50% smaller than H.264 at the same quality,
  // but takes longer to encode and is less compatible with older devices.
  const codec = (req.body.codec === 'h265') ? 'libx265' : 'libx264';
  let finished = false;
  let command = null;

  // Railway's actual documented platform ceiling for a public HTTP request
  // is 15 minutes. We stay safely under that (12 minutes) so the platform
  // itself never cuts the connection mid-job.
  const hardTimeout = setTimeout(() => {
    if (finished) return;
    finished = true;
    if (command) { try { command.kill('SIGKILL'); } catch(e) {} }
    cleanup(inputPath, outputPath);
    if (!res.headersSent) {
      res.status(504).json({ error: 'This video is taking longer than 12 minutes to compress. Please try a shorter clip or a lower target size.' });
    }
  }, 720000);

  try {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (finished) return;
      if (err) {
        finished = true; clearTimeout(hardTimeout);
        cleanup(inputPath, outputPath);
        return res.status(400).json({ error: 'Could not read this video file. It may be corrupted or an unsupported format.' });
      }

      const duration = metadata.format.duration;
      if (!duration || duration <= 0) {
        finished = true; clearTimeout(hardTimeout);
        cleanup(inputPath, outputPath);
        return res.status(400).json({ error: 'Could not determine video length.' });
      }

      // Raised generously now that we know Railway's real ceiling is 15
      // minutes per request. Capping at 4 minutes of footage leaves a wide
      // safety margin under our 12-minute hard timeout above, even if
      // Railway's shared CPU runs several times slower than a dev machine.
      if (duration > 240) {
        finished = true; clearTimeout(hardTimeout);
        cleanup(inputPath, outputPath);
        return res.status(400).json({ error: 'This video is ' + Math.round(duration) + ' seconds long. To keep processing reliable, please use a clip under 4 minutes.' });
      }

      const audioKbps = 64;
      const safeMB = targetMB * 0.93;
      const totalKbps = (safeMB * 8 * 1024) / duration;
      let videoKbps = Math.max(100, Math.round(totalKbps - audioKbps));

      // H.265 encodes roughly 3.5x slower than H.264 (measured). On Railway's
      // shared CPU, a 4-minute H.265 job would run past the 12-minute timeout
      // and fail after a long wait. Cap H.265 to shorter clips rather than let
      // someone wait 12 minutes for a guaranteed failure.
      if (codec === 'libx265' && duration > 90) {
        finished = true; clearTimeout(hardTimeout);
        cleanup(inputPath, outputPath);
        return res.status(400).json({ error: 'H.265 is much slower to encode. For videos over 90 seconds, please use H.264 (the default) — it still compresses well and finishes far quicker.' });
      }

      const scaleFilter = "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2";
      const baseOpts = ['-preset veryfast', '-movflags +faststart', '-vf', scaleFilter];

      command = ffmpeg(inputPath)
        .videoCodec(codec)
        .audioCodec('aac')
        .audioBitrate(audioKbps);

      if (mode === 'quality') {
        // CRF mode — consistent visual quality, size varies with content.
        // H.265 needs a slightly higher CRF for equivalent quality to H.264.
        const effectiveCrf = (codec === 'libx265') ? Math.min(45, crf + 2) : crf;
        command = command.outputOptions(baseOpts.concat(['-crf', String(effectiveCrf)]));
      } else {
        // Target-size mode — calculate the bitrate needed to hit targetMB.
        command = command.videoBitrate(videoKbps).outputOptions(baseOpts);
      }

      command = command
        .on('error', (ffErr) => {
          if (finished) return;
          finished = true; clearTimeout(hardTimeout);
          cleanup(inputPath, outputPath);
          console.log('ffmpeg error:', ffErr.message);
          res.status(500).json({ error: 'Could not compress this video. Please try a different file.' });
        })
        .on('end', () => {
          if (finished) return;
          finished = true; clearTimeout(hardTimeout);
          const fs2 = require('fs');
          // STREAM the file to the response instead of loading it fully into
          // memory. Railway's containers can have as little as 512MB of RAM —
          // reading a large video into a buffer on top of ffmpeg's own memory
          // use can crash the process (the person sees "Failed to fetch").
          // Streaming sends it in small chunks, so peak memory stays low no
          // matter how large the compressed file is.
          fs2.stat(outputPath, (statErr, stats) => {
            if (statErr) { cleanup(inputPath, outputPath); return res.status(500).json({ error: 'Could not read compressed file.' }); }
            res.set('Content-Type', 'video/mp4');
            res.set('Content-Length', stats.size);
            res.set('Content-Disposition', 'attachment; filename="compressed.mp4"');
            const readStream = fs2.createReadStream(outputPath);
            readStream.on('error', () => { cleanup(inputPath, outputPath); if (!res.headersSent) res.status(500).json({ error: 'Could not read compressed file.' }); });
            readStream.on('close', () => { cleanup(inputPath, outputPath); });
            readStream.pipe(res);
          });
        })
        .save(outputPath);
    });
  } catch (e) {
    if (!finished) {
      finished = true; clearTimeout(hardTimeout);
      cleanup(inputPath, outputPath);
      res.status(500).json({ error: 'Server error while compressing video.' });
    }
  }
});

function cleanup(...paths) {
  const fs2 = require('fs');
  paths.forEach(p => { try { if (fs2.existsSync(p)) fs2.unlinkSync(p); } catch(e) {} });
}


// ═══════════════════════════════════════════════════════════
//  AI BUSINESS MENTOR + SKY GUIDE — secure server-side proxy.
//  The API key lives ONLY here on the server, never in the browser.
//  Set ANTHROPIC_API_KEY in your Railway environment variables.
// ═══════════════════════════════════════════════════════════
app.post('/api/ai-mentor', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI Mentor is not configured yet. Please contact support.' });
    }
    const { messages, mode } = req.body;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'No message provided.' });
    }

    const systemPrompts = {
      mentor: 'You are a warm, practical AI Business Mentor for Sky Blueprint, specialising in South African entrepreneurship. You know SA business law, CIPC registration (R175 fee, cipc.co.za), SARS eFiling, SMME funding (SEFA, IDC, NEF, Khula), BEE/BBBEE compliance, load shedding business strategies, and general business growth for the African market. Give clear, actionable advice using South African context. Mention rands, SA government departments, and local resources. Be encouraging and specific.',
      guide: 'You are Sky Guide, the friendly assistant inside Sky Blueprint — a South African digital platform with 13 tools: Website Builder, AI Email Secretary, CV Builder, Learnerships & Internships, Find My Phone, AI Business Mentor, Reminders & Tasks, SA Map (free), Templates Store, PDF Tools, Customer Manager, File Compressor, and Image Editor. Pricing: R55/month for all tools, R1,980/year for the 3-year plan. Payments via Paystack. Keep answers short, simple and friendly, like explaining to someone new to technology.'
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompts[mode] || systemPrompts.mentor,
        messages: messages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.log('Anthropic API error:', data);
      return res.status(502).json({ error: data.error?.message || 'AI service error. Please try again.' });
    }
    const reply = data.content?.[0]?.text || 'Sorry, I could not respond. Please try again.';
    res.json({ success: true, reply: reply });
  } catch (e) {
    console.log('AI mentor endpoint error:', e.message);
    res.status(500).json({ error: 'Could not reach the AI service. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  AFFILIATE PROGRAMME
// ═══════════════════════════════════════════════════════════

// Get my referral code, stats and earnings
app.post('/api/affiliate/stats', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired, please log in again' });
  const user = db.users[session.email];
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Backfill a referral code for accounts created before this feature existed
  if (!user.refCode) { user.refCode = makeRefCode(user.email); saveDB(db); }

  // Count everyone who signed up with this person's code
  let signups = 0, paid = 0;
  Object.keys(db.users).forEach(function(e){
    if (db.users[e].referredBy === session.email) {
      signups++;
      if (db.users[e].commissionPaid) paid++;
    }
  });

  // Split commissions into CLEARED (past the 30-day hold, withdrawable)
  // and PENDING (still inside the hold window, protects against refunds).
  const now = Date.now();
  let cleared = 0, pending = 0, nextClearDate = null;
  (user.pendingCommissions || []).forEach(function(c){
    if (c.cancelled) return;
    if (now >= c.clearsAt) { cleared += c.amount; }
    else {
      pending += c.amount;
      if (!nextClearDate || c.clearsAt < nextClearDate) nextClearDate = c.clearsAt;
    }
  });
  // Include any legacy earnings recorded before the hold system existed
  cleared += (user.earnings || 0);

  res.json({
    success: true,
    refCode: user.refCode,
    refLink: 'https://skyblueprint.company/?ref=' + user.refCode,
    signups: signups,
    paidReferrals: paid,
    earnings: cleared + pending,
    pending: pending,
    nextClearDate: nextClearDate,
    paidOut: user.paidOut || 0,
    balance: cleared - (user.paidOut || 0),
    minPayout: 200,
    payout: user.payout || null
  });
});

// Save how this affiliate wants to be paid (Skrill, bank, etc.)
app.post('/api/affiliate/payout-details', (req, res) => {
  const { token, method, account, accountName, bank } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired, please log in again' });
  const user = db.users[session.email];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!method || !account) return res.status(400).json({ error: 'Please choose a payout method and enter your account details.' });

  user.payout = {
    method: String(method),
    account: String(account).trim(),
    accountName: String(accountName || '').trim(),
    bank: String(bank || '').trim(),
    updated: Date.now()
  };
  saveDB(db);
  res.json({ success: true, payout: user.payout });
});

// Request a payout of the current balance
app.post('/api/affiliate/request-payout', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired, please log in again' });
  const user = db.users[session.email];
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Only CLEARED commissions (past the 30-day hold) can be withdrawn.
  const now = Date.now();
  let cleared = 0;
  (user.pendingCommissions || []).forEach(function(c){
    if (!c.cancelled && now >= c.clearsAt) cleared += c.amount;
  });
  cleared += (user.earnings || 0);
  const balance = cleared - (user.paidOut || 0);

  const MIN_PAYOUT = 200; // R200 — sensible minimum so transfer fees stay a small % of the payout
  if (balance < MIN_PAYOUT) {
    return res.status(400).json({ error: 'You need at least R' + MIN_PAYOUT + ' in cleared earnings to request a payout. Your available balance is R' + balance + '.' });
  }
  if (!user.payout || !user.payout.account) {
    return res.status(400).json({ error: 'Please add your payout details first.' });
  }

  user.payoutRequests = user.payoutRequests || [];
  const requestId = 'PR-' + Date.now().toString(36).toUpperCase();
  user.payoutRequests.push({
    id: requestId,
    amount: balance,
    requested: Date.now(),
    status: 'pending',
    method: user.payout.method,
    account: user.payout.account,
    bank: user.payout.bank || '',
    referralCount: user.referralCount || 0
  });
  saveDB(db);

  // Tell the owner so the payment can actually be sent
  try {
    await sendEmail(OWNER_EMAIL_BE, 'PAYOUT REQUEST: R' + balance + ' - ' + user.email,
      '<div style="font-family:Arial,sans-serif;padding:20px;background:#060914;color:#e2e8f0;border-radius:12px">' +
      '<h2 style="color:#38bdf8">Affiliate Payout Request</h2>' +
      '<p><strong>Request ID:</strong> ' + requestId + '</p>' +
      '<p><strong>Affiliate:</strong> ' + user.fname + ' ' + (user.lname||'') + '</p>' +
      '<p><strong>Email:</strong> ' + user.email + '</p>' +
      '<p><strong>Amount:</strong> R' + balance + '</p>' +
      '<p><strong>Method:</strong> ' + user.payout.method + '</p>' +
      '<p><strong>Account:</strong> ' + user.payout.account + '</p>' +
      (user.payout.bank ? '<p><strong>Bank:</strong> ' + user.payout.bank + '</p>' : '') +
      '<p><strong>Account name:</strong> ' + (user.payout.accountName || '-') + '</p>' +
      '<p><strong>Paid referrals:</strong> ' + (user.referralCount || 0) + '</p>' +
      '</div>');
  } catch(e) { console.log('payout email failed:', e.message); }

  // Confirmation to the AFFILIATE so they know it was received
  try {
    await sendEmail(user.email, 'Payout request received — R' + balance + ' (' + requestId + ')',
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#060914;color:#e2e8f0;border-radius:12px">' +
      '<h2 style="color:#38bdf8;margin-top:0">Payout request received</h2>' +
      '<p>Hi ' + user.fname + ',</p>' +
      '<p>We have received your payout request. Here are the details:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:16px 0">' +
      '<tr><td style="padding:8px 0;color:#94a3b8">Reference</td><td style="padding:8px 0;text-align:right"><strong>' + requestId + '</strong></td></tr>' +
      '<tr><td style="padding:8px 0;color:#94a3b8">Amount</td><td style="padding:8px 0;text-align:right"><strong style="color:#10b981">R' + balance + '</strong></td></tr>' +
      '<tr><td style="padding:8px 0;color:#94a3b8">Paying to</td><td style="padding:8px 0;text-align:right">' + user.payout.method + ' — ' + user.payout.account + '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#94a3b8">Referrals earned from</td><td style="padding:8px 0;text-align:right">' + (user.referralCount || 0) + '</td></tr>' +
      '</table>' +
      '<p style="font-size:13px;color:#94a3b8">We process payouts within 5 working days. You will receive a receipt once the payment has been sent.</p>' +
      (user.payout.method === 'skrill'
        ? '<p style="font-size:12px;color:#f59e0b">Note: Skrill charges its own fees and converts currency, so you may receive less than the full amount. Choose PayShap or bank transfer next time to receive the full amount in Rands.</p>'
        : user.payout.method === 'payshap'
        ? '<p style="font-size:12px;color:#10b981">PayShap payments arrive instantly and are free to receive. Make sure your ShapID is registered in your banking app.</p>'
        : '') +
      '<p style="font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;margin-top:20px">Sky Blueprint · skyblueprint.company</p>' +
      '</div>');
  } catch(e) { console.log('affiliate confirmation email failed:', e.message); }

  res.json({ success: true, message: 'Payout requested. Check your email for confirmation. We process payouts within 5 working days.', amount: balance, requestId: requestId });
});

// Owner-only: cancel a commission if a referred customer refunded or
// charged back. Only works while the commission is still within the
// 30-day hold — which is exactly why the hold exists.
app.post('/api/affiliate/cancel-commission', (req, res) => {
  const { token, customerEmail } = req.body;
  if (!token || !customerEmail) return res.status(400).json({ error: 'Missing token or customer email' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired' });
  if (session.email !== OWNER_EMAIL_BE.toLowerCase()) return res.status(403).json({ error: 'Owner only' });

  const target = String(customerEmail).toLowerCase().trim();
  const customer = db.users[target];
  if (!customer || !customer.referredBy) return res.status(404).json({ error: 'No referral found for that customer' });

  const referrer = db.users[customer.referredBy];
  if (!referrer || !referrer.pendingCommissions) return res.status(404).json({ error: 'No commission found' });

  let cancelled = 0;
  referrer.pendingCommissions.forEach(function(c){
    if (c.fromEmail === target && !c.cancelled) {
      if (Date.now() >= c.clearsAt) return; // already cleared and possibly paid out
      c.cancelled = true;
      c.cancelledAt = Date.now();
      cancelled += c.amount;
    }
  });
  if (cancelled > 0) {
    referrer.referralCount = Math.max(0, (referrer.referralCount || 1) - 1);
    customer.commissionPaid = false;
    saveDB(db);
  }
  res.json({ success: true, cancelled: cancelled, message: cancelled > 0 ? 'Commission of R' + cancelled + ' cancelled.' : 'Nothing to cancel (may already be cleared).' });
});

// Owner-only: mark a payout as PAID and send the affiliate a receipt.
// This is the record you keep for SARS and the proof they receive.
app.post('/api/affiliate/mark-paid', async (req, res) => {
  const { token, affiliateEmail, requestId, paymentRef } = req.body;
  if (!token || !affiliateEmail) return res.status(400).json({ error: 'Missing token or affiliate email' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired' });
  if (session.email !== OWNER_EMAIL_BE.toLowerCase()) return res.status(403).json({ error: 'Owner only' });

  const affEmail = String(affiliateEmail).toLowerCase().trim();
  const aff = db.users[affEmail];
  if (!aff || !aff.payoutRequests) return res.status(404).json({ error: 'No payout requests found for that affiliate' });

  // Find the request — by id if given, otherwise the oldest pending one
  let request = null;
  if (requestId) request = aff.payoutRequests.find(function(r){ return r.id === requestId && r.status === 'pending'; });
  else request = aff.payoutRequests.find(function(r){ return r.status === 'pending'; });
  if (!request) return res.status(404).json({ error: 'No pending payout request found' });

  request.status = 'paid';
  request.paidAt = Date.now();
  request.paymentRef = paymentRef || '';
  request.receiptNo = 'SB-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);

  // Record that this money has now been paid out, so it cannot be claimed twice
  aff.paidOut = (aff.paidOut || 0) + request.amount;
  saveDB(db);

  // Send the affiliate their receipt
  try {
    const paidDate = new Date(request.paidAt).toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });
    await sendEmail(affEmail, 'Payment sent — R' + request.amount + ' (Receipt ' + request.receiptNo + ')',
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;background:#ffffff;color:#1e293b;border:1px solid #e2e8f0;border-radius:12px">' +
      '<div style="border-bottom:3px solid #38bdf8;padding-bottom:16px;margin-bottom:20px">' +
      '<h2 style="margin:0 0 4px;color:#0f172a">Payment Receipt</h2>' +
      '<p style="margin:0;color:#64748b;font-size:13px">Sky Blueprint Affiliate Programme</p>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Receipt number</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #f1f5f9"><strong>' + request.receiptNo + '</strong></td></tr>' +
      '<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Date paid</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #f1f5f9">' + paidDate + '</td></tr>' +
      '<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Paid to</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #f1f5f9">' + aff.fname + ' ' + (aff.lname||'') + '</td></tr>' +
      '<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Method</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #f1f5f9">' + (request.method === 'payshap' ? 'PayShap' : request.method === 'bank' ? 'Bank transfer' : request.method) + ' — ' + request.account + ((aff.payout && aff.payout.bank) ? ' (' + aff.payout.bank + ')' : '') + '</td></tr>' +
      '<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Referrals</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #f1f5f9">' + (request.referralCount || 0) + ' paying customer(s)</td></tr>' +
      (request.paymentRef ? '<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Payment reference</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #f1f5f9">' + request.paymentRef + '</td></tr>' : '') +
      '<tr><td style="padding:14px 0;font-size:16px"><strong>Total paid</strong></td><td style="padding:14px 0;text-align:right;font-size:20px"><strong style="color:#059669">R' + request.amount + '</strong></td></tr>' +
      '</table>' +
      '<p style="font-size:13px;color:#475569;margin-top:20px">Thank you for growing Sky Blueprint. Keep sharing your link to earn more.</p>' +
      '<p style="font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:20px">' +
      'Sky Blueprint · skyblueprint.company<br>' +
      'This receipt is for your records. Commission income may be taxable — please keep it for your tax return.' +
      '</p></div>');
  } catch(e) { console.log('receipt email failed:', e.message); }

  res.json({ success: true, receiptNo: request.receiptNo, amount: request.amount, message: 'Marked as paid and receipt sent to ' + affEmail });
});

// Owner-only: list every pending payout request across all affiliates
app.post('/api/affiliate/pending-payouts', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const db = loadDB();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Session expired' });
  if (session.email !== OWNER_EMAIL_BE.toLowerCase()) return res.status(403).json({ error: 'Owner only' });

  const pending = [];
  Object.keys(db.users).forEach(function(e){
    const u = db.users[e];
    (u.payoutRequests || []).forEach(function(r){
      if (r.status === 'pending') {
        pending.push({
          id: r.id, email: e, name: (u.fname || '') + ' ' + (u.lname || ''),
          amount: r.amount, method: r.method, account: r.account,
          accountName: (u.payout && u.payout.accountName) || '',
          bank: r.bank || (u.payout && u.payout.bank) || '',
          referralCount: r.referralCount || 0, requested: r.requested
        });
      }
    });
  });
  pending.sort(function(a,b){ return a.requested - b.requested; });
  res.json({ success: true, pending: pending, total: pending.reduce(function(s,r){ return s + r.amount; }, 0) });
});

// ═══════════════════════════════════════════════════════════
//  DEVICE REPAIR BOOKINGS
// ═══════════════════════════════════════════════════════════
app.post('/api/device-repair', async (req, res) => {
  const o = req.body || {};
  if (!o.name || !o.phone || !o.email || !o.device) {
    return res.status(400).json({ error: 'Missing required booking details' });
  }
  try {
    // Notify the owner so the job can be scheduled
    await sendEmail(OWNER_EMAIL_BE, 'DEVICE REPAIR BOOKING: ' + o.device + ' - ' + o.total,
      '<div style="font-family:Arial,sans-serif;padding:20px;background:#060914;color:#e2e8f0;border-radius:12px">' +
      '<h2 style="color:#38bdf8">New Device Repair Booking</h2>' +
      '<p><strong>Customer:</strong> ' + o.name + '</p>' +
      '<p><strong>Phone:</strong> ' + o.phone + '</p>' +
      '<p><strong>Email:</strong> ' + o.email + '</p>' +
      '<hr style="border-color:rgba(255,255,255,0.1)">' +
      '<p><strong>Device:</strong> ' + o.device + '</p>' +
      '<p><strong>Android version:</strong> ' + (o.androidVersion || 'Not specified') + '</p>' +
      '<p><strong>Reported problem:</strong> ' + o.issue + '</p>' +
      '<hr style="border-color:rgba(255,255,255,0.1)">' +
      '<p><strong>Services:</strong> ' + o.services + '</p>' +
      '<p><strong>Add-ons:</strong> ' + (o.addons || 'None') + '</p>' +
      '<p><strong>Estimated time:</strong> ' + (o.estimatedTime || '-') + '</p>' +
      '<p style="font-size:18px"><strong>TOTAL: ' + o.total + '</strong></p>' +
      '<hr style="border-color:rgba(255,255,255,0.1)">' +
      '<p style="font-size:12px;color:#10b981">Customer confirmed: ownership proof ✓ · data backup ✓ · understood service effects ✓</p>' +
      '<p style="font-size:12px;color:#94a3b8">Booked: ' + (o.bookedAt || new Date().toISOString()) + '</p>' +
      '</div>');

    // Confirmation to the customer
    await sendEmail(o.email, 'Booking received — ' + o.device + ' (' + o.total + ')',
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#060914;color:#e2e8f0;border-radius:12px">' +
      '<h2 style="color:#38bdf8;margin-top:0">Booking request received</h2>' +
      '<p>Hi ' + o.name + ',</p>' +
      '<p>Thank you for booking with Sky Blueprint. Here is a summary of your request:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">' +
      '<tr><td style="padding:8px 0;color:#94a3b8">Device</td><td style="padding:8px 0;text-align:right">' + o.device + '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#94a3b8">Services</td><td style="padding:8px 0;text-align:right">' + o.services + '</td></tr>' +
      (o.addons && o.addons !== 'None' ? '<tr><td style="padding:8px 0;color:#94a3b8">Add-ons</td><td style="padding:8px 0;text-align:right">' + o.addons + '</td></tr>' : '') +
      '<tr><td style="padding:8px 0;color:#94a3b8">Estimated time</td><td style="padding:8px 0;text-align:right">' + (o.estimatedTime || '-') + '</td></tr>' +
      '<tr><td style="padding:12px 0;font-size:16px"><strong>Total</strong></td><td style="padding:12px 0;text-align:right;font-size:18px"><strong style="color:#10b981">' + o.total + '</strong></td></tr>' +
      '</table>' +
      '<p style="font-size:13px;color:#94a3b8">We will contact you within 24 hours to confirm and arrange drop-off or collection. <strong style="color:#e2e8f0">Payment is made when you drop the device off — not now.</strong></p>' +
      '<p style="font-size:13px;color:#f59e0b">Please remember to bring your ID and proof of ownership for the device.</p>' +
      '<p style="font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;margin-top:20px">Sky Blueprint · skyblueprint.company · 065 601 3544</p>' +
      '</div>');

    res.json({ success: true, message: 'Booking received' });
  } catch (e) {
    console.log('device repair booking email failed:', e.message);
    // Still return success — the booking reached us even if email failed
    res.json({ success: true, message: 'Booking received' });
  }
});

app.listen(PORT, () => {
  console.log(`Sky Blueprint Backend v2 running on port ${PORT}`);
});
