/**
 * Discord role management utilities
 * Handles creation, deletion, and assignment of Discord roles
 */

const { ROLES } = require("../../config/roles");

/**
 * Ensures a guild reference exists
 * @param {Guild} guild
 */
function assertGuild(guild) {
  if (!guild) {
    throw new Error('A valid guild reference is required to manage roles.');
  }
}

/**
 * Coerces a role resolvable (Role | string) into a Role instance
 * @param {Guild} guild
 * @param {Role|string} roleResolvable
 * @returns {Role|null}
 */
function resolveRole(guild, roleResolvable) {
  assertGuild(guild);

  if (!roleResolvable) return null;
  if (typeof roleResolvable === 'string') {
    return (
      guild.roles.cache.get(roleResolvable) ||
      guild.roles.cache.find(role => role.name === roleResolvable) ||
      null
    );
  }

  return roleResolvable;
}

/**
 * Creates a role in the guild
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Role name
 * @param {Object} options - Role options (color, permissions, etc.)
 * @returns {Promise<Role>}
 */
async function createRole(guild, name, options = {}) {
  assertGuild(guild);
  if (!name) {
    throw new Error('Role name is required to create a role.');
  }

  const { reason, ...roleData } = options;
  return guild.roles.create({
    name,
    ...roleData,
    reason: reason || 'Role created via Mall Mystery Heroes bot',
  });
}

/**
 * Deletes a role
 * @param {Role} role - The role to delete
 * @param {string} reason - Optional audit-log reason
 * @returns {Promise<void>}
 */
async function deleteRole(role, reason = 'Role deleted via Mall Mystery Heroes bot') {
  if (!role) {
    throw new Error('A role instance is required to delete a role.');
  }

  if (!role.deletable) {
    throw new Error(`Role "${role.name}" cannot be deleted by the bot.`);
  }

  await role.delete(reason);
}

/**
 * Assigns a role to a member
 * @param {GuildMember} member - The guild member
 * @param {Role|string} role - The role to assign
 * @returns {Promise<Role>}
 */
async function assignRole(member, role) {
  if (!member) {
    throw new Error('A guild member is required to assign a role.');
  }

  const resolvedRole = resolveRole(member.guild, role);
  if (!resolvedRole) {
    throw new Error('Unable to find the specified role to assign.');
  }

  await member.roles.add(resolvedRole);
  return resolvedRole;
}

/**
 * Removes a role from a member
 * @param {GuildMember} member - The guild member
 * @param {Role|string} role - The role to remove
 * @returns {Promise<Role>}
 */
async function removeRole(member, role) {
  if (!member) {
    throw new Error('A guild member is required to remove a role.');
  }

  const resolvedRole = resolveRole(member.guild, role);
  if (!resolvedRole) {
    throw new Error('Unable to find the specified role to remove.');
  }

  await member.roles.remove(resolvedRole);
  return resolvedRole;
}

/**
 * Gets or creates a role by name
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Role name
 * @param {Object} options - Role options
 * @returns {Promise<Role>}
 */
async function getOrCreateRole(guild, name, options = {}) {
  assertGuild(guild);
  if (!name) {
    throw new Error('Role name is required.');
  }

  const existingRole = guild.roles.cache.find(role => role.name === name);
  if (existingRole) {
    return existingRole;
  }

  return createRole(guild, name, options);
}

module.exports = {
  createRole,
  deleteRole,
  assignRole,
  removeRole,
  getOrCreateRole
};

