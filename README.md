# ChatRoom Application

A real-time chat application with code execution capabilities, built with React, Node.js, MongoDB, and Supabase.

## Features

- **Real-time Chat**: Join chatrooms and send messages in real-time
- **Code Execution**: Execute code in multiple programming languages using JDoodle API
- **Authentication**: Optional login/signup with Supabase, or use as a guest
- **Emoji Support**: Built-in emoji picker for expressive messaging
- **Responsive Design**: Modern UI with smooth animations

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Motion (Framer Motion replacement)
- Emoji Picker React
- Supabase JS Client

### Backend
- Node.js
- Express.js
- Mongoose (MongoDB ODM)
- Axios (HTTP client)
- CORS

### Database
- MongoDB Atlas (Cloud hosted)

### External APIs
- JDoodle Compiler API (Code execution)
- Supabase (Authentication)

## Project Structure

```
ChatRoom-/
├── jellylemonshake/          # Frontend React app
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── styles/          # CSS files
│   │   ├── App.js           # Main app component
│   │   ├── index.js         # Entry point
│   │   └── supabaseClient.js # Supabase configuration
│   ├── public/
│   └── package.json
├── backend/                  # Node.js backend
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API routes
│   ├── index.js             # Server entry point
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- JDoodle API credentials
- Supabase project

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd jellylemonshake
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your credentials:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   JDOODLE_CLIENT_ID=your_jdoodle_client_id
   JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret
   PORT=5000
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

The backend will run on `http://localhost:5000`

## Environment Variables

### Backend (.env)
- `MONGODB_URI`: MongoDB Atlas connection string
- `JDOODLE_CLIENT_ID`: JDoodle API client ID
- `JDOODLE_CLIENT_SECRET`: JDoodle API client secret
- `PORT`: Server port (default: 5000)

### Frontend (supabaseClient.js)
- Supabase URL and anon key are configured in `src/supabaseClient.js`

## API Endpoints

### Chatrooms
- `POST /api/rooms` - Create or join a chatroom
- `GET /api/rooms` - Get all chatrooms
- `GET /api/rooms/:roomId/messages` - Get messages for a room
- `POST /api/rooms/:roomId/messages` - Post a message

### Code Execution
- `POST /api/jdoodle/execute` - Execute code using JDoodle API

## Usage

1. **Start both servers** (frontend and backend)
2. **Open your browser** to `http://localhost:3000`
3. **Create or join a chatroom** by entering a room name
4. **Send messages** or **execute code** using the execution mode
5. **Use emojis** with the emoji picker
6. **Login/signup** optionally with Supabase, or continue as a guest

## Code Execution

- Click "I want to execute code" to enter execution mode
- Select a programming language
- Write your code in the textarea
- Click "Run" to execute the code
- The output will be displayed only to you (not in chat)

## Authentication

- **Guest Mode**: Automatically assigned a random guest username
- **Supabase Auth**: Optional email/password authentication
- **Profile Management**: Update profile information when logged in

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
