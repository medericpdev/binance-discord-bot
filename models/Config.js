const configRepo = require('../repository/config-repository');

class Config {
  constructor({
    prefix = '!',
    token,
    autoSave = true,
    showPnlHistory = true,
    channelName,
    players = [],
  } = {}) {
    if (!token) {
      throw new Error('Token must be provided');
    }
    if (!channelName) {
      throw new Error('channelName must be provided');
    }

    this.prefix = prefix;
    this.token = token;
    this.autoSave = autoSave;
    this.showPnlHistory = showPnlHistory;
    this.channelName = channelName;
    this.players = players;
  }

  addPlayer(player, configRepo = configRepo) {
    if (this.players.find((player) => player.name === player.name)) {
      throw new Error('Player with this name already exists');
    }
    const savedPlayer = configRepo.savePlayer(player);
    this.players.push(savedPlayer);
    return savedPlayer;
  }

  deletePlayer(player, configRepo = configRepo) {
    if (!this.players.find((player) => player.name === player.name)) {
      throw new Error('Player with this name does not exists');
    }
    configRepo.deletePlayer(player);
    this.players = this.players.filter((p) => p.name !== player.name);
  }

  updatePlayer(player, configRepo = configRepo) {
    this.deletePlayer(player, configRepo);
    this.addPlayer(player, configRepo);
  }
}

module.exports = Config;
