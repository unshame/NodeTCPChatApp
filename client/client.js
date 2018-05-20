const args = require('minimist')(process.argv);
const net = require('net');
const readline = require('readline');

const prompt = 'You> ';

let reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: prompt
});

reader.on('line', line => {
    let data = {
        text: line
    };
    socket.write(JSON.stringify(data));
    reader.prompt();
});

let port = args.p || args.port || 5000;
let ip = args.ip || '127.0.0.1';


let socket = new net.Socket();
try {
    socket.connect(port, ip, () => {
        print('Connected\n');
        let data = {
            name: args.n || args.name || ''
        };
        socket.write(JSON.stringify(data));
        reader.prompt();
    });
}
catch(err) {
    print(`${err}\n`);
    process.exit(1);
}

socket.on('data', data => {
    print(data.toString());
});

socket.on('close', () => {
    print('Connection closed\n');
    process.exit(0);
});

socket.on('error', err => {
    print(`${err}\n`);
    process.exit(1);
});


function print(str) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(str);
    process.stdout.write(prompt);
}
