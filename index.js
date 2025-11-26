// Load environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
client.once(Events.ClientReady, async (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

	// Register a simple global /ping command for testing
	try {
		await readyClient.application.commands.create({
			name: 'ping',
			description: 'Replies with Pong!',
		});
		console.log('Slash command /ping registered.');
	} catch (error) {
		console.error('Error registering /ping command:', error);
	}
});

// Listen for interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		try {
			await interaction.reply('Pong!');
		} catch (error) {
			console.error('Error handling /ping interaction:', error);
		}
	}
});

// Log in to Discord with your client's token
client.login(token);