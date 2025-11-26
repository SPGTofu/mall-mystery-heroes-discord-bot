/**
 * Bot ready event handler
 * Handles bot initialization and command registration
 */

const { Events } = require('discord.js');
const { registerCommands } = require('../handlers/commandHandler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Register all commands from commands/ directory
    await registerCommands(client);
  },
};

