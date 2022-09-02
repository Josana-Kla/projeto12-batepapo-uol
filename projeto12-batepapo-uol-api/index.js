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

        res.status(400).send(error);
        return;
    };

    participants.push({ name });

    res.sendStatus(200);
});



app.listen(5000);
