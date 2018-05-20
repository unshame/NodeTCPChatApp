const args = require('minimist')(process.argv);
const net = require('net');

let port = args.p || args.port || 5000;
let ip = args.ip || '127.0.0.1';

// Сокеты клиентов
let sockets = [];

// Использованные имена клиентов
let names = {
    "you": {}
};

// Индекс пользователей без имени
let userIndex = 1;

// Серверные команды
let commands = {
    info: commandInfo,
    help: commandHelp
};

// Создаем TCP сервер
let server = net.createServer(socket => addSocket(socket));

// Ожидаем пакеты
server.listen(port, ip, () => console.log(`Listening on ${ip}:${port}`));

// Добавляет сокет в массив и добавляет обработчики событий на сокет
function addSocket(socket) {

    if (sockets.includes(socket)) {
        return;
    }

    // Статистика сокета
    socket.lastActivity = Date.now();
    socket.messagesNum = 0;

    // Добавляем в массив сокетов
    sockets.push(socket);

    // Обработчик данных от сокета
    socket.on('data', data => handleData(socket, data));

    // Обработчик отключения сокета
    socket.on('end', () => removeSocket(socket));

    // Обработчик разрыва соединения с сокетом
    socket.on('error', (err) => {
        console.error(err);
        removeSocket(socket);
    });
}

// Удаляет сокет из массива
function removeSocket(socket) {

    if(!sockets.includes(socket)) {
        return;
    }

    // Удаляем сокет из массива
    sockets.splice(sockets.indexOf(socket), 1);

    // Удаляем имя сокета из используемых
    if (socket.name) {
        names[socket.name.toLowerCase()] = undefined;
    }

    // Сообщаем всем, что клиент отключился
    broadcast(`${socket.name} left the chat.`, socket);
}

// Обрабатывает данные от клиентов
function handleData(socket, data) {

    if (!sockets.includes(socket)) {
        return;
    }

    // Преобразуем полученные данные в объект
    try {
        data = JSON.parse(data);
    }
    catch (err) {
        console.error(err);
        data = {};
    };

    // Считаем, что первое сообщение от клиента содержит его имя
    if (!socket.info) {

        // Добавляем информацию о клиенте сокету
        addSocketInfo(socket, data);

        // Отправляем приветствие клиенту
        socket.write(`Welcome ${socket.name}.\n`);
        commands.info(socket);
        commands.help(socket);

        // Сообщаем остальным клиентам, что новый клиент подсоединился
        broadcast(`${socket.name} joined the chat.`, socket);
    }
    else if(typeof data.text == 'string') {
        let text = data.text;

        // Обрабатываем серверные команды и обычные сообщения
        if(text[0] == '/') {
            handleCommand(socket, text);
        }
        else {
            // Обновляем статистику сокета
            updateSocketStats(socket);
      
            // Рассылаем сообщение остальным клиентам
            broadcast(`${socket.name}> ${text}`, socket);
        }
    }
    else {
        console.error(`Text from ${socket.info} wasn't a string`);
    }
}

// Добавляет информацию сокету
function addSocketInfo(socket, data) {
    let name = data.name || '';
    let lowerCaseName = name.toLowerCase();

    // Даем пользователю стандартное имя, если имя не предоставлено или уже используется
    if (!name || names[lowerCaseName]) {
        socket.write('Name not provided, invalid or already taken!\n');
        name = `User${userIndex++}`;
        lowerCaseName = name.toLowerCase();
    }

    // Добавляем имя сокету и добавляем имя в используемые
    socket.name = name;
    names[lowerCaseName] = socket;

    // Краткая информация о сокете
    socket.info = socket.remoteAddress + ":" + socket.remotePort;
}

// Обновляет статистику сокета
function updateSocketStats(socket) {

    // Переносим сокет вперед массива
    sockets.splice(sockets.indexOf(socket), 1);
    sockets.unshift(socket);

    // Последнее сообщение от клиента
    socket.lastActivity = Date.now();

    // Кол-во сообщений от клиента
    socket.messagesNum++;
}

// Обрабатывает и исполняет серверную команду
function handleCommand(socket, str) {
    let command = str.substr(1).match(/\w*/);

    // Проверяем, существует ли команда
    if (command && commands[command]) {
        commands[command](socket);
    }
    else {
        socket.write(`Invalid command "${command}".\n`);
    }
}

// Рассылает сообщение всем клиентам, кроме sender
function broadcast(message, sender) {

    sockets.forEach(socket => {

        if (socket === sender){
            return;
        }

        socket.write(`${message}\n`);
    });

    console.log(`${sender.info}: ${message}`);
}

// Возвращает время в формате "32h 15m 55s"
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


/* Серверные команды */

// Отправляет клиенту информацию и статистику всех клиентов
function commandInfo(socket) {
    let info = 'Currently in chat:\n';
    sockets.forEach(otherSocket => {

        // Время с последнего сообщения
        let sinceActiveFormatted = formatTime(Date.now() - otherSocket.lastActivity);

        // Имя клиента
        if (otherSocket.name) {
            info += `  ${otherSocket.name} (${otherSocket.info}) `;
        }
        else {
            info += `  ${otherSocket.info} `;
        }

        // Кол-во сообщения
        info += `has sent ${otherSocket.messagesNum} messages`;

        // Время с последнего сообщения
        if (otherSocket.messagesNum > 0) {
            info += ` (last ${sinceActiveFormatted} ago)`;
        }

        info += '.\n';
    });

    socket.write(info);
}

// Отправляет клиенту список серверных команд
function commandHelp(socket) {
    let help = 'Commands:\n';

    Object.keys(commands).forEach(command => {
        help += `  /${command}\n`;
    });

    socket.write(help);
}
