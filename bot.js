const Discord = require('discord.js');
const client = new Discord.Client();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const cron = require('node-cron');

const { handleCommands } = require('./commands');
const { saveData } = require('./usecases');

const ADAPTER_DB = new FileSync('db.json');
const DB = low(ADAPTER_DB);
DB.defaults({ data: [] }).write();

const configRepository = require('./repository/config-repository');
const config = configRepository.getConfig();

if (config.autoSave) {
  cron.schedule('* * */5 * *', async () => {
    const config = configRepository.getConfig();
    await saveData(config.players, DB);
  });
}

client.once('ready', () => {
  console.log('Bot Binance is now online !');
});

client.on('message', async (message) => {
  await handleCommands(message, config.prefix, client);
});

client.login(config.token);
