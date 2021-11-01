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

const ADAPTER_CONFIG = new FileSync('config.json');
const CONFIG = low(ADAPTER_CONFIG);

const AUTO_SAVE = CONFIG.get('auto_save').value();

if (AUTO_SAVE) {
  cron.schedule('* * */5 * *', async () => {
    await saveData(CONFIG, DB);
  });
}

client.once('ready', () => {
  console.log('Bot Binance ready !');
});

client.on('message', async (message) => {
  const PREFIX = CONFIG.get('prefix').value();
  await handleCommands(message, PREFIX, client);
});

client.login(CONFIG.get('token').value());
