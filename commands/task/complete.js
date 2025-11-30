const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { canPerformGMActions } = require('../../utils/permissions');
const { getAllTasks, completeTask, updateTask } = require('../../services/firebase/taskService');
const CHANNELS = require('../../config/channels');
const { getOrCreateChannel } = require('../../services/discord/channels');
const { updatePointsForPlayer, setPointsForPlayer, setIsAliveForPlayer, getRoom, getPlayerByUserID } = require('../../services/firebase/dbCallsAdapter');
const { ROLES } = require('../../config/roles');

/**
 * Formats the "already completed task" error with a user-friendly message
 * @param {Error} error - The error object
 * @param {Interaction} interaction - The Discord interaction
 * @param {User|null} playerUser - Optional player user object from the command
 * @returns {Promise<string|null>} Formatted error message or null if not the right error
 */
async function formatAlreadyCompletedError(error, interaction, playerUser = null) {
  if (!error.message || !error.message.includes('already completed task')) {
    return null;
  }

  // If we have playerUser, use that directly
  if (playerUser) {
    return `❌ ${playerUser} has already completed this task.`;
  }

  // Try to extract player ID from error message
  const playerIdMatch = error.message.match(/Player (\d+) already completed task/);
  if (playerIdMatch && playerIdMatch[1]) {
    const playerId = playerIdMatch[1];
    try {
      // Fetch the member to get their name/mention
      const member = await interaction.guild.members.fetch(playerId).catch(() => null);
      if (member) {
        return `❌ ${member} has already completed this task.`;
      }
    } catch (fetchError) {
      // Fall through to default error message
    }
  }

  // Fallback to original error message
  return null;
}

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
      autocomplete: true,
    },
    {
      name: 'player',
      description: 'The player who completed the task',
      type: ApplicationCommandOptionType.User,
      required: true,
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

      // Find task by name (case-insensitive, trimmed match)
      const tasks = await getAllTasks(interaction.guildId, interaction.guildId);
      if (!tasks || tasks.length === 0) {
        return await interaction.editReply({ content: '❌ No tasks found for this server.' });
      }

      const normalized = taskNameInput.replace(/\s/g, '').toLowerCase();

      let found = tasks.find(t => (t.titleTrimmedLowerCase || (t.name || '').replace(/\s/g, '').toLowerCase()) === normalized || (t.name || '').toLowerCase() === taskNameInput.toLowerCase());

      if (!found) {
        return await interaction.editReply({ content: `❌ Task not found: ${taskNameInput}`, ephemeral: true });
      }

      // Validate that the player is in the game
      let playerDoc;
      try {
        playerDoc = await getPlayerByUserID(playerUser.id, interaction.guildId);
        if (!playerDoc) {
          return await interaction.editReply({ 
            content: `❌ ${playerUser} is not a player in the game.` 
          });
        }
      } catch (error) {
        console.error('Error checking if player is in game:', error);
        return await interaction.editReply({ 
          content: `❌ Error checking player status: ${error.message}` 
        });
      }

      // Check if task is a revival task
      const isRevivalTask = (found.type || '').toString().toLowerCase() === 'revival' || (found.type || '').toString().toLowerCase() === 'revive';

      // Get player status
      const playerData = playerDoc.data();
      const isPlayerAlive = playerData.isAlive !== false; // Default to true if not set

      // Validate: Dead players can only complete revival tasks
      if (!isPlayerAlive && !isRevivalTask) {
        return await interaction.editReply({ 
          content: `❌ Dead players cannot complete tasks. Only revival tasks can be completed by dead players.` 
        });
      }

      // Validate: Revival tasks can only be completed by dead players
      if (isRevivalTask && isPlayerAlive) {
        return await interaction.editReply({ 
          content: `❌ Revival tasks can only be completed by dead players. ${playerUser} is still alive.` 
        });
      }

      // Attempt to complete task with the provided player
      let updatedTask;
      try {
        updatedTask = await completeTask(interaction.guildId, found.id, playerUser.id);
      } catch (err) {
        console.error('Error completing task:', err);
        
        // Try to format "already completed task" error with user-friendly message
        const formattedError = await formatAlreadyCompletedError(err, interaction, playerUser);
        if (formattedError) {
          return await interaction.editReply({ content: formattedError });
        }
        
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

      if (generalChannel) {
        // Only send the 'spots left' announcement when there are spots remaining.
        if (remaining > 0) {
          await generalChannel.send({ embeds: [publicEmbed] });
        }
        // If remaining === 0, skip this message — the 'fully completed' announcement
        // below will be sent instead.
      }

      // If no spots left (task is now complete), announce completion publicly
      const taskIsComplete = updatedTask.isComplete === true || remaining === 0;
      if (taskIsComplete && generalChannel) {
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

      // Handle revival/points
      let pointsToAward = Number(updatedTask.points || found.points || 0);
      let newScore = null;
      
      try {
        if (isRevivalTask) {
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
          { name: 'Player', value: playerUser ? `${playerUser.tag}` : 'N/A' },
          { name: 'Task ID', value: `\`${found.id}\`` },
          { name: 'Remaining Spots', value: `${remaining}` },
          { name: 'Points Awarded', value: `${pointsToAward} pts`, inline: true },
          { name: 'New Player Score', value: `${newScore !== null ? newScore : 'unknown'}`, inline: true },
          { name: 'Revival', value: `${isRevivalTask ? 'Yes' : 'No'}`, inline: true }
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
        await interaction.editReply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true });
      }
    }
  },

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      
      // Only handle autocomplete for task_name
      if (focusedOption.name !== 'task_name') {
        await interaction.respond([]).catch(() => {});
        return;
      }

      const userInput = focusedOption.value.toLowerCase().trim();
      
      // Get all tasks for this guild
      const tasks = await getAllTasks(interaction.guildId, interaction.guildId);
      
      // Filter to only active (incomplete) tasks
      const activeTasks = tasks.filter(task => !task.isComplete);
      
      // Filter tasks based on user input
      let filteredTasks = activeTasks;
      if (userInput.length > 0) {
        filteredTasks = activeTasks.filter(task => {
          const taskName = (task.name || '').toLowerCase();
          return taskName.includes(userInput);
        });
      }
      
      // Sort by name for better UX
      filteredTasks.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Limit to 25 choices (Discord's maximum)
      const choices = filteredTasks.slice(0, 25).map(task => ({
        name: task.name || 'Unnamed Task',
        value: task.name || 'Unnamed Task',
      }));
      
      // If no active tasks at all
      if (choices.length === 0 && activeTasks.length === 0) {
        choices.push({
          name: 'No active tasks available',
          value: 'all', // Allow "all" as a fallback
        });
      }
      // If no matches but user has typed something
      else if (choices.length === 0 && userInput.length > 0) {
        choices.push({
          name: `No active tasks found matching "${userInput}"`,
          value: userInput, // Return their input so they can still submit if needed
        });
      }
      
      await interaction.respond(choices);
    } catch (error) {
      console.error('Error in task complete autocomplete:', error);
      // Respond with empty array on error to prevent Discord errors
      await interaction.respond([]).catch(() => {
        // Ignore errors if interaction already responded or expired
      });
    }
  },
};


