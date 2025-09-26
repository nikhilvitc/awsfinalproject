# Railway Deployment Guide

This guide will help you deploy both the backend and frontend of your application on Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Your MongoDB connection string
3. Your project repository connected to GitHub

## Backend Deployment

### Step 1: Deploy Backend to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `backend` folder as the root directory
6. Railway will automatically detect it's a Node.js project

### Step 2: Configure Environment Variables

In your Railway backend service, add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
NODE_ENV=production
PORT=5000
```

### Step 3: Deploy

Railway will automatically build and deploy your backend. The deployment URL will be something like:
`https://your-backend-name-production.up.railway.app`

## Frontend Deployment

### Step 1: Deploy Frontend to Railway

1. In your Railway dashboard, click "New Service"
2. Select "Deploy from GitHub repo"
3. Choose the same repository
4. Select the `jellylemonshake` folder as the root directory
5. Railway will detect it's a React project

### Step 2: Configure Environment Variables

In your Railway frontend service, add these environment variables:

```
REACT_APP_API_URL=https://your-backend-name-production.up.railway.app
```

Replace `your-backend-name-production` with your actual backend Railway URL.

### Step 3: Deploy

Railway will automatically build and deploy your frontend. The deployment URL will be something like:
`https://your-frontend-name-production.up.railway.app`

## Post-Deployment Configuration

### Update CORS Settings

After both services are deployed, you'll need to update the CORS settings in your backend to include the Railway frontend URL.

1. Go to your backend service in Railway
2. Add the frontend URL to the CORS origins in your backend code
3. Redeploy the backend

### Test the Deployment

1. Visit your frontend URL
2. Test the chat functionality
3. Verify that real-time features work correctly

## Environment Variables Reference

### Backend Environment Variables
- `MONGODB_URI`: Your MongoDB connection string
- `NODE_ENV`: Set to `production`
- `PORT`: Railway will set this automatically

### Frontend Environment Variables
- `REACT_APP_API_URL`: Your backend Railway URL
- `REACT_APP_SUPABASE_URL`: If using Supabase
- `REACT_APP_SUPABASE_ANON_KEY`: If using Supabase

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your backend CORS settings include your frontend Railway URL
2. **Socket.IO Connection Issues**: Ensure both services are using HTTPS
3. **Environment Variables**: Double-check that all required environment variables are set

### Logs

You can view logs for both services in the Railway dashboard to debug any issues.

## Custom Domains

Railway allows you to set up custom domains for your services:

1. Go to your service settings
2. Click on "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Monitoring

Railway provides built-in monitoring for your services:
- CPU and memory usage
- Request logs
- Error tracking
- Performance metrics

## Scaling

Railway automatically handles scaling, but you can configure it manually:
1. Go to your service settings
2. Click on "Scaling"
3. Adjust the scaling settings as needed

## Security

Make sure to:
1. Use HTTPS for all communications
2. Set secure environment variables
3. Configure CORS properly
4. Use strong passwords for your database

## Support

If you encounter any issues:
1. Check the Railway documentation
2. View the service logs
3. Contact Railway support if needed
