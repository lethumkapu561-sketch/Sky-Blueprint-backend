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
    const imap = new Imap({
      user: email,
      password: password,
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

app.listen(PORT, () => {
  console.log(`Sky Blueprint Backend v2 running on port ${PORT}`);
});
