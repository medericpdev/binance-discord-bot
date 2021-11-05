const {
  addPlayer,
  deletePlayer,
  updatePlayerBet,
  getPlayerBalance,
  getAllPlayersBalance,
  getPnlHistory,
} = require('./usecases');

const LOW = require('lowdb');
const FILE_SYNC = require('lowdb/adapters/FileSync');

const ADAPTER_DB = new FILE_SYNC('db.json');
const DB = LOW(ADAPTER_DB);
DB.defaults({ data: [] }).write();

const configRepository = require('./repository/config-repository');
const config = configRepository.getConfig();

async function handleCommands(message, prefix, client) {
  if (message.channel.type === 'dm' && message.author.bot == false) {
    _handleAddPlayer(message);
    return;
  }

  message.channel = client.channels.cache.find(
    (channel) => channel.name === config.channelName
  );

  if (message.content.search(`${prefix}addplayer`) == 0) {
    message.author.send(
      ':small_orange_diamond: To add a new player, send me a private message with the NAME, API KEY, SECRET API KEY, BET \n' +
        ":small_orange_diamond: You can get your API key from your binance account (on binance API management, check only 'Enable Reading', 'Enable Futures' and 'Unrestricted IP access') \n" +
        ':small_orange_diamond: Example : \n' +
        '**John XX XX 100**'
    );
  }

  if (message.content.search(`${prefix}delete`) == 0)
    _handleDeletePlayer(message, prefix);

  if (message.content.search(`${prefix}setbet`) == 0)
    _handleSetBet(message, prefix);

  if (message.content.search(`${prefix}balance`) == 0)
    await _handleBalanceCommand(message, prefix);
}

function _handleAddPlayer(message) {
  const args = message.content;
  const arg = args.split(' ');
  const name =
    arg[0].charAt(0).toUpperCase() + arg[0].substring(1).toLowerCase();
  const apiKey = arg[1];
  const secretKey = arg[2];
  const bet = parseInt(arg[3]);

  if (arg[0] == null || arg[1] == null || (arg[2] == null) | (arg[3] == null)) {
    message.author
      .send('**:warning: Wrong format :warning:**')
      .catch((err) => {});
    message.author
      .send(
        "**:point_right: Try : addplayer 'player name'  'public key'  'secret key'  'player bet'**"
      )
      .catch((err) => {});
    return;
  }

  try {
    const player = addPlayer({ name, apiKey, secretKey, bet });
    message.author
      .send(
        ':white_check_mark: name : **' +
          +'**\n' +
          ':white_check_mark: api_key : **' +
          player.name +
          '**\n' +
          ':white_check_mark: secret_key : **' +
          player.secretKey +
          '**\n' +
          ':white_check_mark: bet : **' +
          player.bet +
          '**'
      )
      .catch((err) => {});
  } catch (e) {
    message.author
      .send(`**:warning: Player creation failure : ${e.message} :warning:**`)
      .catch((err) => {});
  }
}

function _handleDeletePlayer(message, prefix) {
  const args = message.content.replace(`${prefix}delete `, '');
  const arg = args.split(' ');
  const playerName =
    arg[0].charAt(0).toUpperCase() + arg[0].substring(1).toLowerCase();

  try {
    deletePlayer({ playerName });
    message.channel.send(
      `**:white_check_mark: ${playerName} deleted :white_check_mark:**`
    );
  } catch (e) {
    message.channel.send('**:warning: Player name unknown :warning:**');
  }
}

function _handleSetBet(message, prefix) {
  const args = message.content.replace(`${prefix}setbet `, '');
  const arg = args.split(' ');
  const playerName =
    arg[0].charAt(0).toUpperCase() + arg[0].substring(1).toLowerCase();
  const bet = parseInt(arg[1]);
  const { message: messageToSend } = updatePlayerBet({ playerName, bet });

  message.channel.send(messageToSend);
}

async function _handlePlayerBalance(message, playerName) {
  try {
    const messages = await getPlayerBalance({ playerName });
    messages.forEach((msg) => message.channel.send(msg));
  } catch (e) {
    message.channel.send(
      '**:warning: Error balance, are the API keys valid? :warning:**'
    );
  }
}

async function _handlePlayersBalance(message) {
  const messages = getAllPlayersBalance();
  messages.forEach((msg) => message.channel.send(msg));
}

async function _handleBalanceCommand(message, prefix) {
  const ARG = message.content.replace(`${prefix}balance `, '');
  const PLAYER_NAME =
    ARG.charAt(0).toUpperCase() + ARG.substring(1).toLowerCase();

  if (ARG !== 'all') await _handlePlayerBalance(message, PLAYER_NAME);
  else await _handlePlayersBalance(message);
}

module.exports = {
  handleCommands,
};
