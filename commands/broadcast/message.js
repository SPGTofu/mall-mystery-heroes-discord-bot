/****
 * /broadcast command
 * Broadcasts a message to all players
 */

const CHANNELS = require('../../config/channels');
const { createErrorAnnouncement, createAnnouncement } = require('../../services/discord/messages');
const { getChannel } = require('../../services/discord/channels');

// Export the /broadcast command definition used by Discord
module.exports = {
  name: 'broadcast',
  description: 'Broadcast a message to all players',

  // Command option: text message that will be broadcast to all players
  options: [
    {
      name: 'broadcast',
      type: 3,
      description: 'Message to broadcast to all players',
      required: true
    }
  ],

  // Main handler: executes when a user runs /broadcast
  async execute(interaction) {
    // Access the current guild and look up the Player role
    const guild = interaction.guild;
    const playerRole = guild.roles.cache.find(r => r.name === 'Player');
    let errorMessage = 'Default Error Message'
    const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS)
    const messageContent = interaction.options.getString('message');

    // If the Player role does not exist, the broadcast cannot proceed
    if (!playerRole) {
      errorMessage = createErrorAnnouncement(`Player role not found. Cannot broadcast the following message:\n ${messageContent}`);
      await gmChannel.send({ embeds: [errorMessage] });
      return interaction.reply({
        content: 'Player role not found. Cannot broadcast.',
        ephemeral: true
      });
    }

    // Extract the broadcast message content from the command input
    if (!messageContent) {
      return interaction.reply({
        content: 'Please provide a message to broadcast.',
        ephemeral: true
      });
    }

    // Find the general channel using centralized config
    const generalChannel = guild.channels.cache.find(
      ch => ch.name === CHANNELS.GENERAL
    );

    if (!generalChannel) {
      errorMessage = createErrorAnnouncement('General channel not found. Cannot broadcast.');
      await gmChannel.send({ embeds: [errorMessage] });
      return interaction.reply({
        embeds: [errorMessage],
        ephemeral: true
      });
    }

    // Send message to the general channel
    await generalChannel.send(messageContent);

    // Report that the broadcast was sent to general channel
    const message = createAnnouncement(`Broadcast Sent', 'I hae sent a messsage to #general:\n ${messageContent}`)
    return interaction.reply({
      content: 'Broadcast sent to #general.',
      ephemeral: true
    });
  },
};
