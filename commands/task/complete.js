const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { canPerformGMActions } = require('../../utils/permissions');
const { getAllTasks, completeTask } = require('../../services/firebase/taskService');
const CHANNELS = require('../../config/channels');
const { getOrCreateChannel } = require('../../services/discord/channels');
const { updatePointsForPlayer, setPointsForPlayer, setIsAliveForPlayer } = require('../../services/firebase/dbCallsAdapter');
const ROLES = require('../../config/roles');

/**
 * /task complete command
 * Marks a player as having completed a task (GM only)
 */
module.exports = {
  name: 'complete',
  description: 'Mark a player as having completed a task (GM only)',
  options: [
    {
      name: 'task_name',
      description: 'The task name to mark complete',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'player',
      description: 'The player to mark as completed',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],

  async execute(interaction) {
    try {
      // Enforce GM-only usage — fetch full member to ensure role cache is available
      const guildMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
      if (!canPerformGMActions(guildMember)) {
        return await interaction.reply({ content: '❌ You do not have permission to complete tasks. GM role required.', ephemeral: true });
      }

      const taskNameInput = interaction.options.getString('task_name', true).trim();
      const playerUser = interaction.options.getUser('player', true);

      // Find task by name (case-insensitive, trimmed match)
      const tasks = await getAllTasks(interaction.guildId);
      if (!tasks || tasks.length === 0) {
        return await interaction.reply({ content: '❌ No tasks found for this server.', ephemeral: true });
      }

      const normalized = taskNameInput.replace(/\s/g, '').toLowerCase();
      let found = tasks.find(t => (t.titleTrimmedLowerCase || (t.name || '').replace(/\s/g, '').toLowerCase()) === normalized || (t.name || '').toLowerCase() === taskNameInput.toLowerCase());

      // If not exact match, try includes
      if (!found) {
        found = tasks.find(t => (t.name || '').toLowerCase().includes(taskNameInput.toLowerCase()));
      }

      if (!found) {
        return await interaction.reply({ content: `❌ Task not found: ${taskNameInput}`, ephemeral: true });
      }

      // Attempt to complete task
      let updatedTask;
      try {
        updatedTask = await completeTask(interaction.guildId, found.id, playerUser.id);
      } catch (err) {
        console.error('Error completing task:', err);
        return await interaction.reply({ content: `❌ Unable to complete task: ${err.message}`, ephemeral: true });
      }

      const remaining = Math.max(0, (found.maxCompleters || updatedTask.maxCompleters || 1) - (updatedTask.completers?.length || 0));

      // Send public announcement to general (create if missing)
      const generalChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GENERAL).catch(err => {
        console.error('Unable to get or create general channel:', err);
        return null;
      });
      const publicEmbed = new EmbedBuilder()
        .setColor('#00AA00')
        .setTitle('✅ Task Completed')
        .setDescription(`${playerUser} completed **${found.name}**`)
        .addFields(
          { name: 'Spots Left', value: `${remaining}`, inline: false }
        )
        .setTimestamp();

      if (generalChannel) {
        await generalChannel.send({ embeds: [publicEmbed] });
      }

      // If no spots left (task is now complete), announce completion publicly
      const taskIsComplete = updatedTask.isComplete === true || remaining === 0;
      if (taskIsComplete && generalChannel) {
        try {
          const completeEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏁 Task Fully Completed')
            .setDescription(`**${found.name}** has been fully completed.`)
            .addFields(
              { name: 'Completed By', value: `${playerUser}`, inline: true },
              { name: 'Task ID', value: `\`${found.id}\``, inline: true }
            )
            .setTimestamp();

          await generalChannel.send({ embeds: [completeEmbed] });
        } catch (err) {
          console.error('Failed to send task completion announcement:', err);
        }
      }

      // Handle revival tasks specially
      const isRevival = (found.type || '').toString().toLowerCase() === 'revival' || (found.type || '').toString().toLowerCase() === 'revive';

      let pointsToAward = Number(updatedTask.points || found.points || 0);
      let newScore = null;
      try {
        if (isRevival) {
          // For revival: set player as alive and reset points to 0
          try {
            await setIsAliveForPlayer(playerUser.id, true, interaction.guildId);
          } catch (err) {
            console.error('Failed to set player isAlive in DB:', err);
          }

          try {
            newScore = await setPointsForPlayer(playerUser.id, 0, interaction.guildId);
            pointsToAward = 0; // no points awarded on revival
          } catch (err) {
            console.error('Failed to reset player points in DB:', err);
          }

          // Adjust Discord roles: remove 'Dead', add 'Alive'
          try {
            const memberToUpdate = await interaction.guild.members.fetch(playerUser.id).catch(() => null);
            if (memberToUpdate) {
              const deadRole = interaction.guild.roles.cache.find(r => r.name === ROLES.DEAD);
              const aliveRole = interaction.guild.roles.cache.find(r => r.name === ROLES.ALIVE);
              if (deadRole && memberToUpdate.roles.cache.has(deadRole.id)) {
                await memberToUpdate.roles.remove(deadRole).catch(err => console.error('Failed to remove Dead role:', err));
              }
              if (aliveRole && !memberToUpdate.roles.cache.has(aliveRole.id)) {
                await memberToUpdate.roles.add(aliveRole).catch(err => console.error('Failed to add Alive role:', err));
              }
            }
          } catch (err) {
            console.error('Error updating Discord roles for revived player:', err);
          }
        } else {
          // Normal task: award points
          if (pointsToAward > 0) {
            try {
              newScore = await updatePointsForPlayer(playerUser.id, pointsToAward, interaction.guildId);
            } catch (err) {
              console.error('Failed to update player points:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error handling points/isAlive logic:', err);
      }

      // Confirm to GMs in the game-masters channel
      const gmChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GAME_MASTERS).catch(err => {
        console.error('Unable to get or create game-masters channel:', err);
        return null;
      });

      const confirmEmbed = new EmbedBuilder()
        .setColor('#00AA00')
        .setTitle('✅ Task Marked Complete')
        .addFields(
          { name: 'Task Name', value: `**${found.name}**` },
          { name: 'Player', value: `${playerUser.tag}` },
          { name: 'Task ID', value: `\`${found.id}\`` },
          { name: 'Remaining Spots', value: `${remaining}` },
          { name: 'Points Awarded', value: `${pointsToAward} pts`, inline: true },
          { name: 'New Player Score', value: `${newScore !== null ? newScore : 'unknown'}`, inline: true },
          { name: 'Revival', value: `${isRevival ? 'Yes' : 'No'}`, inline: true }
        )
        .setTimestamp();

      if (gmChannel) {
        await gmChannel.send({ embeds: [confirmEmbed] });
      }

      // Reply ephemeral to command invoker to acknowledge
      await interaction.reply({ content: '✅ Task completion recorded. GMs notified.', ephemeral: true });

    } catch (error) {
      console.error('Error in /task complete:', error);
      await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true });
    }
  },
};


