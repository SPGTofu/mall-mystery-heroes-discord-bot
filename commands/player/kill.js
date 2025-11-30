/**
 * /kill command
 * Records an assassination/kill
 */

const { isGameMaster, hasRole } = require('../../services/discord/permissions');
const { createEmbed, createAnnouncement, createErrorAnnouncement } = require('../../services/discord/messages');
const { ROLES } = require('../../config/roles');
const CHANNELS = require('../../config/channels');
const { getChannel } = require('../../services/discord/channels');
const { removeRole, assignRole } = require('../../services/discord/roles');
const { ApplicationCommandOptionType } = require("discord.js");
const { fetchTargetsForPlayer,
    updatePointsForPlayer,
    killPlayerForRoom,
    updateLogsForRoom,
    fetchPlayerByUserIdForRoom,
    getRoom } = require('../../services/firebase/dbCallsAdapter');
const { canPerformGMActions } = require('../../utils/permissions');
const {
  getDmsCategory,
  notifyPlayerEliminated,
  remapAndNotifyTargets,
  dedupeIds,
} = require('../../services/game/playerTargetUpdates');

function hasTargetAssignment(targetList, targetId, targetName) {
  if (!Array.isArray(targetList)) {
    return false;
  }

  const normalizedId = targetId ? String(targetId).trim() : null;
  const normalizedName = targetName ? targetName.trim().toLowerCase() : null;

  return targetList.some(entry => {
    if (entry === undefined || entry === null) {
      return false;
    }

    const entryString = String(entry).trim();
    if (normalizedId && entryString === normalizedId) {
      return true;
    }

    if (normalizedName && entryString.toLowerCase() === normalizedName) {
      return true;
    }

    return false;
  });
}

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
    await interaction.deferReply({ ephemeral: true });
    try {
      // 1. Parse command options for assassin and target users
      const assassin = interaction.options.getUser('assassin');
      const target = interaction.options.getUser('target');
      const assassinName = assassin.username;
      const targetName = target.username;

      if (!assassinName || !targetName) {
        return interaction.editReply({
          content: 'You must mention both an assassin (@assassin) and a target (@target).',
        });
      }

      // 2. Check if user has GM permission
      if (!canPerformGMActions(interaction.member)) {
        return interaction.editReply({
          content: 'Only a Game Master can use this command.',
        });
      }

      const roomID = interaction.guildId;
      const guild = interaction.guild;
      const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS);

      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        return interaction.editReply({
          content: 'No game exists yet. Create and start a game before recording kills.',
        });
      }

      const roomData = roomSnapshot.data() || {};
      if (!roomData.isGameActive) {
        return interaction.editReply({
          content: 'The game has not started yet. Use `/game start` before recording kills.',
        });
      }

      // 3. Get the Discord guild members
      const assassinMember = await interaction.options.getMember('assassin');
      const targetMember = await interaction.options.getMember('target');

      if (!assassinMember) {
        return interaction.editReply({
          content: `Could not find Discord member for "${assassinName}".`,
        });
      }

      if (!targetMember) {
        return interaction.editReply({
          content: `Could not find Discord member for "${targetName}".`,
        });
      }

      // 4. Check if @target and @assassin have 'Alive' roles
      if (!hasRole(assassinMember, ROLES.ALIVE)) {
        return interaction.editReply({
          content: `<@${assassin.id}> is not alive.`,
        });
      }

      if (!hasRole(targetMember, ROLES.ALIVE)) {
        return interaction.editReply({
          content: `<@${target.id}> is not alive.`,
        });
      }

      // 5. Fetch player data from database using user IDs (Discord IDs are permanent, usernames can change)
      let assassinPlayerDoc, targetPlayerDoc;
      try {
        assassinPlayerDoc = await fetchPlayerByUserIdForRoom(assassin.id, roomID);
      } catch (error) {
        return interaction.editReply({
          content: `Assassin (<@${assassin.id}>) is not registered in this game.`,
        });
      }
      
      try {
        targetPlayerDoc = await fetchPlayerByUserIdForRoom(target.id, roomID);
      } catch (error) {
        return interaction.editReply({
          content: `Target (<@${target.id}>) is not registered in this game.`,
        });
      }
      
      const assassinPlayerData = assassinPlayerDoc.data();
      const targetPlayerData = targetPlayerDoc.data();
      const wasOpenSeason = targetPlayerData.openSeason === true;
      
      // Use database names (not Discord usernames) for consistency
      const assassinDbName = assassinPlayerData.name;
      const targetDbName = targetPlayerData.name;
      
      
      // Get points directly from the player data we already fetched
      const assassinPoints = parseInt(assassinPlayerData.score || 0);
      const targetPoints = parseInt(targetPlayerData.score || 0);

      // 6. Validate kill (Check if kill makes sense with Firebase)
      // Check if assassin has target in their targets list
      // Use Discord user ID to fetch targets, but compare against database name
      let assassinTargets;
      try {
        assassinTargets = await fetchTargetsForPlayer(assassin.id, roomID);
      } catch (error) {
        console.error('Error fetching targets for assassin:', error);
        return interaction.editReply({
          content: `Error fetching targets for ${assassinDbName}: ${error.message}`,
        });
      }
      
      if (!hasTargetAssignment(assassinTargets, target.id, targetDbName)) {
        const message = createErrorAnnouncement(`<@${assassin.id}> does not have <@${target.id}> as a target. Kill not valid.`);
        await gmChannel.send({ embeds: [message] });
        return interaction.editReply({
          embeds: [message],
        });
      }

      // 7. Give assassin points (transfer target's points to assassin)
      // Use Discord user ID, not username
      await updatePointsForPlayer(assassin.id, targetPoints, roomID);

      // 8. Unalive player, set target's points to 0, and reset targets/assassins
      // Use Discord user ID, not username
      await killPlayerForRoom(target.id, roomID);

      // 9. Update Discord roles
      // Use helper functions that handle role resolution and error handling properly
      // Pass role names (strings) to the helper functions - they will resolve them properly
      try {
        if (targetMember && targetMember.roles) {
          await removeRole(targetMember, ROLES.ALIVE);
        }
      } catch (error) {
        // If role doesn't exist or can't be removed, log but don't fail the kill
        console.warn(`Could not remove "${ROLES.ALIVE}" role:`, error.message);
      }

      try {
        if (targetMember && targetMember.roles) {
          await assignRole(targetMember, ROLES.DEAD);
        }
      } catch (error) {
        // If role doesn't exist or can't be assigned, log but don't fail the kill
        console.warn(`Could not add "${ROLES.DEAD}" role:`, error.message);
      }

      // 10. Log the kill in Firebase
      // Use database names for logging (consistent with database records)
      await updateLogsForRoom(
        `${assassinDbName} assassinated ${targetDbName}! ${assassinDbName} gained ${targetPoints} points.`,
        'red',
        roomID
      );

      // 11. Broadcast a message to the general chat
      const generalChannel = interaction.guild.channels.cache.find(
        channel => channel.name === CHANNELS.GENERAL
      );

      const killEmbed = createEmbed({
        title: '💀 Assassination!',
        description: `**${assassinDbName}** has assassinated **${targetDbName}**!`,
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

      if (wasOpenSeason) {
        const openSeasonEmbed = createAnnouncement(
          '✅ Open Season Ended',
          `Open season on **${targetDbName}** has ended because they have been eliminated.`
        );

        if (generalChannel) {
          await generalChannel.send({ embeds: [openSeasonEmbed] });
        }
        if (gmChannel) {
          await gmChannel.send({ embeds: [openSeasonEmbed] });
        }
      }

      const dmsCategory = getDmsCategory(guild);
      await notifyPlayerEliminated(dmsCategory, target.id, targetDbName);
      const playersNeedingTargets = dedupeIds(targetPlayerData.assassins || []);
      const playersNeedingAssassins = dedupeIds(targetPlayerData.targets || []);
      await remapAndNotifyTargets({
        guild,
        roomID,
        playersNeedingTargets,
        playersNeedingAssassins,
        dmsCategoryOverride: dmsCategory,
      });

      // Reply to the interaction
      await interaction.editReply({
        content: `✅ Kill recorded! ${assassinDbName} assassinated ${targetDbName}.`,
      });

    } catch (error) {
      console.error('Error handling /kill command:', error);
      await interaction.editReply({
        content: `Error recording kill: ${error.message}`,
      });
    }
  },
};
