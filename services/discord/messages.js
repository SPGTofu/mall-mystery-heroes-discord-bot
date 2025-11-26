/**
 * Discord message formatting utilities
 * Handles creation of embeds, announcements, and DMs
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Creates a formatted embed message
 * @param {Object} options - Embed options (title, description, color, fields, etc.)
 * @returns {EmbedBuilder}
 */
function createEmbed(options = {}) {
  const embed = new EmbedBuilder();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.color) embed.setColor(options.color);
  if (options.fields) {
    options.fields.forEach(field => {
      embed.addFields(field);
    });
  }
  if (options.timestamp) embed.setTimestamp();
  if (options.footer) embed.setFooter(options.footer);

  return embed;
}

/**
 * Sends a DM to a user
 * @param {User} user - The Discord user
 * @param {string|EmbedBuilder} content - Message content or embed
 * @returns {Promise<Message>}
 */
async function sendDM(user, content) {
  // TODO: Implement DM sending
  throw new Error('DM sending not yet implemented');
}

/**
 * Creates an announcement message
 * @param {string} title - Announcement title
 * @param {string} message - Announcement message
 * @returns {EmbedBuilder}
 */
function createAnnouncement(title, message) {
  return createEmbed({
    title,
    description: message,
    color: 0x00ff00, // Green
    timestamp: new Date(),
  });
}

module.exports = {
  createEmbed,
  sendDM,
  createAnnouncement,
};

