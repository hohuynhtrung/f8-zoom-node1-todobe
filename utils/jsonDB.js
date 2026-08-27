const fs = require("node:fs");
const filePath = "./db.json";

function read() {
  try {
    const result = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(result);
  } catch (error) {
    if (error.code === "ENOENT") {
      const defaultDB = {};
      save(defaultDB);
      return defaultDB;
    }
  }
}

function save(db) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.log(error);
  }
}

module.exports = { read, save };
