const FileSync = require('lowdb/adapters/FileSync');
const low = require('lowdb');
const ADAPTER_DB = new FileSync('db.json');
const db = low(ADAPTER_DB);
db.defaults({ data: [] }).write();

module.exports = {
  getBackupDatabase() {
    return db;
  },
};
