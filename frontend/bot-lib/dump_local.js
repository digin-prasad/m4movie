require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI;
const DB_PATH = path.join(__dirname, '../shared/movies.json');

const run = async () => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('m4movie');
        const movies = await db.collection('movies').find({}).toArray();

        // Clean _id
        const cleanMovies = movies.map(m => {
            const { _id, ...rest } = m;
            return rest;
        });

        const data = {
            movies: cleanMovies,
            meta: {}
        };

        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        console.log(`Dumped ${cleanMovies.length} movies to ${DB_PATH}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
};

run();
