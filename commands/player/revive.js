/**
 * /revive command
 * Revives a dead player and reassigns targets/assassins
 */

const { ApplicationCommandOptionType } = require("discord.js");
const { handleReviveForPlayer, getRoom } = require("../../services/firebase/dbCallsAdapter");
const { createAnnouncement, createErrorAnnouncement } = require("../../services/discord/messages");
const { hasRole } = require("../../services/discord/permissions");
const { ROLES } = require("../../config/roles");
const { removeRole, assignRole } = require("../../services/discord/roles");
const { GameError } = require("../../utils/errors");

module.exports = {
  name: 'revive',
  description: 'Revive a dead player',
  options: [
    {
      name: 'player',
      description: 'name of the player to revive',
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'points',
      description: '(optional) amount of points to revive with',
      type: ApplicationCommandOptionType.Integer,
      required: false
    }
  ],
  async execute(interaction) {

    const playerToRevive = interaction.options.getUser('player');
    const roomID = interaction.guildId;

    const member = await interaction.guild.members.fetch(playerToRevive.id);

    const sender = interaction.member;

    const gmChannel = interaction.guild.channels.cache.find(ch => ch.name === "game-masters");

    // Check if room/game exists
    const roomSnapshot = await getRoom(roomID);
    if (!roomSnapshot.exists) {
      throw new GameError('No game has been created yet.');
    }

    // Only GM can revive
    if (!hasRole(sender, ROLES.GAME_MASTER)) {
      const message = createErrorAnnouncement(`${sender} tried to revive ${playerToRevive}, but they are not a GM.`);
      await gmChannel.send({ embeds: [message]});
      const userError = createErrorAnnouncement('You are not a game master.');
      return interaction.reply({ embeds: [userError] });
    }

    // Cannot revive someone already alive
    if (hasRole(member, ROLES.ALIVE)) {
      const message = createErrorAnnouncement(`${playerToRevive} is already alive.`);
      await gmChannel.send({ embeds: [message] });
      const replyMessage = createErrorAnnouncement(`${playerToRevive} is already alive.`);
      return interaction.reply({ embeds: [replyMessage], flags: ['Ephemeral'] });
    }

    // Cannot revive someone not dead
    if (!hasRole(member, ROLES.DEAD)) {
      const message = createErrorAnnouncement(`${playerToRevive} is not dead.`);
      await gmChannel.send({ embeds: [message] });
      const replyMessage = createErrorAnnouncement(`${playerToRevive} is not dead.`);
      return interaction.reply({ embeds: [replyMessage], flags: ['Ephemeral'] });
    }

    // Cannot revive someone not a player
    if (!hasRole(member, ROLES.PLAYER)) {
      const message = createErrorAnnouncement(`${playerToRevive} is not a player.`);
      await gmChannel.send({ embeds: [message] });
      const replyMessage = createErrorAnnouncement(`${playerToRevive} is not a player.`);
      return interaction.reply({ embeds: [replyMessage], flags: ['Ephemeral'] });
    }

    // Cannot revive a GM
    if (hasRole(member, ROLES.GAME_MASTER)) {
      const message = createErrorAnnouncement(`${playerToRevive} cannot be revived. They are a Game Master.`);
      await gmChannel.send({ embeds: [message] });
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }

    try {
      const points = interaction.options.getInteger('points') || 0;

      await handleReviveForPlayer(playerToRevive.id, roomID, points);

      // Update Discord roles
      await removeRole(member, ROLES.DEAD);
      await assignRole(member, ROLES.ALIVE);

      const message = createAnnouncement('Success', `${playerToRevive} has been revived with ${points} points!`);
      await gmChannel.send({ embeds: [message] })
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });

    } catch (e) {
      const message = createErrorAnnouncement(`An error occurred reviving ${playerToRevive}: ${e}`);
      await gmChannel.send({ embeds: [message] });
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }
  },
};
