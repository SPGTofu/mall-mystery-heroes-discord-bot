/**
 * /game end command
 * Ends an active game
 */

const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { 
  getRoom, 
  fetchAllPlayersWithScores,
  endGame,
  deleteRoomAndData
} = require('../../services/firebase/dbCallsAdapter');
const { getChannel, deleteChannel } = require('../../services/discord/channels');
const { createEmbed, createAnnouncement } = require('../../services/discord/messages');
const { deleteAllRolesForRoom } = require('../../services/discord/roles');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');

const CLEANUP_DELAY_MS = 5000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function cleanupGameChannels(guild) {
  const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS);
  if (gmChannel) {
    try {
      await deleteChannel(gmChannel);
    } catch (error) {
      console.error('Failed to delete Game Masters channel:', error);
    }
  }

  const dmsCategory = getChannel(guild, CHANNELS.DMS_CATEGORY, 4);
  if (dmsCategory) {
    for (const child of dmsCategory.children.cache.values()) {
      try {
        await deleteChannel(child);
      } catch (error) {
        console.error(`Failed to delete DM channel ${child.name}:`, error);
      }
    }

    try {
      await deleteChannel(dmsCategory);
    } catch (error) {
      console.error('Failed to delete DMs category:', error);
    }
  }
}

module.exports = {
  name: 'end',
  description: 'End an active game',
  async execute(interaction) {
    try {
      // Check GM permissions
      if (!canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters can end a game.');
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const roomID = guild.id; // Use guild ID as room ID

      // Check if room exists
      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        throw new GameError('No game exists yet. Use `/game create` and `/game start` before ending game.');
      }

      const roomData = roomSnapshot.data();
      const isGameActive = Boolean(roomData.isGameActive);

      let allPlayers = [];
      let alivePlayers = [];
      let deadPlayers = [];

      if (isGameActive) {
        // Fetch all players with scores
        await interaction.editReply('Fetching final scores...');
        allPlayers = await fetchAllPlayersWithScores(roomID);

        if (allPlayers.length === 0) {
          throw new GameError('No players found in the game.');
        }

        // Get top players for final scoreboard
        const topPlayers = allPlayers.slice(0, 10);
        alivePlayers = allPlayers.filter(player => player.isAlive);
        deadPlayers = allPlayers.filter(player => !player.isAlive);

        // Format final scoreboard
        let scoreboardText = '';
        topPlayers.forEach((player, index) => {
          const rank = index + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
          const status = player.isAlive ? '✅' : '☠️';
          scoreboardText += `${medal} **${player.name}** - ${player.score} points ${status}\n`;
        });

        if (allPlayers.length > 10) {
          scoreboardText += `\n*Showing top 10 of ${allPlayers.length} total players*`;
        }

        // End the game
        await interaction.editReply('Ending game...');
        await endGame(roomID);

        // Create final scoreboard embed
        const finalScoreboardEmbed = createEmbed({
          title: '🏁 FINAL SCOREBOARD',
          description: scoreboardText || 'No players found.',
          color: 0xff9900, // Orange
          fields: [
            {
              name: 'Game Statistics',
              value: `**Total Players:** ${allPlayers.length}\n**Alive:** ${alivePlayers.length}\n**Eliminated:** ${deadPlayers.length}`,
              inline: false,
            },
          ],
          footer: { text: 'Game has ended' },
          timestamp: new Date(),
        });

        // Broadcast final scoreboard to general channel
        const generalChannel = getChannel(guild, CHANNELS.GENERAL);
        if (generalChannel) {
          const announcement = createAnnouncement(
            '🏁 GAME ENDED!',
            `The game has officially ended!\n\n**Final Results:**\n- Total Players: ${allPlayers.length}\n- Players Still Alive: ${alivePlayers.length}\n- Players Eliminated: ${deadPlayers.length}\n\nCheck the scoreboard below for final rankings! 🎮`
          );
          await generalChannel.send({ embeds: [announcement] });
          await generalChannel.send({ embeds: [finalScoreboardEmbed] });
        }

        await interaction.editReply(
          `✅ Game ended successfully! Final scoreboard has been posted to the general channel.\n\n**Final Stats:**\n- Total Players: ${allPlayers.length}\n- Alive: ${alivePlayers.length}\n- Eliminated: ${deadPlayers.length}\n\n♻️ Post-game cleanup will remove the room and roles shortly.`
        );
      } else {
        await interaction.editReply(
          '⚠️ No active game was found, but the existing room data and roles will now be cleaned up.'
        );
      }

      try {
        await delay(CLEANUP_DELAY_MS);
        await deleteRoomAndData(roomID);
        await cleanupGameChannels(guild);
        await deleteAllRolesForRoom(guild);
        await interaction.followUp({
          content: '♻️ Cleanup complete. Room data has been removed and game roles have been reset.',
          flags: MessageFlags.Ephemeral
        });
      } catch (cleanupError) {
        console.error('Post-game cleanup failed:', cleanupError);
        await interaction.followUp({
          content: '⚠️ Game ended but automatic cleanup failed. Please check logs.',
          flags: MessageFlags.Ephemeral
        });
      }

    } catch (error) {
      console.error('Error in /game end:', error);
      await handleError(error, interaction);
    }
  },
};

