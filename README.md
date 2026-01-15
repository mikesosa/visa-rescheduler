# Visa Rescheduler SaaS Platform

A B2C SaaS platform for automated US visa appointment rescheduling. Monitor and automatically reschedule your visa appointments to earlier dates.

## 🏗️ Project Structure

```
visa-rescheduler/
├── scripts/              # Rescheduler automation scripts
│   ├── index.js         # Entry point for rescheduler
│   ├── rescheduler.js   # Core automation logic
│   └── package.json     # Script dependencies
├── src/                 # Next.js application source
│   ├── app/            # App Router pages & API routes
│   ├── components/     # React components
│   └── lib/            # Auth, DB, encryption, job manager
├── prisma/             # Database schema & migrations
├── public/             # Static assets
├── package.json        # Web app dependencies
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17+ installed
- Google Chrome installed (for rescheduler script)

### 1. Install Dependencies

```bash
# Install web app dependencies
npm install

# Install script dependencies
cd scripts
npm install
cd ..
```

### 2. Environment Setup

The `.env.local` file has been created with defaults. Update these values:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
ENCRYPTION_KEY="your-32-char-encryption-key"
```

### 3. Initialize Database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

## 📱 Using the Platform

1. **Sign Up**: Create an account at http://localhost:3000/signup
2. **Login**: Sign in with your credentials
3. **Create Job**: Go to Dashboard → New Monitoring Job
4. **Enter Details**:
   - Visa account credentials
   - Current appointment date
   - Schedule ID
   - Optional: Minimum date (don't book before)
5. **Monitor**: Dashboard shows real-time status updates

## 🛠️ Using Scripts Standalone

You can also run the rescheduler script directly without the web interface:

```bash
cd scripts
node index.js <email> <password> <current-date> <schedule-id> [facility-id] [not-earlier-than]
```

See [`scripts/README.md`](scripts/README.md) for detailed script usage.

## 🔒 Security Features

- **Password Hashing**: Bcrypt with 10 rounds for user accounts
- **Encryption**: AES-256 for visa credentials
- **JWT Sessions**: Secure token-based authentication
- **CSRF Protection**: Built-in with NextAuth
- **SQL Injection Prevention**: Prisma ORM parameterized queries

## 📊 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth.js v4
- **Process Management**: Node.js child_process
- **Automation**: Selenium WebDriver, ChromeDriver

## 🎯 Key Features

### For Users

- Automated 24/7 monitoring (checks every 60 seconds)
- Smart slot selection (avoids racing for first slots)
- Handles both Consulate and ASC appointments
- Real-time dashboard updates
- Secure credential storage

### For Developers

- RESTful API design
- TypeScript for type safety
- Prisma for database migrations
- Process lifecycle management
- Clean separation of concerns

## 📁 Important Files

- **`src/lib/job-manager.ts`**: Spawns and monitors rescheduler processes
- **`src/lib/auth.ts`**: NextAuth configuration
- **`src/lib/encryption.ts`**: AES-256 encryption utilities
- **`src/app/api/jobs/route.ts`**: Job CRUD API endpoints
- **`scripts/index.js`**: Rescheduler entry point
- **`scripts/rescheduler.js`**: Core automation logic

## 🧪 Testing

Build the application:

```bash
npm run build
```

Run development server:

```bash
npm run dev
```

## 📖 Documentation

- [`scripts/README.md`](scripts/README.md) - Rescheduler script documentation
- [`INTEGRATION_TEST.md`](INTEGRATION_TEST.md) - End-to-end testing guide
- [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md) - Complete implementation overview

## 🚢 Deployment

### ⚠️ Important: Vercel Limitations

**Vercel is NOT suitable for running the rescheduler jobs** because:

1. Vercel functions are serverless with a 10-second timeout (60s max on Pro)
2. No persistent file system for ChromeDriver
3. No support for Selenium/Chrome in serverless functions
4. Jobs need to run continuously for hours

### Recommended Deployment Architecture

#### Option 1: Vercel Frontend + VPS Backend (Recommended)

**Frontend (Vercel)**:

- Deploy Next.js app to Vercel
- Use PostgreSQL database (Vercel Postgres or Neon)
- Set environment variables in Vercel dashboard

**Backend (Separate VPS - DigitalOcean/AWS/Linode)**:

- Run Node.js server with job manager
- Install Chrome/ChromeDriver
- Run long-lived processes
- Connect to same PostgreSQL database

#### Option 2: Full VPS Deployment

Deploy everything on a single VPS with:

- Node.js 18+
- Chrome/ChromeDriver installed
- PostgreSQL database
- PM2 or systemd for process management

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."  # PostgreSQL connection string
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-domain.com"
ENCRYPTION_KEY="generate-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID="optional-for-google-oauth"
GOOGLE_CLIENT_SECRET="optional-for-google-oauth"
```

### Development

- PostgreSQL database (local or Neon)
- Local Node.js server
- Chrome installed for Selenium

## 🔮 Future Enhancements

- [ ] Stripe integration for subscriptions
- [ ] Email notifications (SendGrid)
- [ ] SMS alerts (Twilio)
- [ ] WebSocket for real-time updates
- [ ] Job history and analytics
- [ ] Multi-user team accounts
- [ ] Admin dashboard
- [ ] API webhooks

## 📝 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. For issues or suggestions, please contact the maintainer.

---

**Status**: ✅ Production-ready foundation
**Build**: ✅ Passing
**Version**: 1.0.0
