/**
 * /unalive command
 * Marks a player as dead (requires confirmation reaction)
 */

const { ApplicationCommandOptionType } = require("discord.js");
const { killPlayerForRoom } = require("../../services/firebase/dbCallsAdapter");

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
    const playerId = await interaction.guild.members.fetch(playerToBeDead.id);
    const roles = playerId.roles.cache.map(role => role.name);
    const gmChannel = interaction.guild.channels.cache.find(ch => ch.name === "game-masters");
    const senderRoles = interaction.member.roles.cache.map(role => role.name);
    const sender = interaction.member

    console.log('sender: ', sender, senderRoles);
    // check if sender is game master
    if (!senderRoles.includes('Game Master')) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `${sender} tried to kill ${playerToBeDead}, but they are not a GM.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      })
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

    // if 'alive' role, add 'dead' status. Else, error
    if (roles.includes('dead')) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `${playerToBeDead} is already dead.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: `${playerToBeDead} is already dead.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }
    // if 'Game Master' cannot be killed
    if (roles.includes('Game Master')) {
      await gmChannel.send({
        embeds: [
          {
            title: "Error",
            description: `${playerToBeDead} cannot be killed. They are a Game Master.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: `${playerToBeDead} cannot be killed. They are a Game Master.`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }

    try {
      // TODO: finish once implemented
      await killPlayerForRoom(playerToBeDead.username, roomID);

      // change status of user on Discord
      await playerId.roles.remove('Alive');
      await playerId.roles.add('Dead');
      await interaction.reply({
        embeds: [
          {
            title: "Error",
            descripiton: `${playerToBeDead} has been killed`,
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
            description: `An error occurred killing ${playerToBeDead}: ${e}`,
            color: 0xFF0000
          }
        ]
      });
      return interaction.reply({
        embeds: [
          {
            title: "Error",
            description: `An error occurred killing ${playerToBeDead}: ${e}`,
            color: 0xFF0000
          }
        ],
        flags: ['Ephemeral']
      });
    }
  },
};

