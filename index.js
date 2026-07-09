import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Load commands
client.commands = new Collection();
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = await import(pathToFileURL(join(__dirname, 'commands', file)).href);
  client.commands.set(cmd.data.name, cmd);
}

// Load events
const eventFiles = readdirSync(join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = await import(pathToFileURL(join(__dirname, 'events', file)).href);
  client.on(event.name, (...args) => event.execute(...args, client));
}

client.once('ready', () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN)
  .catch(console.error);