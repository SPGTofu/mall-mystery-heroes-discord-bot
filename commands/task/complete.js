const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { canPerformGMActions } = require('../../utils/permissions');
const { getAllTasks, completeTask, updateTask } = require('../../services/firebase/taskService');
const CHANNELS = require('../../config/channels');
const { getOrCreateChannel } = require('../../services/discord/channels');
const { getOrCreateAliveRole, getOrCreateDeadRole } = require('../../services/discord/roles');
const { updatePointsForPlayer, setPointsForPlayer, setIsAliveForPlayer } = require('../../services/firebase/dbCallsAdapter');
const { ROLES } = require('../../config/roles');
const { getRoom } = require('../../services/firebase/dbCallsAdapter');

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
      description: 'The player to mark as completed (not required when task_name is "all")',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  async execute(interaction) {
    try {
      // Defer the reply to avoid timeout on long operations
      await interaction.deferReply({ ephemeral: true });

      // Enforce GM-only usage — fetch full member to ensure role cache is available
      const guildMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
      if (!canPerformGMActions(guildMember)) {
        return await interaction.editReply({ content: '❌ You do not have permission to complete tasks. GM role required.' });
      }

      const roomSnapshot = await getRoom(interaction.guildId);
      if (!roomSnapshot.exists) {
        return await interaction.editReply({
          content: '❌ No game room exists. Create and start a game before managing tasks.',
        });
      }

      const roomData = roomSnapshot.data();
      if (!roomData.isGameActive) {
        return await interaction.editReply({
          content: '⚠️ Tasks can only be managed while a game is running. Start the game with /game start first.',
        });
      }

      const taskNameInput = interaction.options.getString('task_name', true).trim();
      const playerUser = interaction.options.getUser('player');
      // Broadcast option removed; always broadcast publicly
      const shouldBroadcast = true;

      // Find task by name (case-insensitive, trimmed match)
      const tasks = await getAllTasks(interaction.guildId, interaction.guildId);
      if (!tasks || tasks.length === 0) {
        return await interaction.editReply({ content: '❌ No tasks found for this server.' });
      }

      const normalized = taskNameInput.replace(/\s/g, '').toLowerCase();

      // Special-case: 'all' -> mark all active tasks complete
      if (normalized === 'all') {
        // Mark all active tasks complete
        const activeTasks = tasks.filter(t => !t.isComplete);
        if (activeTasks.length === 0) {
          return await interaction.reply({ content: '✅ There are no active tasks to complete.', ephemeral: true });
        }

        const now = new Date().toISOString();
        const updatePromises = activeTasks.map(t => updateTask(interaction.guildId, t.id, { isComplete: true, completedAt: now }));
        const results = await Promise.allSettled(updatePromises);

        // Build announcement embed summarizing completed tasks and completers
        const summaryEmbed = new EmbedBuilder()
          .setTitle('Tasks Marked Complete')
          .setColor('#22AA66')
          .setTimestamp();

        for (const t of activeTasks) {
          let completerList = 'No completers recorded.';
          if (Array.isArray(t.completers) && t.completers.length) {
            const names = [];
            for (const c of t.completers) {
              let display = null;
              if (c.discordId) {
                try {
                  const m = await interaction.guild.members.fetch(c.discordId).catch(() => null);
                  if (m) display = m.displayName;
                } catch (e) {
                  display = null;
                }
              }
              if (!display) display = c.displayName || c.name || c.playerId || c.discordId || 'Unknown';
              names.push(display);
            }
            completerList = names.join('\n');
          }

          const title = t.name || t.title || 'Untitled Task';
          const desc = t.description ? (t.description.length > 1000 ? t.description.slice(0, 997) + '...' : t.description) : '';
          const value = (desc ? desc + '\n\n' : '') + '**Completers:**\n' + completerList;
          summaryEmbed.addFields({ name: title, value });
        }

        const gmChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GAME_MASTERS).catch(() => null);
        if (gmChannel) await gmChannel.send({ embeds: [summaryEmbed] });
        const generalChannel = await getOrCreateChannel(interaction.guild, CHANNELS.GENERAL).catch(() => null);
        if (shouldBroadcast && generalChannel) await generalChannel.send({ embeds: [summaryEmbed] });

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        return await interaction.reply({ content: `✅ Completed ${succeeded} task(s). ${failed ? `${failed} failed to update (see logs).` : ''}`, ephemeral: true });
      }
      let found = tasks.find(t => (t.titleTrimmedLowerCase || (t.name || '').replace(/\s/g, '').toLowerCase()) === normalized || (t.name || '').toLowerCase() === taskNameInput.toLowerCase());

      // If not exact match, try includes
      if (!found) {
        found = tasks.find(t => (t.name || '').toLowerCase().includes(taskNameInput.toLowerCase()));
      }

      if (!found) {
        return await interaction.reply({ content: `❌ Task not found: ${taskNameInput}`, ephemeral: true });
      }

      // Allow single-task completion without specifying a player.
      // If no player is provided we will mark the task complete without awarding points.

      // Attempt to complete task. If a player is provided, use completeTask
      // to record the completer and trigger awarding/revival logic. If no
      // player is provided, simply mark the task complete without awarding points.
      let updatedTask;
      try {
        if (playerUser) {
          updatedTask = await completeTask(interaction.guildId, found.id, playerUser.id);
        } else {
          const now = new Date().toISOString();
          await updateTask(interaction.guildId, found.id, { isComplete: true, completedAt: now });
          // fetch fresh task state after update
          const all = await getAllTasks(interaction.guildId);
          updatedTask = all.find(t => t.id === found.id) || { ...found, isComplete: true };
        }
      } catch (err) {
        console.error('Error completing task:', err);
        return await interaction.editReply({ content: `❌ Unable to complete task: ${err.message}` });
      }

      const remaining = Math.max(0, (found.maxCompleters || updatedTask.maxCompleters || 1) - (updatedTask.completers?.length || 0));

      // Send public announcement to general (create if missing) when allowed by broadcast
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

      if (shouldBroadcast && generalChannel) {
        // Only send the 'spots left' announcement when there are spots remaining.
        if (remaining > 0) {
          await generalChannel.send({ embeds: [publicEmbed] });
        }
        // If remaining === 0, skip this message — the 'fully completed' announcement
        // below will be sent instead.
      }

      // If no spots left (task is now complete), announce completion publicly
      const taskIsComplete = updatedTask.isComplete === true || remaining === 0;
      if (taskIsComplete && shouldBroadcast && generalChannel) {
        try {
          const completersArray = (updatedTask.completers || []).map(id => `<@${id}>`);
          const completersList = completersArray.length > 0 ? completersArray.join('\n') : 'No completers recorded.';

          const completeEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏁 Task Fully Completed')
            .setDescription(`**${found.name}** has been fully completed.`)
            .addFields(
              { name: 'Completed By', value: completersList, inline: false }
            )
            .setTimestamp();

          await generalChannel.send({ embeds: [completeEmbed] });
        } catch (err) {
          console.error('Failed to send task completion announcement:', err);
        }
      }

      // Handle revival/points only when a player was provided.
      let pointsToAward = Number(updatedTask.points || found.points || 0);
      let newScore = null;
      let isRevival = false;
      if (playerUser) {
        isRevival = (found.type || '').toString().toLowerCase() === 'revival' || (found.type || '').toString().toLowerCase() === 'revive';
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
          { name: 'Player', value: playerUser ? `${playerUser.tag}` : 'N/A' },
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
      await interaction.editReply({ content: '✅ Task completion recorded. GMs notified.' });

    } catch (error) {
      console.error('Error in /task complete:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
      } else {
        await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true });
      }
    }
  },
};


