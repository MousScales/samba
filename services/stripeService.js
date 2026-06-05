// Demo mode — no real Stripe API calls (checkout uses local ticket purchase only).

const demoPaymentId = () => `demo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

class StripeService {
  async createPaymentIntent(amount) {
    const id = demoPaymentId();
    return {
      clientSecret: `demo_secret_${id}`,
      paymentIntentId: id,
      amount,
      demo: true,
    };
  }

  async confirmPayment(paymentIntentId) {
    return {
      success: true,
      paymentIntent: {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 0,
        platformFee: 0,
        providerAmount: 0,
      },
    };
  }

  async getPaymentStatus(paymentIntentId) {
    return { status: 'succeeded', id: paymentIntentId, demo: true };
  }

  async getConnectStatus() {
    return {
      account: {
        id: 'demo_acct',
        status: 'enabled',
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
      },
    };
  }

  async getProviderDashboard() {
    return {
      totalEarnings: 1250.0,
      totalPayouts: 980.0,
      balance: {
        available: [{ amount: 27000, currency: 'usd' }],
      },
    };
  }

  async createOnboardingLink() {
    return {
      success: true,
      onboardingUrl: null,
      message: 'Demo mode — payouts are simulated.',
    };
  }
}

export const stripeService = new StripeService();
export default stripeService;
