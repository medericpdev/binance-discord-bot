const DATE = require('date-and-time');
const Player = require('./models/Player');
const { getConfig } = require('./repository/config-repository');
const { getBackupDatabase } = require('./repository/backup-repository');

function addPlayer({
  name,
  apiKey,
  secretKey,
  bet,
  config = getConfig(),
} = {}) {
  const newPlayer = new Player({ name, apiKey, secretKey, bet });
  return config.addPlayer({ player: newPlayer });
}

function deletePlayer({ playerName, config = getConfig() } = {}) {
  return config.deletePlayer({ player: { name: playerName } });
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

function getPnlHistory({ playerName, pnl, db = getBackupDatabase() } = {}) {
  let balanceNow;
  const now = new Date();

  const yesterday = DATE.addDays(now, -1);
  const lastWeek = DATE.addDays(now, -7);
  const lastMonth = DATE.addMonths(now, -1);

  const yesterdayData = db
    .get('data')
    .find({
      player_name: playerName,
      year: yesterday.getFullYear(),
      month: yesterday.getMonth() + 1,
      day: yesterday.getDate(),
    })
    .value();
  const lastWeekData = db
    .get('data')
    .find({
      player_name: playerName,
      year: lastWeek.getFullYear(),
      month: lastWeek.getMonth() + 1,
      day: lastWeek.getDate(),
    })
    .value();
  const lastMonthData = db
    .get('data')
    .find({
      player_name: playerName,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
      day: lastMonth.getDate(),
    })
    .value();

  const MAP = new Map();
  MAP.set('Yesterday', yesterdayData);
  MAP.set('Last week', lastWeekData);
  MAP.set('Last Month', lastMonthData);

  let messages = [];
  for (let [key, value] of MAP) {
    if (!value) {
      messages.push('**:small_orange_diamond: ' + key + ' :** *No data*');
    } else {
      balanceNow = pnl - value.pnl;
      messages.push(
        `**:small_orange_diamond: ${key}** *(${value.day}/${value.month}/${value.year})* : **${balanceNow}$**`
      );
    }
  }
  return messages;
}

async function saveData({
  config = getConfig(),
  db = getBackupDatabase(),
} = {}) {
  for (const player of config.players) {
    const [futures, spot] = await Promise.all([
      player.getBalanceFutures(),
      player.getBalanceSpot(),
    ]);

    let balanceTotal = futures + spot.total;
    const PNL = Math.round(balanceTotal - player.bet);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (
      db
        .get('data')
        .find({ player_name: player.name, year: year, month: month, day: day })
        .value() == null
    )
      db.get('data')
        .push({
          player_name: player.name,
          balance: balanceTotal,
          year: year,
          month: month,
          day: day,
          pnl: PNL,
        })
        .write();

    console.log(
      `Saving ${player.name}'s data (${day}/${month}/${year} - ${hour}:${minute})`
    );
  }
}

async function getPlayerBalance({ playerName, config = getConfig() } = {}) {
  const player = config.findPlayer({ name: playerName });
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
    messages = [
      ...messages,
      ...getPnlHistory({ playerName: player.name, pnl }),
    ];
  }

  return messages;
}

async function getAllPlayersBalance({ config = getConfig() } = {}) {
  if (config.players.length === 0) {
    throw new Error('No player found');
  }

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
    return [];
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
  saveData,
};
