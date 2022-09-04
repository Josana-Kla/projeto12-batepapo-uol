import express from 'express';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import cors from 'cors';
import joi from 'joi';
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db('buzzquizz')
});

const currentDate = dayjs(new Date()).format('HH:mm:ss');

const participantsSchema = joi.object({
    name: joi.string().alphanum().required().empty('')
}); 

const messagesSchema = joi.object({
    to: joi.string().alphanum().required().empty(''),
    text: joi.string().required().empty(''),
    type: joi.string().required().empty('').valid('message', 'private_messsage')
}); 


app.post('/participants', async (req, res) => {
    const { name } = req.body;
    const validation = participantsSchema.validate(req.body);

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        res.status(422).send(error);
        return;
    };

    try {
        await db.collection('participants').insertOne({ name, lastStatus: Date.now() });

        res.sendStatus(201);
    } catch(error) {
        res.sendStatus(500);
    };

});

app.get('/participants', (req, res) => {
    db.collection('participants').find().toArray().then(data => {
        res.send(data.map(value => ({
            ...value,
            _id: undefined
        })));
    });
});

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const validation = messagesSchema.validate(req.body, {abortEarly: false});

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        res.status(422).send(error);
        return;
    };

    try {
        await db.collection('messages').insertOne({
            from: 'Jojo',
            to,
            text,
            type,
            time: currentDate
        });
    
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(500);
    };

});

app.listen(5000);
