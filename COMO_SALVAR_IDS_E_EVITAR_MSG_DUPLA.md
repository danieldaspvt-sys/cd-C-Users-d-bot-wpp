# Como salvar IDs dos clientes e evitar mensagem inicial duplicada

## O que foi implementado

- Arquivo de exemplo pronto: `EXEMPLO_CORRECAO_BOT.js`.
- Persistência dos IDs únicos em `clientes_ids.json`.
- Filtro para ignorar mensagens do próprio bot e grupos.
- Proteção contra mensagem inicial duplicada usando:
  - `global.__BOT_LISTENER_ATTACHED__` (evita listener registrado 2x);
  - cooldown por chat (`lastWelcomeByChat`) para não reenviar saudação toda hora.

## Por que seu bot envia 2 mensagens no início?

Geralmente é um destes motivos:

1. **Listener duplicado** (`client.on('message')` sendo registrado mais de uma vez).
2. **Mais de uma instância do bot rodando** ao mesmo tempo.
3. **Falta de filtro `msg.fromMe`**, então o bot responde a própria mensagem.
4. **Fluxo sem estado**, que reenviava saudação a cada mensagem.

## Como usar

1. Copie a lógica do arquivo `EXEMPLO_CORRECAO_BOT.js` para seu `index.js`.
2. Rode apenas **uma** instância do bot.
3. Garanta que o tratamento de mensagem esteja em um único `client.on('message')`.
4. Verifique se o arquivo `clientes_ids.json` está sendo criado.

## Sobre "botar todos em grupo"

- Tecnicamente você pode ter os IDs e montar uma lista.
- Porém, em muitos cenários do WhatsApp, adicionar pessoas em grupo sem consentimento pode falhar por privacidade e também gerar bloqueios/restrições.
- Recomendação segura:
  - coletar consentimento (opt-in) no bot;
  - enviar convite do grupo em vez de forçar adição;
  - manter lista de quem aceitou.

## Exportar IDs salvos (exemplo)

```js
const fs = require('fs');
const ids = JSON.parse(fs.readFileSync('clientes_ids.json', 'utf8'));
console.log(ids);
```
