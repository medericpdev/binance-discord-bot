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
}

module.exports = Config;
