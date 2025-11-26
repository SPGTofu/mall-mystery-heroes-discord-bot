/**
 * Event registration
 * Auto-registers events from events/ directory
 */

const fs = require('fs');
const path = require('path');

/**
 * Registers all events from the events directory
 * @param {Client} client - The Discord client
 * @returns {void}
 */
function registerEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    
    console.log(`Registered event: ${event.name}`);
  }
}

module.exports = {
  registerEvents,
};

