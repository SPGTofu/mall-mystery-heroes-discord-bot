/**
 * Interaction create event handler
 * Routes slash commands and modal interactions to their handlers
 */

const { Events } = require('discord.js');
const { routeInteraction, routeAutocomplete, loadCommands } = require('../handlers/commandHandler');
const modalInteractionCreate = require('./modalInteractionCreate');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      await modalInteractionCreate.execute(interaction);
      return;
    }

    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      await routeAutocomplete(interaction);
      return;
    }

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

