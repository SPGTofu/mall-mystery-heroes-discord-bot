/**
 * /openseason end command
 * Ends open season on a player
 */

const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, ValidationError, handleError } = require('../../utils/errors');
const { getRoom, fetchPlayerForRoom, setOpenSeasonForPlayer } = require('../../services/firebase/dbCallsAdapter');
const { getChannel } = require('../../services/discord/channels');
const { createAnnouncement } = require('../../services/discord/messages');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');

module.exports = {
  name: 'end',
  description: 'End open season on a player',
  options: [
    {
      type: 6, // USER type
      name: 'player',
      description: 'The player to remove from open season',
      required: true,
    },
  ],
  async execute(interaction) {
    try {
      // Check GM permissions
      if (!canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters can end open season.');
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
      
      // Check if player is NOT in open season (using data we already fetched)
      if (playerData.openSeason !== true) {
        throw new GameError(`${dbPlayerName} is not in open season.`);
      }

      // Set open season to false
      await setOpenSeasonForPlayer(userID, false, roomID);

      // Broadcast message to general channel
      const generalChannel = getChannel(guild, CHANNELS.GENERAL);
      if (generalChannel) {
        const announcement = createAnnouncement(
          '🟢 OPEN SEASON ENDED',
          `**${dbPlayerName}** is no longer in **OPEN SEASON**.\n\nPlayers can no longer freely target ${dbPlayerName}.`
        );
        await generalChannel.send({ embeds: [announcement] });
      }

      // Reply to interaction
      await interaction.editReply({
        content: `✅ Open season ended for **${dbPlayerName}**. Players can no longer freely target them.`,
      });

    } catch (error) {
      console.error('Error in openseason end:', error);
      await handleError(error, interaction);
    }
  },
};

