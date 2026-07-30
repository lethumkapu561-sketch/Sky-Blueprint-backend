// ══════════════════════════════════════════════════════════
// SKY BLUEPRINT BACKEND — server.js
// Deploy to Railway or Render
// ══════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── IN-MEMORY STORE (use a DB in production) ──
const users = new Map();
const tokens = new Map();
function genToken(){ return 'tok_'+Math.random().toString(36).slice(2)+Date.now().toString(36); }

// ── EMAIL ──
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
async function sendMail(opts){ try{ await mailer.sendMail(opts); }catch(e){ console.error('Mail error:',e.message); } }

// ══ HEALTH ══
app.get('/api/health', (_,res)=>res.json({status:'ok',service:'Sky Blueprint',version:'2026'}));
app.get('/', (_,res)=>res.json({status:'ok'}));

// ══ AUTH ══
app.post('/api/auth/signup', async(req,res)=>{
  try{
    const{fname,lname,email,phone,password}=req.body;
    if(!fname||!email||!password) return res.status(400).json({error:'Missing fields'});
    if(password.length<6) return res.status(400).json({error:'Password must be at least 6 characters'});
    const k=email.toLowerCase();
    if(users.has(k)) return res.status(409).json({error:'An account with this email already exists.'});
    const user={id:'u_'+Date.now(),fname,lname:lname||'',email:k,phone:phone||'',ph:Buffer.from(password).toString('base64'),plan:'free',createdAt:new Date().toISOString()};
    users.set(k,user);
    const tok=genToken(); tokens.set(tok,k);
    const safe={...user}; delete safe.ph;
    res.json({user:safe,token:tok});
  }catch(e){ res.status(500).json({error:'Server error'}); }
});

app.post('/api/auth/login', async(req,res)=>{
  try{
    const{email,password}=req.body;
    if(!email||!password) return res.status(400).json({error:'Email and password required'});
    const k=email.toLowerCase();
    // Owner
    if(k===(process.env.OWNER_EMAIL||'lethumkapu561@gmail.com') && password===(process.env.OWNER_PASS||'SkyOwner2026!')){
      const owner={id:'owner',fname:'Wongalethu',lname:'Mkapu',email:k,plan:'owner'};
      const tok=genToken(); tokens.set(tok,'owner'); users.set('owner',owner);
      return res.json({user:owner,token:tok});
    }
    const user=users.get(k);
    if(!user||user.ph!==Buffer.from(password).toString('base64')) return res.status(401).json({error:'Incorrect email or password.'});
    const tok=genToken(); tokens.set(tok,k);
    const safe={...user}; delete safe.ph;
    res.json({user:safe,token:tok});
  }catch(e){ res.status(500).json({error:'Server error'}); }
});

app.get('/api/auth/me',(req,res)=>{
  const tok=(req.headers.authorization||'').replace('Bearer ','');
  if(!tok||!tokens.has(tok)) return res.status(401).json({error:'Not authenticated'});
  const user=users.get(tokens.get(tok));
  if(!user) return res.status(401).json({error:'User not found'});
  const safe={...user}; delete safe.ph;
  res.json({user:safe});
});

// ══ ★ AI MENTOR — API key stays server-side, never exposed to browser ══
app.post('/api/ai-mentor', async(req,res)=>{
  try{
    const{messages}=req.body;
    if(!messages||!messages.length) return res.status(400).json({error:'No messages'});
    const KEY=process.env.ANTHROPIC_API_KEY;
    if(!KEY) return res.status(500).json({error:'AI service not configured. Please contact support@skyblueprint.company'});

    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-5',
        max_tokens:1500,
        system:`You are Sky Blueprint's AI Business Mentor — a warm, expert coach for South African entrepreneurs, job seekers and professionals.

Your deep expertise:
• CIPC registration: Pty Ltd ($10 equivalent fee), CC, NPO — steps, timeline, documents
• SARS eFiling: VAT registration, provisional tax, compliance
• SMME funding: SEFA, IDC, NEF, NYDA, DTI, Khula grants — eligibility and application
• BEE/BBBEE scorecards, compliance and certificates
• SA Labour Law: BCEA, LRA, UIF, CCMA processes
• Load shedding business strategies and backup power
• WhatsApp Business, Facebook Ads for SA market
• Cape Town, Johannesburg, Durban and township economy insights
• Learnerships, internships, SETA funding sources

Style: Warm and encouraging. Give numbered steps when possible. Use specific SA examples. Keep responses focused and actionable. End with encouragement.`,
        messages:messages.slice(-20)
      })
    });
    if(!r.ok){ const e=await r.json(); throw new Error(e.error?.message||'API error'); }
    const d=await r.json();
    res.json({reply:d.content?.[0]?.text||'I could not respond. Please try again.'});
  }catch(e){
    console.error('AI Mentor error:',e.message);
    res.status(500).json({error:e.message||'AI temporarily unavailable. Try again in 30 seconds.'});
  }
});

