/**
 * Discord role management utilities
 * Handles creation, deletion, and assignment of Discord roles
 */

const { ROLES, ROLE_COLORS } = require('../../config/roles');

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
 * @throws {Error} If role cannot be assigned (permissions, hierarchy, etc.)
 */
async function assignRole(member, role) {
  if (!member) {
    throw new Error('A guild member is required to assign a role.');
  }

  const resolvedRole = resolveRole(member.guild, role);
  if (!resolvedRole) {
    throw new Error('Unable to find the specified role to assign.');
  }

  try {
    await member.roles.add(resolvedRole);
    return resolvedRole;
  } catch (error) {
    // Provide more helpful error messages for permission issues
    if (error.code === 50013) {
      const botMember = member.guild.members.me;
      const botHighestRole = botMember?.roles.highest;
      
      // Build detailed diagnostic message
      let diagnosticMessage = `Missing permissions to assign role "${resolvedRole.name}".\n`;
      
      if (botMember) {
        const hasManageRoles = botMember.permissions.has('ManageRoles');
        diagnosticMessage += `- Bot has "Manage Roles" permission: ${hasManageRoles ? 'Yes' : 'No'}\n`;
        
        if (botHighestRole) {
          diagnosticMessage += `- Bot's highest role: "${botHighestRole.name}" (position: ${botHighestRole.position})\n`;
          diagnosticMessage += `- Target role "${resolvedRole.name}" position: ${resolvedRole.position}\n`;
          
          if (resolvedRole.position >= botHighestRole.position) {
            diagnosticMessage += `- ❌ Problem: The "${resolvedRole.name}" role is positioned at or above the bot's role!\n`;
            diagnosticMessage += `  Solution: Move the bot's role above "${resolvedRole.name}" in Server Settings > Roles, or delete and recreate the game roles.`;
          } else {
            diagnosticMessage += `- ✅ Hierarchy is correct, but permission error occurred. Check bot permissions.`;
          }
        } else {
          diagnosticMessage += `- Bot has no roles assigned.`;
        }
      } else {
        diagnosticMessage += `- Could not fetch bot member information.`;
      }
      
      throw new Error(diagnosticMessage);
    }
    throw error;
  }
}

/**
 * Removes a role from a member
 * @param {GuildMember} member - The guild member
 * @param {Role|string} role - The role to remove
 * @returns {Promise<Role>}
 * @throws {Error} If role cannot be removed (permissions, hierarchy, etc.)
 */
async function removeRole(member, role) {
  if (!member) {
    throw new Error('A guild member is required to remove a role.');
  }

  const resolvedRole = resolveRole(member.guild, role);
  if (!resolvedRole) {
    throw new Error('Unable to find the specified role to remove.');
  }

  try {
    await member.roles.remove(resolvedRole);
    return resolvedRole;
  } catch (error) {
    // Provide more helpful error messages for permission issues
    if (error.code === 50013) {
      const botMember = member.guild.members.me;
      const botHighestRole = botMember?.roles.highest;
      
      // Build detailed diagnostic message
      let diagnosticMessage = `Missing permissions to remove role "${resolvedRole.name}".\n`;
      
      if (botMember) {
        const hasManageRoles = botMember.permissions.has('ManageRoles');
        diagnosticMessage += `- Bot has "Manage Roles" permission: ${hasManageRoles ? 'Yes' : 'No'}\n`;
        
        if (botHighestRole) {
          diagnosticMessage += `- Bot's highest role: "${botHighestRole.name}" (position: ${botHighestRole.position})\n`;
          diagnosticMessage += `- Target role "${resolvedRole.name}" position: ${resolvedRole.position}\n`;
          
          if (resolvedRole.position >= botHighestRole.position) {
            diagnosticMessage += `- ❌ Problem: The "${resolvedRole.name}" role is positioned at or above the bot's role!\n`;
            diagnosticMessage += `  Solution: Move the bot's role above "${resolvedRole.name}" in Server Settings > Roles, or delete and recreate the game roles.`;
          } else {
            diagnosticMessage += `- ✅ Hierarchy is correct, but permission error occurred. Check bot permissions.`;
          }
        } else {
          diagnosticMessage += `- Bot has no roles assigned.`;
        }
      } else {
        diagnosticMessage += `- Could not fetch bot member information.`;
      }
      
      throw new Error(diagnosticMessage);
    }
    throw error;
  }
}

/**
 * Repositions an existing role below the bot's highest role
 * @param {Role} role - The role to reposition
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<boolean>} True if repositioned, false otherwise
 */
