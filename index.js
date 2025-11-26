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
			name: 'johnt',
			description: 'Replies with johnt!',
		});
		console.log('Slash command /johnt registered.');
	} catch (error) {
		console.error('Error registering /johnTest command:', error);
	}
});

// Listen for interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'johnt') {
		try {
			await interaction.reply('johnt!');
		} catch (error) {
			console.error('Error handling /johnt interaction:', error);
		}
	}
});

// Log in to Discord with your client's token
client.login(token);