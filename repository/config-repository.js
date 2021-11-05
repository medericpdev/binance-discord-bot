const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const ADAPTER_CONFIG = new FileSync('config.json');
const config = low(ADAPTER_CONFIG);

const Config = require('../models/Config');

module.exports = {
  getConfig() {
    const prefix = CONFIG.get('prefix').value();
    const token = CONFIG.get('token').value();
    const autoSave = CONFIG.get('auto_save').value();
    const channelName = CONFIG.get('channel_name').value();
    const showPnlHistory = CONFIG.get('show_pnl_history').value();
    const players = CONFIG.get('players').value();
    return new Config({
      prefix,
      token,
      autoSave,
      channelName,
      showPnlHistory,
      players,
    });
  },
};
