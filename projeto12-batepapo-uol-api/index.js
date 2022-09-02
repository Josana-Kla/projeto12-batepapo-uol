import express from 'express';
import cors from 'cors';
import joi from 'joi';

const app = express();

app.use(cors());
app.use(express.json());

const participantsSchema = joi.object({
    name: joi.string().alphanum().required().empty('')
}); 

const participants = [];

app.post('/participants', (req, res) => {
    const { name } = req.body;
    const validation = participantsSchema.validate(req.body);
    
    if(validation.error) {
        const error = validation.error.details.map(detail => detail.message);

        res.status(422).send(error);
        return;
    };

    participants.push({ name, lastStatus: Date.now() });
    console.log(participants);

    res.sendStatus(201);
});

app.get('/participants', (req, res) => {
    res.status(200).send(participants);
})

app.listen(5000);
