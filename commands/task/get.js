const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { canPerformGMActions } = require('../../utils/permissions');
const { getAllTasks, updateTask } = require('../../services/firebase/taskService');
const { getRoom } = require('../../services/firebase/dbCallsAdapter');
const CHANNELS = require('../../config/channels');
const { getOrCreateChannel } = require('../../services/discord/channels');

/**
 * /task get [broadcast: on/off] (GM only)
 * Lists active tasks to game-masters channel and optionally broadcasts to general
 */
module.exports = {
  name: 'get',
  description: 'List active tasks (GM only). Optionally broadcast to general.',
  options: [
    {
      name: 'broadcast',
      description: 'Whether to broadcast to #general (true) or only to #game-masters (false)',
      type: ApplicationCommandOptionType.Boolean,
      required: true,
    },
  ],

  async execute(interaction) {
    try {
      const guildMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
      if (!canPerformGMActions(guildMember)) {
        return await interaction.reply({ content: '❌ You do not have permission to list tasks. GM role required.', ephemeral: true });
      }

      const roomSnapshot = await getRoom(interaction.guildId);
      if (!roomSnapshot.exists) {
        return await interaction.reply({
          content: '❌ No game room exists. Create and start a game before using /task commands.',
          ephemeral: true,
        });
      }

      const roomData = roomSnapshot.data();
      if (!roomData.isGameActive) {
        return await interaction.reply({
          content: '⚠️ Tasks can only be managed while a game is running. Start the game with /game start first.',
          ephemeral: true,
        });
      }

      const broadcastOpt = interaction.options.getBoolean('broadcast');
      const shouldBroadcast = broadcastOpt === null || broadcastOpt === undefined ? true : Boolean(broadcastOpt);

      const tasks = await getAllTasks(interaction.guildId);
      if (!tasks) {
        return await interaction.reply({ content: '❌ Failed to fetch tasks from the database.', ephemeral: true });
      }

      // Ensure tasks without isComplete field are marked active (isComplete: false)
      const fixPromises = [];
      for (const t of tasks) {
        if (typeof t.isComplete === 'undefined') {
          fixPromises.push(updateTask(interaction.guildId, t.id, { isComplete: false }));
        }
      }
      if (fixPromises.length) await Promise.allSettled(fixPromises);

      // Filter active tasks
      const activeTasks = tasks.filter(t => !t.isComplete);

      // Build embed(s)
      if (activeTasks.length === 0) {
        const noEmbed = new EmbedBuilder()
          .setColor('#999999')
          .setTitle('Active Tasks')
          .setDescription('There are currently no active tasks.')
          .setTimestamp();

        // Send to GMs and optionally to general
        const gmCh = await getOrCreateChannel(interaction.guild, CHANNELS.GAME_MASTERS).catch(() => null);
        if (gmCh) await gmCh.send({ embeds: [noEmbed] });
        if (shouldBroadcast) {
          const gen = await getOrCreateChannel(interaction.guild, CHANNELS.GENERAL).catch(() => null);
          if (gen) await gen.send({ embeds: [noEmbed] });
        }

        return await interaction.reply({ content: '✅ Sent active tasks (none found).', ephemeral: true });
      }

      // Build embed with fields for each active task
      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('Active Tasks')
        .setTimestamp();

      for (const t of activeTasks) {
        const name = t.name || t.title || 'Untitled Task';
        const desc = t.description ? (t.description.length > 1000 ? t.description.slice(0, 997) + '...' : t.description) : 'No description.';
        embed.addFields({ name, value: desc });
      }

      const gmChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GAME_MASTERS).catch(() => null);
      if (gmChannel) await gmChannel.send({ embeds: [embed] });

      if (shouldBroadcast) {
        const generalChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GENERAL).catch(() => null);
        if (generalChannel) await generalChannel.send({ embeds: [embed] });
      }

      return await interaction.reply({ content: `✅ Sent ${activeTasks.length} active task(s) to ${CHANNELS.GAME_MASTERS}${shouldBroadcast ? ' and #general' : ''}.`, ephemeral: true });

    } catch (err) {
      console.error('Error in /task get:', err);
      return await interaction.reply({ content: `❌ An error occurred: ${err.message}`, ephemeral: true });
    }
  }
};

