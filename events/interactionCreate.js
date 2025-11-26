/**
 * Interaction create event handler
 * Routes slash commands to their handlers
 */

const { Events } = require('discord.js');
const { routeInteraction, loadCommands } = require('../handlers/commandHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Load commands if not already loaded
    if (!interaction.client.commands) {
      const { commands, commandMap } = loadCommands(interaction.client);
      interaction.client.commands = commands;
      interaction.client.commandMap = commandMap;
    }
    
    // Route the interaction to the appropriate command handler
    await routeInteraction(
      interaction, 
      interaction.client.commands, 
      interaction.client.commandMap
    );
  },
};

