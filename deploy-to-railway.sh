#!/bin/bash

# Railway Deployment Script
# This script helps you deploy your application to Railway

echo "🚀 Railway Deployment Script"
echo "=============================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Please install it first:"
    echo "npm install -g @railway/cli"
    echo "or"
    echo "curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

echo "✅ Railway CLI is installed"

# Login to Railway
echo "🔐 Logging in to Railway..."
railway login

# Deploy Backend
echo "📦 Deploying Backend..."
cd backend
railway up --service backend
echo "✅ Backend deployment initiated"

# Get backend URL
echo "🔗 Getting backend URL..."
BACKEND_URL=$(railway domain --service backend)
echo "Backend URL: $BACKEND_URL"

# Deploy Frontend
echo "📦 Deploying Frontend..."
cd ../jellylemonshake
railway up --service frontend
echo "✅ Frontend deployment initiated"

# Get frontend URL
echo "🔗 Getting frontend URL..."
FRONTEND_URL=$(railway domain --service frontend)
echo "Frontend URL: $FRONTEND_URL"

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "⚠️  Important: Update your backend CORS settings to include:"
echo "   $FRONTEND_URL"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Railway dashboard"
echo "2. Update CORS settings in backend"
echo "3. Test your application"
echo ""
echo "📖 For detailed instructions, see RAILWAY_DEPLOYMENT_GUIDE.md"
