/**
 * /unalive command
 * Marks a player as dead (requires confirmation reaction)
 */

const { ApplicationCommandOptionType } = require("discord.js");
const { killPlayerForRoom, getRoom, fetchPlayerByUserIdForRoom } = require("../../services/firebase/dbCallsAdapter");
const { hasRole } = require("../../services/discord/permissions");
const { ROLES } = require("../../config/roles");
const { createErrorAnnouncement, createAnnouncement, createEmbed } = require("../../services/discord/messages");
const { removeRole, assignRole } = require("../../services/discord/roles");
const { GameError } = require("../../utils/errors");
const {
  getDmsCategory,
  notifyPlayerEliminated,
  remapAndNotifyTargets,
  dedupeIds,
} = require("../../services/game/playerTargetUpdates");
const { getChannel } = require("../../services/discord/channels");
const CHANNELS = require("../../config/channels");

module.exports = {
  name: 'unalive',
  description: 'Mark a player as dead',
  options: [
    {
      name: 'player',
      description: 'name of the player to mark as dead',
      type: ApplicationCommandOptionType.User,
      required: true
    }
  ],
  async execute(interaction) {
    const playerToBeDead = interaction.options.getUser('player');
    const roomID = interaction.guildId;
    const member = await interaction.guild.members.fetch(playerToBeDead.id);
    const gmChannel = interaction.guild.channels.cache.find(ch => ch.name === "game-masters");
    const sender = interaction.member

    // Check if room/game exists
    const roomSnapshot = await getRoom(roomID);
    if (!roomSnapshot.exists) {
      throw new GameError('No game has been created yet.');
    }
    const roomData = roomSnapshot.data() || {};
    if (!roomData.isGameActive) {
      throw new GameError('The game has not started yet. Use `/game start` before unaliving.');
    }

    // Only GM can mark unalive
    if (!hasRole(sender, ROLES.GAME_MASTER)) {
      const gmMessage = createErrorAnnouncement(`${sender} tried to kill ${playerToBeDead}, but they are not a GM.`);
      await gmChannel.send({ embeds: [gmMessage] });
      return interaction.reply({ embeds: [gmMessage], flags: ['Ephemeral'] });
    }

    // Cannot kill someone already dead
    if (hasRole(member, ROLES.DEAD)) {
      const message = createErrorAnnouncement(`${playerToBeDead} is already dead.`);
      await gmChannel.send({ embeds: [message] });
      message = createErrorAnnouncement(`${playerToBeDead} is already dead.`);
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }

    // Cannot unalive a GM
    if (hasRole(member, ROLES.GAME_MASTER)) {
      const message = createErrorAnnouncement(`${playerToBeDead} cannot be unalived. They are a Game Master.`);
      await gmChannel.send({ embeds: [message] });
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }

    try {
      let targetPlayerDoc;
      try {
        targetPlayerDoc = await fetchPlayerByUserIdForRoom(playerToBeDead.id, roomID);
      } catch (error) {
        const message = createErrorAnnouncement(`${playerToBeDead} is not registered in this game.`);
        await gmChannel.send({ embeds: [message] });
        return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
      }

      const targetPlayerData = targetPlayerDoc.data();
      const targetDbName = targetPlayerData.name || playerToBeDead.username;

      await killPlayerForRoom(playerToBeDead.id, roomID);

      // change status of user on Discord
      await removeRole(member, ROLES.ALIVE);
      await assignRole(member, ROLES.DEAD);
      const message = createAnnouncement('Player Update', `${playerToBeDead} has been killed`);

      await interaction.reply({ embeds: [message], flags: ['Ephemeral'] });

      const eliminationEmbed = createEmbed({
        title: '⚔️ Player Eliminated',
        description: `${playerToBeDead} has been eliminated from the game. Targets have been reassigned.`,
        color: 0xff4500,
        timestamp: true,
      });

      const generalChannel = getChannel(interaction.guild, CHANNELS.GENERAL);
      if (generalChannel) {
        await generalChannel.send({ embeds: [eliminationEmbed] });
      }

      if (gmChannel) {
        await gmChannel.send({ embeds: [eliminationEmbed] });
      }

      const dmsCategory = getDmsCategory(interaction.guild);
      await notifyPlayerEliminated(dmsCategory, playerToBeDead.id, targetDbName);
      const playersNeedingTargets = dedupeIds(targetPlayerData.assassins || []);
      const playersNeedingAssassins = dedupeIds(targetPlayerData.targets || []);
      await remapAndNotifyTargets({
        guild: interaction.guild,
        roomID,
        playersNeedingTargets,
        playersNeedingAssassins,
        dmsCategoryOverride: dmsCategory,
      });
    } catch (e) {
      const message = createErrorAnnouncement(`An error occurred killing ${playerToBeDead}: ${e}`);
      await gmChannel.send({ embeds: [message] });
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }
  },
};
