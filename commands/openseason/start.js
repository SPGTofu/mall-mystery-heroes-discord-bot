/**
 * /openseason start command
 * Starts open season (all players can kill anyone)
 */

const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, ValidationError, handleError } = require('../../utils/errors');
const { getRoom, fetchPlayerForRoom, setOpenSeasonForPlayer } = require('../../services/firebase/dbCallsAdapter');
const { getChannel } = require('../../services/discord/channels');
const { createAnnouncement } = require('../../services/discord/messages');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');

module.exports = {
  name: 'start',
  description: 'Start open season on a player',
  options: [
    {
      type: 6, // USER type
      name: 'player',
      description: 'The player to put in open season',
      required: true,
    },
  ],
  async execute(interaction) {
    try {
      // Check GM permissions
      if (!canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters can start open season.');
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Get the player from the interaction (required option, but check for safety)
      const targetUser = interaction.options.getUser('player');
      if (!targetUser) {
        throw new ValidationError('Please specify a player.');
      }

      const guild = interaction.guild;
      const roomID = guild.id; // Use guild ID as room ID
      const userID = targetUser.id;

      // Check if room exists
      const roomSnapshot = await getRoom(roomID);
      
      if (!roomSnapshot.exists) {
        throw new GameError('No game room exists. Please create a game first with /game create.');
      }

      // Fetch player from database by userID
      const playerDoc = await fetchPlayerForRoom(userID, roomID);
      const playerData = playerDoc.data();
      const dbPlayerName = playerData.name; // Use database name

      if (playerData.isAlive === false) {
        throw new GameError(`<@${targetUser.id}> cannot be placed in open season because they are dead.`);
      }
      
      // Check if player already has open season (using data we already fetched)
      if (playerData.openSeason === true) {
        throw new GameError(`${dbPlayerName} is already in open season.`);
      }

      // Set open season to true
      await setOpenSeasonForPlayer(userID, true, roomID);

      // Broadcast message to general channel
      const announcement = createAnnouncement(
        '🔴 OPEN SEASON DECLARED',
        `**${dbPlayerName}** is now in **OPEN SEASON**!\n\nAll players can now target and kill ${dbPlayerName}.`
      );

      const generalChannel = getChannel(guild, CHANNELS.GENERAL);
      if (generalChannel) {
        await generalChannel.send({ embeds: [announcement] });
      }

      const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS);
      if (gmChannel) {
        await gmChannel.send({ embeds: [announcement] });
      }

      // Reply to interaction
      await interaction.editReply({
        content: `✅ Open season started for **${dbPlayerName}**. All players can now target them.`,
      });

    } catch (error) {
      console.error('Error in openseason start:', error);
      await handleError(error, interaction);
    }
  },
};
