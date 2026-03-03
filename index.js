const { Client, LocalAuth, Location, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const precos = require('./precos');
const mensagens = require('./mensagens');
const clientes = require('./estado');

const GRUPO_ID = "120363406626018377@g.us";

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot Apple Consert conectado 🚀');
});

client.on('message', async message => {



         // 🔒 BLOQUEAR TODOS OS GRUPOS
          if (message.from.endsWith('@g.us')) {
    return;
}



    console.log("ID DO CHAT:", message.from);

    const user = message.from;

    const contato = await message.getContact();
    const nome = contato.pushname || contato.name || "Cliente";
    const textoOriginal = message.body.toLowerCase().trim();

    if (!clientes[user]) {
        clientes[user] = { etapa: 'inicio', pausado: false };
    }
// =====================
// BLOQUEIO ATENDIMENTO HUMANO
// =====================
if (clientes[user].pausado) {

    if (textoOriginal === 'menu') {
        clientes[user].pausado = false;
        clientes[user].etapa = 'inicio';
    } else {
        return; // impede o bot de responder
    }

}

    const etapa = clientes[user].etapa;

    // ================= MENU INICIAL =================
    if (etapa === 'inicio') {
        await message.reply(mensagens.menu(nome));
        clientes[user].etapa = 'menu';
        return;
    }

    // ================= MENU =================
    if (etapa === 'menu') {

        if (textoOriginal === '1') {
            await message.reply(mensagens.modelo);
            clientes[user].etapa = 'modelo';
        }

        else if (textoOriginal === '2') {
            await message.reply(
                "👨‍🔧 Atendimento humano iniciado!\n\n" +
                "Um atendente irá responder você em breve.\n\n" +
                "Para voltar ao menu automático, digite:\n*menu*"
            );
            clientes[user].pausado = true;
            clientes[user].tempoPausa = Date.now();
            return;
        }

        else if (textoOriginal === '3') {
            await message.reply(mensagens.vendaModelo);
            clientes[user].etapa = 'venda_modelo';
        }

        else if (textoOriginal === '4') {
    await message.reply(
        "🚧 *Acessórios temporariamente indisponíveis*\n\n" +
        "Estamos organizando nosso catálogo 🔥\n" +
        "Em breve você poderá comprar direto pelo WhatsApp."
    );
    return;
}


        else {
            await message.reply("❌ Digite apenas 1, 2 ou 3.");
        }

        return;
    }

    // ================= VENDA =================
    if (etapa === 'venda_modelo') {
        clientes[user].vendaModelo = message.body;
        await message.reply(mensagens.vendaDefeito);
        clientes[user].etapa = 'venda_defeito';
        return;
    }

    if (etapa === 'venda_defeito') {
        clientes[user].vendaDefeito = message.body;
        await message.reply(mensagens.vendaMidia);
        clientes[user].etapa = 'venda_midias';
        return;
    }

    if (etapa === 'venda_midias') {

    if (message.hasMedia) {

        const media = await message.downloadMedia();

        // ✅ Confirmação para o cliente
        await message.reply(
            "✅ Material recebido!\n\n" +
            "Nossa equipe técnica irá analisar e retornaremos com a proposta.\n\n" +
            "⏳ Aguarde nosso contato."
        );

        // 🚨 Envio para grupo dos técnicos
        await client.sendMessage(GRUPO_ID,
            "📲 *NOVA AVALIAÇÃO DE VENDA*\n\n" +
            `👤 Cliente: ${nome}\n` +
            `📱 Modelo: ${clientes[user].vendaModelo}\n` +
            `🔧 Defeito: ${clientes[user].vendaDefeito}\n\n` +
            "📎 Mídia enviada abaixo:"
        );

        // 📸 Envia a foto ou vídeo
        await client.sendMessage(GRUPO_ID, media);

        clientes[user].etapa = 'inicio';
    }

    else {
        await message.reply("📎 Por favor envie foto ou vídeo para avaliação.");
    }

    return;
}


    // ================= MODELO =================
    if (etapa === 'modelo') {

        let modeloDigitado = textoOriginal.replace("iphone", "").trim();

        let modeloEncontrado = Object.keys(precos).find(modelo =>
            modelo.includes(modeloDigitado)
        );

        if (!modeloEncontrado) {
            await message.reply("❌ Modelo não encontrado.");
            return;
        }

        clientes[user].modelo = modeloEncontrado;
        await message.reply(mensagens.servico);
        clientes[user].etapa = 'servico';
        return;
    }

    // ================= SERVIÇOS =================
    if (etapa === 'servico') {

        const modelo = clientes[user].modelo;

        const servicosDigitados = textoOriginal
            .replace(/,/g, " ")
            .split(" ")
            .filter(s => s.length > 0);

        let servicosValidos = [];
        let total = 0;

        for (let servico of servicosDigitados) {
            if (precos[modelo] && precos[modelo][servico]) {
                servicosValidos.push(servico);
                total += precos[modelo][servico];
            }
        }

        if (servicosValidos.length === 0) {
            await message.reply("❌ Serviço inválido.");
            return;
        }

        await message.reply(
            "📋 *Resumo do Orçamento*\n\n" +
            `📱 Modelo: ${modelo}\n` +
            `🔧 Serviços: ${servicosValidos.join(", ")}\n\n` +
            `💰 Valor total: R$${total}\n\n` +
            "📅 Deseja agendar?\n\n" +
            "1️⃣ Sim\n" +
            "2️⃣ Não"
        );

        clientes[user].total = total;
        clientes[user].servicos = servicosValidos.join(", ");
        clientes[user].etapa = 'agendar_confirmacao';
        return;
    }

    // ================= CONFIRMAR AGENDAMENTO =================
    if (etapa === 'agendar_confirmacao') {

        if (textoOriginal === '1') {
            await message.reply(
                "📅 Escolha o dia:\n\n" +
                "1️⃣ Hoje\n" +
                "2️⃣ Amanhã"
            );
            clientes[user].etapa = 'agendar_dia';
            return;
        }

        if (textoOriginal === '2') {
            await message.reply("👍 Perfeito! Quando quiser é só chamar.");
            clientes[user].etapa = 'inicio';
            return;
        }
    }

    // ================= ESCOLHER DIA =================
    if (etapa === 'agendar_dia') {

        if (textoOriginal === '1') {
            clientes[user].data = "Hoje";
        }

        if (textoOriginal === '2') {
            clientes[user].data = "Amanhã";
        }

        await message.reply("⏰ Informe o horário desejado.\nExemplo: 14:30");
        clientes[user].etapa = 'agendar_horario';
        return;
    }

    // ================= RECEBER HORÁRIO =================
    if (etapa === 'agendar_horario') {

        clientes[user].horario = message.body;

        await message.reply(
            "✅ *Agendamento confirmado!*\n\n" +
            "📍 Enviando localização da loja..."
        );

        // ENVIA LOCALIZAÇÃO
        const location = new Location(
            -1.418261,
            -48.469614,
            "📍 Apple Consert"
        );

        await client.sendMessage(user, location);

        // ENVIA PARA O GRUPO
        await client.sendMessage(GRUPO_ID,
            "🚨 *NOVO AGENDAMENTO*\n\n" +
            `👤 Cliente: ${nome}\n` +
            `📱 Modelo: ${clientes[user].modelo}\n` +
            `🔧 Serviços: ${clientes[user].servicos}\n` +
            `💰 Valor: R$${clientes[user].total}\n` +
            `📅 Data: ${clientes[user].data}\n` +
            `⏰ Horário: ${clientes[user].horario}`
        );

        clientes[user].etapa = 'inicio';
        return;
    }
// ================= ACESSÓRIOS =================
if (etapa === 'acessorios') {

    if (textoOriginal === '1') {

        const fs = require('fs');
        const path = './imagens_capinhas';

        try {
            const arquivos = fs.readdirSync(path);

            for (let arquivo of arquivos) {
                const media = MessageMedia.fromFilePath(`${path}/${arquivo}`);
                await message.reply(media);
            }

            await message.reply(
                "🎨 *Capinha Personalizada*\n\n" +
                "Envie agora a imagem ou arte que deseja colocar na capinha.\n\n" +
                "📲 Pode enviar foto ou arte."
            );

            clientes[user].etapa = 'receber_arte';

        } catch (erro) {
            await message.reply("❌ Erro ao carregar imagens.");
        }

        return;
    }

    await message.reply("❌ Digite um número válido do acessório.");
    return;
}
// ================= RECEBER ARTE CAPINHA =================
if (etapa === 'receber_arte') {

    if (message.hasMedia) {

        const media = await message.downloadMedia();

        await message.reply("✅ Arte recebida!\n\nNossa equipe irá preparar sua capinha personalizada.");

        // Aqui você pode enviar para o grupo da loja
        await client.sendMessage(GRUPO_ID,
            "🎨 *NOVA CAPINHA PERSONALIZADA*\n\n" +
            `👤 Cliente: ${nome}`
        );

        await client.sendMessage(GRUPO_ID, media);

        clientes[user].etapa = 'inicio';
        return;
    }

    await message.reply("📸 Por favor, envie a imagem da arte desejada.");
    return;
}

});

client.initialize();
