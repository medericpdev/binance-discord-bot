const { addPlayerInConfig, deletePlayerInConfig, setBetInConfig, getPlayerBalanceSpot, getPlayerBalanceFutures, getPnlHistory } = require('./usecases');

const LOW = require('lowdb');
const FILE_SYNC = require('lowdb/adapters/FileSync');

const ADAPTER_DB = new FILE_SYNC('db.json');
const DB = LOW(ADAPTER_DB);
DB.defaults({ data: [] }).write();

const ADAPTER_CONFIG = new FILE_SYNC('config.json');
const CONFIG = LOW(ADAPTER_CONFIG);

async function handleCommands(message, prefix, client) {
  if (message.channel.type === 'dm' && message.author.bot == false) {
    _handleAddPlayer(message);
    return;
  }

  message.channel = client.channels.cache.find(channel => channel.name === CONFIG.get('channel_name').value());

  if (message.content.search(`${prefix}addplayer`) == 0) {
    message.author.send(":small_orange_diamond: To add a new player, send me a private message with the NAME, API KEY, SECRET API KEY, BET \n" +
      ":small_orange_diamond: You can get your API key from your binance account (on binance API management, check only 'Enable Reading', 'Enable Futures' and 'Unrestricted IP access') \n" +
      ":small_orange_diamond: Example : \n" +
      "**John XX XX 100**");
  }

  if (message.content.search(`${prefix}deleteplayer`) == 0)
    _handleDeletePlayer(message, prefix);

  if (message.content.search(`${prefix}setbet`) == 0)
    _handleSetBet(message, prefix);

  if (message.content.search(`${prefix}balance`) == 0)
    await _handleBalanceCommand(message, prefix);
}

function _handleAddPlayer(message) {
  const ARGS = message.content;
  const ARG = ARGS.split(' ');
  const PLAYER_NAME = ARG[0].charAt(0).toUpperCase() + ARG[0].substring(1).toLowerCase();
  const PUBLIC_KEY = ARG[1];
  const SECRET_KEY = ARG[2];
  const PLAYER_BET = parseInt(ARG[3]);

  if (ARG[0] == null || ARG[1] == null || ARG[2] == null | ARG[3] == null) {
    message.author.send("**:warning: Wrong format :warning:**").catch(err => { });
    message.author.send("**:point_right: Try : addplayer 'player name'  'public key'  'secret key'  'player bet'**").catch(err => { });
    return;
  }

  if (!isNaN(ARG[3])) {
    if (addPlayerInConfig(PLAYER_NAME, PUBLIC_KEY, SECRET_KEY, PLAYER_BET, CONFIG)) {
      message.author.send(":white_check_mark: name : **" + PLAYER_NAME + "**\n" +
        ":white_check_mark: api_key : **" + PUBLIC_KEY + "**\n" +
        ":white_check_mark: secret_key : **" + SECRET_KEY + "**\n" +
        ":white_check_mark: bet : **" + PLAYER_BET + "**"
      ).catch(err => { });
    }
  } else
    message.author.send("**:warning: You must use a number for the player's bet :warning:**").catch(err => { });
}

function _handleDeletePlayer(message, prefix) {
  const ARGS = message.content.replace(`${prefix}deleteplayer `, '');
  const ARG = ARGS.split(' ');
  const PLAYER_NAME = ARG[0].charAt(0).toUpperCase() + ARG[0].substring(1).toLowerCase();

  if (CONFIG.get('players').find({ name: PLAYER_NAME }).value() == null) {
    message.channel.send("**:warning: Player name unknown :warning:**");
    return;
  }

  deletePlayerInConfig(PLAYER_NAME, CONFIG);
  message.channel.send("**:white_check_mark: " + PLAYER_NAME + " deleted :white_check_mark:**");
}

function _handleSetBet(message, prefix) {
  const ARGS = message.content.replace(`${prefix}setbet `, '');
  const ARG = ARGS.split(' ');
  const PLAYER_NAME = ARG[0].charAt(0).toUpperCase() + ARG[0].substring(1).toLowerCase();
  const BET = parseInt(ARG[1]);
  const { message: messageToSend } = setBetInConfig(PLAYER_NAME, BET, CONFIG);

  message.channel.send(messageToSend);
}

