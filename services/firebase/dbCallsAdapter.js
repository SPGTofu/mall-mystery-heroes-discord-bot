/**
 * Firebase Admin SDK adapter for dbCalls
 * Provides Admin SDK versions of functions from src/services/firebase/dbCalls.js
 */

const { db } = require('./config');

/**
 * Checks if roomID already exists
 * Admin SDK version of checkForRoomIDDupes
 * @param {string} roomID - Room ID
 * @returns {Promise<boolean>} True if room doesn't exist (can create), false if exists
 */
async function checkForRoomIDDupes(roomID) {
  try {
    const roomDocRef = db.collection('rooms').doc(roomID);
    const roomSnapshot = await roomDocRef.get();
    return !roomSnapshot.exists; // Admin SDK uses .exists (property), not .exists()
  } catch (error) {
    console.error('Error checking for room ID dupes:', error);
    throw error;
  }
}

/**
 * Creates or updates a room document
 * @param {string} roomID - Room ID
 * @param {Object} data - Room data
 * @returns {Promise<void>}
 */
async function createOrUpdateRoom(roomID, data) {
  try {
    const roomRef = db.collection('rooms').doc(roomID);
    await roomRef.set(data, { merge: true });
  } catch (error) {
    console.error('Error creating/updating room:', error);
    throw error;
  }
}

/**
 * Gets room document
 * @param {string} roomID - Room ID
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>}
 */
async function getRoom(roomID) {
  try {
    const roomRef = db.collection('rooms').doc(roomID);
    return await roomRef.get();
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
}

/**
 * Ends the game
 * Admin SDK version of endGame
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function endGame(roomID) {
  try {
    const roomRef = db.collection('rooms').doc(roomID);
    const roomSnapshot = await roomRef.get();

    if (roomSnapshot.exists) {
      await roomRef.update({ isGameActive: false });
      console.log('Game ended successfully.');
    } else {
      console.log('No such document!');
    }
  } catch (error) {
    console.error('Error ending game:', error);
    throw error;
  }
}

/**
 * Fetches all alive players for a room
 * @param {string} roomID - Room ID
 * @returns {Promise<Array<string>>} Array of player names
 */
async function fetchAlivePlayersForRoom(roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('isAlive', '==', true).get();
    return snapshot.docs.map(doc => doc.data().name);
  } catch (error) {
    console.error('Error fetching alive players:', error);
    throw error;
  }
}

/**
 * Adds a player to the room
 * @param {string} playerName - Player name
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function addPlayerForRoom(playerName, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const trimmedLowercaseName = playerName.replace(/\s/g, '').toLowerCase();
    
    // Check if player already exists
    const existingPlayer = await playersRef
      .where('trimmedNameLowerCase', '==', trimmedLowercaseName)
      .get();
    
    if (!existingPlayer.empty) {
      throw new Error('Player already exists');
    }
    
    // Add player
    await playersRef.add({
      name: playerName,
      trimmedNameLowerCase: trimmedLowercaseName,
      isAlive: true,
      score: 10,
      targets: [],
      targetsLength: 0,
      assassins: [],
      assassinsLength: 0,
      openSeason: false
    });
  } catch (error) {
    console.error('Error adding player:', error);
    throw error;
  }
}

/**
 * Updates targets for a player
 * @param {string} playerName - Player name
 * @param {Array<string>} targets - Array of target names
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function updateTargetsForPlayer(playerName, targets, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('name', '==', playerName).get();
    
    if (snapshot.empty) {
      throw new Error(`Player ${playerName} not found`);
    }
    
    const playerDoc = snapshot.docs[0];
    await playerDoc.ref.update({
      targets: targets,
      targetsLength: targets.length
    });
  } catch (error) {
    console.error('Error updating targets:', error);
    throw error;
  }
}

/**
 * Updates assassins for a player
 * @param {string} playerName - Player name
 * @param {Array<string>} assassins - Array of assassin names
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function updateAssassinsForPlayer(playerName, assassins, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('name', '==', playerName).get();
    
    if (snapshot.empty) {
      throw new Error(`Player ${playerName} not found`);
    }
    
    const playerDoc = snapshot.docs[0];
    await playerDoc.ref.update({
      assassins: assassins,
      assassinsLength: assassins.length
    });
  } catch (error) {
    console.error('Error updating assassins:', error);
    throw error;
  }
}

module.exports = {
  checkForRoomIDDupes,
  createOrUpdateRoom,
  getRoom,
  endGame,
  fetchAlivePlayersForRoom,
  addPlayerForRoom,
  updateTargetsForPlayer,
  updateAssassinsForPlayer,
};

