/**
 * /game join command
 * Allows a player to join an active game
 */

const { PermissionError, GameError, handleError } = require('../../utils/errors');
const { isGameMaster, isAdmin } = require('../../services/discord/permissions');
const { getRoom, addPlayerForRoom } = require('../../services/firebase/dbCallsAdapter');
const { getOrCreateRole, getOrCreateAliveRole, assignRole } = require('../../services/discord/roles');
const { createChannel, getChannel } = require('../../services/discord/channels');
const { createEmbed, createAnnouncement } = require('../../services/discord/messages');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const CHANNELS = require('../../config/channels');
const { ROLES } = require('../../config/roles');

module.exports = {
  name: 'join',
  description: 'Join an active game',
  options: [
    {
      name: 'name',
      description: 'Your first and last name',
      type: 3, // STRING
      required: true,
    },
  ],
  async execute(interaction) {
    try {
      // Block Game Masters and Admins from joining (they manage the game, not play it)
      if (isGameMaster(interaction.member) || isAdmin(interaction.member)) {
        throw new PermissionError('Game Masters and Admins cannot join the game as players.');
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const roomID = guild.id;
      const playerName = interaction.options.getString('name');
      const member = interaction.member;

      // Validate player name
      if (!playerName || playerName.trim().length === 0) {
        throw new GameError('Please provide a valid name. Name provided: ' + playerName);
      }

      // Check if room/game exists
      const roomSnapshot = await getRoom(roomID);
      if (!roomSnapshot.exists) {
        throw new GameError('No game has been created yet. A Game Master must create a game first using `/game create`.');
      }

      // Check if game is already active (can't join after game starts)
      const roomData = roomSnapshot.data();
      if (roomData.isGameActive) {
        throw new GameError('The game has already started. You cannot join now.');
      }

      await interaction.editReply('Joining game...');

      // Check if user is already in the game
      const userID = member.user.id;

      // Add player to backend
      try {
        await addPlayerForRoom(playerName.trim(), userID, roomID);
      } catch (error) {
        if (error.message === 'User already in game') {
          throw new GameError('You are already in the game. You cannot join twice.');
        }
        throw error;
      }

      // Get or create Player role
      const playerRole = await getOrCreateRole(guild, ROLES.PLAYER);
      
      // Get or create Alive role (with hoist enabled to group members)
      const aliveRole = await getOrCreateAliveRole(guild);

      // Assign roles
      await assignRole(member, playerRole);
      await assignRole(member, aliveRole);

      // Change user's nickname to their real name
      try {
        await member.setNickname(playerName.trim());
      } catch (error) {
        console.warn(`Could not set nickname for ${member.user.tag}:`, error);
        // Continue even if nickname can't be set (might not have permission)
      }

      // Find DMs category
      const dmsCategory = guild.channels.cache.find(
        ch => ch.type === 4 && ch.name.toLowerCase() === CHANNELS.DMS_CATEGORY.toLowerCase()
      );

      if (!dmsCategory) {
        throw new GameError('DMs category not found. Please ensure the game has been created properly.');
      }

      // Create DM channel for player (in DMs category)
      const channelName = playerName.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Find GM role to get GM members
      const gmRole = guild.roles.cache.find(r => r.name === ROLES.GAME_MASTER);
      const gmMembers = gmRole ? gmRole.members : new Map();

      // Set up permission overwrites for the DM channel
      const permissionOverwrites = [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: member.id, // Player
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: guild.members.me.id, // Bot
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels],
        },
      ];

      // Add GM members to permission overwrites
      gmMembers.forEach(gmMember => {
        permissionOverwrites.push({
          id: gmMember.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      });

      const dmChannel = await createChannel(guild, channelName, {
        type: 0, // Text channel
        parent: dmsCategory.id,
        permissionOverwrites: permissionOverwrites,
      });

      // Send welcome message in DM channel
      const welcomeEmbed = createEmbed({
        title: 'Welcome to the Game!',
        description: `Welcome, ${playerName}! 👋\n\nThis is your private channel for communicating with Game Masters about your targets and game-related questions.\n\n**Before the game starts:**\n- Feel free to @Game Master here to test that everything is working\n- Ask any questions you have about the game\n\n**Once the game starts:**\n- You'll receive your target assignments here\n- Game Masters will communicate important updates\n- Keep this channel private and don't share your targets!`,
        color: 0x00ff00,
        footer: { text: 'Good luck and have fun!' },
      });

      await dmChannel.send({ embeds: [welcomeEmbed] });
      await dmChannel.send(`<@${member.id}>, please @Game Master here to test that everything is working before the game starts!`);

      await interaction.editReply(`✅ Successfully joined the game as **${playerName}**! Check your DM channel in the DMs category.`);

      const gmChannel = getChannel(guild, CHANNELS.GAME_MASTERS);
      const gmEmbed = createAnnouncement('Player Joined', `<@${member.id}> has joined the game.`);
      await gmChannel.send({ embeds: [gmEmbed]});
    } catch (error) {
      console.error('Error in /game join:', error);
      await handleError(error, interaction);
    }
  },
};
