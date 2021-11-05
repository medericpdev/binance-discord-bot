const BINANCE_API = require('node-binance-api');
const DATE = require('date-and-time');
const { getUSDPriceByCrypto } = require('./utils');

function addPlayerInConfig(playerName, apiKey, secretKey, playerBet, config) {
  if (config.get('players').find({ name: playerName }).value() == null) {
    config
      .get('players')
      .push({
        name: playerName,
        apikey: apiKey,
        secretkey: secretKey,
        bet: playerBet,
      })
      .write();
    return true;
  }
  return false;
}

function deletePlayerInConfig(playerName, config) {
  config.get('players').remove({ name: playerName }).write();
}

function setBetInConfig(playerName, bet, config) {
  const PLAYER = config.get('players').find({ name: playerName }).value();
  if (!PLAYER) {
    return { message: '**:warning: Player name unknown :warning:**' };
  }

  if (isNaN(bet)) {
    console.log(bet);
    return { message: '**:warning: You must use an number :warning:**' };
  }

  const OLD_BET = PLAYER.bet;
  PLAYER.bet = bet;
  config.write();

  return {
    message: `**:white_check_mark: ${PLAYER.name} bet : ${OLD_BET}$ -> ${PLAYER.name} bet : ${bet}$**`,
  };
}

async function getPlayerBalanceSpot(apiKey, secretKey, message) {
  const BINANCE = new BINANCE_API().options({
    APIKEY: apiKey,
    APISECRET: secretKey,
  });

  await BINANCE.useServerTime();

  try {
    const RESULTS = await Promise.all([BINANCE.prices(), BINANCE.balance()]);
    const PRICE = RESULTS[0];
    const CRYPTO_LIST = RESULTS[1];

    return _getBalance(CRYPTO_LIST, PRICE, message);
  } catch (e) {
    console.log(e);
  }
}

async function getPlayerBalanceFutures(apiKey, secretKey) {
  const BINANCE = new BINANCE_API().options({
    APIKEY: apiKey,
    APISECRET: secretKey,
  });
  if (apiKey === undefined || secretKey === undefined) {
    return { totalSpotBalance: 0, message: `RIP` };
  }
  await BINANCE.useServerTime();

  const FUTURES = await BINANCE.futuresAccount();

  if (isNaN(parseInt(FUTURES['totalMarginBalance']))) return 0;
  else return parseInt(FUTURES['totalMarginBalance']);
}

function _getBalance(cryptoList, price, message) {
  let totalSpotBalance = 0;
  let messages = [];

  for (let crypto in cryptoList) {
    let available = parseFloat(cryptoList[crypto]['available']);
    let onOrder = parseFloat(cryptoList[crypto]['onOrder']);

    if (available + onOrder == 0) {
      continue;
    }

    let balanceUSD = getUSDPriceByCrypto(crypto, available, onOrder, price);
    if (balanceUSD > 2) {
      balanceUSD = Math.round(balanceUSD);

      if (message) {
        messages.push(`:arrow_forward: ${crypto} = **${balanceUSD} $**`);
      }
      totalSpotBalance = balanceUSD + totalSpotBalance;
    }
  }

  return { totalSpotBalance, messages };
}

function getPnlHistory(message, playerName, pnl, db) {
  let balanceNow;
  const NOW = new Date();

  const YESTERDAY = DATE.addDays(NOW, -1);
  const LAST_WEEK = DATE.addDays(NOW, -7);
  const LAST_MONTH = DATE.addMonths(NOW, -1);

  const YESTERDAY_DATE = db
    .get('data')
    .find({
      player_name: playerName,
      year: YESTERDAY.getFullYear(),
      month: YESTERDAY.getMonth() + 1,
      day: YESTERDAY.getDate(),
    })
    .value();
  const LAST_WEEK_DATA = db
    .get('data')
    .find({
      player_name: playerName,
      year: LAST_WEEK.getFullYear(),
      month: LAST_WEEK.getMonth() + 1,
      day: LAST_WEEK.getDate(),
    })
    .value();
  const LAST_MONTH_DATA = db
    .get('data')
    .find({
      player_name: playerName,
      year: LAST_MONTH.getFullYear(),
      month: LAST_MONTH.getMonth() + 1,
      day: LAST_MONTH.getDate(),
    })
    .value();

  const MAP = new Map();
  MAP.set('Yesterday', YESTERDAY_DATE);
  MAP.set('Last week', LAST_WEEK_DATA);
  MAP.set('Last Month', LAST_MONTH_DATA);

  for (let [key, value] of MAP) {
    if (!value)
      message.channel.send(
        '**:small_orange_diamond: ' + key + ' :** *No data*'
      );
    else {
      balanceNow = pnl - value.pnl;
      message.channel.send(
        '**:small_orange_diamond: ' +
          key +
          '** *(' +
          value.day +
          '/' +
          value.month +
          '/' +
          value.year +
          ')* : **' +
          balanceNow +
          '$**'
      );
    }
  }
}

async function saveData(players, db) {
  for (const player of players) {
    const { totalSpotBalance } = await getPlayerBalanceSpot(
      player.apiKey,
      player.secretKey,
      null
    );
    const TOTAL_FUTURES_BALANCE = await getPlayerBalanceFutures(
      player.apiKey,
      player.secretKey
    );

    let balanceTotal = TOTAL_FUTURES_BALANCE + totalSpotBalance;
    const PNL = Math.round(balanceTotal - player.bet);
    const NOW = new Date();
    const YEAR = NOW.getFullYear();
    const MONTH = NOW.getMonth() + 1;
    const DAY = NOW.getDate();
    const HOUR = NOW.getHours();
    const MINUTE = NOW.getMinutes();

    if (
      db
        .get('data')
        .find({ player_name: player.name, year: YEAR, month: MONTH, day: DAY })
        .value() == null
    )
      db.get('data')
        .push({
          player_name: player.name,
          balance: balanceTotal,
          year: YEAR,
          month: MONTH,
          day: DAY,
          pnl: PNL,
        })
        .write();

    console.log(
      'Saving ' +
        player.name +
        "'s data (" +
        DAY +
        '/' +
        MONTH +
        '/' +
        YEAR +
        ' - ' +
        HOUR +
        ':' +
        MINUTE +
        ')'
    );
  }
}

module.exports = {
  addPlayerInConfig,
  deletePlayerInConfig,
  setBetInConfig,
  getPlayerBalanceSpot,
  getPlayerBalanceFutures,
  getPnlHistory,
  saveData,
};
