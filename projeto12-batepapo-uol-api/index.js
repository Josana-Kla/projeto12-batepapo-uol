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

const participantsSchema = joi.object({
    name: joi.string().alphanum().required().empty('')
}); 

const messagesSchema = joi.object({
    to: joi.string().alphanum().required().empty(''),
    text: joi.string().required().empty(''),
    type: joi.string().required().empty('').valid('message', 'private_message')
}); 


function currentDate() {
    return dayjs(new Date()).format('HH:mm:ss');
};

async function findSameName(name) {
    try {
        const userName = await db.collection('participants').findOne({name});

        if(userName === null) {
            console.log("Se você não for um novo usuário, manda seu nome aí! 😄");
            return false;
        } else {
            console.log("O usuário já existe no banco 😃: \n", userName);
            return true;
        }
    } catch(error) {
        console.log("Deu erro!");
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
        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: currentDate()
        });
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

//TODO: Não pode mandar o tipo: private_message para "Todos", não faz sentido, tem que ser só "message". E o mesmo para o get messages. O nome que vem do headers deveria ser obrigatório se não eu posto mensagem como usuário null.
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
            time: currentDate()
        });
    
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(500);
    };

});

//TODO: verificar se o limitMessages é um Num
app.get('/messages', async (req, res) => {
    const limitMessages = req.query['limit'];
    const { user } = req.headers;
    const validUser = await findSameName(user);

    if(!validUser) {
        res.sendStatus(409);
        return;
    };

    try {
        const messageList = await db.collection('messages').find().toArray();
        const messageFilter = messageList.filter(msg => msg.to === "Todos" || msg.to === user || msg.from === user);

        if(limitMessages) {
            res.send(messageFilter.slice(-limitMessages));
            return;
        } else {
            res.send(messageFilter);
            return;
        };
    } catch (error) {
        res.sendStatus(500);
        return;
    };

});

app.post('/status', async (req, res) => {
    const { user } = req.headers;
    const validUser = await findSameName(user);

    if(!validUser) {
        res.sendStatus(404);
        return;
    };

    try {
        await db.collection('participants')
        .insertOne({
            name: user, lastStatus: Date.now()
        });

        res.sendStatus(200);
    } catch(error) {
        res.sendStatus(500);
        return;
    };

});

setInterval(async () => {
    const currentDate = Date.now();

    try {
        const participantsList = await db.collection('participants').find().toArray();
        
        participantsList.forEach(async element => {
            if((currentDate - element.lastStatus) > 10000) {
                try {
                    try {
                        console.log(element.name);
                        const mensagem = await db.collection('messages').insertOne({
                            from: element.name, 
                            to: 'Todos', 
                            text: 'sai da sala...', 
                            type: 'status', 
                            time: currentDate()
                        });
                        console.log("mensagem enviada com sucesso!");
                        console.log(mensagem);
                    } catch (error) {
                        console.log("Erro ao enviar mensagem de sair da sala");
                    };
                    await db.collection('participants').deleteOne(element);
                    console.log("removido com sucesso!");
                } catch (error) {
                    console.log("Erro no servidor ao remover um participante");
                }
            } else {
                return false;
            }
        });
    } catch (error) {
        console.log("Erro no servidor ao encontrar um participante");
    };

}, 15000);


app.listen(5000);
