/**
 * Error handling utilities
 * Standardized error handling and error messages
 */

const { MessageFlags } = require('discord.js');

/**
 * Custom error class for game-related errors
 */
class GameError extends Error {
  constructor(message, code = 'GAME_ERROR') {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

/**
 * Custom error class for permission errors
 */
class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
    this.code = 'PERMISSION_ERROR';
  }
}

/**
 * Custom error class for validation errors
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

/**
 * Handles errors and sends appropriate response to Discord interaction
 * @param {Error} error - The error object
 * @param {Interaction} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
async function handleError(error, interaction) {
  let message = 'An error occurred.';
  
  if (error instanceof GameError) {
    message = error.message;
  } else if (error instanceof PermissionError) {
    message = `Permission denied: ${error.message}`;
  } else if (error instanceof ValidationError) {
    message = `Validation error: ${error.message}`;
  } else {
    console.error('Unexpected error:', error);
    message = 'An unexpected error occurred.';
  }

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  } catch (e) {
    console.error("Error sending error reply:", e);
  }
}

module.exports = {
  GameError,
  PermissionError,
  ValidationError,
  handleError,
};


