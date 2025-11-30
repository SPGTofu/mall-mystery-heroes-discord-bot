/****
 * /broadcast command
 * Broadcasts a message to all players
 */

const CHANNELS = require('../../config/channels');
const { createErrorAnnouncement, createBroadcastAnnouncement } = require('../../services/discord/messages');
const { getChannel } = require('../../services/discord/channels');
const { ROLES } = require('../../config/roles');
const { MessageFlags } = require('discord.js');
const { getRoom } = require('../../services/firebase/dbCallsAdapter');

// Export the /broadcast command definition used by Discord
module.exports = {
  name: 'broadcast',
  description: 'Broadcast a message to all players',

  // Command option: text message that will be broadcast to all players
  options: [
    {
      name: 'message',
      type: 3,
      description: 'Message to broadcast to all players',
      required: true
    }
  ],

  // Main handler: executes when a user runs /broadcast
  async execute(interaction) {
    const guild = interaction.guild;
    const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS)

    const notifyGMChannel = async (embed) => {
      if (!embed) return;
      if (gmChannel) {
        try {
          await gmChannel.send({ embeds: [embed] });
        } catch (err) {
          console.error('Unable to send message to Game Masters channel:', err);
        }
      } else {
        console.warn('Game Masters channel not found. Skipping GM notification.');
      }
    };
    try {
      // Access the current guild and look up the Player role
      const playerRole = guild.roles.cache.find(r => r.name === ROLES.PLAYER);
      let errorMessage = 'Default Error Message'
      const messageContent = interaction.options.getString('message');
  
      // Check if user is GM
      const member = interaction.member;
      const gmRole = guild.roles.cache.find(r => r.name === ROLES.GAME_MASTER);
      if (!gmRole || !member.roles.cache.has(gmRole.id)) {
        errorMessage = createErrorAnnouncement('Only Game Masters can broadcast.');
        await notifyGMChannel(createErrorAnnouncement(`Player ${member} tried to broadcast but they are not a GM.`));
        return interaction.reply({
          embeds: [errorMessage],
          ephemeral: true
        })
      }
  
      // Ensure a game exists and has started
      const roomSnapshot = await getRoom(guild.id);
      if (!roomSnapshot.exists) {
        errorMessage = createErrorAnnouncement('No game exists yet. Use `/game create` and `/game start` before broadcasting.');
        await notifyGMChannel(errorMessage);
        return interaction.reply({
          embeds: [errorMessage],
          ephemeral: true
        });
      }

      const roomData = roomSnapshot.data() || {};
      if (!roomData.isGameActive) {
        errorMessage = createErrorAnnouncement('The game has not started yet. Start the game before broadcasting.');
        await notifyGMChannel(errorMessage);
        return interaction.reply({
          embeds: [errorMessage],
          ephemeral: true
        });
      }

      // If the Player role does not exist, the broadcast cannot proceed
      if (!playerRole) {
        errorMessage = createErrorAnnouncement(`Player role not found. Cannot broadcast the following message:\n ${messageContent}`);
        await notifyGMChannel(errorMessage);
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
        await notifyGMChannel(errorMessage);
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
      await notifyGMChannel(message);
      return interaction.reply({
        content: 'Broadcasted',
        ephemeral: true
      })
    } catch (e) {
      const errMessage = createErrorAnnouncement(`Error sending broadcast: ${e}`);
      await notifyGMChannel(errMessage);
      return interaction.reply({
        embeds: [errMessage],
        flags: MessageFlags.Ephemeral
      })
    }
  },
};
