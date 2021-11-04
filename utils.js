function getUSDPriceByCrypto(crypto, available, onOrder, price) {
  let usd;
  if (crypto === 'BUSD' || crypto === 'USDT' || crypto === 'USDC')
    usd = available + onOrder;
  else if (crypto === 'EUR') usd = (available + onOrder) * price['EURUSDT'];
  else {
    usd = (available + onOrder) * price[crypto + 'USDT'];

    if (usd === 0.0 || isNaN(usd))
      usd = (available + onOrder) * price[crypto + 'BTC'] * price['BTCUSDT'];
  }

  return usd;
}

module.exports = { getUSDPriceByCrypto };
