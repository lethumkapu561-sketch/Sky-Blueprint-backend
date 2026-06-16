// Sky Blueprint Backend Server
// Handles: Email cleaning (Gmail/Outlook/Yahoo), CV matching, Job search
// Privacy: Email content is NEVER stored. Read → Sort → Delete → Done.

const express = require('express');
const cors = require('cors');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'https://lethumkapu561-sketch.github.io',
    'http://localhost:3000',
    '*'
  ]
}));
app.use(express.json());

// ── SPAM DETECTION ──
// Words that strongly indicate spam
const SPAM_KEYWORDS = [
  'won','winner','prize','lottery','congratulations','claim now',
  'click here','free money','urgent','million dollar','inheritance',
  'nigerian','bitcoin doubler','casino','gambling','cheap meds',
  'prescription','enlargement','weight loss miracle','make money fast',
  'work from home earn','limited time offer','act now','expire',
  'unsubscribe','bulk','promo','flashsale','win-prizes',
  '!!!','%%%','free gift','no deposit','double your money',
  'whatsapp only','call now','limited slots','guaranteed income'
];

const IMPORTANT_SENDERS = [
  'sars','bank','absa','fnb','nedbank','standard bank','capitec',
  'paystack','payfast','shopify','amazon','google','microsoft',
  'uif','department','government','gov.za','municipality',
  'vodacom','mtn','telkom','cell c','rain',
  'hospital','clinic','doctor','school','university',
  'linkedin','indeed','pnet','youthmobi'
];

function isSpam(email) {
  const subject = (email.subject || '').toLowerCase();
  const from = (email.from || '').toLowerCase();
  const text = (email.text || '').toLowerCase();

  // Check important senders first — never mark as spam
  for (const imp of IMPORTANT_SENDERS) {
    if (from.includes(imp)) return false;
  }

  // Check spam keywords in subject
  let spamScore = 0;
  for (const kw of SPAM_KEYWORDS) {
    if (subject.includes(kw)) spamScore += 2;
    if (text.includes(kw)) spamScore += 1;
  }

  // Excessive exclamation marks or caps
  const capsRatio = (subject.match(/[A-Z]/g) || []).length / (subject.length || 1);
  if (capsRatio > 0.5) spamScore += 2;
  if ((subject.match(/!/g) || []).length > 2) spamScore += 2;

  return spamScore >= 3;
}

