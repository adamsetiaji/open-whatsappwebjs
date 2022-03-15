const qrcodeterminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const { Client, LegacySessionAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const SocketIO = require('socket.io');
const { phoneNumberFormatter } = require('./helpers/formatter');

const app = express();
const server = http.createServer(app);
const io = SocketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended: true}));


const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res)=>{    
    res.sendFile('index.html', {root: __dirname})
});

// Use the saved values
const client = new Client({
    authStrategy: new LegacySessionAuth({
        session: sessionCfg,
        puppeteer: { headless: true }
    })
});

// Save session values to the file upon successful auth
client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
});



client.on('message', msg => {
    if (msg.body == 'hi') {
        msg.reply('hello');
    }
});

client.initialize();





// Socket IO
io.on('connection', function(socket){
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        // qrcodeterminal.generate(qr, {small: true});
        // console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) =>{
            socket.emit('qr', url);
            socket.emit('message', 'Received QRCode, Scan Please...');
        });
    });

    client.on('ready', () => {
        socket.emit('message', 'WHATSAPP CONNECTED'); 
    });
});

server.listen((process.env.PORT || 5000), function(){
    console.log('App Running on http://localhost:'+ (process.env.PORT || 5000))
});
