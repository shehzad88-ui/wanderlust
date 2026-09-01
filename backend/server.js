import cors from 'cors';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import { PORT } from './config/utils.js';

import authRouter from './routes/auth.js';
import postsRouter from './routes/posts.js';

import { connectToRedis } from './services/redis.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(compression());

// Test API
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend connected successfully',
  });
});

// Connect to database
connectDB();

// Connect to Redis
connectToRedis();

// API routes
app.use('/api/posts', postsRouter);
app.use('/api/auth', authRouter);

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Wanderlust Backend is running',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