// ── IMAP SERVER CONFIGS ──
function getImapConfig(provider, email, password) {
  const configs = {
    gmail: {
      user: email,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    outlook: {
      user: email,
      password: password,
      host: 'outlook.office365.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    yahoo: {
      user: email,
      password: password,
      host: 'imap.mail.yahoo.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  };
  return configs[provider] || configs.gmail;
}

// ── ENDPOINT: Scan emails ──
app.post('/api/scan-emails', async (req, res) => {
  const { provider, email, password } = req.body;

  if (!provider || !email || !password) {
    return res.status(400).json({ error: 'Provider, email and password required' });
  }

  const config = getImapConfig(provider, email, password);
  const imap = new Imap(config);

  const important = [];
  const spam = [];

  try {
    await new Promise((resolve, reject) => {
      imap.once('ready', function() {
        imap.openBox('INBOX', false, function(err, box) {
          if (err) return reject(err);

          // Get last 50 emails
          const total = box.messages.total;
          const start = Math.max(1, total - 49);
          const fetch = imap.seq.fetch(`${start}:${total}`, {
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
            struct: true
          });

          let processed = 0;
          const emails = [];

          fetch.on('message', function(msg, seqno) {
            let header = '';
            let body = '';
            let uid = seqno;

            msg.on('body', function(stream, info) {
              let buffer = '';
              stream.on('data', chunk => buffer += chunk.toString('utf8'));
              stream.once('end', () => {
                if (info.which.includes('HEADER')) header = buffer;
                else body = buffer;
              });
            });

            msg.once('attributes', function(attrs) {
              uid = attrs.uid;
            });

            msg.once('end', function() {
              emails.push({ header, body, uid, seqno });
            });
          });

          fetch.once('end', async function() {
            // Parse and sort emails
            for (const e of emails) {
              try {
                const parsed = await simpleParser(e.header + '\r\n\r\n' + e.body);
                const emailData = {
                  uid: e.uid,
                  seqno: e.seqno,
                  from: parsed.from?.text || 'Unknown',
                  subject: parsed.subject || '(No subject)',
                  date: parsed.date?.toLocaleDateString('en-ZA') || '',
                  text: (parsed.text || '').slice(0, 200)
                };

                if (isSpam(emailData)) {
                  spam.push(emailData);
                } else {
                  important.push(emailData);
                }
              } catch(parseErr) {
                // Skip unparseable emails
              }
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
    console.error('Email scan error:', err.message);
    res.status(401).json({
      error: 'Could not connect to email',
      message: err.message.includes('auth') || err.message.includes('Invalid')
        ? 'Incorrect email or password. For Gmail, use an App Password from your Google Account settings.'
        : 'Connection failed. Please check your internet and try again.'
    });
  }
});

// ── ENDPOINT: Delete spam emails ──
app.post('/api/delete-spam', async (req, res) => {
  const { provider, email, password, uids } = req.body;

  if (!uids || uids.length === 0) {
    return res.json({ success: true, deleted: 0 });
  }

  const config = getImapConfig(provider, email, password);
  const imap = new Imap(config);

  try {
    await new Promise((resolve, reject) => {
      imap.once('ready', function() {
        imap.openBox('INBOX', false, function(err) {
          if (err) return reject(err);

          // Move to trash / mark as deleted
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
    res.status(500).json({ error: 'Could not delete emails', message: err.message });
  }
});

// ── ENDPOINT: AI CV Job Matching ──
app.post('/api/match-jobs', async (req, res) => {
  const { cvText, jobTitle, location } = req.body;

  if (!cvText) {
    return res.status(400).json({ error: 'CV text required' });
  }

  // Detect qualification level from CV text
  const cv = cvText.toLowerCase();
  let level = 'entry';
  let levelLabel = 'Entry Level';
  let minExp = 0;
  let maxExp = 2;

  if (cv.includes('phd') || cv.includes('doctorate') || cv.includes('professor')) {
    level = 'executive'; levelLabel = 'Executive / PhD Level'; minExp = 10; maxExp = 99;
  } else if (cv.includes('director') || cv.includes('ceo') || cv.includes('cto') || cv.includes('head of') || cv.includes('15 years') || cv.includes('20 years')) {
    level = 'executive'; levelLabel = 'Executive Level'; minExp = 10; maxExp = 99;
  } else if (cv.includes('senior') || cv.includes('manager') || cv.includes('lead') || cv.includes('8 years') || cv.includes('10 years')) {
    level = 'senior'; levelLabel = 'Senior Level'; minExp = 5; maxExp = 15;
  } else if (cv.includes('degree') || cv.includes('bcom') || cv.includes('bsc') || cv.includes('bachelor') || cv.includes('3 years') || cv.includes('5 years')) {
    level = 'mid'; labelLabel = 'Mid Level'; minExp = 2; maxExp = 7;
  } else if (cv.includes('diploma') || cv.includes('certificate') || cv.includes('trade') || cv.includes('artisan') || cv.includes('n4') || cv.includes('n5') || cv.includes('n6')) {
    level = 'trade'; levelLabel = 'Trade / Technical Level'; minExp = 1; maxExp = 5;
  } else if (cv.includes('matric') || cv.includes('grade 12') || cv.includes('grade12')) {
    level = 'entry'; levelLabel = 'Entry Level (Matric)'; minExp = 0; maxExp = 2;
  }

  // Build job search URLs for each platform filtered by level
  const q = encodeURIComponent(jobTitle || 'jobs');
  const loc = encodeURIComponent(location || 'South Africa');
  const levelMap = {
    entry: 'entry+level',
    trade: 'trade+technical',
    mid: 'mid+level',
    senior: 'senior',
    executive: 'executive+senior'
  };
  const levelQ = levelMap[level];

  const searchUrls = {
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${q}+${levelQ}&location=${loc}`,
    indeed: `https://za.indeed.com/jobs?q=${q}+${levelQ}&l=${loc}`,
    pnet: `https://www.pnet.co.za/jobs/${encodeURIComponent(jobTitle || 'jobs').toLowerCase()}/south-africa/`,
    youthmobi: `https://youthmobi.com/jobs?q=${q}&location=${loc}`
  };

  res.json({
    success: true,
    level,
    levelLabel,
    message: `Based on your CV, you qualify for ${levelLabel} positions.`,
    advice: getAdvice(level),
    searchUrls
  });
});

function getAdvice(level) {
  const advice = {
    entry: 'Your CV shows entry-level qualifications. Apply for junior, trainee and learnership positions. Avoid applying for senior or managerial roles as you will not be shortlisted.',
    trade: 'Your CV shows trade/technical qualifications. Apply for artisan, technician and skilled trade positions. These are in high demand in SA.',
    mid: 'Your CV shows mid-level qualifications. Apply for specialist and experienced roles requiring 2-5 years experience.',
    senior: 'Your CV shows senior-level experience. Apply for management, team lead and senior specialist roles.',
    executive: 'Your CV shows executive-level experience. Apply for director, C-suite and head of department roles.'
  };
  return advice[level] || advice.entry;
}

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({ status: 'Sky Blueprint Backend is running', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Sky Blueprint Backend running on port ${PORT}`);
});
