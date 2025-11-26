/**
 * /task create command
 * Creates a new task for the game
 * Opens a modal dialog with labeled fields for task creation
 * Requires: GM Permission
 */

const { EmbedBuilder, ApplicationCommandOptionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { canPerformGMActions } = require('../../utils/permissions');
const { createTask } = require('../../services/firebase/taskService');
const GAME_RULES = require('../../config/gameRules');

module.exports = {
  name: 'create',
  description: 'Create a new task',
  
  // No slash command options; modal will be shown on command trigger
  options: [],
  /**
   * Validate task arguments
   * @param {Object} taskData - Task data to validate
   * @returns {Object} Validation result with isValid flag and error message if invalid
   */
  validateTask(taskData) {
    if (!taskData.taskName || taskData.taskName.length === 0) {
      return { isValid: false, error: 'Task name is required.' };
    }
    if (taskData.taskName.length > 100) {
      return { isValid: false, error: 'Task name must be 100 characters or less.' };
    }
    if (!taskData.taskDescription || taskData.taskDescription.length === 0) {
      return { isValid: false, error: 'Task description is required.' };
    }
    if (taskData.taskDescription.length > 500) {
      return { isValid: false, error: 'Task description must be 500 characters or less.' };
    }
    if (taskData.maxCompleters < 1) {
      return { isValid: false, error: 'Max completers must be at least 1.' };
    }
    if (taskData.maxCompleters > 100) {
      return { isValid: false, error: 'Max completers cannot exceed 100.' };
    }
    if (taskData.points < 0) {
      return { isValid: false, error: 'Points cannot be negative.' };
    }
    if (taskData.points > 10000) {
      return { isValid: false, error: 'Points cannot exceed 10000.' };
    }
    return { isValid: true };
  },

  async execute(interaction) {
    try {
      // Check GM permissions
      /*
      if (!canPerformGMActions(interaction.member)) {
        return await interaction.reply({
          content: '❌ You do not have permission to create tasks. GM role required.',
          ephemeral: true,
        });
      }
        */

      // Create modal with labeled input fields
      const modal = new ModalBuilder()
        .setCustomId('task_create_modal')
        .setTitle('Create a New Task');

      // Task Name input
      const taskNameInput = new TextInputBuilder()
        .setCustomId('task_name_input')
        .setLabel('Task Name')
        .setPlaceholder('Enter task name (1-100 characters)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true);

      // Task Description input
      const taskDescriptionInput = new TextInputBuilder()
        .setCustomId('task_description_input')
        .setLabel('Task Description')
        .setPlaceholder('Enter task description (1-500 characters)')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(1)
        .setMaxLength(500)
        .setRequired(true);

      // Task Type selector
      const taskTypeInput = new TextInputBuilder()
        .setCustomId('task_type_input')
        .setLabel('Task Type (normal or revival)')
        .setPlaceholder('Choose: normal or revival')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(false)
        .setValue('normal');

      // Max Completers input
      const maxCompletersInput = new TextInputBuilder()
        .setCustomId('max_completers_input')
        .setLabel('Max Completers (1-100)')
        .setPlaceholder(`Default: ${GAME_RULES.TASK.DEFAULT_MAX_COMPLETERS}`)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(false)
        .setValue(String(GAME_RULES.TASK.DEFAULT_MAX_COMPLETERS));

      // Points input
      const pointsInput = new TextInputBuilder()
        .setCustomId('points_input')
        .setLabel('Points Awarded (0-10000)')
        .setPlaceholder(`Default: ${GAME_RULES.TASK.DEFAULT_POINTS}`)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(5)
        .setRequired(false)
        .setValue(String(GAME_RULES.TASK.DEFAULT_POINTS));

      // Add inputs to action rows
      const row1 = new ActionRowBuilder().addComponents(taskNameInput);
      const row2 = new ActionRowBuilder().addComponents(taskDescriptionInput);
      const row3 = new ActionRowBuilder().addComponents(taskTypeInput);
      const row4 = new ActionRowBuilder().addComponents(maxCompletersInput);
      const row5 = new ActionRowBuilder().addComponents(pointsInput);

      modal.addComponents(row1, row2, row3, row4, row5);

      // Show modal to user
      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error showing task create modal:', error);
      await interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};

