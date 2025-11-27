/**
 * /game start command
 * Starts an active game and assigns targets
 */

const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { 
  getRoom, 
  fetchAllPlayersForRoom, 
  generateAndAssignTargets,
  createOrUpdateRoom 
} = require('../../services/firebase/dbCallsAdapter');
const { findChannelByName } = require('../../services/discord/channels');
const { createEmbed, createAnnouncement } = require('../../services/discord/messages');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');
const GAME_RULES = require('../../config/gameRules');

module.exports = {
  name: 'start',
  description: 'Start an active game',
  async execute(interaction) {
    try {
      // Check GM permissions
      if (!canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters can start a game.');
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const roomID = guild.id; // Use guild ID as room ID

      // Check if room exists
      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        throw new GameError('No game room exists. Please create a game first with /game create.');
      }

      // Check if game is already active
      const roomData = roomSnapshot.data();
      if (roomData.isGameActive) {
        throw new GameError('The game has already started.');
      }

      // Fetch all players
      await interaction.editReply('Fetching players...');
      const players = await fetchAllPlayersForRoom(roomID);
      
      if (players.length < GAME_RULES.MIN_PLAYERS_TO_START) {
        throw new GameError(
          `Not enough players to start the game. Minimum ${GAME_RULES.MIN_PLAYERS_TO_START} players required, but only ${players.length} have joined.`
        );
      }

      // Assign targets using the database service
      await interaction.editReply('Assigning targets...');
      const targetMap = await generateAndAssignTargets(roomID);

      // Send target assignments to each player's DM channel
      await interaction.editReply('Sending target assignments...');
      const dmsCategory = guild.channels.cache.find(
        ch => ch.type === 4 && ch.name.toLowerCase() === CHANNELS.DMS_CATEGORY.toLowerCase()
      );

      if (!dmsCategory) {
        throw new GameError('DMs category not found. Please ensure the game has been created properly.');
      }

      // Send targets to each player
      for (const player of players) {
        const targets = targetMap.get(player.name) || [];
        const channelName = player.name.toLowerCase().replace(/\s+/g, '-');
        const dmChannel = dmsCategory.children.cache.find(
          ch => ch.name.toLowerCase() === channelName.toLowerCase()
        );

        if (dmChannel) {
          const targetsList = targets.length > 0 
            ? targets.map((t, i) => `${i + 1}. **${t}**`).join('\n')
            : 'No targets assigned.';

          const targetEmbed = createEmbed({
            title: '🎯 Your Targets',
            description: `The game has started! Here are your targets:\n\n${targetsList}\n\n**Remember:**\n- Eliminate your targets by taking identifiable photos\n- Gain points by eliminating targets\n- Keep your targets secret!\n\nGood luck! 🎮`,
            color: 0xff0000, // Red
            timestamp: new Date(),
          });

          try {
            await dmChannel.send({ embeds: [targetEmbed] });
          } catch (error) {
            console.error(`Error sending targets to ${player.name}:`, error);
            // Continue even if one player's DM fails
          }
        } else {
          console.warn(`DM channel not found for player: ${player.name}`);
        }
      }

      // Update game state to active
      await createOrUpdateRoom(roomID, {
        isGameActive: true,
        startedAt: new Date()
      });

      // Broadcast game start to general channel
      const generalChannel = findChannelByName(guild, CHANNELS.GENERAL);
      if (generalChannel) {
        const announcement = createAnnouncement(
          '🎮 GAME STARTED!',
          `The game has officially begun with **${players.length}** players!\n\nAll players have received their target assignments in their DM channels.\n\nGood luck, and may the best assassin win! 🔪`
        );
        await generalChannel.send({ embeds: [announcement] });
      }

      await interaction.editReply(
        `✅ Game started successfully! ${players.length} players have been assigned targets. The game is now active.`
      );

    } catch (error) {
      console.error('Error in /game start:', error);
      await handleError(error, interaction);
    }
  },
};
