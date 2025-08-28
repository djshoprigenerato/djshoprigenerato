
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Webhook needs raw body, so mount that route before json()
import stripeRoutes from './routes/stripe.js';
app.use('/api', stripeRoutes);

// JSON parser for all other routes
app.use(cors());
app.use(express.json());

// Public shop & admin APIs
import shopRoutes from './routes/shop.js';
import adminRoutes from './routes/admin.js';
app.use('/api', shopRoutes);
app.use('/api/admin', adminRoutes);

// Serve the built client
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// History API fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
