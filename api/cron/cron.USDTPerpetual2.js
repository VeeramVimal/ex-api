const { WebsocketClient } = require('bybit-api');

const API_KEY = 'p75Ot4ncgYL6biDQCO';
const API_SECRET = 'NR4vfjtmNSIgQiU8TFqxRYrXq6LME9jmzkBe';
const useTestnet = false;

const wsConfig = {
    // key: API_KEY,
    // secret: API_SECRET,
    testnet: useTestnet,
    market: 'v5',
};

var socket = 0;

// here socket connect 
exports.SocketInit = function (socketIO) {
    socket = socketIO;
}

const ws = new WebsocketClient(wsConfig);

ws.subscribeV5(['orderbook.50.BTCUSDT'], 'linear');

// Listen to events coming from websockets. This is the primary data source
ws.on('update', (data) => {
    console.log('update', {
        type: data.type,
        data: data,
        a: data.data.a,
        b: data.data.b
    });
});

// Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
ws.on('open', ({ wsKey, event }) => {
    // console.log('connection open for websocket with ID: ' + wsKey);
});

// Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
ws.on('response', (response) => {
    // console.log('response', response);
});

// Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
ws.on('close', () => {
    // console.log('connection closed');
});

// Optional: Listen to raw error events. Recommended.
ws.on('error', (err) => {
    console.error('error', err);
});