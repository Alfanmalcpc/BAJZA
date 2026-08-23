const cryptoService = require('../services/crypto.service');

const getPrices = async (req, res) => {
  try {
    const data = await cryptoService.fetchPrices();
    res.json(data);
  } catch (error) {
    console.error('Error in crypto.controller:', error.message);
    res.status(500).json({ error: 'Failed to fetch crypto prices' });
  }
};

module.exports = {
  getPrices
};
