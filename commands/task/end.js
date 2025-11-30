/**
 * /task end command
 * Ends a task (no longer available for completion)
 */

const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { canPerformGMActions } = require('../../utils/permissions');
const { getAllTasks, updateTask } = require('../../services/firebase/taskService');
const { getRoom } = require('../../services/firebase/dbCallsAdapter');
const CHANNELS = require('../../config/channels');
const { getOrCreateChannel } = require('../../services/discord/channels');

module.exports = {
  name: 'end',
  description: 'End a task (GM only)',
  options: [
    {
      name: 'task_name',
      description: 'The task name to end',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],

  async execute(interaction) {
    try {
      // Ensure GM
      const guildMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
      if (!canPerformGMActions(guildMember)) {
        return await interaction.reply({ content: '❌ You do not have permission to end tasks. GM role required.', ephemeral: true });
      }

      const roomSnapshot = await getRoom(interaction.guildId);
      if (!roomSnapshot.exists) {
        return await interaction.reply({ content: 'No game exists yet. Use `/game create` and `/game start` before ending task.', ephemeral: true });
      }

      const roomData = roomSnapshot.data();
      if (!roomData.isGameActive) {
        return await interaction.reply({ content: '⚠️ Tasks can only be ended while a game is running. Start the game with /game start first.', ephemeral: true });
      }

      const taskNameInput = interaction.options.getString('task_name', true).trim();

      // Find task
      const tasks = await getAllTasks(interaction.guildId);
      if (!tasks || tasks.length === 0) {
        return await interaction.reply({ content: '❌ No tasks found for this server.', ephemeral: true });
      }

      const normalized = taskNameInput.replace(/\s/g, '').toLowerCase();
      let found = tasks.find(t => (t.titleTrimmedLowerCase || (t.name || '').replace(/\s/g, '').toLowerCase()) === normalized || (t.name || '').toLowerCase() === taskNameInput.toLowerCase());
      if (!found) {
        found = tasks.find(t => (t.name || '').toLowerCase().includes(taskNameInput.toLowerCase()));
      }

      if (!found) {
        return await interaction.reply({ content: `❌ Task not found: ${taskNameInput}`, ephemeral: true });
      }

      // Mark task as complete
      try {
        await updateTask(interaction.guildId, found.id, { isComplete: true });
      } catch (err) {
        console.error('Error ending task:', err);
        return await interaction.reply({ content: `❌ Unable to end task: ${err.message}`, ephemeral: true });
      }

      // Fetch latest task to get completers
      const tasksAfter = await getAllTasks(interaction.guildId);
      const updated = tasksAfter.find(t => t.id === found.id) || found;

      // Public announcement to general: list completers (even if none). Do NOT include Task ID publicly.
      const generalChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GENERAL).catch(() => null);
      const completersArray = (updated.completers || []).map(id => `<@${id}>`);
      const completersList = completersArray.length > 0 ? completersArray.join('\n') : 'No completers recorded.';

      const publicEmbed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('🏁 Task Ended')
        .setDescription(`**${found.name}** has been ended by GM.`)
        .addFields(
          { name: 'Completed By', value: completersList, inline: false }
        )
        .setTimestamp();

      if (generalChannel) await generalChannel.send({ embeds: [publicEmbed] });

      // Notify GMs in game-masters (include Task ID)
      const gmChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GAME_MASTERS).catch(() => null);
      const gmEmbed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('✅ Task Ended by GM')
        .addFields(
          { name: 'Task Name', value: `**${found.name}**` },
          { name: 'Task ID', value: `\`${found.id}\`` },
          { name: 'Completed By', value: completersList }
        )
        .setTimestamp();

      if (gmChannel) await gmChannel.send({ embeds: [gmEmbed] });

      await interaction.reply({ content: '✅ Task ended and announced.', ephemeral: true });

    } catch (error) {
      console.error('Error in /task end:', error);
      await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true });
    }
  },

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name !== 'task_name') {
        await interaction.respond([]).catch(() => {});
        return;
      }

      const userInput = focusedOption.value.toLowerCase().trim();
      const tasks = await getAllTasks(interaction.guildId, interaction.guildId);
      const activeTasks = tasks.filter(task => !task.isComplete);

      let filteredTasks = activeTasks;
      if (userInput.length > 0) {
        filteredTasks = activeTasks.filter(task => {
          const taskName = (task.name || '').toLowerCase();
          return taskName.includes(userInput);
        });
      }

      filteredTasks.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      const choices = filteredTasks.slice(0, 25).map(task => ({
        name: task.name || 'Unnamed Task',
        value: task.name || 'Unnamed Task',
      }));

      if (choices.length === 0 && activeTasks.length === 0) {
        choices.push({
          name: 'No active tasks available',
          value: 'all',
        });
      } else if (choices.length === 0 && userInput.length > 0) {
        choices.push({
          name: `No active tasks found matching "${userInput}"`,
          value: userInput,
        });
      }

      await interaction.respond(choices);
    } catch (error) {
      console.error('Error in task end autocomplete:', error);
      await interaction.respond([]).catch(() => {});
    }
  },
};
