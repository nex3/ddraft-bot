const Discord = require('discord.js');
const fetch = require('node-fetch');
const Chance = require('chance');

// Importing this allows you to access the environment variables of the running node process
require('dotenv').config();

const ddraft = 'http://ddraft.clients.dashdash.help';
const ddraftApi = process.env.DDRAFT_API_URL ?? ddraft;

const client = new Discord.Client();
const chance = new Chance();

let lastResponse;

const marsh = '<:marsh:689284694403055619>';
const cubebrain = '<:cubebrain:745811987375718511>';
const ddraftId = '826592102447317022';

async function removeMyReacts(message) {
  const reactions = message.reactions.cache
    .filter(reaction => reaction.users.cache.has(ddraftId));

  for (const reaction of reactions.values()) {
    await reaction.users.remove(ddraftId);
  }
}

function formatDecks(decks) {
  return Object.entries(decks).map(([name, url]) => {
    const resolved = new URL(url, ddraft);
    return `[${name}](${resolved})`;
  }).join('\n');
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  try {
    if (message.content === '?help') {
      await message.channel.send(
        '**?help**: Show this help info\n' +
        '**?pack**: Show a new pack to pick from\n' +
        '**?pick** _card_: Pick a card from the current pack\n' +
        '**?sideboard** _card_: Pick a card from the current pack into the sideboard\n' +
        '**?deck**: Show the current deck\n' +
        '**?sideboard**: Show the current sideboard\n' +
        '**?decks**: Link MTGO versions of all decks\n' +
        '**?fix** _card_ | _card_: Swap two cards everywhere\n' +
        '**?reset-draft**: Reset the current draft\n'
      );
    } else if (message.content === '?pack') {
      await message.react('⌛');

      const res = await fetch(`${ddraftApi}/cube/api/ddraft/pack/moddy`);
      if (!res.ok) {
        await removeMyReacts(message);

        const json = await res.json();
        if (json.decks) {
          await message.channel.send(`${json.message}\n` + formatDecks(json.decks));
        } else {
          await message.channel.send(`Request failed ${marsh}. Here's a normal pack to make it up to you: ` +
                                     `https://cubecobra.com/cube/samplepack/moddy/${Date.now()}`);
        }
        return;
      }

      lastResponse = await res.json();
      await removeMyReacts(message);

      if (lastResponse.deck_image) {
        await message.channel.send(new Discord.MessageEmbed()
                                   .setTitle('Deck so far:')
                                   .setImage(new URL(lastResponse.deck_image, ddraft)));
      }

      // Add a cache-busting query parameter to stop Discord from caching the
      // pack image.
      const url = `${lastResponse.view}?${Math.round(Date.now() / 1000)}`;
      await message.channel.send(new URL(url, ddraft).toString());
    } else if (message.content === '?sideboard') {
      if (!lastResponse?.sideboard_image) {
        await message.channel.send("There's no sideboard to show!");
        return;
      }

      await message.channel.send(
        new Discord.MessageEmbed().setImage(
          new URL(lastResponse.sideboard_image, ddraft)
        )
      );
    } else if (message.content === '?deck') {
      if (!lastResponse?.deck_image) {
        await message.channel.send("There's no deck to show!");
        return;
      }

      await message.channel.send(
        new Discord.MessageEmbed().setImage(
          new URL(lastResponse.deck_image, ddraft)
        )
      );
    } else if (message.content === '?reset-draft') {
      const res = await fetch(`${ddraftApi}/cube/api/ddraft/reset`, {method: 'POST'});
      if (!res.ok) {
        console.error(res);
        await message.channel.send(`Request failed ${marsh}.`);
        return;
      }

      lastResponse = null;
      await message.react('💥');
    } else if (message.content === '?decks') {
      const res = await fetch(`${ddraftApi}/api/decks`);
      if (!res.ok) {
        console.error(res);
        await message.channel.send(`Request failed ${marsh}.`);
        return;
      }

      await message.channel.send(formatDecks((await res.json())['decks']));
    } else if (message.content.startsWith('?fix ')) {
      const cards = message.content.substring('?fix '.length);
      if (!cards.includes('|')) {
        await message.channel.send('Usage: ?fix _card_ | _card_');
        return;
      }

      const [card1, card2] = cards.split('|').map(card => card.trim());
      const params = new URLSearchParams();
      params.set('card1', card1);
      params.set('card2', card2);
      const res = await fetch(`${ddraftApi}/api/fix`, {
        method: 'POST',
        body: new URLSearchParams(params)
      });
      if (!res.ok) {
        console.error(res);
        await message.channel.send((await res.json()).message);
        return;
      }

      await message.react('👍');
    } else {
      const pick = message.content.startsWith('?pick ');
      const sideboard = message.content.startsWith('?sideboard ');
      if (pick || sideboard) {
        if (!lastResponse?.choose) {
          await message.channel.send("There's no pack to pick from!");
          return;
        }

        const name = message.content.substring(message.content.indexOf(' ') + 1);

        const params = {card: message.content.substring(
            (pick ? '?pick ' : '?sideboard ').length)};
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
          ['👍', '😬', cubebrain, '🤣', '🤑'],
          [100, 10, 5, 1, 1]
        ));
      } else if (message.content.startsWith('?swap ')) {
        if (!lastResponse?.choose) {
          await message.channel.send("There's no deck to swap!");
          return;
        }

        const name = message.content.substring(message.content.indexOf(' ') + 1);

        const params = {card: message.content.substring('?swap '.length)};
        const res = await fetch(new URL(lastResponse.swap, ddraftApi), {
          method: 'POST',
          body: new URLSearchParams(params)
        });
        if (!res.ok) {
          console.error(res);
          await message.channel.send((await res.json()).message);
          return;
        }

        await message.react('👍');
      }
    }
  } catch (error) {
    console.error(error);
    await message.channel.send("<@!250519887108112384> Something broke!");
  }
});

client.login();
