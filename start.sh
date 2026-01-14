#!/bin/bash

echo "🚀 Starting Visa Rescheduler SaaS Platform..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Please create it with required variables."
    exit 1
fi

# Check if web node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing web app dependencies..."
    npm install
fi

# Check if script node_modules exists
if [ ! -d scripts/node_modules ]; then
    echo "📦 Installing script dependencies..."
    cd scripts && npm install && cd ..
fi

# Check if database exists
if [ ! -f prisma/dev.db ]; then
    echo "🗄️  Creating database..."
    npx prisma migrate dev --name init
    npx prisma generate
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "📂 Project Structure:"
echo "   - Web app: Root directory (Next.js)"
echo "   - Scripts: ./scripts/ (Rescheduler automation)"
echo ""
echo "Starting development server..."
echo "Visit: http://localhost:3000"
echo ""

npm run dev
