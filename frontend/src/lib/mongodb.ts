import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
    // We don't throw error yet to allow build to pass if just verifying
    console.warn('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
        if (uri) {
            client = new MongoClient(uri, options);
            globalWithMongo._mongoClientPromise = client.connect();
        } else {
            console.warn("MongoDB URI is missing in development!");
            globalWithMongo._mongoClientPromise = Promise.reject("MongoDB URI missing");
        }
    }
    clientPromise = globalWithMongo._mongoClientPromise
} else {
    // In production mode, it's best to not use a global variable.
    if (uri) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    } else {
        console.error("MongoDB URI is missing in production!");
        clientPromise = Promise.reject("MongoDB URI missing");
    }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
