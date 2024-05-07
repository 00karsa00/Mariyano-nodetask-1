// Database Details
const DB_USER = process.env['DB_USER'];
const DB_PWD = process.env['DB_PWD'];
const DB_URL = process.env['DB_URL'];
const DB_NAME = "task-karthick";
const DB_COLLECTION_NAME = "players";
const DB_COLLECTION_TEAMS = "teamentrys"

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://" + DB_USER + ":" + DB_PWD + "@" + DB_URL + "/?retryWrites=true&w=majority";
console.log(uri)
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;


exports.run = async () => {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });

        db = client.db(DB_NAME);

        console.log("You successfully connected to MongoDB!");

    } finally {
    }
}

// Sample create document
exports.sampleCreate = async () => {
    const demo_doc = {
        "demo": "doc demo",
        "hello": "world"
    };
    const demo_create = await db.collection(DB_COLLECTION_NAME).insertOne(demo_doc);
    console.log("Added!")
    console.log(demo_create.insertedId);
}

exports.insertDate = async (data) => {
    console.log("data data => ",data)
    const result = await db.collection(DB_COLLECTION_TEAMS).insertOne(data)
    return result;
};

exports.findAll = async (data) => {
    const result = await db.collection(DB_COLLECTION_TEAMS).find(data).toArray()
    console.log("data data => ",result)
    return result;
};

exports.updateAll = async (updates) => {
    console.log(updates)
    const results = await Promise.all(updates.map(({ filter, update }) => db.collection(DB_COLLECTION_TEAMS).updateMany(filter, update)));
    // console.log("data data => ",results)
    return updates;
};
