# Deploy to Railway

This project is configured for deployment on Railway, a modern cloud platform.

## Quick Start

### Option 1: Using Railway Dashboard (Recommended)

1. **Sign up** at [railway.app](https://railway.app)
2. **Connect your GitHub repository**
3. **Deploy Backend:**
   - Create new project
   - Select "Deploy from GitHub repo"
   - Choose your repo
   - Set root directory to `backend/`
   - Add environment variables (see below)
4. **Deploy Frontend:**
   - Add new service to same project
   - Select "Deploy from GitHub repo"
   - Choose your repo
   - Set root directory to `jellylemonshake/`
   - Add environment variables (see below)

### Option 2: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy backend
cd backend
railway up

# Deploy frontend
cd ../jellylemonshake
railway up
```

## Environment Variables

### Backend Environment Variables

Set these in your Railway backend service:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
NODE_ENV=production
```

### Frontend Environment Variables

Set these in your Railway frontend service:

```
REACT_APP_API_URL=https://your-backend-name-production.up.railway.app
```

Replace `your-backend-name-production` with your actual backend Railway URL.

## Project Structure

```
awsproject/
├── backend/                 # Backend service
│   ├── index.js           # Main server file
│   ├── package.json       # Backend dependencies
│   ├── railway.json       # Railway configuration
│   └── Procfile           # Process file
├── jellylemonshake/       # Frontend service
│   ├── src/               # React source code
│   ├── package.json       # Frontend dependencies
│   ├── railway.json       # Railway configuration
│   └── Procfile           # Process file
├── railway.toml          # Global Railway config
└── RAILWAY_DEPLOYMENT_GUIDE.md
```

## Features

- ✅ **Automatic HTTPS**: Railway provides SSL certificates
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Zero-downtime deployments**: Updates without service interruption
- ✅ **Built-in monitoring**: CPU, memory, and request metrics
- ✅ **Custom domains**: Add your own domain names
- ✅ **Environment management**: Secure environment variable storage

## Configuration Files

### Backend (`backend/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Frontend (`jellylemonshake/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## CORS Configuration

The backend is configured to accept requests from Railway domains. After deployment, you may need to update the CORS origins in `backend/index.js` to include your specific Railway URLs.

## Database

This project uses MongoDB. Make sure to:
1. Set up a MongoDB Atlas cluster
2. Get your connection string
3. Add it as `MONGODB_URI` environment variable

## Monitoring

Railway provides built-in monitoring:
- **Metrics**: CPU, memory, disk usage
- **Logs**: Real-time application logs
- **Alerts**: Set up notifications for issues

## Custom Domains

To use your own domain:
1. Go to your service settings
2. Click "Domains"
3. Add your domain
4. Configure DNS as instructed

## Troubleshooting

### Common Issues

1. **Build Failures**: Check the build logs in Railway dashboard
2. **CORS Errors**: Verify CORS settings include your frontend URL
3. **Database Connection**: Ensure MongoDB URI is correct
4. **Environment Variables**: Double-check all required variables are set

### Getting Help

- Check Railway documentation: https://docs.railway.app
- View service logs in Railway dashboard
- Contact Railway support if needed

## Cost

Railway offers:
- **Free tier**: $5 credit monthly
- **Pro plan**: $20/month for production use
- **Pay-as-you-go**: Only pay for what you use

## Security

Railway provides:
- Automatic HTTPS
- Secure environment variables
- Network isolation
- DDoS protection

## Next Steps

After deployment:
1. Test your application
2. Set up monitoring alerts
3. Configure custom domains
4. Set up CI/CD for automatic deployments
