/**
 * Message reaction add event handler
 * Handles confirmation reactions (e.g., for /unalive command)
 */

const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return;

    // TODO: Implement reaction handling for confirmations
    // Example: Check if reaction is on a confirmation message
    // and handle the confirmed action (e.g., unalive)
    
    // Partial reactions need to be fetched
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }
  },
};

