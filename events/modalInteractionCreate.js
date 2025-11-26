/**
 * Modal interaction handler
 * Processes modal submissions for task creation
 */

const { EmbedBuilder } = require('discord.js');
const { createTask } = require('../services/firebase/taskService');
const GAME_RULES = require('../config/gameRules');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'task_create_modal') {
      try {
        // Extract modal input values
        const taskName = interaction.fields.getTextInputValue('task_name_input');
        const taskDescription = interaction.fields.getTextInputValue('task_description_input');
        const taskType = interaction.fields.getTextInputValue('task_type_input') || 'standard';
        const maxCompletersStr = interaction.fields.getTextInputValue('max_completers_input');
        const pointsStr = interaction.fields.getTextInputValue('points_input');

        // Parse integers with defaults
        const maxCompleters = parseInt(maxCompletersStr) || GAME_RULES.TASK.DEFAULT_MAX_COMPLETERS;
        const points = parseInt(pointsStr) || GAME_RULES.TASK.DEFAULT_POINTS;

        // Validate task type is only 'normal' or 'revival'
        const validTaskTypes = ['normal', 'revival'];
        if (!validTaskTypes.includes(taskType.toLowerCase())) {
          return await interaction.reply({
            content: '❌ Task type must be either "normal" or "revival".',
            ephemeral: true,
          });
        }

        // Validate task data
        const taskData = { taskName, taskDescription, taskType, maxCompleters, points };

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
        if (points < 0 || points > 10000) {
          return await interaction.reply({
            content: '❌ Points must be between 0 and 10000.',
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

        // Save to backend
        const taskId = await createTask(interaction.guildId, newTask);

        // Get general channel
        const generalChannel = interaction.guild.channels.cache.find(
          channel => channel.name === 'general' && channel.isTextBased()
        );

        // Create announcement embed
        const announcementEmbed = new EmbedBuilder()
          .setColor('#00AA00')
          .setTitle('🎯 New Task Created')
          .addFields(
            { name: 'Task Name', value: `**${taskName}**`, inline: false },
            { name: 'Description', value: taskDescription, inline: false },
            { name: 'Type', value: taskType, inline: true },
            { name: 'Max Completers', value: `${maxCompleters}`, inline: true },
            { name: 'Points', value: `${points} pts`, inline: true },
            { name: 'Task ID', value: `\`${taskId}\``, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: `Created by ${interaction.user.username}` });

        // Send announcement to general channel
        if (generalChannel) {
          await generalChannel.send({ embeds: [announcementEmbed] });
        }

        // Confirm to user
        const confirmEmbed = new EmbedBuilder()
          .setColor('#00AA00')
          .setTitle('✅ Task Created Successfully')
          .addFields(
            { name: 'Task Name', value: `**${taskName}**` },
            { name: 'Task ID', value: `\`${taskId}\`` },
            { name: 'Status', value: 'Task added to backend' }
          )
          .setTimestamp();

        await interaction.reply({
          embeds: [confirmEmbed],
          ephemeral: true,
        });

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
