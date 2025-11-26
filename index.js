// Load environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, GatewayIntentBits } = require('discord.js');
const token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Load event handlers
const { registerEvents } = require('./handlers/eventHandler');
registerEvents(client);

// Log in to Discord with your client's token
client.login(token);