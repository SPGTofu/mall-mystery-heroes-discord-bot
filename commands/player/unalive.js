/**
 * /unalive command
 * Marks a player as dead (requires confirmation reaction)
 */

const { ApplicationCommandOptionType } = require("discord.js");
const { killPlayerForRoom } = require("../../services/firebase/dbCallsAdapter");
const { hasRole } = require("../../services/discord/permissions");
const { ROLES } = require("../../config/roles");
const { createErrorAnnouncement, createAnnouncement } = require("../../services/discord/messages");
const { removeRole, assignRole } = require("../../services/discord/roles");

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

    // Only GM can revive
    if (!hasRole(sender, ROLES.GAME_MASTER)) {
      const message = createErrorAnnouncement(`${sender} tried to kill ${playerToBeDead}, but they are not a GM.`);
      await gmChannel.send({ embeds: [message] })
      message = 'You are not a Game Master'
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
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
      const message = createErrorAnnouncement(`${playerToRevive} cannot be unalived. They are a Game Master.`);
      await gmChannel.send({ embeds: [message] });
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }

    try {
      await killPlayerForRoom(playerToBeDead.id, roomID);

      // change status of user on Discord
      await removeRole(member, ROLES.ALIVE);
      await assignRole(member, ROLES.DEAD);
      const message = createAnnouncement('Player Update', `${playerToBeDead} has been killed`);

      await interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    } catch (e) {
      const message = createErrorAnnouncement(`An error occurred killing ${playerToBeDead}: ${e}`);
      await gmChannel.send({ embeds: [message] });
      return interaction.reply({ embeds: [message], flags: ['Ephemeral'] });
    }
  },
};

