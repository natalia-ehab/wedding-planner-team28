const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Read data from the JSON file
function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

// Write data to the JSON file
function writeDB(data) {
    fs.writeFileSync(
        DB_PATH,
        JSON.stringify(data, null, 4),
        'utf8'
    );
}

module.exports = {
    readDB,
    writeDB
};