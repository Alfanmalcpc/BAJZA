const axios = require('axios');

const fetchPrices = async () => {
  const ids = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'ripple'];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  
  const response = await axios.get(url);
  return response.data;
};

module.exports = {
  fetchPrices
};
