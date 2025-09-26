# Render Meeting Feature Deployment Guide

## 🚀 Quick Fix for Meeting Issues on Render

### **Step 1: Update Your Render Services**

#### Backend Service (Render)
1. Go to your Render dashboard
2. Find your backend service
3. Go to **Environment** tab
4. Add/Update these environment variables:
   ```
   MONGODB_URI=your-mongodb-atlas-connection-string
   NODE_ENV=production
   ```
5. Click **Save Changes**
6. Go to **Manual Deploy** → **Deploy latest commit**

#### Frontend Service (Render)
1. Go to your Render dashboard
2. Find your frontend service
3. Go to **Environment** tab
4. Add/Update these environment variables:
   ```
   REACT_APP_API_URL=https://awsproject-backend.onrender.com
   ```
5. Click **Save Changes**
6. Go to **Manual Deploy** → **Deploy latest commit**

### **Step 2: Test Meeting API**

After deployment, test your meeting API:

```bash
# Test meeting API status
curl https://awsproject-backend.onrender.com/api/meetings/debug/status

# Test meeting creation
curl -X POST https://awsproject-backend.onrender.com/api/meetings/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Meeting",
    "roomId": "test123",
    "organizer": "testuser@example.com",
    "scheduledTime": "2024-12-31T10:00:00Z"
  }'
```

### **Step 3: Verify Frontend Connection**

1. Open your frontend URL
2. Open browser developer tools (F12)
3. Go to **Console** tab
4. Try to create a meeting
5. Check for any error messages

### **Step 4: Common Issues & Solutions**

#### Issue 1: "Meeting API is not responding"
**Solution**: Check if backend is deployed and running
- Go to Render dashboard
- Check backend service status
- Look at backend logs

#### Issue 2: "Failed to create meeting"
**Solution**: Check MongoDB connection
- Verify MONGODB_URI is correct
- Check MongoDB Atlas connection
- Test database connection

#### Issue 3: CORS errors
**Solution**: Backend CORS is already configured for Render domains

#### Issue 4: Meeting room not loading
**Solution**: Check meeting ID format and API response

### **Step 5: Test Complete Meeting Flow**

1. **Create Meeting**:
   - Go to a chat room
   - Click "Schedule Meeting"
   - Fill in meeting details
   - Click "Create Meeting"

2. **Join Meeting**:
   - Click on meeting link
   - Should load meeting room
   - Click "Join Video Call"

3. **Instant Meeting**:
   - Go to a chat room
   - Click "Start Instant Meeting"
   - Should create and join meeting immediately

### **Step 6: Debug Commands**

```bash
# Check backend health
curl https://awsproject-backend.onrender.com/health

# Check meeting API status
curl https://awsproject-backend.onrender.com/api/meetings/debug/status

# List all meetings
curl https://awsproject-backend.onrender.com/api/meetings/debug/all

# Test meeting creation
node test-meetings.js
```

### **Step 7: Environment Variables Checklist**

#### Backend Environment Variables:
- [ ] `MONGODB_URI` - MongoDB Atlas connection string
- [ ] `NODE_ENV` - Set to `production`

#### Frontend Environment Variables:
- [ ] `REACT_APP_API_URL` - Backend Render URL

### **Step 8: Monitoring**

#### Backend Logs (Render Dashboard):
1. Go to your backend service
2. Click **Logs** tab
3. Look for meeting-related logs
4. Check for any errors

#### Frontend Console:
1. Open your frontend
2. Press F12
3. Go to **Console** tab
4. Look for meeting-related errors

### **Step 9: Troubleshooting**

#### If meetings still don't work:

1. **Check Backend Logs**:
   - Look for MongoDB connection errors
   - Check for meeting route errors
   - Verify environment variables

2. **Check Frontend Console**:
   - Look for API call errors
   - Check for CORS errors
   - Verify API URL

3. **Test API Endpoints**:
   - Use the test script: `node test-meetings.js`
   - Test individual endpoints with curl
   - Check database for meeting records

### **Step 10: Success Indicators**

✅ **Backend Working**:
- Health check returns 200
- Meeting API status returns success
- Meeting creation works
- Database connection successful

✅ **Frontend Working**:
- No console errors
- Meeting creation form works
- Meeting room loads
- Video call interface appears

✅ **Integration Working**:
- Meetings are created in database
- Meeting links work
- Real-time features work
- Meeting notifications work

## 🎯 **Expected Results**

After applying these fixes:

1. **Meeting Creation**: Should work without errors
2. **Meeting Room**: Should load properly
3. **Video Call**: Should show video interface
4. **Real-time**: Should work with Socket.IO
5. **Database**: Meetings should be saved and retrieved

## 📞 **Support**

If you're still having issues:

1. Check Render service logs
2. Test API endpoints manually
3. Verify environment variables
4. Check MongoDB Atlas connection
5. Test with the provided test script

The meeting feature should work perfectly on Render after these fixes!
