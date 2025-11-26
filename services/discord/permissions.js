/**
 * Discord permission checking utilities
 * Validates user permissions for various actions
 */

/**
 * Checks if a member has admin permissions
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function isAdmin(member) {
  // TODO: Implement admin check
  return member.permissions.has('Administrator');
}

/**
 * Checks if a member has a specific role
 * @param {GuildMember} member - The guild member
 * @param {string} roleName - The role name to check
 * @returns {boolean}
 */
function hasRole(member, roleName) {
  // TODO: Implement role check
  return member.roles.cache.some(role => role.name === roleName);
}

/**
 * Checks if a member is a Game Master
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function isGameMaster(member) {
  // TODO: Implement GM check (check for GM role)
  return hasRole(member, 'Game Master');
}

/**
 * Checks if a member is a Player
 * @param {GuildMember} member - The guild member
 * @returns {boolean}
 */
function isPlayer(member) {
  // TODO: Implement player check (check for Player role)
  return hasRole(member, 'Player');
}

module.exports = {
  isAdmin,
  hasRole,
  isGameMaster,
  isPlayer,
};

