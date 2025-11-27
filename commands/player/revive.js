/**
 * /revive command
 * Revives a dead player and reassigns targets/assassins
 */

const { ApplicationCommandOptionType } = require("discord.js");
const { handleReviveForPlayer } = require("../../services/firebase/dbCallsAdapter");

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
    const roles = member.roles.cache.map(role => role.name);

    const sender = interaction.member;
    const senderRoles = sender.roles.cache.map(role => role.name);

    const gmChannel = interaction.guild.channels.cache.find(ch => ch.name === "game-masters");

    // Only GM can revive
    if (!senderRoles.includes('Game Master')) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `${sender} tried to revive ${playerToRevive}, but they are not a GM.`,
            color: 0xFF0000
          }
        ]
      });

      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: 'You are not a game master.',
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }

    // Cannot revive someone already alive
    if (roles.includes('Alive')) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `${playerToRevive} is already alive.`,
            color: 0xFF0000
          }
        ]
      });

      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: `${playerToRevive} is already alive.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }

    // Cannot revive a GM
    if (roles.includes('Game Master')) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `${playerToRevive} cannot be revived. They are a Game Master.`,
            color: 0xFF0000
          }
        ]
      });

      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: `${playerToRevive} cannot be revived. They are a Game Master.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }

    try {
      const points = interaction.options.getInteger('points') || 0;

      await handleReviveForPlayer(playerToRevive.id, roomID, points);

      // Update Discord roles
      await member.roles.remove('Dead');
      await member.roles.add('Alive');

      return interaction.reply({
        embeds: [
          {
            title: "Success",
            description: `${playerToRevive} has been revived with ${points} points!`,
            color: 0x00ff00
          }
        ],
        flags: ['Ephemeral']
      });

    } catch (e) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `An error occurred reviving ${playerToRevive}: ${e}`,
            color: 0xFF0000
          }
        ]
      });
      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: `An error occurred reviving ${playerToRevive}: ${e}`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }
  },
};

