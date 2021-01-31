// importing
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Messages =require("./dbMessages.js");
const cors = require('cors');
const Pusher = require('pusher');

// app config
const app = express()
const port = process.env.PORT || 9000
dotenv.config();
app.use(cors());

const pusher = new Pusher({
    appId: process.env.appId,
    key: process.env.key,
    secret: process.env.secret,
    cluster: process.env.cluster,
    useTLS: true
  });

// middleware
app.use(express.json());

// DB configure
const connection_url = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.kpqpp.mongodb.net/${process.env.DBNAME}?retryWrites=true&w=majority`;

mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.once('open', () => {
    console.log('DB connected');

    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on('change', (change) => {
        console.log('change: ',change);

        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;
            pusher.trigger("messages","inserted",{
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received : messageDetails.received
            });
        } else {
            console.log("Error triggering Pusher");
        }
    })
})


// API routes
app.get('/', (req, res)=>res.status(200).send('Hello World'))

app.post('/messages/new', (req, res) => {
    const dbMessage = req.body;

    Messages.create(dbMessage, (err, data) => {
        if (err) {
            res.status(500).send(err);
        }else{
            res.status(201).send(data);
        }
    })
})


app.get('/messages/sync', (req, res) => {
    Messages.find((err, data) => { 
    
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})


// listeners
app.listen(port, ()=>console.log(`Listening on localhost:${port}`))