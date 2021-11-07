const Discord = require('discord.js');
const client = new Discord.Client();
const cron = require('node-cron');

const { handleCommands } = require('./commands');
const { saveData } = require('./usecases');

const configRepository = require('./repository/config-repository');
const config = configRepository.getConfig();

if (config.autoSave) {
  cron.schedule('* * */5 * *', async () => {
    await saveData();
  });
}

client.once('ready', () => {
  console.log('Bot Binance is now online !');
});

client.on('message', async (message) => {
  await handleCommands(message, config.prefix, config.channelName, client);
});

client.login(config.token);
