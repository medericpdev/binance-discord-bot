const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const ADAPTER_CONFIG = new FileSync('config.json');
const config = low(ADAPTER_CONFIG);

const Config = require('../models/Config');
const Player = require('../models/Player');

module.exports = {
  getConfig() {
    const prefix = config.get('prefix').value();
    const token = config.get('token').value();
    const autoSave = config.get('auto_save').value();
    const channelName = config.get('channel_name').value();
    const showPnlHistory = config.get('show_pnl_history').value();
    let players = config.get('players').value();
    players = players.map((player) => new Player(player));
    return new Config({
      prefix,
      token,
      autoSave,
      channelName,
      showPnlHistory,
      players,
    });
  },

  savePlayer(player) {
    config.get('players').push(player).write();
    return new Player(player);
  },

  deletePlayer(player) {
    config.get('players').remove({ name: player.name }).write();
  },

  updatePlayer(player) {
    config.get('players').remove({ name: player.name }).write();
    config.get('players').push(player).write();
  },
};
