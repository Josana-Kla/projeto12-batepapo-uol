import express, { response } from 'express';
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
    type: joi.string().required().empty('').valid('message', 'private_message')
}); 


async function findSameName(name) {
    try {
        const userName = await db.collection('participants').findOne({name});

        if(userName === null) {
            console.log("É um novo usuário! ");
            return false;
        } else {
            console.log("O usuário já existe no banco 😃: \n", userName);
            return true;
        }
    } catch(error) {
        res.sendStatus(500);
    };
};


app.post('/participants', async (req, res) => {
    const { name } = req.body;
    const validation = participantsSchema.validate(req.body);

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        res.status(422).send(error);
        return;
    };

    if(await findSameName(name)) {
        res.sendStatus(409);
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
    const { user } = req.headers;
    const validUser = await findSameName(user);
    const validation = messagesSchema.validate(req.body, {abortEarly: false});

    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        res.status(422).send(error);
        return;
    };

    if(!validUser) {
        res.sendStatus(422);
        return;
    };

    try {
        await db.collection('messages').insertOne({
            from: user,
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

app.get('/messages', async (req, res) => {
    const response = await db.collection('messages').find().toArray();
    
    res.send(response);
});

app.post('/status', async (req, res) => {
    const { user } = req.headers;
    const validUser = await findSameName(user);

    if(!validUser) {
        res.sendStatus(404);
        return;
    };

    try {
        const modificado = await db.collection('participants')
        .insertOne({
            name: user, lastStatus: Date.now()
        });
        res.sendStatus(200);
    } catch(error) {
        res.sendStatus(500);
        return;
    };

});

app.listen(5000);
