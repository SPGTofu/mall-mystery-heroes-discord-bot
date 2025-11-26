/**
 * Discord role management utilities
 * Handles creation, deletion, and assignment of Discord roles
 */

/**
 * Creates a role in the guild
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Role name
 * @param {Object} options - Role options (color, permissions, etc.)
 * @returns {Promise<Role>}
 */
async function createRole(guild, name, options = {}) {
  try {
    const roleOptions = {
      name: name,
      ...options
    };
    const role = await guild.roles.create(roleOptions);
    return role;
  } catch (error) {
    console.error(`Error creating role ${name}:`, error);
    throw error;
  }
}

/**
 * Deletes a role
 * @param {Role} role - The role to delete
 * @returns {Promise<void>}
 */
async function deleteRole(role) {
  try {
    await role.delete();
  } catch (error) {
    console.error(`Error deleting role ${role.name}:`, error);
    throw error;
  }
}

/**
 * Assigns a role to a member
 * @param {GuildMember} member - The guild member
 * @param {Role} role - The role to assign
 * @returns {Promise<void>}
 */
async function assignRole(member, role) {
  try {
    await member.roles.add(role);
  } catch (error) {
    console.error(`Error assigning role ${role.name} to ${member.user.tag}:`, error);
    throw error;
  }
}

/**
 * Removes a role from a member
 * @param {GuildMember} member - The guild member
 * @param {Role} role - The role to remove
 * @returns {Promise<void>}
 */
async function removeRole(member, role) {
  try {
    await member.roles.remove(role);
  } catch (error) {
    console.error(`Error removing role ${role.name} from ${member.user.tag}:`, error);
    throw error;
  }
}

/**
 * Gets or creates a role by name
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Role name
 * @param {Object} options - Role options
 * @returns {Promise<Role>}
 */
async function getOrCreateRole(guild, name, options = {}) {
  // Try to find existing role
  const role = guild.roles.cache.find(r => r.name === name);
  
  if (role) {
    return role;
  }
  
  // Create new role if not found
  return await createRole(guild, name, options);
}

module.exports = {
  createRole,
  deleteRole,
  assignRole,
  removeRole,
  getOrCreateRole,
};

