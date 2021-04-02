const Discord = require('discord.js');
const fetch = require('node-fetch');
const chance = require('chance');

// Importing this allows you to access the environment variables of the running node process
require('dotenv').config();

const ddraft = 'http://ddraft.clients.dashdash.help';
const ddraftApi = process.env.DDRAFT_API_URL ?? ddraft;

const client = new Discord.Client();

let lastResponse;

const dumpy = '<:dumpsterdollar:741829899848777738>';
const cubebrain = '<:cubebrain:745811987375718511>';

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  try {
    if (message.content === '?pack') {
      const res = await fetch(`${ddraftApi}/cube/api/ddraft/pack/moddy`);
      if (!res.ok) {
        console.error(res);

        await message.channel.send(`Request failed ${dumpy}. Here's a normal pack to make it up to you: ` +
                                   `https://cubecobra.com/cube/samplepack/moddy/${Date.now()}`);
        return;
      }

      lastResponse = await res.json();

      if (lastResponse.deck_image) {
        await message.channel.send(new Discord.MessageEmbed()
                                   .setTitle('Deck so far:')
                                   .setImage(new URL(lastResponse.deck_image, ddraft)));
      }

      await message.channel.send(new URL(lastResponse.view, ddraft).toString());
    } else if (message.content === '?reset-draft') {
      const res = await fetch(`${ddraftApi}/cube/api/ddraft/reset`, {method: 'POST'});
      if (!res.ok) {
        console.error(res);
        await message.channel.send(`Request failed ${dumpy}.`);
        return;
      }

      lastResponse = null;
      await message.react('💥');
    } else {
      const pick = message.content.startsWith('?pick ');
      const sideboard = message.content.startsWith('?sideboard ');
      if (pick || sideboard) {
        if (!lastResponse?.choose) {
          await message.channel.send("There's no pack to pick from!");
          return;
        }

        const name = message.content.substring(message.content.indexOf(' ') + 1);

        const params = {card: message.content.substring('?pick '.length)};
        if (sideboard) params.sideboard = 'true';

        const res = await fetch(new URL(lastResponse.choose, ddraftApi), {
          method: 'POST',
          body: new URLSearchParams(params)
        });
        if (!res.ok) {
          console.error(res);
          await message.channel.send((await res.json()).message);
          return;
        }

        lastResponse = null;
        await message.react(chance.weighted(
          ['👍', '😬', cubebrain, '🤣'],
          [100, 10, 5, 1]
        ));
      }
    }
  } catch (error) {
    await message.channel.send("<@!250519887108112384> Something broke!");
  }
});

client.login();
