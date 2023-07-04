const WebSocket = require('ws');
const zlib = require('zlib');

const symbol = 'btcusdt'; // The trading symbol

// Create a new WebSocket instance
const ws = new WebSocket('wss://api.huobi.pro/ws');

// Handle WebSocket open event
ws.on('open', () => {
  console.log('WebSocket connection opened');

  // Subscribe to the order book channel
  ws.send(JSON.stringify({
    "sub": `market.${symbol}.depth.step0`,
    "id": "depth"
  }));
});

// Handle WebSocket message event
ws.on('message', (data) => {
    console.log(typeof data);
  if (typeof data === 'string') {
    // Handle ping message
    const message = JSON.parse(data);
    if (message.ping) {
      ws.send(JSON.stringify({
        pong: message.ping
      }));
    }
  } else if (Buffer.isBuffer(data)) {
    // Handle order book update
    zlib.gunzip(data, (err, uncompressedData) => {
      if (err) {
        console.error('Error decompressing data:', err);
        return;
      }

      const message = JSON.parse(uncompressedData.toString('utf8'));
      console.log('Order book:', message.tick);
    });
  }
});

// Handle WebSocket close event
ws.on('close', () => {
  console.log('WebSocket connection closed');
});
