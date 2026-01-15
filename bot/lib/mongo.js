const { MongoClient } = require('mongodb');

// URI should be in .env
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri || 'mongodb://localhost:27017/'); // Fallback prevents crash on load

let dbConnection;

module.exports = {
    connectToServer: async function () {
        if (!uri) {
            console.log("No MONGODB_URI found, skipping Mongo connection (using local FS potentially).");
            return;
        }
        try {
            await client.connect();
            dbConnection = client.db('m4movie'); // Default DB name
            console.log("Successfully connected to MongoDB.");
        } catch (err) {
            console.error("Error connecting to MongoDB:", err);
        }
    },

    getDb: function () {
        return dbConnection;
    },

    client: client
};
