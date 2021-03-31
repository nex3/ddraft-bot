const Discord = require('discord.js');
const fetch = require('node-fetch');

// Importing this allows you to access the environment variables of the running node process
require('dotenv').config();

const ddraft = 'http://ddraft.clients.dashdash.help';

const client = new Discord.Client();

let lastResponse;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  if (message.content === '?pack') {
    const res = await fetch(`${ddraft}/cube/api/ddraft/pack/moddy`);
    if (!res.ok) {
      console.error(res);

      await message.reply("Request failed :dumpsterdollar:. Here's a normal pack to make it up to you: " +
        `https://cubecobra.com/cube/samplepack/moddy/${Date.now()}`);
      return;
    }

    lastResponse = await res.json();

    if (lastResponse.deck_image) {
      await message.reply(new Discord.MessageEmbed()
        .setTitle('Deck so far:')
        .setImage(new URL(lastResponse.deck_image, ddraft)));
    }

    await message.reply(new URL(lastResponse.view, ddraft).toString());
  } else {
    const pick = message.content.startsWith('?pick ');
    const sideboard = message.content.startsWith('?sideboard ');
    if (pick || sideboard) {
      if (!lastResponse?.choose) {
        await message.reply("There's no pack to pick from!");
        return;
      }

      const name = message.content.substring(message.content.indexOf(' ') + 1);

      const params = {card: message.content.substring('?pick '.length)};
      if (sideboard) params.sideboard = 'true';

      const res = await fetch(new URL(lastResponse.choose, ddraft), {
        method: 'POST',
        body: new URLSearchParams(params)
      });
      if (!res.ok) {
        console.error(res);
        await message.reply((await res.json()).message);
        return;
      }

      lastResponse = null;
      await message.react('👍');
    }
  }
});

client.login();
