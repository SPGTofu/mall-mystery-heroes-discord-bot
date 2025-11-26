/**
 * Permission checking utilities
 * Checks GM, Player, and Admin permissions
 */

const { isGameMaster, isPlayer, isAdmin } = require('../services/discord/permissions');

/**
 * Checks if a member has permission to perform GM actions
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function canPerformGMActions(member) {
  return isGameMaster(member) || isAdmin(member);
}

/**
 * Checks if a member has permission to perform player actions
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function canPerformPlayerActions(member) {
  return isPlayer(member) || isGameMaster(member) || isAdmin(member);
}

/**
 * Checks if a member has permission to perform admin actions
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function canPerformAdminActions(member) {
  return isAdmin(member);
}

module.exports = {
  canPerformGMActions,
  canPerformPlayerActions,
  canPerformAdminActions,
};


