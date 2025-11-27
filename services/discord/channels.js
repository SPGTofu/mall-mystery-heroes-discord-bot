/**
 * Discord channel management utilities
 * Handles creation, deletion, and management of Discord channels
 */

/**
 * Creates a channel in the guild
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Channel name
 * @param {Object} options - Channel options (type, permissions, etc.)
 * @returns {Promise<Channel>}
 */
async function createChannel(guild, name, options = {}) {
  try {
    const channelOptions = {
      name: name,
      type: options.type || 0, // 0 = text channel, 4 = category
      ...options
    };
    const channel = await guild.channels.create(channelOptions);
    return channel;
  } catch (error) {
    console.error(`Error creating channel ${name}:`, error);
    throw error;
  }
}

/**
 * Deletes a channel
 * @param {Channel} channel - The channel to delete
 * @returns {Promise<void>}
 */
async function deleteChannel(channel) {
  try {
    await channel.delete();
  } catch (error) {
    console.error(`Error deleting channel ${channel.name}:`, error);
    throw error;
  }
}

/**
 * Gets a channel by name (does not create if not found)
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Channel name
 * @param {number} channelType - Optional channel type (default: 0 for text channel)
 * @returns {Channel|null} The channel if found, null otherwise
 */
function getChannel(guild, name, channelType = 0) {
  if (!name || typeof name !== 'string') {
    return null;
  }
  
  return guild.channels.cache.find(
    ch => ch && ch.name && typeof ch.name === 'string' && 
         ch.name.toLowerCase() === name.toLowerCase() && 
         ch.type === channelType
  ) || null;
}

/**
 * Gets or creates a channel by name
 * @param {Guild} guild - The Discord guild
 * @param {string} name - Channel name
 * @param {Object} options - Channel options
 * @returns {Promise<Channel>}
 */
async function getOrCreateChannel(guild, name, options = {}) {
  // Validate name parameter
  if (!name || typeof name !== 'string') {
    throw new Error(`Invalid channel name: ${name}`);
  }
  
  // Try to find existing channel
  const channelType = options.type || 0;
  const channel = getChannel(guild, name, channelType);
  
  if (channel) {
    return channel;
  }
  
  // Create new channel if not found
  return await createChannel(guild, name, options);
}

module.exports = {
  createChannel,
  deleteChannel,
  getChannel,
  getOrCreateChannel
};