async function _handlePlayerBalance(message, PLAYER_NAME) {
  const PLAYER = CONFIG.get('players').find({ name: PLAYER_NAME }).value();

  if (!PLAYER) {
    message.channel.send("**:warning: Player name unknown :warning:**");
    return;
  }

  message.channel.send("**Binance Balance :** ***" + PLAYER.name + "*** :arrow_heading_down:");

  try {
    const TOTAL_FUTURES_BALANCE = await getPlayerBalanceFutures(PLAYER.apikey, PLAYER.secretkey);
    if(TOTAL_FUTURES_BALANCE > 0)
      message.channel.send(":arrow_forward: Binance Futures = **" + TOTAL_FUTURES_BALANCE + "$**");

    const { totalSpotBalance, messages } = await getPlayerBalanceSpot(PLAYER.apikey, PLAYER.secretkey, message);
    messages.forEach((msg) => {
      message.channel.send(msg);
    });

    const TOTAL_BALANCE = TOTAL_FUTURES_BALANCE + totalSpotBalance;

    const PNL = Math.round(TOTAL_BALANCE - PLAYER.bet);

    if (PNL > 0)
      message.channel.send("**:moneybag: Account balance : " + TOTAL_BALANCE + "$  :money_with_wings: Bet = " + PLAYER.bet + "$  :white_check_mark: Profit = +" + PNL + "$**");
    else
      message.channel.send("**:moneybag: Account balance : " + TOTAL_BALANCE + "$  :money_with_wings: Bet = " + PLAYER.bet + "$  :no_entry_sign: Loss = " + PNL + "$**");

    if (CONFIG.get('show_pnl_history').value())
      getPnlHistory(message, PLAYER.name, PNL, DB);

  } catch (e) {
    message.channel.send("**:warning: Error balance, are the API keys valid? :warning:**");
  }
}

async function _handlePlayersBalance(message) {
  const PLAYERS = CONFIG.get('players').value();
  if (PLAYERS.length == 0){
    message.channel.send("** :x: No registered players :x: **");
    return;
  }

  const RESULTS = await Promise.all(PLAYERS.map(async (player) => {
    if (player.apikey == undefined || player.secretkey == undefined){
      message.channel.send("** :x: No registered player :x: **");
      return;
    }

    try {
      const { totalSpotBalance } = await getPlayerBalanceSpot(player.apikey, player.secretkey, null);
      const TOTAL_FUTURES_BALANCE = await getPlayerBalanceFutures(player.apikey, player.secretkey);
    } catch (error) {
      message.channel.send("**:warning: Error balance for " + player.name + ", are the API keys valid? :warning:**");
      return;
    }
    
    const TOTAL_BALANCE = totalSpotBalance + TOTAL_FUTURES_BALANCE;    

    return {
      name: player.name,
      balance: Math.round(TOTAL_BALANCE),
      pnl: Math.round(TOTAL_BALANCE - player.bet),
    };
  }));

  if(RESULTS[0] == undefined){
    return;
  }

  message.channel.send("**Let me find out who made the most money** :nerd: *(wait a few seconds)*");

  RESULTS.sort((a, b) => b.pnl - a.pnl).forEach((result) => {
    if (result.pnl > 0) {
      message.channel.send(":white_check_mark: **+" + result.pnl + "$** - **" + result.name + "** (**" + result.balance + "$**)");
    } else {
      message.channel.send(":no_entry_sign: **" + result.pnl + "$** - **" + result.name + "** (**" + result.balance + "$**)");
    }
  });
}

async function _handleBalanceCommand(message, prefix) {
  const ARG = message.content.replace(`${prefix}balance `, '');
  const PLAYER_NAME = ARG.charAt(0).toUpperCase() + ARG.substring(1).toLowerCase();

  if (ARG !== 'all')
    await _handlePlayerBalance(message, PLAYER_NAME);
  else
    await _handlePlayersBalance(message);
}

module.exports = {
  handleCommands
}
