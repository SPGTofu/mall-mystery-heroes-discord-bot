/**
 * Command registration and routing
 * Auto-registers commands from commands/ directory and routes interactions
 */

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * Loads all commands from the commands directory
 * @param {Client} client - The Discord client
 * @returns {Object} Object with commands collection and command map
 */
function loadCommands(client) {
  const commands = new Collection();
  const commandMap = new Map(); // Maps "group.subcommand" or "command" to command object
  const commandsPath = path.join(__dirname, '../commands');
  
  // Directories that contain standalone commands (not subcommands)
  const standaloneDirs = ['player', 'assassination', 'broadcast', 'utility'];
  
  // Recursively load commands from subdirectories
  function loadCommandsFromDir(dir, groupName = null, isStandaloneDir = false) {
    const files = fs.readdirSync(dir);
    const dirName = path.basename(dir);
    
    // Check if this directory should be treated as standalone commands
    const shouldBeStandalone = standaloneDirs.includes(dirName);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively load from subdirectory
        const newGroupName = groupName ? `${groupName}.${file}` : file;
        loadCommandsFromDir(filePath, newGroupName, standaloneDirs.includes(file));
      } else if (file.endsWith('.js')) {
        const command = require(filePath);
        if (command.name) {
          let commandKey;
          let finalGroupName = null;
          
          if (shouldBeStandalone || isStandaloneDir) {
            // This is a standalone command - use the command's name directly
            commandKey = command.name;
          } else if (groupName) {
            // This is a subcommand - use group.subcommand format
            commandKey = `${groupName}.${command.name}`;
            finalGroupName = groupName;
          } else {
            // Top-level standalone command
            commandKey = command.name;
          }
          
          // Store command with metadata
          const commandData = {
            ...command,
            group: finalGroupName,
            fullPath: commandKey,
          };
          
          commands.set(commandKey, commandData);
          commandMap.set(commandKey, commandData);
        }
      }
    }
  }
  
  loadCommandsFromDir(commandsPath);
  return { commands, commandMap };
}

/**
 * Registers all commands with Discord
 * @param {Client} client - The Discord client
 * @returns {Promise<void>}
 */
async function registerCommands(client) {
  const { commands, commandMap } = loadCommands(client);
  console.log(`Loaded ${commands.size} commands`);
  
  // Build Discord slash command structure
  const discordCommands = [];
  const groups = new Map(); // group name -> array of subcommands
  
  // Organize commands by group
  commands.forEach((command, key) => {
    if (command.group) {
      // This is a subcommand
      const groupName = command.group;
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      const subcommandData = {
        type: 1, // SUB_COMMAND
        name: command.name,
        description: command.description || 'No description',
      };
      
      // Add options if command defines them
      if (command.options && Array.isArray(command.options)) {
        subcommandData.options = command.options;
      }
      
      groups.get(groupName).push(subcommandData);
    } else {
      // This is a standalone command
      const commandData = {
        name: command.name,
        description: command.description || 'No description',
      };
      
      // Add options if command defines them
      if (command.options && Array.isArray(command.options)) {
        commandData.options = command.options;
      }
      
      if (command.default_member_permissions) {
        commandData.default_member_permissions = command.default_member_permissions;
      }

      if (typeof command.dm_permission === 'boolean') {
        commandData.dm_permission = command.dm_permission;
      }

      discordCommands.push(commandData);
    }
  });
  
  // Add grouped commands
  groups.forEach((subcommands, groupName) => {
    discordCommands.push({
      name: groupName,
      description: `${groupName} commands`,
      options: subcommands,
    });
  });
  
  try {
    await client.application.commands.set(discordCommands);
    console.log(`Registered ${discordCommands.length} commands with Discord`);
    console.log('Commands:', discordCommands.map(c => c.name).join(', '));
  } catch (error) {
    console.error('Error registering commands:', error);
  }
  
  // Store commands for routing
  client.commands = commands;
  client.commandMap = commandMap;
}

/**
 * Routes an interaction to the appropriate command handler
 * @param {Interaction} interaction - The Discord interaction
 * @param {Collection} commands - Collection of loaded commands
 * @param {Map} commandMap - Map of command keys to commands
 * @returns {Promise<void>}
 */
async function routeInteraction(interaction, commands, commandMap) {
  if (!interaction.isChatInputCommand()) return;

  let command;
  const subcommand = interaction.options.getSubcommand(false);
  
  if (subcommand) {
    // This is a subcommand (e.g., /game create)
    const groupName = interaction.commandName;
    const commandKey = `${groupName}.${subcommand}`;
    command = commandMap.get(commandKey);
  } else {
    // Standalone command (e.g., /ping)
    command = commandMap.get(interaction.commandName);
  }

  if (!command) {
    console.error(`No command matching ${interaction.commandName}${subcommand ? ` ${subcommand}` : ''} was found.`);
    await interaction.reply({ 
      content: 'Command not found.', 
      ephemeral: true 
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}${subcommand ? ` ${subcommand}` : ''}:`, error);
    const { handleError } = require('../utils/errors');
    await handleError(error, interaction);
  }
}

module.exports = {
  loadCommands,
  registerCommands,
  routeInteraction,
};
