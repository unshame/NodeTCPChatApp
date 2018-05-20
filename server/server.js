const args = require('minimist')(process.argv);
const net = require('net');

let port = args.p || args.port || 5000;
let ip = args.ip || '127.0.0.1';

let sockets = [];
let names = {
    "you": {}
};
let userIndex = 1;
let commands = {
    info: (socket) => {
        let info = 'Currently in chat:\n';
        sockets.forEach(otherSocket => {
            let sinceActiveFormatted = formatTime(Date.now() - otherSocket.lastActivity);

            if(otherSocket.name) {
                info += `  ${otherSocket.name} (${otherSocket.info}) `;
            }
            else {
                info += `  ${otherSocket.info} `;
            }

            info += `sent ${otherSocket.messagesNum} messages`;
            if(otherSocket.messagesNum > 0) {
                info += ` (last ${ sinceActiveFormatted } ago)`;
            }
            info += '\n';
        });
        socket.write(info);
    },
    help: (socket) => {
        let help = 'Commands:\n';
        Object.keys(commands).forEach(command => {
            help += `  /${command}\n`;
        });
        socket.write(help);
    }
};

let server = net.createServer(socket => addSocket(socket));

server.listen(port, ip, () => {
    console.log(`Listening on ${ip}:${port}`);
});

function addSocket(socket) {
    socket.lastActivity = Date.now();
    socket.messagesNum = 0;

    sockets.push(socket);

    socket.on('data', data => handleData(socket, data));

    socket.on('end', () => removeSocket(socket));

    socket.on('error', (err) => {
        console.error(err);
        removeSocket(socket);
    });
}

function removeSocket(socket) {

    if(!sockets.includes(socket)) {
        return;
    }

    sockets.splice(sockets.indexOf(socket), 1);
    if (socket.name) {
        names[socket.name.toLowerCase()] = undefined;
    }
    broadcast(`${socket.name} left the chat.`, socket);
}

function handleData(socket, data) {

    if (!sockets.includes(socket)) {
        return;
    }

    try {
        data = JSON.parse(data);
    }
    catch (err) {
        console.error(err);
    };

    if (!socket.info) {
        addSocketInfo(socket, data);
        socket.write(`Welcome ${socket.name}\n`);
        commands.info(socket);
        commands.help(socket);
        broadcast(`${socket.name} joined the chat`, socket);
    }
    else if(typeof data.text == 'string') {
        let text = data.text;

        if(text[0] == '/') {
            handleCommand(socket, text);
        }
        else{
            updateSocketInfo(socket);
            broadcast(`${socket.name}> ${text}`, socket);
        }
    }
    else {
        console.error(`Text from ${socket.info} wasn't a string`);
    }
}

function addSocketInfo(socket, data) {
    let name = data.name || '';
    let lowerCaseName = name.toLowerCase();

    if (!name || names[lowerCaseName]) {
        socket.write('Name not provided, invalid or already taken!\n');
        name = `User${userIndex++}`;
        lowerCaseName = name.toLowerCase();
    }

    socket.name = name;
    names[lowerCaseName] = socket;

    socket.info = socket.remoteAddress + ":" + socket.remotePort;
}

function updateSocketInfo(socket) {
    sockets.splice(sockets.indexOf(socket), 1);
    sockets.unshift(socket);
    socket.lastActivity = Date.now();
    socket.messagesNum++;
}

function handleCommand(socket, str) {
    let command = str.substr(1).match(/\w*/);

    if (command && commands[command]) {
        commands[command](socket);
        return;
    }
    else {
        socket.write(`Invalid command "${command}"\n`);
    }
}

function broadcast(message, sender) {
    sockets.forEach(socket => {

        if (socket === sender){
            return;
        }

        socket.write(`${message}\n`);
    });

    console.log(`${sender.info}: ${message}`);
}


function formatTime(time) {
    let hours = Math.floor(time / 1000 / 60 / 60);
    let minutes = Math.floor((time - hours * 1000 * 60 * 60) / 1000 / 60);
    let seconds = Math.floor((time - minutes * 1000 * 60) / 1000);
    let formatedTime = `${seconds}s`;

    if (minutes > 0) {
        formatedTime = `${minutes}m ${formatedTime}`;
    }

    if (hours > 0) {
        formatedTime = `${hours}h ${formatedTime}`;
    }

    return formatedTime;
}
