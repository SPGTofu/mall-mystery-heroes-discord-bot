/**
 * /player command
 * Fetches player data for Game Masters
 */

const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const { fetchAllPlayersForRoom, fetchPlayerByUserIdForRoom, getRoom } = require('../../services/firebase/dbCallsAdapter');
const { canPerformGMActions } = require('../../utils/permissions');
const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { createEmbed } = require('../../services/discord/messages');
const CHANNELS = require('../../config/channels');

/**
 * Formats an array of player names into a string that fits embed limits
 * @param {Array<string>} entries
 * @returns {string}
 */
function formatList(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'None';
  }

  const joined = entries.join(', ');
  if (joined.length <= 1024) {
    return joined;
  }

  const truncated = entries.slice(0, 20);
  const suffix = entries.length > 20 ? ` (+${entries.length - 20} more)` : '';
  return `${truncated.join(', ')}${suffix}`;
}

/**
 * Builds a Discord embed for the provided player record
 * @param {Object} player
 * @returns {import('discord.js').EmbedBuilder}
 */
function buildPlayerEmbed(player) {
  const alive = typeof player.isAlive === 'boolean'
    ? player.isAlive
    : player.status === 'alive';
  const points = Number.isFinite(Number(player.score))
    ? Number(player.score)
    : Number(player.points ?? 0);

  let footerText = 'Player data';
  const updatedAt = player.updatedAt?.toDate?.() ?? player.updatedAt;
  if (updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime())) {
    footerText = `Last updated ${updatedAt.toLocaleString()}`;
  }

  return createEmbed({
    title: `Player Report: ${player.name || 'Unknown'}`,
    color: alive ? 0x1abc9c : 0xe74c3c,
    fields: [
      { name: 'Points', value: points.toString(), inline: true },
      { name: 'Alive Status', value: alive ? '✅ Alive' : '☠️ Dead', inline: true },
      { name: 'Open Season', value: player.openSeason ? 'Yes' : 'No', inline: true },
      { name: 'Targets', value: formatList(player.targets), inline: false },
      { name: 'Assassins', value: formatList(player.assassins), inline: false },
    ],
    footer: { text: footerText },
  });
}

/**
 * Splits an array into chunks
 * @param {Array<any>} array
 * @param {number} size
 * @returns {Array<Array<any>>}
 */
function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Maps a Firestore document to a simple object
 * @param {FirebaseFirestore.QueryDocumentSnapshot} doc
 * @returns {Object}
 */
function mapPlayerDoc(doc) {
  if (!doc) return {};
  return {
    id: doc.id,
    ...doc.data(),
  };
}

module.exports = {
  name: 'player',
  description: 'Fetch player information for Game Masters',
  options: [
    {
      name: 'player',
      description: 'Mention a player or use @everyone to fetch all players',
      type: ApplicationCommandOptionType.Mentionable,
      required: true,
    },
  ],
  async execute(interaction) {
    try {
      if (!interaction.guild) {
        throw new GameError('This command can only be used inside a server.');
      }

      if (!canPerformGMActions(interaction.member)) {
        throw new PermissionError('Only Game Masters or Admins can fetch player data.');
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const mentionable = interaction.options.getMentionable('player', true);
      const roomID = interaction.guildId;

      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        throw new GameError('No game exists yet. Ask a GM to run `/game create` first.');
      }
      const gmChannel = interaction.guild.channels.cache.find(
        channel =>
          channel.type === 0 &&
          channel.name.toLowerCase() === CHANNELS.GAME_MASTERS.toLowerCase()
      );

      if (!gmChannel) {
        throw new GameError('Unable to locate the Game Masters channel.');
      }

      const isRoleMention =
        mentionable &&
        typeof mentionable === 'object' &&
        'members' in mentionable &&
        typeof mentionable.members === 'object';
      const isEveryone = isRoleMention && mentionable.id === interaction.guild.id;

      let playerDocs = [];

      if (isEveryone) {
        playerDocs = await fetchAllPlayersForRoom(roomID);
        if (!playerDocs.length) {
          throw new GameError('No players have joined this game yet.');
        }
      } else if (isRoleMention) {
        throw new GameError('Please mention a specific player or @everyone.');
      } else {
        const userId = mentionable?.user?.id ?? mentionable?.id;
        if (!userId) {
          throw new GameError('Unable to determine which player you selected.');
        }
        try {
          const playerDoc = await fetchPlayerByUserIdForRoom(userId, roomID);
          playerDocs = [playerDoc];
        } catch (err) {
          throw new GameError('That user is not registered as a player in this game.');
        }
      }

      const playerRecords = playerDocs.map(mapPlayerDoc);
      const embeds = playerRecords.map(buildPlayerEmbed);

      const headerText = isEveryone
        ? `📊 Player report for **all players** requested by ${interaction.user}.`
        : `📊 Player report for **${playerRecords[0].name || 'Unknown'}** requested by ${interaction.user}.`;

      await gmChannel.send({ content: headerText });

      const batchedEmbeds = chunk(embeds, 10);
      for (const embedBatch of batchedEmbeds) {
        await gmChannel.send({ embeds: embedBatch });
      }

      const confirmation = isEveryone
        ? `Sent ${playerRecords.length} player reports to ${gmChannel}.`
        : `Sent player data for ${playerRecords[0].name || 'that player'} to ${gmChannel}.`;

      await interaction.editReply({ content: confirmation });
    } catch (error) {
      console.error('Error running /player:', error);
      await handleError(error, interaction);
    }
  },
};

