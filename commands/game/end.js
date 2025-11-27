/**
 * /game end command
 * Ends an active game
 */

const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { 
  getRoom, 
  fetchAllPlayersWithScores,
  endGame 
} = require('../../services/firebase/dbCallsAdapter');
const { getChannel } = require('../../services/discord/channels');
const { createEmbed, createAnnouncement } = require('../../services/discord/messages');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');

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
        throw new GameError('No game room exists. Please create a game first with /game create.');
      }

      // Check if game is active
      const roomData = roomSnapshot.data();
      if (!roomData.isGameActive) {
        throw new GameError('The game is not currently active. No game to end.');
      }

      // Fetch all players with scores
      await interaction.editReply('Fetching final scores...');
      const allPlayers = await fetchAllPlayersWithScores(roomID);

      if (allPlayers.length === 0) {
        throw new GameError('No players found in the game.');
      }

      // Get top players for final scoreboard
      const topPlayers = allPlayers.slice(0, 10);
      const alivePlayers = allPlayers.filter(player => player.isAlive);
      const deadPlayers = allPlayers.filter(player => !player.isAlive);

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
        `✅ Game ended successfully! Final scoreboard has been posted to the general channel.\n\n**Final Stats:**\n- Total Players: ${allPlayers.length}\n- Alive: ${alivePlayers.length}\n- Eliminated: ${deadPlayers.length}`
      );

    } catch (error) {
      console.error('Error in /game end:', error);
      await handleError(error, interaction);
    }
  },
};

