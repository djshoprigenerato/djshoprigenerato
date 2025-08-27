import express from 'express';
const router = express.Router();

// Home demo: expects that your existing code replaces data fetching
router.get('/', async (req, res) => {
  // Render with empty arrays if data layer not wired, the page still renders
  res.render('store/home', { title: 'Home', cats: [], prods: [] });
});

export default router;
