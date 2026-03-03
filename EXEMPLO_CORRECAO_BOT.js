const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const IDS_FILE = path.join(__dirname, 'clientes_ids.json');
const WELCOME_COOLDOWN_MS = 60 * 60 * 1000; // 1h

function loadClientIds() {
  try {
    const raw = fs.readFileSync(IDS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

function saveClientIds(idsSet) {
  fs.writeFileSync(IDS_FILE, JSON.stringify([...idsSet], null, 2), 'utf8');
}

function isUserChat(msg) {
  // Ignora mensagens enviadas pelo próprio bot, grupos e status/broadcast
  if (msg.fromMe) return false;
  if (!msg.from || !msg.from.endsWith('@c.us')) return false;
  return true;
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: false }
});

const knownClientIds = loadClientIds();
const lastWelcomeByChat = new Map();

function shouldSendWelcome(chatId) {
  const now = Date.now();
  const last = lastWelcomeByChat.get(chatId) || 0;

  if (now - last < WELCOME_COOLDOWN_MS) return false;

  lastWelcomeByChat.set(chatId, now);
  return true;
}

if (!global.__BOT_LISTENER_ATTACHED__) {
  global.__BOT_LISTENER_ATTACHED__ = true;

  client.on('message', async (msg) => {
    if (!isUserChat(msg)) return;

    const chatId = msg.from;

    // 1) Salvar IDs únicos para usar depois
    if (!knownClientIds.has(chatId)) {
      knownClientIds.add(chatId);
      saveClientIds(knownClientIds);
      console.log(`Novo cliente salvo: ${chatId}`);
    }

    // 2) Evitar mensagem inicial duplicada
    const text = (msg.body || '').trim().toLowerCase();
    const isFirstInteraction = !['1', '2', '3', '4'].includes(text);

    if (isFirstInteraction && shouldSendWelcome(chatId)) {
      await client.sendMessage(
        chatId,
        [
          '🍎 Apple Consert',
          '',
          'Olá! 👋',
          'Escolha uma opção abaixo:',
          '1️⃣ Fazer orçamento',
          '2️⃣ Falar com atendente',
          '3️⃣ Vender telefone quebrado',
          '4️⃣ Acessórios',
          '',
          'Digite o número da opção.'
        ].join('\n')
      );
      return;
    }

    // Menu normal
    if (text === '1') {
      await client.sendMessage(chatId, '🔎 Descreva qual é o problema do aparelho.');
      return;
    }

    if (text === '2') {
      await client.sendMessage(chatId, '👨‍🔧 Atendimento humano iniciado! Um atendente irá responder você.');
      return;
    }

    if (text === '3') {
      await client.sendMessage(chatId, '💰 Me envie modelo e estado do aparelho para avaliação.');
      return;
    }

    if (text === '4') {
      await client.sendMessage(chatId, '🛍️ Temos capas, películas, carregadores e fones. O que você procura?');
      return;
    }

    // Mensagem padrão sem duplicar boas-vindas toda hora
    await client.sendMessage(chatId, 'Digite apenas 1, 2, 3 ou 4.');
  });
}

client.on('ready', () => {
  console.log('Bot conectado com proteção contra duplicidade e captura de IDs.');
});

client.initialize();
