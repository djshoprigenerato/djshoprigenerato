import express from 'express';
const router = express.Router();

// Redirect to login or dashboard depending on your existing auth
router.get('/', (req, res) => {
  res.send('Admin placeholder: collega le rotte admin esistenti.');
});

export default router;