async function repositionRoleBelowBot(role, guild) {
  try {
    const botMember = guild.members.me;
    if (!botMember || !botMember.roles.highest) {
      return false;
    }

    const botHighestRole = botMember.roles.highest;
    const targetPosition = botHighestRole.position - 1;
    
    // Only reposition if the role is currently at or above the bot's role
    // Position 0 is the lowest, higher numbers are higher in hierarchy
    const originalPosition = role.position;
    if (originalPosition >= botHighestRole.position && targetPosition >= 0) {
      await role.setPosition(targetPosition, {
        reason: 'Repositioning role below bot for management'
      });
      console.log(`Repositioned role "${role.name}" from position ${originalPosition} to ${targetPosition} (below bot's role)`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn(`Could not reposition role "${role.name}" below bot's role:`, error.message);
    return false;
  }
}

/**
 * Gets or creates a role by name
 * Automatically positions the role below the bot's highest role to ensure the bot can manage it
 * Also attempts to fix existing roles that are positioned incorrectly
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
    // Try to fix position if it's above the bot's role
    await repositionRoleBelowBot(existingRole, guild);
    return existingRole;
  }

  // Calculate the target position to be below the bot's role
  let targetPosition = 0; // Default to bottom
  const botMember = guild.members.me;
  if (botMember && botMember.roles.highest) {
    const botHighestRole = botMember.roles.highest;
    // Position should be below the bot's role (position - 1)
    // But ensure it's at least 0 (can't be negative)
    targetPosition = Math.max(0, botHighestRole.position - 1);
  }

  // Create the role with the calculated position
  // Note: If position is specified and the bot can't set it there, Discord will place it at the bottom
  const role = await createRole(guild, name, {
    ...options,
    position: targetPosition,
  });

  // Verify the role ended up in the right position, and try to fix if needed
  // (Sometimes Discord may ignore the position if the bot doesn't have permission)
  if (role.position >= targetPosition + 1) {
    // Role ended up higher than intended, try to reposition
    await repositionRoleBelowBot(role, guild);
  }

  return role;
}

/**
 * Gets or creates the Game Master role
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<Role>}
 */
async function getOrCreateGameMasterRole(guild) {
  return getOrCreateRole(guild, ROLES.GAME_MASTER, {
    color: ROLE_COLORS.GAME_MASTER,
    reason: 'Game Master role needed for Mall Mystery Heroes',
  });
}

/**
 * Gets or creates the Player role
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<Role>}
 */
async function getOrCreatePlayerRole(guild) {
  return getOrCreateRole(guild, ROLES.PLAYER, {
    color: ROLE_COLORS.PLAYER,
    reason: 'Player role needed for Mall Mystery Heroes',
  });
}

/**
 * Gets or creates the Alive role (with hoist enabled to group members)
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<Role>}
 */
async function getOrCreateAliveRole(guild) {
  return getOrCreateRole(guild, ROLES.ALIVE, {
    color: ROLE_COLORS.ALIVE,
    hoist: true, // Display members with this role separately in the member list
    reason: 'Alive role needed for Mall Mystery Heroes',
  });
}

/**
 * Gets or creates the Dead role
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<Role>}
 */
async function getOrCreateDeadRole(guild) {
  return getOrCreateRole(guild, ROLES.DEAD, {
    color: ROLE_COLORS.DEAD,
    reason: 'Dead role needed for Mall Mystery Heroes',
  });
}

/**
 * Gets or creates the Open Season role
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<Role>}
 */
async function getOrCreateOpenSeasonRole(guild) {
  return getOrCreateRole(guild, ROLES.OPEN_SEASON, {
    color: ROLE_COLORS.OPEN_SEASON,
    reason: 'Dead role needed for Mall Mystery Heroes',
  });
}

/**
 * Gets or creates all roles needed for a game
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<null>}
 */
async function getOrCreateAllRolesForRoom(guild) {
  try {
    await getOrCreateGameMasterRole(guild);
    await getOrCreatePlayerRole(guild);
    await getOrCreateAliveRole(guild);
    await getOrCreateDeadRole(guild);
    await getOrCreateOpenSeasonRole(guild);
  } catch (e) {
    throw new Error('Error creating all roles for the room: ', e);
  }
}

/**
 * Deletes all game-specific roles created by the bot
 * @param {Guild} guild
 * @returns {Promise<void>}
 */
async function deleteAllRolesForRoom(guild) {
  assertGuild(guild);

  const roleNames = [
    ROLES.GAME_MASTER,
    ROLES.PLAYER,
    ROLES.ALIVE,
    ROLES.DEAD,
    ROLES.OPEN_SEASON
  ];

  for (const roleName of roleNames) {
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (role) {
      try {
        await deleteRole(role);
      } catch (error) {
        console.warn(`Unable to delete role "${roleName}":`, error.message);
      }
    }
  }
}

module.exports = {
  createRole,
  deleteRole,
  assignRole,
  removeRole,
  getOrCreateRole,
  getOrCreateGameMasterRole,
  getOrCreatePlayerRole,
  getOrCreateAliveRole,
  getOrCreateDeadRole,
  getOrCreateOpenSeasonRole,
  getOrCreateAllRolesForRoom
};

