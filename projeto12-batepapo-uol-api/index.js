import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

const participants = [];

app.post('/participants', (req, res) => {
    const { name } = req.body;

    if(!name) {
        res.status(400).send('Campo obrigatório!');
        return;
    }

    participants.push({ name });

    res.sendStatus(200);
});



app.listen(5000);
