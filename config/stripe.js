// Stripe Configuration
// TODO: Replace these with your actual Stripe keys

export const STRIPE_CONFIG = {
  // Test keys (safe to expose in frontend)
  PUBLISHABLE_KEY_TEST: 'pk_test_51REifLRqvuBtPAdXr3sOBg5kM3cH3RhEXxQiRGPc4uW9gV3RtZnoiUF2Qvzru3I9fzKmxXUgF22tzJBoYZS3XqYf00QA6fSLqs',
  
  // Production keys (for when you're ready to go live)
  PUBLISHABLE_KEY_LIVE: 'pk_live_your_stripe_publishable_key_here',
  
  // Use test keys by default (change to false for production)
  USE_TEST_KEYS: true
};

// Get the appropriate publishable key based on environment
export const getStripePublishableKey = () => {
  return STRIPE_CONFIG.USE_TEST_KEYS 
    ? STRIPE_CONFIG.PUBLISHABLE_KEY_TEST 
    : STRIPE_CONFIG.PUBLISHABLE_KEY_LIVE;
};

export default STRIPE_CONFIG; 