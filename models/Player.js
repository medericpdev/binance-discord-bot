const { getUSDPriceByCrypto } = require('../utils');
const BinanceAPI = require('node-binance-api');

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
    this.bet = parseInt(bet);
  }

  setBet(bet, config) {
    if (isNaN(bet)) {
      throw new Error('bet must be a number');
    }

    this.bet = parseInt(bet);
    config.updatePlayer(this);
  }

  async getBalanceFutures({ binanceAPI = new BinanceAPI() } = {}) {
    const binance = binanceAPI.options({
      APIKEY: this.apiKey,
      APISECRET: this.secretKey,
    });
    await binance.useServerTime();
    const futures = await binance.futuresAccount();
    const balance = parseInt(futures['totalMarginBalance']);
    return isNaN(balance) ? 0 : balance;
  }

  async getBalanceSpot({ binanceAPI = new BinanceAPI() } = {}) {
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
      let total = 0;

      for (let crypto in cryptoList) {
        let available = parseFloat(cryptoList[crypto]['available']);
        let onOrder = parseFloat(cryptoList[crypto]['onOrder']);
        if (available + onOrder === 0.0) {
          continue;
        }

        let amount = getUSDPriceByCrypto(crypto, available, onOrder, price);
        if (amount > 2) {
          amount = Math.round(amount);
          cryptos.push({ value: crypto, amount });
          total += amount;
        }
      }

      return { total, cryptos };
    } catch (e) {
      console.log(e);
    }
  }

  getPnlHistory() {
    // TODO Move getPnlHistory in Player
  }
}

module.exports = Player;
