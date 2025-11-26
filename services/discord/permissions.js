/**
 * Discord permission checking utilities
 * Validates user permissions for various actions
 */

const { PermissionFlagsBits } = require('discord.js');
const ROLES = require('../../config/roles');

/**
 * Checks if a member has admin permissions
 * Relies on Discord's native Administrator permission
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function isAdmin(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}

/**
 * Checks if a member has a specific role
 * @param {GuildMember} member - The guild member
 * @param {string} roleName - The role name to check
 * @returns {boolean}
 */
function hasRole(member, roleName) {
  if (!member?.roles?.cache?.size) return false;
  return member.roles.cache.some(role => role.name === roleName);
}

/**
 * Checks if a member is a Game Master
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function isGameMaster(member) {
  return hasRole(member, ROLES.GAME_MASTER);
}

/**
 * Checks if a member is a Player
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function isPlayer(member) {
  return hasRole(member, ROLES.PLAYER);
}

module.exports = {
  isAdmin,
  hasRole,
  isGameMaster,
  isPlayer,
};

