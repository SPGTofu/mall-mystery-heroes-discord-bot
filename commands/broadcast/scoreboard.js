/**
 * /scoreboard command
 * Displays the current game scoreboard
 */

const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { canPerformGMActions } = require('../../utils/permissions');
const { getRoom, fetchAllPlayersWithScores } = require('../../services/firebase/dbCallsAdapter');
const { getChannel } = require('../../services/discord/channels');
const { createEmbed } = require('../../services/discord/messages');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');

module.exports = {
  name: 'scoreboard',
  description: 'Display the game scoreboard',
  options: [
    {
      name: 'k-rank',
      description: 'Number of top players to show (default: 10)',
      type: 4, // INTEGER
      required: false,
    },
    {
      name: 'broadcast',
      description: 'Broadcast to general channel (default: off)',
      type: 3, // STRING
      required: false,
      choices: [
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' },
      ],
    },
  ],
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const roomID = guild.id;

      // Check if room/game exists
      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        throw new GameError('No game exists yet. Use `/game create` and `/game start` before using `/game` commands.');
      }

      // Get options
      const kRank = interaction.options.getInteger('k-rank') || 10;
      const broadcastOption = interaction.options.getString('broadcast') || 'off';
      const shouldBroadcast = broadcastOption === 'on';

      // Check if user has permission to broadcast (only GMs and Admins)
      if (shouldBroadcast && !canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters and Admins can broadcast the scoreboard to the general channel.');
      }

      // Fetch all players with scores
      const allPlayers = await fetchAllPlayersWithScores(roomID);

      // Filter to only alive players
      const alivePlayers = allPlayers.filter(player => player.isAlive);

      if (alivePlayers.length === 0) {
        throw new GameError('No alive players found in the game.');
      }

      // Take top k players
      const topPlayers = alivePlayers.slice(0, kRank);

      // Format scoreboard (only alive players, so no need for status indicator)
      let scoreboardText = '';
      topPlayers.forEach((player, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        scoreboardText += `${medal} **${player.name}** - ${player.score} points\n`;
      });

      // If there are more alive players than k, show total count
      if (alivePlayers.length > kRank) {
        scoreboardText += `\n*Showing top ${kRank} of ${alivePlayers.length} alive players*`;
      }

      const scoreboardEmbed = createEmbed({
        title: '📊 Scoreboard',
        description: scoreboardText || 'No players found.',
        color: 0x0099ff,
        footer: { text: shouldBroadcast ? 'Broadcast to general channel' : 'Private scoreboard' },
        timestamp: new Date(),
      });

      if (shouldBroadcast) {
        // Broadcast to general channel
        const generalChannel = getChannel(guild, CHANNELS.GENERAL);
        if (generalChannel) {
          await generalChannel.send({ embeds: [scoreboardEmbed] });
          await interaction.reply({
            content: '✅ Scoreboard broadcasted to general channel.',
            flags: MessageFlags.Ephemeral,
          });
        } else {
          throw new GameError('General channel not found. Cannot broadcast scoreboard.');
        }
      } else {
        // Send as ephemeral (whisper to individual)
        await interaction.reply({
          embeds: [scoreboardEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

    } catch (error) {
      console.error('Error in /scoreboard:', error);
      await handleError(error, interaction);
    }
  },
};

