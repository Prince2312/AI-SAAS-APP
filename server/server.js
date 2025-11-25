import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import aiRouter from './routes/aiRoutes.js';
import userRouter from './routes/userRoutes.js';
import connectCloudinary from './configs/cloudinary.js';

const app = express();

await connectCloudinary();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('Server is Live!'));

// Add a public test route to verify the path
app.get('/api/ai/test', (req, res) => {
  res.json({ message: 'AI routes are accessible!', timestamp: new Date() });
});

// Protect only AI routes:
app.use('/api/ai', requireAuth(), aiRouter);

// User routes (login, profile, subscription, etc.) should NOT require requireAuth
app.use('/api/user', userRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});