/**
 * /game create command
 * Creates a new game instance
 */

const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { createOrUpdateRoom, getRoom } = require('../../services/firebase/dbCallsAdapter');
const { deleteChannel, getOrCreateChannel } = require('../../services/discord/channels');
const { getOrCreateGameMasterRole, getOrCreateAllRolesForRoom, removeRole } = require('../../services/discord/roles');
const { createEmbed } = require('../../services/discord/messages');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');
const { ROLES } = require('../../config/roles');

module.exports = {
  name: 'create',
  description: 'Create a new game',
  async execute(interaction) {
    try {
      // Check if channel is general
      if (interaction.channel.name !== CHANNELS.GENERAL) {
        return interaction.reply({
          content: "/game create can only be done in #general.",
          ephemeral: true
        })
      }
      // Check GM permissions
      if (!canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters can create a game.');
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const roomID = guild.id; // Use guild ID as room ID

      // Check if room already exists
      const roomSnapshot = await getRoom(roomID);
      
      if (roomSnapshot.exists) {
        throw new GameError('Command cannot be executed. Another game is still in progress. End that game to create a new one.');
      }

      // Create new room
      await interaction.editReply('Creating new game room...');

      // Create or update room with initial data
      await createOrUpdateRoom(roomID, {
        isGameActive: false,
        taskIndex: 0,
        logs: []
      });

      // Remove all channels/categories except general
      await interaction.editReply('Cleaning up channels...');
      const channelsToDelete = [];
      
      guild.channels.cache.forEach(channel => {
        // Keep general channel, system channels, and don't delete categories yet
        const isGeneral = channel.name.toLowerCase() === CHANNELS.GENERAL.toLowerCase() ||
                         channel.name.toLowerCase().includes('general');
        const isSystem = channel.type === 2 || channel.type === 13 || channel.type === 15; // Voice, Stage, Forum
        const isCategory = channel.type === 4;
        
        // Only delete text channels that aren't general
        if (!isGeneral && !isSystem && !isCategory && channel.type === 0) {
          channelsToDelete.push(channel);
        }
      });

      // Delete channels
      for (const channel of channelsToDelete) {
        try {
          await deleteChannel(channel);
        } catch (error) {
          console.error(`Error deleting channel ${channel.name}:`, error);
        }
      }

      // Delete categories (except if they contain general)
      const categoriesToDelete = [];
      guild.channels.cache.forEach(channel => {
        if (channel.type === 4) { // Category
          const hasGeneral = channel.children.cache.some(
            ch => ch.name.toLowerCase() === CHANNELS.GENERAL.toLowerCase()
          );
          if (!hasGeneral) {
            categoriesToDelete.push(channel);
          }
        }
      });

      for (const category of categoriesToDelete) {
        try {
          // Delete children first
          for (const child of category.children.cache.values()) {
            await deleteChannel(child);
          }
          await deleteChannel(category);
        } catch (error) {
          console.error(`Error deleting category ${category.name}:`, error);
        }
      }

      // Reset all roles (delete game-specific roles)
      await interaction.editReply('Resetting roles...');
      // DOESNT WORK ATM
      // try {
      //   await deleteAllRolesForRoom(guild);
      // } catch (e) {
      //   console.error(e)
      // }

      // Remove tracked roles from all members so the new game starts clean
      await interaction.editReply('Removing previous player roles...');
      const roleNamesToClear = [
        ROLES.GAME_MASTER,
        ROLES.PLAYER,
        ROLES.ALIVE,
        ROLES.DEAD,
        ROLES.OPEN_SEASON
      ];

      const rolesToClear = roleNamesToClear
        .map(roleName => guild.roles.cache.find(role => role.name === roleName))
        .filter(Boolean);

      if (rolesToClear.length > 0) {
        const members = await guild.members.fetch();
        for (const member of members.values()) {
          for (const role of rolesToClear) {
            if (member.roles.cache.has(role.id)) {
              try {
                await removeRole(member, role);
              } catch (error) {
                console.error(`Error removing role ${role.name} from ${member.user.tag}:`, error);
              }
            }
          }
        }
      }

      // Get or create all roles
      const allRoles = await getOrCreateAllRolesForRoom(guild);
      const gmRole = await getOrCreateGameMasterRole(guild);

      // Create DMs category
      await interaction.editReply('Creating DMs category...');
      const dmCategory = await getOrCreateChannel(guild, CHANNELS.DMS_CATEGORY, { type: 4 });

      // Create Game Masters channel with only GMs and bot
      await interaction.editReply('Creating Game Masters channel...');
      
      // Create Game Masters channel with permissions
      const gameMastersChannel = await getOrCreateChannel(guild, CHANNELS.GAME_MASTERS, {
        type: 0, // Text channel
        parent: null, // No category
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: ['ViewChannel']
          },
          {
            id: gmRole.id, // Game Masters
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          },
          {
            id: guild.members.me.id, // Bot
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages']
          }
        ]
      });

      // Get or create general channel
      const generalChannel = await getOrCreateChannel(guild, CHANNELS.GENERAL);

      // Send rules message and pin it
      await interaction.editReply('Sending rules message...');
      
      const rulesMessage = createEmbed({
        title: '📜 Game Rules',
        description: `Welcome to Mall Mystery Heroes!
**How to Play:**
- Players are assigned secret targets
- Eliminate your targets by taking identifiable photos
- Gain points by eliminating targets
- Complete tasks to earn rewards
- The player with the highest score wins!

**Commands:**
- Use \`/game join [your real name]\` to join the game
- Game Masters can use various commands to manage the game

**Important:**
- Follow all server rules
- Be respectful to other players
- Have fun! 🎮`,
        color: 0x0099ff,
        footer: { text: 'Game created successfully!' }
      });

      const sentMessage = await generalChannel.send({ embeds: [rulesMessage] });
      await sentMessage.pin();

      await interaction.editReply('✅ Game created successfully! The room has been initialized, channels have been set up, and rules have been posted.');

    } catch (error) {
      console.error('Error in /game create:', error);
      await handleError(error, interaction);
    }
  },
};
