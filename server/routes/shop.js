// --- CODICI SCONTO PUBBLICI ---
// GET /api/shop/discounts/:code
router.get('/discounts/:code', async (req, res) => {
  const code = req.params.code.trim();

  async function fetchFrom(table) {
    return supabaseAuth
      .from(table)
      .select('id, code, percent_off, amount_off_cents, active')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle();
  }

  try {
    // 1) prova "discounts"
    let { data, error } = await fetchFrom('discounts');

    // Se la tabella non esiste nello schema cache, riprova con "discount_codes"
    // PostgREST usa error code PGRST116 in questi casi, ma facciamo anche un check sul messaggio.
    if (error && (error.code === 'PGRST116' || /schema cache/i.test(error.message))) {
      const retry = await fetchFrom('discount_codes');
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Codice sconto non trovato o non attivo' });

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
