const API_BASE_URL = 'http://localhost:3001/api'; // Update this to your backend URL

class StripeService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Create a payment intent (with optional provider for marketplace payments)
  async createPaymentIntent(amount, metadata = {}, providerId = null) {
    try {
      console.log('💳 Creating payment intent:', {
        amount,
        providerId: providerId || 'direct platform payment',
        metadata
      });
      
      const response = await fetch(`${this.baseURL}/payments/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'usd',
          metadata: metadata,
          providerId: providerId // Include provider ID for marketplace payments
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      console.log('✅ Payment intent created:', {
        paymentIntentId: data.paymentIntentId,
        platformFee: data.platformFee || 'N/A',
        providerAmount: data.providerAmount || 'N/A'
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment (with optional provider ID for tracking)
  async confirmPayment(paymentIntentId, providerId = null) {
    try {
      console.log('🔍 Confirming payment:', {
        paymentIntentId,
        providerId: providerId || 'direct platform payment'
      });
      
      const response = await fetch(`${this.baseURL}/payments/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          providerId: providerId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm payment');
      }

      const data = await response.json();
      console.log('✅ Payment confirmation result:', {
        success: data.success,
        amount: data.paymentIntent?.amount,
        platformFee: data.paymentIntent?.platformFee || 'N/A',
        providerAmount: data.paymentIntent?.providerAmount || 'N/A'
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      throw error;
    }
  }

  // Get payment status
  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await fetch(`${this.baseURL}/payments/payment-status/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get payment status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      throw error;
    }
  }

  // Get provider's Stripe Connect account status
  async getConnectStatus(authToken) {
    try {
      const response = await fetch(`${this.baseURL}/payments/connect-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get connect status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting connect status:', error);
      throw error;
    }
  }

  // Create Stripe Connect onboarding link
  async createOnboardingLink(authToken) {
    try {
      const response = await fetch(`${this.baseURL}/payments/create-onboarding-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create onboarding link');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error creating onboarding link:', error);
      throw error;
    }
  }

  // Get provider dashboard data (balance, transactions, etc.)
  async getProviderDashboard(authToken) {
    try {
      const response = await fetch(`${this.baseURL}/payments/provider-dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get provider dashboard');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting provider dashboard:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
export default stripeService; 