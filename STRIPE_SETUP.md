# Stripe Integration Setup Guide

## Prerequisites

1. **Create a Stripe Account**
   - Go to [https://stripe.com](https://stripe.com) and create an account
   - Complete your account setup and verification

2. **Get Your API Keys**
   - Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
   - Copy your **Publishable Key** (starts with `pk_test_` for testing)
   - Copy your **Secret Key** (starts with `sk_test_` for testing)

## Setup Instructions

### 1. Frontend Configuration

Update the file `config/stripe.js`:

```javascript
export const STRIPE_CONFIG = {
  // Replace with your actual test publishable key
  PUBLISHABLE_KEY_TEST: 'pk_test_YOUR_ACTUAL_KEY_HERE',
  
  // For production (when ready)
  PUBLISHABLE_KEY_LIVE: 'pk_live_YOUR_ACTUAL_KEY_HERE',
  
  USE_TEST_KEYS: true // Set to false for production
};
```

### 2. Backend Configuration

Create a file `backend/.env` with your secret key:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/samba-app

# Server Configuration  
PORT=3001

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**⚠️ IMPORTANT: Never commit your secret keys to version control!**

### 3. Update Service Configuration

Update `services/stripeService.js` if your backend is not running on localhost:3001:

```javascript
const API_BASE_URL = 'YOUR_BACKEND_URL'; // e.g., 'https://your-api.com/api'
```

## Testing the Integration

### 1. Start Your Backend Server

```bash
cd backend
npm start
```

### 2. Test Payment Flow

Use Stripe's test card numbers:

- **Successful Payment**: `4242 4242 4242 4242`
- **Declined Payment**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC will work with test cards.

### 3. Monitor Payments

- Check the [Stripe Dashboard > Payments](https://dashboard.stripe.com/payments) to see test transactions
- View logs in your terminal for payment processing details

## How It Works

1. **Step 1**: User enters contact information
2. **Step 2**: User selects payment method (Credit Card)
3. **Payment Intent Creation**: App creates a payment intent on your backend
4. **Payment Sheet**: Stripe's secure payment form is presented
5. **Payment Processing**: Stripe processes the payment securely
6. **Confirmation**: Backend confirms payment success
7. **Ticket Creation**: Tickets are created and user is redirected to confirmation

## Security Features

✅ **PCI Compliant**: Stripe handles all sensitive card data
✅ **3D Secure**: Automatic authentication for qualifying cards  
✅ **Fraud Detection**: Built-in fraud protection
✅ **Webhook Verification**: Secure event handling

## Going Live

When ready for production:

1. Activate your Stripe account in the dashboard
2. Get your live API keys
3. Update `config/stripe.js` with live keys
4. Set `USE_TEST_KEYS: false`
5. Update backend with live secret key
6. Set up webhook endpoints for production

## Troubleshooting

### Common Issues

1. **"No such payment_intent"**: Check that your secret key matches the publishable key environment
2. **CORS errors**: Make sure your backend is running and accessible
3. **Payment sheet won't open**: Verify publishable key is correct

### Debug Steps

1. Check browser/app console for errors
2. Verify API keys are correct
3. Ensure backend server is running
4. Test with curl/Postman to verify backend endpoints

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [React Native Integration Guide](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [Stripe Support](https://support.stripe.com/)

---

**Ready to integrate? Replace the placeholder keys in the config files with your actual Stripe keys!** 