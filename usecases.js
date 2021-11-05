const DATE = require('date-and-time');
const Player = require('./models/Player');
const { getConfig } = require('./repository/config-repository');

function addPlayer({
  name,
  apiKey,
  secretKey,
  bet,
  config = getConfig(),
} = {}) {
  const newPlayer = new Player({ name, apiKey, secretKey, bet });
  return config.addPlayer(newPlayer);
}

function deletePlayer({ playerName, config = getConfig() } = {}) {
  return config.deletePlayer({ name: playerName });
}

function updatePlayerBet({ playerName, bet, config = getConfig() } = {}) {
  const player = config.players.find((player) => player.name === playerName);
  if (!player) {
    return { message: '**:warning: Player name unknown :warning:**' };
  }

  try {
    const oldBet = player.bet;
    player.setBet(bet, config);
    return {
      message: `**:white_check_mark: ${player.name} bet : ${oldBet}$ -> ${player.name} bet : ${player.bet}$**`,
    };
  } catch (e) {
    return { message: `**:warning: ${e.message} :warning:**` };
  }
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
    // TODO : Faire ça
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

async function getPlayerBalance({ playerName, config = getConfig() } = {}) {
  const player = config.players.find((player) => player.name === playerName);
  if (!player) {
    return ['**:warning: Player name unknown :warning:**'];
  }
  const intro = `**Binance Balance :** *** ${player.name} *** :arrow_heading_down:`;
  let messages = [intro];
  const [futures, spot] = await Promise.all([
    player.getBalanceFutures(),
    player.getBalanceSpot(),
  ]);

  if (futures > 0) {
    messages.push(`:arrow_forward: Binance Futures = **${futures}$**`);
  }

  if (!spot.cryptos.length) {
    return messages;
  }

  spot.cryptos.forEach((crypto) => {
    messages.push(`:arrow_forward: ${crypto.value} = **${crypto.amount} $**`);
  });

  const total = futures + spot.total;

  const pnl = Math.round(total - player.bet);

  if (pnl > 0) {
    messages.push(
      `**:moneybag: Account balance : ${total}$  :money_with_wings: Bet = ${player.bet}$  :white_check_mark: Profit = +${pnl}$**`
    );
  } else {
    messages.push(
      `**:moneybag: Account balance : ${total}$  :money_with_wings: Bet = ${player.bet}$  :no_entry_sign: Loss = ${pnl}$**`
    );
  }

  if (config.showPnlHistory) {
    // TODO getPnl
    // getPnlHistory(message, player.name, pnl, DB);
  }

  return messages;
}

async function getAllPlayersBalance({ config = getConfig() } = {}) {
  const results = await Promise.all(
    config.players.map(async (player) => {
      const [futures, spot] = await Promise.all([
        player.getBalanceFutures(),
        player.getBalanceSpot(),
      ]);

      const total = futures + spot.total;

      return {
        name: player.name,
        balance: Math.round(total),
        pnl: Math.round(total - player.bet),
      };
    })
  );

  if (!results.length) {
    return;
  }

  return results
    .sort((a, b) => b.pnl - a.pnl)
    .map((result) => {
      if (result.pnl > 0) {
        return `:white_check_mark: **+${result.pnl}$** - **${result.name}** (**${result.balance}$**)`;
      }
      return `:no_entry_sign: **${result.pnl}$** - **${result.name}** (**${result.balance}$**)`;
    });
}

module.exports = {
  addPlayer,
  deletePlayer,
  updatePlayerBet,
  getPlayerBalance,
  getAllPlayersBalance,
  getPnlHistory,
  saveData,
};
