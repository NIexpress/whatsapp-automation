# Needin — Multi-Service WhatsApp AI Automation Platform

An enterprise-grade, multi-service automation platform powered by **Next.js 14**, **Prisma ORM**, **Supabase PostgreSQL**, **Meta WhatsApp Cloud API (v21.0)**, and **Razorpay Payment Gateway**.

Designed for seamless customer onboarding, automated bookings, interactive in-chat forms, live WhatsApp messaging, and verified digital payments.

---

## 🚀 Key Features

- **📱 Meta WhatsApp Cloud API (v21.0):**
  - Two-way webhook processing (`GET` verification challenge & `POST` message ingestion).
  - Outbound messaging supporting text, interactive quick-reply buttons (up to 3 actions), and interactive list pickers.
  - Delivery status and real-time read receipt updates (`✓✓` blue ticks).
  - Webhook HMAC-SHA256 signature verification.

- **💳 Real Razorpay Gateway Integration:**
  - Order creation API (`POST /api/payments/razorpay/create-order`).
  - Embedded Razorpay `Checkout.js` modal with test UPI, NetBanking, Cards, and QR codes.
  - Server-side cryptographic HMAC-SHA256 payment signature verification (`POST /api/payments/razorpay/verify`).
  - Server-to-server webhook synchronization for `payment.captured` and `order.paid` events.
  - Instant WhatsApp confirmation receipts sent to the customer upon payment completion.

- **🐾 Dog Daycare & Services Booking Engine:**
  - Single-turn in-chat interactive booking forms (reducing turn count and API costs).
  - Real-time slot availability checking and atomic database capacity locking with PostgreSQL transactions.
  - Automated booking numbering (`ND-DDC-YYYYMM-XXXXX`).
  - Booking history viewer with real-time status badges and payment links.

- **💬 WhatsApp Web Simulator:**
  - Realistic WhatsApp mobile preview with simulated and live Meta Cloud API modes.
  - Quick action shortcuts (Book Day Care, Pricing, Location, My Bookings, Menu).
  - Staff take-over mode (`AI_ACTIVE` vs. `HUMAN_ACTIVE`).

- **🛡️ Enterprise Security & Admin Dashboard:**
  - Role-Based Access Control (RBAC) with staff authentication via JOSE JWT.
  - Immutable audit logs for compliance tracking.
  - Database connection pooling with Supabase PostgreSQL.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router, Server Actions, Route Handlers)
- **Database & ORM:** PostgreSQL (Supabase) + Prisma ORM
- **Payments:** Razorpay Node SDK + Razorpay Checkout.js
- **Messaging:** Meta WhatsApp Business Cloud API (Graph API v21.0)
- **Styling:** Tailwind CSS + Lucide Icons
- **Security:** JOSE (JWT), Bcrypt.js, Node.js Crypto (HMAC-SHA256)

---

## 🏁 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/NIexpress/whatsapp-automation.git
cd whatsapp-automation
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL` & `DIRECT_URL`: Supabase PostgreSQL pooled and direct session strings.
- `SESSION_SECRET`: 64-character cryptographic string for JWT sessions.
- `WHATSAPP_ACCESS_TOKEN`: Meta System User Token with `whatsapp_business_messaging`.
- `WHATSAPP_PHONE_NUMBER_ID`: Phone number ID from Meta App Dashboard.
- `WHATSAPP_VERIFY_TOKEN`: Webhook verification token string.
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay API test or live keys.

### 3. Generate Prisma Client & Push Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000/simulator](http://localhost:3000/simulator) to test the WhatsApp chat simulator and Razorpay checkout.

---

## 🌐 Webhook Configuration for Meta

In your **Meta App Dashboard** (WhatsApp → Configuration):
- **Callback URL:** `https://your-domain.com/api/webhook/whatsapp` *(or `/webhooks/whatsapp`)*
- **Verify Token:** Matching `WHATSAPP_VERIFY_TOKEN` in your `.env`
- **Fields to Subscribe:** `messages`

---

## 📄 License
Private proprietary software for Needin Platform.
