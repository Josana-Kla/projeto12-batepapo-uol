import express from 'express';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import cors from 'cors';
import joi from 'joi';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db('buzzquizz')
});

const participantsSchema = joi.object({
    name: joi.string().alphanum().required().empty('')
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
        const response = await db.collection('participants').insertOne({ name, lastStatus: Date.now() });

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

app.listen(5000);
