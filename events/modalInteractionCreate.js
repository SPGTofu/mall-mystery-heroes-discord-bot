/**
 * Modal interaction handler
 * Processes modal submissions for task creation
 */

const { EmbedBuilder } = require('discord.js');
const { createTask } = require('../services/firebase/taskService');
const GAME_RULES = require('../config/gameRules');
const CHANNELS = require('../config/channels');
const { getOrCreateChannel } = require('../services/discord/channels');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'task_create_modal') {
      try {
        // Extract modal input values
        const taskName = interaction.fields.getTextInputValue('task_name_input');
        const taskDescription = interaction.fields.getTextInputValue('task_description_input');
        const taskTypeInput = interaction.fields.getTextInputValue('task_type_input') || 'N';
        const maxCompletersStr = interaction.fields.getTextInputValue('max_completers_input');
        const pointsStr = interaction.fields.getTextInputValue('points_input');

        // Parse integers with defaults
        const maxCompleters = parseInt(maxCompletersStr) || GAME_RULES.TASK.DEFAULT_MAX_COMPLETERS;
        const points = parseInt(pointsStr) || GAME_RULES.TASK.DEFAULT_POINTS;

        // Convert task type input (N or R) to normal/revival
        const taskType = taskTypeInput.toUpperCase() === 'R' ? 'revival' : 'normal';

        // Validate task data
        if (!taskName || taskName.length === 0) {
          return await interaction.reply({
            content: '❌ Task name is required.',
            ephemeral: true,
          });
        }
        if (taskName.length > 100) {
          return await interaction.reply({
            content: '❌ Task name must be 100 characters or less.',
            ephemeral: true,
          });
        }
        if (!taskDescription || taskDescription.length === 0) {
          return await interaction.reply({
            content: '❌ Task description is required.',
            ephemeral: true,
          });
        }
        if (taskDescription.length > 500) {
          return await interaction.reply({
            content: '❌ Task description must be 500 characters or less.',
            ephemeral: true,
          });
        }
        if (maxCompleters < 1 || maxCompleters > 100) {
          return await interaction.reply({
            content: '❌ Max completers must be between 1 and 100.',
            ephemeral: true,
          });
        }
        if (points < 0 || points > 100) {
          return await interaction.reply({
            content: '❌ Points must be between 0 and 100.',
            ephemeral: true,
          });
        }

        // Create task object matching database schema
        const newTask = {
          name: taskName,
          description: taskDescription,
          type: taskType,
          maxCompleters: maxCompleters,
          points: points,
          isComplete: false,
          completedBy: [],
          titleTrimmedLowerCase: taskName.replace(/\s/g, '').toLowerCase(),
        };

        // Defer reply to avoid "the application did not respond" for long ops
        await interaction.deferReply({ ephemeral: true });

        // Save to backend with gameId (use guildId as gameId since one game per guild)
        const taskId = await createTask(interaction.guildId, interaction.guildId, newTask);

        // Get general channel
        const generalChannel = interaction.guild.channels.cache.find(
          channel => channel.name === 'general' && channel.isTextBased()
        );

        // Create condensed announcement embed
        let taskTitle = 'New Task';
        if (taskType === 'revival') {
          taskTitle = 'New Revival Mission';
        }

        const announcementEmbed = new EmbedBuilder()
          .setColor('#00AA00')
          .setTitle(`🎯 ${taskTitle}: ${taskName}`)
          .setDescription(taskDescription)
          .addFields(
            { name: 'Points Reward', value: `${points} pts`, inline: false },
            { name: 'Max Completers', value: `${maxCompleters}`, inline: false }
          )
          .setTimestamp();

        // Send announcement to general channel (single public message)
        if (generalChannel) {
          await generalChannel.send({ embeds: [announcementEmbed] });
        }

        // Send confirmation to the game-masters channel (GM-only visible channel)
        const confirmEmbed = new EmbedBuilder()
          .setColor('#00AA00')
          .setTitle('✅ Task Created Successfully')
          .addFields(
            { name: 'Task Name', value: `**${taskName}**` },
            { name: 'Task ID', value: `\`${taskId}\`` },
            { name: 'Type', value: taskType === 'normal' ? 'Normal Task' : 'Revival Mission' },
            { name: 'Status', value: 'Task has been posted' }
          )
          .setTimestamp();

        try {
          // Ensure the game-masters channel exists (create if necessary)
          const gmChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GAME_MASTERS);
          console.log('Found/created gmChannel:', gmChannel?.name, 'id:', gmChannel?.id);
          if (gmChannel && gmChannel.isTextBased()) {
            console.log('Sending confirmation to gmChannel');
            // Ensure bot has send permission; if not, try to set permission overwrites for the bot
            try {
              const botMember = interaction.guild.members.me;
              const perms = gmChannel.permissionsFor(botMember);
              if (!perms || !perms.has('SendMessages')) {
                console.log('Bot missing SendMessages on gmChannel, attempting to set permission overwrite');
                try {
                  await gmChannel.permissionOverwrites.edit(botMember, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                  });
                  console.log('Permission overwrite updated for bot on gmChannel');
                } catch (permErr) {
                  console.warn('Failed to set permission overwrites for bot on gmChannel:', permErr.message || permErr);
                }
              }
            } catch (permCheckErr) {
              console.warn('Error checking/setting bot permissions on gmChannel:', permCheckErr.message || permCheckErr);
            }

            try {
              await gmChannel.send({ embeds: [confirmEmbed] });
              console.log('Sent confirmation to gmChannel');
              await interaction.editReply({ content: `Posted confirmation to **${CHANNELS.GAME_MASTERS}**.` });
            } catch (sendErr) {
              console.error('Failed to send confirmation to gmChannel:', sendErr);
              // Fallback: edit deferred reply with the embed for the GM
              await interaction.editReply({ embeds: [confirmEmbed] });
            }
          } else {
            console.warn('game-masters channel not available or not text-based');
            // Fallback: edit deferred reply with the embed for the GM
            await interaction.editReply({ embeds: [confirmEmbed] });
          }
        } catch (err) {
          console.error('Error sending confirmation to game-masters channel:', err);
          // Fallback: edit deferred reply with the embed for the GM
          await interaction.editReply({ embeds: [confirmEmbed] });
        }

      } catch (error) {
        console.error('Error processing task create modal:', error);
        await interaction.reply({
          content: `❌ An error occurred while creating the task: ${error.message}`,
          ephemeral: true,
        });
      }
    }
  },
};

// Mark this module as an internal handler so it won't be auto-registered as a top-level event
module.exports._skipRegister = true;
