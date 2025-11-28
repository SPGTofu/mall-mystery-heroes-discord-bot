/****
 * /broadcast command
 * Broadcasts a message to all players
 */

const CHANNELS = require('../../config/channels');
const { createErrorAnnouncement, createBroadcastAnnouncement } = require('../../services/discord/messages');
const { getChannel } = require('../../services/discord/channels');
const { ROLES } = require('../../config/roles');

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
    const playerRole = guild.roles.cache.find(r => r.name === ROLES.PLAYER);
    let errorMessage = 'Default Error Message'
    const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS)
    const messageContent = interaction.options.getString('broadcast');

    // Check if user is GM
    const member = interaction.member;
    const gmRole = guild.roles.cache.find(r => r.name === ROLES.GAME_MASTER);
    if (!gmRole || !member.roles.cache.has(gmRole.id)) {
      errorMessage = createErrorAnnouncement('Only Game Masters can broadcast.');
      await gmChannel.send({ embeds: [createErrorAnnouncement(`Player ${member} tried to broadcast but they are not a GM.`)]});
      return interaction.reply({
        embeds: [errorMessage],
        ephemeral: true
      })
    }

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
        embeds: [ ],
      ephemeral: true
      });
    }

    // Send message to the general channel
    const genMessage = createBroadcastAnnouncement('Broadcast:', messageContent)
    await generalChannel.send({ embeds: [genMessage] });

    // Report that the broadcast was sent to general channel
    const message = createBroadcastAnnouncement('Broadcast Sent', `I have sent this messsage to #general:\n ${messageContent}`)
    return gmChannel.send({
      embeds: [message]
    })
  },
};
