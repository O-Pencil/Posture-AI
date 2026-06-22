/**
 * @file server.mjs
 * @description WS 中转（两台手机保底方案）。
 *   iPhone App(姿态发送方) → 本服务 → Catune Web/App(wsSensorSource 接收)。
 *
 * 运行（Mac，与手机同一 WiFi）：
 *   npm i ws            # 仅首次
 *   node scripts/ws-relay/server.mjs
 * Mac 接收：另开 `npm run web`，浏览器打开 Expo Web，自动连 ws://127.0.0.1:8787
 * iPhone 发送：App Settings → 姿态发送方 → ws://<Mac内网IP>:8787
 */
import http from 'node:http';
import os from 'node:os';
import {readFileSync} from 'node:fs';
import {WebSocketServer} from 'ws';

const PORT = Number(process.env.PORT || 8787);
const EXPO_WEB = process.env.EXPO_WEB_URL || 'http://localhost:8083';
const senderHtml = readFileSync(new URL('./ws-sender.html', import.meta.url));

const server = http.createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (path === '/receiver') {
    res.writeHead(302, {Location: EXPO_WEB});
    res.end();
    return;
  }
  if (path === '/') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(senderHtml);
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({server});
wss.on('connection', ws => {
  ws.on('message', data => {
    const msg = data.toString();
    for (const c of wss.clients) {
      if (c !== ws && c.readyState === 1) {
        c.send(msg);
      }
    }
  });
});

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
  console.log(`✓ WS 中转已启动，端口 ${PORT}`);
  console.log('');
  console.log('① iPhone 发送（推荐 App · 姿态发送方）：');
  ips.forEach(ip => console.log(`    ws://${ip}:${PORT}`));
  console.log('');
  console.log('② Mac/Web 接收（Catune 完整 UI，非单独页面）：');
  console.log(`    npm run web  →  ${EXPO_WEB}`);
  console.log('    启动后自动连 ws://127.0.0.1:8787，看 Desk / Monitor');
  console.log('');
  console.log('③ 安卓 App 接收：Settings · 手机姿态带 · 同上 ws 地址');
  console.log('');
  console.log('备选：浏览器传感器页 / （需 ngrok https，无 App 时用）');
});
