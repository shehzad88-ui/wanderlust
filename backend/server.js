
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import compression from 'compression';
import connectDB from './config/db.js';
import { PORT } from './config/utils.js';
import authRouter from './routes/auth.js';
import postsRouter from './routes/posts.js';
import { connectToRedis } from './services/redis.js';
const app = express();
app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend connected successfully"
  });
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());
app.use(compression());

// Connect to database
connectDB();

// Connect to redis
connectToRedis();

// API route
app.use('/api/posts', postsRouter);
app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Yay!! Backend of wanderlust app is now accessible');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
