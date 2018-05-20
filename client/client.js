const args = require('minimist')(process.argv);
const net = require('net');
const readline = require('readline');

let port = args.p || args.port || 5000;
let ip = args.ip || '127.0.0.1';

// Открываем сокет для связи с сервером
let socket = new net.Socket();

// Считыватель строк из консоли
let reader;

// Пытаемся подключиться к серверу
try {
    socket.connect(port, ip, () => {
        print(`Connected to ${ip}:${port}\n`);

        // Отправляем имя клиента после подключения
        let data = {
            name: args.n || args.name || ''
        };

        socket.write(JSON.stringify(data));

        // начинаем считывание из консоли
        reader = createReader('You> ');
        reader.prompt();
    });
}
catch(err) {
    print(`${err}\n`);
    process.exit(1);
}

// Обработчик данных от сервера
socket.on('data', data => {
    print(data.toString());
});

// Обработчик закрытия соединения
socket.on('close', () => {
    print('Connection closed\n');
    process.exit(0);
});

// Обработчик обрыва соединения
socket.on('error', err => {
    print(`${err}\n`);
    process.exit(1);
});

// Создает и возвращает считыватель строк
function createReader(prompt) {

    // Считыватель
    let reader = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: prompt
    });

    // Обработчик введенных строк
    reader.on('line', line => {

        // Мы будем передавать данные в виде преобразованного в строку объекта,
        // чтобы дать возможность отправлять пустые сообщения
        let data = {
            text: line
        };

        // Преобразовываем текст в JSON строку и передаем серверу
        socket.write(JSON.stringify(data));

        // Читаем дальше
        reader.prompt();
    });

    return reader;
}

// Выводит строку в консоль, сохраняя позицию промпта
function print(str) {

    // Очищаем строку и переводим курсор в нулевую позицию,
    // чтобы промпт не выводился со строкой
    readline.clearLine();
    readline.cursorTo(process.stdout, 0);

    // Выводим строку
    process.stdout.write(str);

    // Возвращаем промпт на место
    if(reader) {
        reader.prompt(true);
    }
}
