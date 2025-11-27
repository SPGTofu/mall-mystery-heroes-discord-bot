/**
 * /game leave command
 * Allows a player to leave an active game
 */

const { GameError, handleError } = require('../../utils/errors');
const { getRoom, getPlayerByUserID, removePlayerForRoom } = require('../../services/firebase/dbCallsAdapter');
const { getOrCreatePlayerRole, getOrCreateAliveRole, getOrCreateDeadRole, removeRole } = require('../../services/discord/roles');
const { deleteChannel } = require('../../services/discord/channels');
const { MessageFlags } = require('discord.js');
const CHANNELS = require('../../config/channels');
const { ROLES } = require('../../config/roles');

module.exports = {
  name: 'leave',
  description: 'Leave an active game',
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const roomID = guild.id;
      const member = interaction.member;
      const userID = member.user.id;

      // Check if room/game exists
      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        throw new GameError('No game has been created yet.');
      }

      // Check if user is in the game
      const playerDoc = await getPlayerByUserID(userID, roomID);
      if (!playerDoc) {
        throw new GameError('You are not in the game.');
      }

      // Get player name before deletion (needed for finding DM channel)
      const playerData = playerDoc.data();
      const playerName = playerData.name;

      await interaction.editReply('Leaving game...');

      // Remove the player from the database (unmaps targets/assassins and deletes the document)
      await removePlayerForRoom(userID, roomID);

      // Remove player role
      const playerRole = await getOrCreatePlayerRole(guild);
      try {
        await removeRole(member, playerRole);
      } catch (error) {
        console.warn(`Could not remove player role from ${member.user.tag}:`, error);
      }

      // Remove alive role
      const aliveRole = await getOrCreateAliveRole(guild);
      try {
        await removeRole(member, aliveRole);
      } catch (error) {
        console.warn(`Could not remove alive role from ${member.user.tag}:`, error);
      }

      // Remove dead role (in case they were already dead)
      const deadRole = await getOrCreateDeadRole(guild);
      try {
        await removeRole(member, deadRole);
      } catch (error) {
        console.warn(`Could not remove dead role from ${member.user.tag}:`, error);
      }

      // Find and delete their DM channel
      // The channel name should be the player name in lowercase with spaces replaced by hyphens
      const channelName = playerName.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Find DMs category
      const dmsCategory = guild.channels.cache.find(
        ch => ch.type === 4 && ch.name.toLowerCase() === CHANNELS.DMS_CATEGORY.toLowerCase()
      );

      if (dmsCategory) {
        // Find the player's DM channel in the DMs category
        const dmChannel = guild.channels.cache.find(
          ch => ch.parentId === dmsCategory.id && 
               ch.name.toLowerCase() === channelName.toLowerCase() &&
               ch.type === 0 // Text channel
        );

        if (dmChannel) {
          try {
            await deleteChannel(dmChannel);
          } catch (error) {
            console.warn(`Could not delete DM channel for ${member.user.tag}:`, error);
          }
        }
      }

      // Reset nickname (optional - remove nickname)
      try {
        await member.setNickname(null);
      } catch (error) {
        console.warn(`Could not reset nickname for ${member.user.tag}:`, error);
        // Continue even if nickname can't be reset (might not have permission)
      }

      await interaction.editReply(`✅ Successfully left the game. You have been removed from the game.`);

    } catch (error) {
      console.error('Error in /game leave:', error);
      await handleError(error, interaction);
    }
  },
};

