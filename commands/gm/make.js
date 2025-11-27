/**
 * /gm make command
 * Promotes a user to Game Master by assigning the GM role
 */

const { ApplicationCommandOptionType, PermissionFlagsBits, DiscordAPIError } = require('discord.js');
const { canPerformAdminActions } = require('../../utils/permissions');
const { PermissionError, ValidationError } = require('../../utils/errors');
const { ROLES } = require('../../config/roles');
const { getOrCreateGameMasterRole } = require('../../services/discord/roles');

module.exports = {
  name: 'make',
  description: 'Promote a user to Game Master',
  options: [
    {
      name: 'target',
      description: 'User to promote to Game Master',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  async execute(interaction) {
    if (!interaction.guild) {
      throw new ValidationError('This command can only be used inside a server.');
    }

    await interaction.deferReply({ ephemeral: true });

    if (!canPerformAdminActions(interaction.member)) {
      throw new PermissionError('Only Discord administrators can promote Game Masters.');
    }

    const targetUser = interaction.options.getUser('target', true);
    const guild = interaction.guild;
    const botMember = guild.members.me ?? await guild.members.fetchMe();

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new ValidationError('I need the Manage Roles permission to promote Game Masters.');
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      throw new ValidationError('Unable to find that member in this server.');
    }

    // Remove all editable roles (except @everyone) to reset their state
    const removableRoles = targetMember.roles.cache.filter(
      role => role.id !== guild.id && role.editable
    );

    const gmRole = await getOrCreateGameMasterRole(guild);

    try {
      await guild.members.fetch();

      const formerGMList = guild.members.cache
        .filter(member => member.roles.cache.has(gmRole.id) && member.id !== targetMember.id)
        .map(member => member);

      if (removableRoles.size > 0) {
        await targetMember.roles.remove(removableRoles);
      }

      if (formerGMList.length > 0) {
        await Promise.all(formerGMList.map(member => member.roles.remove(gmRole)));
        const demotionNotice = `You are no longer the active Game Master on **${guild.name}**!`;
        await Promise.all(
          formerGMList.map(member =>
            member.send(demotionNotice).catch(() => null)
          )
        );
      }

      await targetMember.roles.add(gmRole);
      await targetMember
        .send(`You have been promoted to Game Master on **${guild.name}**!`)
        .catch(() => null);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 50013) {
        throw new ValidationError(
          'Discord denied the role change. Move my role higher in the hierarchy so I can manage that member.'
        );
      }
      throw error;
    }

    await interaction.editReply({
      content: `${targetMember} is now the Game Master.`,
    });
  },
};

