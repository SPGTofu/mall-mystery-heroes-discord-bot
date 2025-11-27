/**
 * /kill command
 * Records an assassination/kill
 */

const { isGameMaster, hasRole } = require('../../services/discord/permissions');
const { createEmbed, createAnnouncement, createErrorAnnouncement } = require('../../services/discord/messages');
const { ROLES } = require('../../config/roles');
const CHANNELS = require('../../config/channels');
const { getChannel } = require('../../services/discord/channels');
const { ApplicationCommandOptionType } = require("discord.js");
const { fetchTargetsForPlayer,
    fetchPointsForPlayerInRoom,
    updatePointsForPlayer,
    killPlayerForRoom,
    updateLogsForRoom } = require('../../services/firebase/dbCallsAdapter');

module.exports = {
  name: 'kill',
  description: 'Record an assassination',
  options: [
    {
        name: 'assassin',
        description: 'The assassin',
        type: ApplicationCommandOptionType.User,
        required: true
    },
    {
        name: 'target',
        description: 'The target',
        type: ApplicationCommandOptionType.User,
        required: true
    }
  ],

  async execute(interaction) {
    try {
      // 1. Parse command options for assassin and target users
      const assassin = interaction.options.getUser('assassin');
      const target = interaction.options.getUser('target');
      const assassinName = assassin.username;
      const targetName = target.username;

      if (!assassinName || !targetName) {
        return interaction.reply({
          content: 'You must mention both an assassin (@assassin) and a target (@target).',
          ephemeral: true
        });
      }

      // 2. Check if user has GM permission
      if (!isGameMaster(interaction.member)) {
        return interaction.reply({
          content: 'Only a Game Master can use this command.',
          ephemeral: true
        });
      }

      const roomID = interaction.guildId;
      const guild = interaction.guild;
      const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS);

      // 3. Get the Discord guild members
      const assassinMember = await interaction.options.getMember('assassin');
      const targetMember = interaction.options.getMember('assassin');

      if (!assassinMember) {
        return interaction.reply({
          content: `Could not find Discord member for "${assassinName}".`,
          ephemeral: true
        });
      }

      if (!targetMember) {
        return interaction.reply({
          content: `Could not find Discord member for "${targetName}".`,
          ephemeral: true
        });
      }

      // 4. Check if @target and @assassin have 'Alive' roles
      if (!hasRole(assassinMember, ROLES.ALIVE)) {
        return interaction.reply({
          content: `${assassinName} is not alive.`,
          ephemeral: true
        });
      }

      if (!hasRole(targetMember, ROLES.ALIVE)) {
        return interaction.reply({
          content: `${targetName} is not alive.`,
          ephemeral: true
        });
      }

      // 5. Validate kill (Check if kill makes sense with Firebase)
      // Check if assassin has target in their targets list
      const assassinTargets = await fetchTargetsForPlayer(assassinName, roomID);
      if (!assassinTargets.includes(targetName)) {
        const message = createErrorAnnouncement(`<@${assassin.id}> does not have <@${target.id}> as a target. Kill not valid.`);
        await gmChannel.send({ embeds: [message] })
      }

      // 6. Get current points
      const assassinPoints = await fetchPointsForPlayerInRoom(assassinName, roomID);
      const targetPoints = await fetchPointsForPlayerInRoom(targetName, roomID);

      // 7. Give assassin points (transfer target's points to assassin)
      await updatePointsForPlayer(assassinName, targetPoints, roomID);

      // 8. Unalive player, set target's points to 0, and reset targets/assassins
      await killPlayerForRoom(targetName, roomID);

      // 9. Update Discord roles
      const aliveRole = interaction.guild.roles.cache.find(role => role.name === ROLES.ALIVE);
      const deadRole = interaction.guild.roles.cache.find(role => role.name === ROLES.DEAD);

      await targetMember.roles.remove(aliveRole);
      await targetMember.roles.add(deadRole);

      // 10. Log the kill in Firebase
      await updateLogsForRoom(
        `${assassinName} assassinated ${targetName}! ${assassinName} gained ${targetPoints} points.`,
        'red',
        roomID
      );

      // 11. Broadcast a message to the general chat
      const generalChannel = interaction.guild.channels.cache.find(
        channel => channel.name === CHANNELS.GENERAL
      );

      const killEmbed = createEmbed({
        title: '💀 Assassination!',
        description: `**${assassinName}** has assassinated **${targetName}**!`,
        color: 0xff0000, // Red
        fields: [
          { name: 'Points Transferred', value: `${targetPoints} points`, inline: true },
          { name: 'Assassin New Total', value: `${assassinPoints + targetPoints} points`, inline: true },
        ],
        timestamp: true,
      });

      if (generalChannel) {
        await generalChannel.send({ embeds: [killEmbed] });
      }

      // Reply to the interaction
      await interaction.reply({
        content: `✅ Kill recorded! ${assassinName} assassinated ${targetName}.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling /kill command:', error);
      await interaction.reply({
        content: `Error recording kill: ${error.message}`,
        ephemeral: true
      });
    }
  },
};

