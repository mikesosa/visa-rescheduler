# Vercel Deployment Guide

## Current Status

✅ **Working on Vercel:**
- Next.js web application
- Database connection (PostgreSQL via Neon)
- Authentication (NextAuth.js)
- API routes for job management

❌ **NOT Working on Vercel:**
- Rescheduler automation jobs (Selenium/Chrome)
- Long-running background processes

## Why Jobs Don't Work on Vercel

Vercel is a **serverless platform** with these limitations:

1. **Function Timeout**: 10 seconds (Hobby), 60 seconds (Pro), 900 seconds (Enterprise max)
2. **No Persistent Filesystem**: ChromeDriver needs to write files
3. **No Browser Support**: Selenium requires Chrome/ChromeDriver
4. **Stateless Functions**: Each request runs in a new isolated container
5. **No Long-Running Processes**: Jobs need to run for hours/days continuously

## Current Error

```
Error: Cannot find module 'moment'
```

Even if we fix this dependency issue, the jobs still won't run due to the architectural limitations above.

## Solutions

### Solution 1: Hybrid Deployment (Recommended)

**Frontend on Vercel** + **Backend on VPS**

#### Vercel (Frontend):
- Deploy Next.js UI
- Authentication & user management
- Job status display
- Database connection

#### VPS (Backend - $5-10/month):
- DigitalOcean Droplet
- AWS EC2 t2.micro
- Linode Nanode
- Railway.app (supports long processes)

**Setup VPS:**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install ChromeDriver
wget https://chromedriver.storage.googleapis.com/114.0.5735.90/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo mv chromedriver /usr/local/bin/
sudo chmod +x /usr/local/bin/chromedriver

# Clone your repo and install dependencies
git clone <your-repo>
cd visa-rescheduler
npm install
cd scripts && npm install && cd ..

# Set environment variables
nano .env

# Run the job manager service
# Option 1: Create a separate job-runner.js
# Option 2: Use PM2
npm install -g pm2
pm2 start src/lib/job-runner.js --name visa-jobs
pm2 startup
pm2 save
```

#### Create Job Runner Service

Create `job-runner.js` in your project root:

```javascript
// job-runner.js - Run this on VPS
const { restartActiveJobs } = require('./src/lib/job-manager');
const { prisma } = require('./src/lib/db');

async function main() {
  console.log('Starting job runner service...');
  
  // Restart active jobs on startup
  await restartActiveJobs();
  
  // Keep the process alive
  setInterval(() => {
    console.log('Job runner heartbeat:', new Date().toISOString());
  }, 60000); // Every minute
}

main().catch(console.error);

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
```

### Solution 2: Railway.app (Easier Alternative)

Railway.app supports long-running processes and is easier than managing a VPS.

**Pros:**
- $5/month hobby plan
- Supports Selenium/Chrome
- Easy deployment (connect GitHub)
- Built-in PostgreSQL
- No server management

**Cons:**
- Costs money (no free tier anymore)
- Less control than VPS

**Deploy to Railway:**

1. Sign up at https://railway.app
2. Create new project from GitHub
3. Add PostgreSQL service
4. Set environment variables
5. Railway will auto-deploy

### Solution 3: Local Development Only

Keep everything running locally:

```bash
npm run dev
```

This works perfectly for personal use but doesn't scale to multiple users.

## Recommended Path Forward

### For MVP/Personal Use:
✅ Use **Railway.app** - easiest, works out of the box

### For Production SaaS:
✅ Use **Vercel + VPS**:
- Vercel: Web interface ($0)
- DigitalOcean: Job runner ($5/mo)
- Neon: PostgreSQL database (free tier)
- **Total: $5/month**

### For Local Only:
✅ Run everything locally - free but not scalable

## Next Steps

1. **Immediate**: Fix dependencies for local development
   ```bash
   npm install
   ```

2. **Short-term**: Choose deployment strategy above

3. **Long-term**: 
   - Add job queuing (Bull/BullMQ)
   - Separate job-runner service
   - Add health checks and monitoring
   - Implement job retries and error handling

## Environment Variables Checklist

### Vercel (Web App):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generated secret
- `NEXTAUTH_URL` - https://your-app.vercel.app
- `ENCRYPTION_KEY` - Generated key

### VPS/Railway (Job Runner):
- `DATABASE_URL` - Same PostgreSQL database
- `ENCRYPTION_KEY` - Same as Vercel
- Any other environment variables your scripts need

## Current Setup

Right now, your Vercel deployment has:
- ✅ Web interface working
- ✅ Database connected
- ✅ Auth working
- ❌ Jobs not running (will error)

**Users can create jobs in the UI, but they won't execute until you set up the backend worker.**

## Questions?

Feel free to ask about:
- Setting up a VPS
- Configuring Railway.app
- Separating the job runner
- Any deployment issues
