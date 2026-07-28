// ════════════════════════════════════════════════════════════════
// SKY BLUEPRINT REFERRAL BACKEND
// Handles payout processing via Paystack
// ════════════════════════════════════════════════════════════════

const REFERRAL_CONFIG = {
  commissionPercent: 20,
  minimumPayout: 5, // $5 minimum before payout
  paystackSecretKey: 'sk_live_YOUR_PAYSTACK_SECRET_KEY', // Replace with your actual key
  webhookSecret: 'your_webhook_secret_here'
};

// ─── INITIALIZE REFERRAL DATABASE ───
// If using Node.js/Express, store this in a database
// For now, using simple object structure

class ReferralSystem {
  constructor() {
    this.referrals = {}; // referralCode -> { referrerEmail, earnings, payouts }
    this.conversions = {}; // conversionId -> { referralCode, userId, amount, status }
  }

  // Create referral for user
  createReferral(userId, username, email) {
    const code = this.generateCode(username);
    this.referrals[code] = {
      userId,
      username,
      email,
      created: new Date(),
      totalEarnings: 0,
      activeReferrals: 0,
      payoutsPending: 0,
      payoutsCompleted: 0,
      lastPayout: null
    };
    return code;
  }

  // Generate unique referral code
  generateCode(username) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ref_${username}_${timestamp.substring(0, 4)}${random}`.toLowerCase().slice(0, 20);
  }

  // Record referral conversion
  recordConversion(referralCode, userId, amount, planType) {
    if (!this.referrals[referralCode]) {
      console.error('Invalid referral code:', referralCode);
      return null;
    }

    const commission = (amount * REFERRAL_CONFIG.commissionPercent) / 100;
    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.conversions[conversionId] = {
      id: conversionId,
      referralCode,
      userId,
      amount,
      commission,
      planType,
      status: 'active', // active, cancelled, paused
      created: new Date(),
      nextPayout: this.getNextPayoutDate()
    };

    // Update referrer's earnings
    this.referrals[referralCode].totalEarnings += commission;
    this.referrals[referralCode].activeReferrals += 1;

    console.log(`✅ Conversion recorded: ${referralCode} earns $${commission.toFixed(2)}`);
    return conversionId;
  }

  // Get next payout date (e.g., end of month)
  getNextPayoutDate() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  // Calculate monthly earnings for referrer
  getMonthlyEarnings(referralCode, year, month) {
    let total = 0;
    for (const convId in this.conversions) {
      const conv = this.conversions[convId];
      if (conv.referralCode === referralCode && conv.status === 'active') {
        const convDate = new Date(conv.created);
        if (convDate.getFullYear() === year && convDate.getMonth() === month - 1) {
          total += conv.commission;
        }
      }
    }
    return total;
  }

  // Prepare payout via Paystack
  preparePayout(referralCode) {
    if (!this.referrals[referralCode]) {
      return { success: false, error: 'Invalid referral code' };
    }

    const referrer = this.referrals[referralCode];
    const pendingEarnings = referrer.payoutsPending;

    if (pendingEarnings < REFERRAL_CONFIG.minimumPayout) {
      return {
        success: false,
        error: `Minimum payout is $${REFERRAL_CONFIG.minimumPayout}. You have $${pendingEarnings.toFixed(2)} pending.`
      };
    }

    return {
      success: true,
      email: referrer.email,
      amount: Math.floor(pendingEarnings * 100), // Paystack uses cents
      reference: `payout_${referralCode}_${Date.now()}`,
      metadata: {
        referralCode,
        userId: referrer.userId,
        type: 'referral_payout'
      }
    };
  }

  // Process Paystack webhook
  processWebhook(event) {
    const { event: eventType, data } = event;

    if (eventType === 'charge.success') {
      const { reference, customer, amount, metadata } = data;

      if (metadata?.type === 'customer_subscription') {
        // New subscription from referral link
        return this.recordConversion(
          metadata.referralCode,
          metadata.userId,
          amount / 100, // Convert from cents to dollars
          metadata.planType
        );
      }
    }

    if (eventType === 'transfer.success') {
      // Payout confirmed
      const { reference } = data;
      console.log(`✅ Payout confirmed: ${reference}`);
      // Update database status to 'completed'
    }

    if (eventType === 'charge.failed') {
      // Subscription failed or cancelled
      const { metadata } = data;
      if (metadata?.conversionId) {
        this.conversions[metadata.conversionId].status = 'cancelled';
      }
    }

    return { success: true };
  }

  // Get referrer stats
  getReferrerStats(referralCode) {
    if (!this.referrals[referralCode]) return null;

    const referrer = this.referrals[referralCode];
    return {
      username: referrer.username,
      email: referrer.email,
      totalEarnings: referrer.totalEarnings.toFixed(2),
      activeReferrals: referrer.activeReferrals,
      pendingPayout: referrer.payoutsPending.toFixed(2),
      completedPayouts: referrer.payoutsCompleted.toFixed(2),
      lastPayout: referrer.lastPayout
    };
  }
}

// ─── EXPRESS BACKEND EXAMPLE ───
// If you're using Node.js/Express, add these endpoints:

/*
const express = require('express');
const app = express();
app.use(express.json());

const referralSystem = new ReferralSystem();

// Create referral code for user
app.post('/api/referral/create', (req, res) => {
  const { userId, username, email } = req.body;
  const code = referralSystem.createReferral(userId, username, email);
  res.json({ success: true, code });
});

// Record a conversion (when someone subscribes via referral link)
app.post('/api/referral/conversion', (req, res) => {
  const { referralCode, userId, amount, planType } = req.body;
  const conversionId = referralSystem.recordConversion(referralCode, userId, amount, planType);
  res.json({ success: true, conversionId });
});

// Get referrer stats
app.get('/api/referral/stats/:code', (req, res) => {
  const stats = referralSystem.getReferrerStats(req.params.code);
  if (!stats) {
    return res.status(404).json({ error: 'Referral code not found' });
  }
  res.json(stats);
});

// Paystack webhook receiver
app.post('/webhook/paystack', (req, res) => {
  const payload = req.body;
  
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', REFERRAL_CONFIG.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Process the webhook
  const result = referralSystem.processWebhook(payload);
  res.json(result);
});

// Prepare payout request
app.post('/api/referral/payout', (req, res) => {
  const { referralCode } = req.body;
  const payout = referralSystem.preparePayout(referralCode);
  res.json(payout);
});

app.listen(3000, () => console.log('Server running on port 3000'));
*/

// ─── INTEGRATION WITH PAYSTACK ───
async function initiateReferralPayout(referralCode, paystackSecretKey) {
  const payout = referralSystem.preparePayout(referralCode);

  if (!payout.success) {
    return { success: false, error: payout.error };
  }

  try {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: payout.amount,
        recipient: payout.email,
        reference: payout.reference,
        reason: `Referral commission for ${referralCode}`
      })
    });

    const data = await response.json();

    if (data.status) {
      console.log(`✅ Payout initiated for ${referralCode}: $${(payout.amount / 100).toFixed(2)}`);
      return { success: true, transferCode: data.data.transfer_code };
    } else {
      console.error('Paystack error:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('Payout error:', error);
    return { success: false, error: error.message };
  }
}

// ─── MONTHLY PAYOUT SCHEDULER ───
// Run this function at the end of each month (e.g., using node-cron)

async function processMonthlyPayouts(referralSystem, paystackSecretKey) {
  console.log('🔄 Starting monthly payout processing...');

  const today = new Date();
  const lastMonth = today.getMonth() - 1;
  const year = today.getFullYear();

  for (const code in referralSystem.referrals) {
    const earnings = referralSystem.getMonthlyEarnings(code, year, lastMonth);

    if (earnings >= REFERRAL_CONFIG.minimumPayout) {
      const result = await initiateReferralPayout(code, paystackSecretKey);

      if (result.success) {
        referralSystem.referrals[code].payoutsPending += earnings;
      }
    }
  }

  console.log('✅ Monthly payout processing complete');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ReferralSystem,
    initiateReferralPayout,
    processMonthlyPayouts,
    REFERRAL_CONFIG
  };
}
