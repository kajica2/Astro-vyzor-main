#!/bin/bash

echo "🚀 Starting Astro-Vysio Application"
echo "=================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🔨 Building application..."
npm run build
echo ""

echo "✨ Starting development server..."
echo "Opening browser at http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server and open browser
npm run demo