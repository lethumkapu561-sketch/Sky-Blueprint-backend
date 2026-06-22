// Sky Blueprint Backend Server v2
const express = require('express');
const cors = require('cors');

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

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060914;color:#e2e8f0;padding:32px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:28px;font-weight:800;color:#38bdf8">Sky Blueprint</div>
        <div style="font-size:14px;color:#64748b">${action === 'signup' ? 'New Account Created!' : 'User Login'}</div>
      </div>
      <div style="background:#0f1629;border-radius:12px;padding:20px">
        <h2 style="color:#10b981;margin:0 0 16px">${action === 'signup' ? '🎉 New Customer Registered' : '👤 Customer Logged In'}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px;width:120px">Name:</td><td style="color:#fff;font-weight:600;font-size:14px">${fname || ''} ${lname || ''}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Email:</td><td style="color:#38bdf8;font-size:13px">${email}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Action:</td><td style="color:#fff;font-size:13px">${action === 'signup' ? 'Created new account (7-day trial started)' : 'Logged into existing account'}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Time:</td><td style="color:#fff;font-size:13px">${new Date().toLocaleString('en-ZA', {timeZone:'Africa/Johannesburg'})}</td></tr>
        </table>
      </div>
    </div>`;

  await sendEmail('lethumkapu561@gmail.com', (action === 'signup' ? 'NEW SIGNUP' : 'LOGIN') + ' - ' + email, html);
  res.json({ success: true });
});


app.listen(PORT, () => {
  console.log(`Sky Blueprint Backend v2 running on port ${PORT}`);
});
