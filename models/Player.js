const { getUSDPriceByCrypto } = require('../utils');

class Player {
  constructor({ name, apiKey, secretKey, bet }) {
    if (!name) {
      throw new Error('name must be provided');
    }
    if (!apiKey) {
      throw new Error('apiKey must be provided');
    }
    if (!secretKey) {
      throw new Error('secretKey must be provided');
    }
    if (!bet) {
      throw new Error('bet must be provided');
    }
    if (isNaN(bet)) {
      throw new Error('bet must be a number');
    }

    this.name = name;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.bet = bet;
  }

  setBet(bet, config) {
    if (isNaN(bet)) {
      throw new Error('bet must be a number');
    }

    this.bet = bet;
    config.updatePlayer(this);
  }

  async getBalanceFutures(binanceAPI) {
    const binance = binanceAPI.options({
      APIKEY: this.apiKey,
      APISECRET: this.secretKey,
    });
    await binance.useServerTime();
    const futures = await binance.futuresAccount();
    const balance = parseInt(futures['totalMarginBalance']);
    return isNaN(balance) ? 0 : balance;
  }

  async getBalanceSpot(binanceAPI) {
    const binance = binanceAPI.options({
      APIKEY: this.apiKey,
      APISECRET: this.secretKey,
    });

    try {
      const [price, cryptoList] = await Promise.all([
        binance.prices(),
        binance.balance(),
      ]);
      const cryptos = [];
      const total = cryptoList.reduce((acc, crypto) => {
        let available = parseFloat(crypto['available']);
        let onOrder = parseFloat(crypto['onOrder']);
        if (available + onOrder === 0.0) {
          return;
        }

        let amount = getUSDPriceByCrypto(crypto, available, onOrder, price);
        if (amount > 2) {
          amount = Math.round(amount);
          cryptos.push({ value: crypto, amount });
          return acc + amount;
        }
      }, 0);
      return { total, cryptos };
    } catch (e) {
      console.log(e);
    }
  }

  getPnlHistory() {}
}

module.exports = Player;