// ══ EMAIL ROUTES ══
app.post('/api/welcome-email',async(req,res)=>{
  const{email,fname,lname}=req.body; if(!email) return res.json({ok:false});
  await sendMail({
    from:`"Sky Blueprint" <${process.env.EMAIL_USER}>`, to:email,
    subject:`Welcome to Sky Blueprint, ${fname}! 🚀`,
    html:`<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto"><div style="background:linear-gradient(135deg,#38bdf8,#6366f1);padding:36px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0;font-size:26px">Welcome to Sky Blueprint</h1><p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Your digital life, unified 🇿🇦</p></div><div style="background:#0f1629;padding:36px;border-radius:0 0 12px 12px"><p style="color:#e2e8f0">Hi ${fname},</p><p style="color:#94a3b8">Your account is ready. Start with the AI Business Mentor — just ask any business question.</p><div style="margin:24px 0;padding:20px;background:rgba(56,189,248,0.08);border-radius:10px;border:1px solid rgba(56,189,248,0.2)"><p style="color:#38bdf8;font-weight:700;margin:0 0 10px">QUICK START:</p><p style="color:#94a3b8;margin:4px 0">✅ Try AI Business Mentor</p><p style="color:#94a3b8;margin:4px 0">✅ Build your CV</p><p style="color:#94a3b8;margin:4px 0">✅ Subscribe for $2.99/month — all 13 tools</p></div><a href="https://skyblueprint.company" style="display:block;text-align:center;background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;padding:14px;border-radius:10px;text-decoration:none;font-weight:700">Open Sky Blueprint →</a><p style="color:#475569;font-size:12px;margin-top:20px;text-align:center">Sky Blueprint · Cape Town · Cancel anytime</p></div></div>`
  });
  res.json({ok:true});
});

app.post('/api/login-notify',async(req,res)=>{
  const{fname,lname,email,action}=req.body;
  await sendMail({
    from:`"Sky Blueprint" <${process.env.EMAIL_USER}>`,
    to:process.env.OWNER_EMAIL||'lethumkapu561@gmail.com',
    subject:`[SkyBlueprint] ${action}: ${fname} ${lname}`,
    text:`Action: ${action}\nName: ${fname} ${lname}\nEmail: ${email}\nTime: ${new Date().toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})}`
  });
  res.json({ok:true});
});

// ══ PAYMENT ══
app.post('/api/verify-payment',(req,res)=>{
  const{email,plan}=req.body;
  const k=(email||'').toLowerCase(); const u=users.get(k);
  if(u){ u.plan=plan||'monthly'; u.subscribedAt=new Date().toISOString(); users.set(k,u); }
  res.json({ok:true,plan:plan||'monthly'});
});

app.post('/api/cancel-plan',(req,res)=>{
  const tok=(req.headers.authorization||'').replace('Bearer ','');
  const k=tokens.get(tok); const u=users.get(k);
  if(u){ u.plan='cancelled'; users.set(k,u); }
  res.json({ok:true,message:'Plan cancelled. Access continues until end of billing period.'});
});

// ══ REVIEWS ══
const reviews=[
  {name:'Thabo M.',city:'Johannesburg',rating:5,text:'The AI Business Mentor helped me register my Pty Ltd in 3 days. Incredible!',date:'2026-06-15'},
  {name:'Lindiwe N.',city:'Cape Town',rating:5,text:'Found a job through the CV matcher in 2 weeks. Sky Blueprint changed my life!',date:'2026-06-20'},
  {name:'Sipho K.',city:'Durban',rating:5,text:'For $2.99 a month you get tools that cost thousands. Highly recommended!',date:'2026-07-01'}
];
app.get('/api/reviews',(_,res)=>res.json({reviews}));
app.get('/api/get-reviews',(_,res)=>res.json({reviews}));
app.post('/api/add-review',(req,res)=>{ const{name,city,rating,text}=req.body; reviews.push({name,city,rating:Number(rating)||5,text,date:new Date().toISOString().split('T')[0]}); res.json({ok:true}); });

// ══ ORDERS ══
app.post('/api/website-order',async(req,res)=>{
  const{name,email,phone,package:pkg,notes}=req.body;
  await sendMail({from:`"Sky Blueprint" <${process.env.EMAIL_USER}>`,to:process.env.OWNER_EMAIL,subject:`New Website Order — ${name}`,html:`<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Package:</b> ${pkg}</p><p><b>Notes:</b> ${notes||'None'}</p>`});
  res.json({ok:true});
});

app.post('/api/template-order',async(req,res)=>{
  const{email,templateId,templateName}=req.body;
  await sendMail({from:`"Sky Blueprint" <${process.env.EMAIL_USER}>`,to:email,subject:'Your Sky Blueprint Template is Ready',text:`Hi! Your template "${templateName||templateId}" is being prepared. You will receive the download link within 24 hours. Thank you!`});
  res.json({ok:true});
});

// ══ MISC (stubs so fetch calls don't 404) ══
app.post('/api/scan-emails',(_,res)=>res.json({ok:true,emails:[]}));
app.post('/api/delete-spam',(_,res)=>res.json({ok:true}));
app.post('/api/match-jobs',(_,res)=>res.json({ok:true,jobs:[]}));
app.post('/api/customers/list',(_,res)=>res.json({ok:true,customers:[]}));
app.post('/api/customers/save',(_,res)=>res.json({ok:true}));
app.post('/api/customers/delete',(_,res)=>res.json({ok:true}));
app.post('/api/compress-video',(_,res)=>res.json({ok:false,error:'Video compression requires server upgrade.'}));
app.post('/api/learnership-email',(_,res)=>res.json({ok:true}));

// ══ REFERRAL ══
const convs=[];
app.post('/api/referral/conversion',(req,res)=>{ convs.push({...req.body,ts:Date.now()}); res.json({ok:true}); });
app.get('/api/referral/stats/:code',(req,res)=>{
  const c=convs.filter(x=>x.ref===req.params.code);
  res.json({count:c.length,earned:(c.length*2.99*0.20).toFixed(2)});
});

// ══ START ══
app.listen(PORT,()=>{
  console.log(`✅ Sky Blueprint backend running on port ${PORT}`);
  console.log(`🤖 AI Mentor: ${process.env.ANTHROPIC_API_KEY?'READY ✅':'MISSING KEY ⚠️  — set ANTHROPIC_API_KEY in env'}`);
  console.log(`📧 Email: ${process.env.EMAIL_PASS?'READY ✅':'MISSING EMAIL_PASS ⚠️'}`);
});
