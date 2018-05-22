const args = require('minimist')(process.argv);
const net = require('net');
const readline = require('readline');

let port = args.p || args.port || 5000;
let ip = args.ip || '127.0.0.1';

// Сокет для связи с сервером
let client = null;

// Считыватель строк из консоли
let reader = null;

// Пытаемся подключиться к серверу
try {
    client = net.createConnection(port, ip, onConnect);
}
catch(err) {
    print(`${err}\n`);
    process.exit(1);
}

// Обработчик данных от сервера
client.on('data', data => {
    print(data.toString());
});

// Обработчик закрытия соединения
client.on('close', () => {
    reader = null;
    print('Connection closed.\n');
    process.exit(0);
});

// Обработчик обрыва соединения
client.on('error', err => {
    reader = null;
    print(`${err}\n`);
    process.exit(1);
});

// Отправляем имя и начинаем считывать из консоли после подключения
function onConnect() {
    print(`Connected to ${ip}:${port}\n`);

    // Отправляем имя клиента после подключения
    let data = {
        name: args.n || args.name || ''
    };

    client.write(JSON.stringify(data));

    // Начинаем считывание из консоли
    reader = createReader('You> ');
    reader.prompt();
}

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
        client.write(JSON.stringify(data));

        // Читаем дальше
        reader.prompt();
    });

    // Обработчик Ctrl+D - закрываем соединени
    reader.on('close', () => {
        client.destroy();
    });

    // Обработчик Ctrl+C - закрываем соединени
    reader.on('SIGINT', () => {
        client.destroy();
    });

    return reader;
}

// Выводит строку в консоль, сохраняя позицию промпта
function print(str) {

    // Очищаем строку и переводим курсор в нулевую позицию,
    // чтобы промпт не выводился со строкой
    readline.clearLine(process.stdout);
    readline.cursorTo(process.stdout, 0);

    // Выводим строку
    process.stdout.write(str);

    // Возвращаем промпт на место
    if(reader) {
        reader.prompt(true);
    }
}
