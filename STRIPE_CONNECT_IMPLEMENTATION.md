# Stripe Connect Payment Splitting Implementation

This document outlines the complete implementation of Stripe Connect payment splitting for the ticketing app, where 10% goes to the platform and 90% goes to event providers.

## Overview

The system automatically splits payments:
- **10% Platform Fee**: Goes to your main Stripe account
- **90% Provider Amount**: Transferred to the event provider's connected account

## Implementation Components

### 1. Backend Changes

#### User Model Updates (`backend/models/User.js`)
Added comprehensive Stripe Connect fields to `providerInfo`:
- `stripeConnectAccountId`: Stripe Connect account ID
- `stripeAccountStatus`: Account verification status (pending/enabled/restricted/rejected)
- `stripeDetailsSubmitted`, `stripeChargesEnabled`, `stripePayoutsEnabled`: Status flags
- `bankAccountInfo`: Encrypted bank account details (last 4 digits only)
- `taxInfo`: Tax information (SSN/EIN with partial masking)
- `identityVerification`: ID verification status

#### Payment Routes Updates (`backend/routes/payments.js`)
Complete rewrite to support:
- Marketplace payment creation with `application_fee_amount` and `transfer_data`
- Provider account status checking before payment processing
- Automatic earnings tracking for providers
- Stripe Connect account onboarding links
- Provider dashboard data (balance, transactions)
- Enhanced webhook handling for account updates

#### Provider Registration (`backend/routes/users.js`)
Enhanced `become-provider` endpoint:
- Creates Stripe Connect account automatically
- Handles both individual and business account types
- Sets up external bank account for payouts
- Manages verification requirements
- Stores encrypted information securely

### 2. Frontend Changes

#### Multi-Step Provider Registration (`screens/BecomeProviderScreen.js`)
Complete redesign with 5 steps:
1. **Party Information**: Organization name, description, logo
2. **Contact & Address**: Business contact info and address
3. **Tax Information**: Business type, SSN/EIN
4. **Identity Verification**: Photo ID and selfie verification to prevent fraud
5. **Bank Account**: Routing number, account details, agreements

Features:
- Form validation at each step
- Secure data handling
- Legal agreement checkboxes
- Progress indicator

#### Provider Dashboard (`screens/ProviderDashboardScreen.js`)
New screen showing:
- Identity verification status and progress
- Stripe Connect account status and verification progress
- Total earnings and payouts
- Current account balance
- Recent transactions
- Platform fee structure explanation
- Account setup completion button

#### Payment Processing Updates (`screens/CheckoutScreen.js`)
Modified to:
- Pass provider ID to payment creation
- Handle marketplace payment flows
- Show platform fee information in UI

#### Service Layer (`services/stripeService.js`)
Enhanced with new methods:
- `createPaymentIntent()` with provider support
- `confirmPayment()` with provider tracking
- `getConnectStatus()` for account verification
- `createOnboardingLink()` for Stripe onboarding
- `getProviderDashboard()` for earnings data

### 3. User Experience Flow

#### For Event Providers:
1. **Registration**: Complete 4-step provider onboarding with tax and banking info
2. **Verification**: Stripe automatically handles identity and business verification
3. **Account Setup**: Complete any additional verification via Stripe onboarding links
4. **Dashboard**: Monitor earnings, payouts, and account status
5. **Payments**: Automatically receive 90% of ticket sales

#### For Customers:
1. **Purchase**: Normal checkout experience
2. **Payment**: Automatic splitting (transparent to customer)
3. **Receipt**: Shows total amount paid

### 4. Security Features

- **Data Encryption**: Sensitive information stored with minimal exposure
- **PCI Compliance**: All payment data handled by Stripe
- **Identity Verification**: Photo ID and selfie verification for all providers
- **Duplicate Account Prevention**: ID document hashing prevents multiple accounts
- **Fraud Protection**: Stripe's built-in fraud detection plus identity verification
- **Access Control**: Provider data only accessible to account owner
- **Secure File Storage**: Identity documents encrypted and stored securely

### 5. Financial Flow

```
Customer Payment: $100
├── Platform Fee (10%): $10 → Your Stripe Account
└── Provider Amount (90%): $90 → Provider's Connected Account
```

### 6. Environment Setup Required

#### Backend Environment Variables:
```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret
FRONTEND_URL=http://localhost:3000 # For onboarding redirects
```

#### Stripe Dashboard Configuration:
1. Enable Stripe Connect in your dashboard
2. Set up webhook endpoints for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `transfer.created`
3. Configure Connect settings for Express accounts

### 7. Testing

#### Test Cards:
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Insufficient Funds**: `4000000000009995`

#### Test SSN for Individual Accounts:
- **Success**: `000000000` (all zeros)
- **Verification Required**: `000000001`

#### Test EIN for Business Accounts:
- **Success**: `000000000`

### 8. Production Considerations

1. **Live Keys**: Replace test keys with live Stripe keys
2. **Webhook Security**: Implement proper webhook signature verification
3. **Error Handling**: Add comprehensive error logging and alerting
4. **Compliance**: Ensure proper tax reporting (1099s for US providers earning >$600)
5. **International**: Add support for international providers if needed
6. **Rate Limiting**: Implement API rate limiting for payment endpoints

### 9. Monitoring and Analytics

Track key metrics:
- Payment success/failure rates
- Provider onboarding completion rates
- Platform fee revenue
- Provider payout delays
- Account verification issues

### 10. Support Features

- Provider onboarding help documentation
- Payment issue resolution workflow
- Account verification assistance
- Payout schedule management

## Next Steps

1. **Test the complete flow** with Stripe test accounts
2. **Set up webhook endpoints** in production
3. **Configure proper error monitoring**
4. **Create provider support documentation**
5. **Implement analytics tracking**
6. **Add international support** if needed

This implementation provides a complete marketplace payment system with automatic fee splitting, proper verification, and comprehensive provider management. 
 
 