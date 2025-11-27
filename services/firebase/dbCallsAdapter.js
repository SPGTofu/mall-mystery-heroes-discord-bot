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
 * @param {string} userID - Discord user ID (unique identifier)
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function addPlayerForRoom(playerName, userID, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    
    // Check if player already exists by user ID (unique identifier)
    const existingPlayer = await playersRef
      .where('userID', '==', userID)
      .get();
    
    if (!existingPlayer.empty) {
      throw new Error('User already in game');
    }
    
    // Add player with user ID as unique identifier
    await playersRef.add({
      name: playerName,
      userID: userID,
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

/**
 * Unmaps a player's targets and assassins (Admin SDK version)
 * @param {string} selectedPlayerName
 * @param {string} roomID
 */
async function unmapPlayers(selectedPlayerName, roomID) {
  const playersRef = db.collection('rooms').doc(roomID).collection('players');

  // Get selected player
  const playerSnapshot = await playersRef.where('name', '==', selectedPlayerName).get();
  if (playerSnapshot.empty) {
    console.error("Error unmapping: player not found:", selectedPlayerName);
    return;
  }

  const playerDoc = playerSnapshot.docs[0].ref;
  const playerData = playerSnapshot.docs[0].data();
  const playerAssassins = playerData.assassins || [];
  const playerTargets = playerData.targets || [];

  // Remove selected player from assassins' targets
  for (const assassinName of playerAssassins) {
    const assassinSnap = await playersRef.where('name', '==', assassinName).get();
    if (assassinSnap.empty) {
      console.error("Error unmapping assassin not found:", assassinName);
      continue;
    }
    const assassinDoc = assassinSnap.docs[0].ref;
    const assassinData = assassinSnap.docs[0].data();
    const newTargets = (assassinData.targets || []).filter(t => t !== selectedPlayerName);
    await assassinDoc.update({ targets: newTargets });
  }

  // Remove selected player from targets' assassins
  for (const targetName of playerTargets) {
    const targetSnap = await playersRef.where('name', '==', targetName).get();
    if (targetSnap.empty) {
      console.error("Error unmapping target not found:", targetName);
      continue;
    }
    const targetDoc = targetSnap.docs[0].ref;
    const targetData = targetSnap.docs[0].data();
    const newAssassins = (targetData.assassins || []).filter(a => a !== selectedPlayerName);
    await targetDoc.update({ assassins: newAssassins });
  }

  await playerDoc.update({ targets: [], assassins: [] });
}

/**
 * Kills a player in a room (Admin SDK version)
 * @param {string} playerName
 * @param {string} roomID
 */
async function killPlayerForRoom(playerName, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snap = await playersRef.where('name', '==', playerName).get();

    if (snap.empty) {
      throw new Error(`Player ${playerName} not found`);
    }

    // Unmap targets and assassins first
    await unmapPlayers(playerName, roomID);

    const playerDoc = snap.docs[0].ref;

    await playerDoc.update({
      score: 0,
      isAlive: false,
      openSeason: false,
      targets: [],
      targetsLength: 0,
      assassins: [],
      assassinsLength: 0
    });

    console.log(`Player ${playerName} killed in room ${roomID}.`);
  } catch (err) {
    console.error('Error killing player:', err);
    throw err;
  }
}

/**
 * Fetches a player from the room by name
 * Tries trimmed name first, then exact name match
 * Admin SDK version of fetchPlayerForRoom
 * @param {string} playerName - Player name
 * @param {string} roomID - Room ID
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>} Player document
 */
async function fetchPlayerForRoom(playerName, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const trimmedLowercaseName = playerName.replace(/\s/g, '').toLowerCase();
    
    // Try to find player by trimmed name first (most reliable)
    let playerQuery = await playersRef
      .where('trimmedNameLowerCase', '==', trimmedLowercaseName)
      .get();

    // If not found, try exact name match
    if (playerQuery.empty) {
      playerQuery = await playersRef
        .where('name', '==', playerName)
        .get();
    }
    
    if (playerQuery.empty) {
      throw new Error(`Player "${playerName}" not found in the game.`);
    }
    
    return playerQuery.docs[0];
  } catch (error) {
    console.error(`Error fetching player ${playerName}:`, error);
    throw error;
  }
}

/**
 * Sets open season status for a player
 * Admin SDK version of setOpenSznOfPlayerToValueForRoom
 * @param {string} playerName - Player name
 * @param {boolean} value - Open season value (true/false)
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function setOpenSeasonForPlayer(playerName, value, roomID) {
  try {
    const playerDoc = await fetchPlayerForRoom(playerName, roomID);
    await playerDoc.ref.update({
      openSeason: value,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Error setting open season for ${playerName}:`, error);
    throw error;
  }
}

/**
 * Checks if a player is in open season
 * Admin SDK version of checkOpenSzn
 * @param {string} playerName - Player name
 * @param {string} roomID - Room ID
 * @returns {Promise<boolean>} True if player is in open season
 */
async function checkOpenSeason(playerName, roomID) {
  try {
    const playerDoc = await fetchPlayerForRoom(playerName, roomID);
    const playerData = playerDoc.data();
    return playerData.openSeason === true;
  } catch (error) {
    console.error(`Error checking open season for ${playerName}:`, error);
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
  unmapPlayers,
  killPlayerForRoom,
  fetchPlayerForRoom,
  setOpenSeasonForPlayer,
  checkOpenSeason,
};
