# Samba — Event Management & Ticketing Platform

### Payment Integration | Backend Systems | Mobile Application Engineering

**JavaScript · React Native · Expo · Supabase · Stripe · API Integration · QR Codes**

Samba is a cross-platform event management and ticketing application built with React Native and Expo.

The platform combines event discovery, ticketing, payment integration, and event-related workflows into a unified mobile experience.

Built with a modular application structure and Supabase backend integration, Samba demonstrates practical experience developing software that coordinates user interactions, external services, and transaction-related functionality.

## Engineering Highlights

### 1. Payment Processing & Financial Integration

Samba integrates Stripe into its mobile application architecture to support payment-related workflows.

- Integrated the Stripe React Native SDK.
- Organized payment functionality alongside backend services.
- Included Stripe Connect implementation and configuration documentation.
- Developed application infrastructure for event-related transaction workflows.

**Relevant concepts:** Payment APIs, Transaction Processing, Financial Technology, Backend Integration

### 2. Backend Architecture & Data Management

The application integrates Supabase and includes dedicated backend resources.

- Connected mobile application functionality to Supabase services.
- Organized backend, services, and configuration into separate modules.
- Used shared application context to coordinate state across features.
- Integrated Axios for HTTP-based API communication.

**Relevant concepts:** Backend Development, Database Integration, API Communication, Asynchronous Operations, Modular Architecture

### 3. Ticketing & QR-Code Integration

The project incorporates QR-code generation and camera functionality into its mobile technology stack.

- Integrated QR-code rendering using `react-native-qrcode-svg`.
- Incorporated Expo Camera for camera-based workflows.
- Organized event and ticketing interfaces within the application.
- Combined native device capabilities with backend-connected application functionality.

**Relevant concepts:** Data Encoding, QR Codes, Device Integration, Event-Driven Applications

### 4. Location & Mapping Services

Samba incorporates geolocation and mapping technologies for location-aware event experiences.

- Integrated Expo Location for device location access.
- Incorporated React Native Maps for map-based interfaces.
- Included network connectivity utilities for device-level networking.
- Combined location-aware features with mobile navigation.

**Relevant concepts:** Geolocation, Mapping, Native APIs, Network Connectivity

### 5. Application Architecture

- Built a cross-platform application using React Native and Expo SDK 53.
- Organized application functionality into components, screens, services, and shared context.
- Integrated React Navigation for screen and tab navigation.
- Added internationalization resources through a dedicated `i18n` directory.
- Configured Expo Application Services for mobile development and deployment.

**Relevant concepts:** Software Architecture, State Management, Cross-Platform Development, Internationalization

## Core Features & Technical Components

| Component | Engineering Focus |
|---|---|
| Event Discovery | Event-oriented interfaces and data presentation |
| Ticketing | Ticket-related application workflows |
| Payment Integration | Stripe and Stripe Connect infrastructure |
| QR Codes | QR-code generation and camera integration |
| Location Services | Device geolocation and mapping |
| Backend Services | Supabase and API integration |
| Authentication & State | Shared application context |
| Internationalization | Multilingual application resources |

## Technology Stack

| Category | Technologies |
|---|---|
| Programming | JavaScript |
| Mobile Framework | React Native, React 19 |
| Development Platform | Expo SDK 53 |
| Backend | Supabase |
| Database | PostgreSQL via Supabase |
| Payments | Stripe React Native SDK |
| Networking | Axios, Expo Network |
| QR Codes | react-native-qrcode-svg |
| Camera | Expo Camera |
| Maps | React Native Maps |
| Location | Expo Location |
| Navigation | React Navigation |
| State Management | React Context |
| Build Tooling | Expo Application Services |

## Repository Architecture

```text
samba/
├── App.js                  # Main application component
├── index.js                # Application entry point
├── backend/                # Backend-related code
├── components/             # Reusable UI components
├── config/                 # Application configuration
├── context/                # Shared application state
├── i18n/                   # Internationalization resources
├── screens/                # Application screens
├── services/               # Service integrations
├── supabase/               # Supabase backend resources
├── theme/                  # Application styling
├── utils/                  # Shared utility functions
├── plugins/                # Native plugins
├── assets/                 # Static assets
├── app.config.js           # Expo application configuration
├── eas.json                # Build configuration
└── package.json            # Dependencies and scripts
```

The repository separates application presentation, shared state, backend functionality, and external integrations into dedicated modules.

## Getting Started

### Prerequisites

- Node.js and npm
- Expo development tooling
- Xcode or Android Studio for native builds
- Supabase project configuration
- Stripe credentials for payment-related functionality

### Installation

Clone the repository:

```bash
git clone https://github.com/MousScales/samba.git
cd samba
```

Install dependencies:

```bash
npm install
```

### Environment Configuration

Review `.env.example` and configure the environment variables required by the application.

For payment integration details, consult:

- [Stripe Setup](STRIPE_SETUP.md)
- [Stripe Connect Implementation](STRIPE_CONNECT_IMPLEMENTATION.md)

Never commit secret API keys or private credentials.

### Start Development

```bash
npm start
```

Run on iOS:

```bash
npm run ios
```

Run on Android:

```bash
npm run android
```

Native integrations may require an Expo development build.

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run ios` | Start Expo for iOS |
| `npm run android` | Start Expo for Android |
| `npm run web` | Start Expo for web |
| `npm run eas:env:production` | Push production environment configuration to EAS |
| `npm run eas:env:preview` | Push preview environment configuration to EAS |

## Engineering Focus

Samba demonstrates experience with software engineering concepts that are relevant to financial and data-intensive applications.

**Transaction-Oriented Workflows**

Integrating payment infrastructure into a mobile application and coordinating payment-related services.

**Backend Integration**

Connecting application interfaces with backend services, external APIs, and structured data.

**Event-Driven Application Design**

Developing workflows around user actions, navigation, tickets, and device interactions.

**Modular Architecture**

Separating components, services, application state, and backend resources to improve maintainability.

**Systems Integration**

Combining payment providers, mapping services, camera functionality, and cloud infrastructure within one application.

These experiences establish foundations for more advanced work in financial software engineering, systems programming, and quantitative development.

## About the Developer

**Moustapha Gueye**

Computer & Data Science Student at New York University | Aspiring Quantitative Developer

Interested in C++, Python, algorithms, systems programming, and financial technology.

- **GitHub:** [@MousScales](https://github.com/MousScales)
- **Portfolio:** [mousholdings.com](https://mousholdings.com)

---

© 2026 Moustapha Gueye. All rights reserved.
