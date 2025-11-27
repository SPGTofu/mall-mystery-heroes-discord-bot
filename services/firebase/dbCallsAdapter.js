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
 * Fetches all players for a room (regardless of alive status)
 * @param {string} roomID - Room ID
 * @returns {Promise<Array<Object>>} Array of player documents with data
 */
async function fetchAllPlayersForRoom(roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching all players:', error);
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
 * Fetches all players for a room with their data, sorted by score (descending)
 * @param {string} roomID - Room ID
 * @returns {Promise<Array<Object>>} Array of player data objects with name, score, isAlive
 */
async function fetchAllPlayersWithScores(roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.get();
    
    const players = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.name || 'Unknown',
        score: data.score || 0,
        isAlive: data.isAlive || false,
      };
    });
    
    // Sort by score descending, then by isAlive (alive players first)
    players.sort((a, b) => {
      if (a.isAlive !== b.isAlive) {
        return b.isAlive ? 1 : -1; // Alive players first
      }
      return b.score - a.score; // Higher score first
    });
    
    return players;
  } catch (error) {
    console.error('Error fetching all players with scores:', error);
    throw error;
  }
}

/**
 * Gets a player by user ID
 * @param {string} userID - Discord user ID
 * @param {string} roomID - Room ID
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot|null>} Player document snapshot or null if not found
 */
async function getPlayerByUserID(userID, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('userID', '==', userID).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0];
  } catch (error) {
    console.error('Error getting player by user ID:', error);
    throw error;
  }
}

/**
 * Fetches every player document for a room
 * @param {string} roomID - Room ID
 * @returns {Promise<Array<FirebaseFirestore.QueryDocumentSnapshot>>}
 */
async function fetchAllPlayersForRoom(roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.get();
    return snapshot.docs;
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
}

/**
 * Fetches a player document based on Discord user ID
 * @param {string} userID - Discord user ID
 * @param {string} roomID - Room ID
 * @returns {Promise<FirebaseFirestore.QueryDocumentSnapshot>}
 */
async function fetchPlayerByUserIdForRoom(userID, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('userID', '==', userID).limit(1).get();

    if (snapshot.empty) {
      throw new Error(`Player with user ID ${userID} not found in room ${roomID}.`);
    }

    return snapshot.docs[0];
  } catch (error) {
    console.error(`Error fetching player by user ID ${userID}:`, error);
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
 * Updates a player's points (Admin SDK)
 * Accepts either a Discord userID or a player name to identify the player document
 * @param {string} playerIdentifier - userID or player name
 * @param {number} points - points to add
 * @param {string} roomID
 * @returns {Promise<number>} new points total
 */
async function updatePointsForPlayer(playerIdentifier, points, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');

    // Try to find by userID first
    let snapshot = await playersRef.where('userID', '==', playerIdentifier).get();

    // Fallback: try to find by name
    if (snapshot.empty) {
      snapshot = await playersRef.where('name', '==', playerIdentifier).get();
    }

    if (snapshot.empty) {
      throw new Error(`Player not found: ${playerIdentifier}`);
    }

    const playerDoc = snapshot.docs[0];
    const currScore = parseInt(playerDoc.data().score) || 0;
    const newScore = currScore + Number(points || 0);

    await playerDoc.ref.update({ score: newScore });
    return newScore;
  } catch (error) {
    console.error('Error updating player points:', error);
    throw error;
  }
}

/**
 * Sets a player's score to an exact value (Admin SDK)
 * @param {string} playerIdentifier - userID or player name
 * @param {number} points - absolute points value to set
 * @param {string} roomID
 * @returns {Promise<number>} new points total
 */
async function setPointsForPlayer(playerIdentifier, points, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');

    // Try by userID first
    let snapshot = await playersRef.where('userID', '==', playerIdentifier).get();
    if (snapshot.empty) {
      snapshot = await playersRef.where('name', '==', playerIdentifier).get();
    }

    if (snapshot.empty) throw new Error(`Player not found: ${playerIdentifier}`);

    const playerDoc = snapshot.docs[0];
    await playerDoc.ref.update({ score: Number(points || 0) });
    return Number(points || 0);
  } catch (error) {
    console.error('Error setting player points:', error);
    throw error;
  }
}

/**
 * Sets the 'isAlive' flag for a player (Admin SDK)
 * @param {string} playerIdentifier - userID or player name
 * @param {boolean} isAlive
 * @param {string} roomID
 * @returns {Promise<void>}
 */
async function setIsAliveForPlayer(playerIdentifier, isAlive, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');

    // Try userID first
    let snapshot = await playersRef.where('userID', '==', playerIdentifier).get();
    if (snapshot.empty) {
      snapshot = await playersRef.where('name', '==', playerIdentifier).get();
    }

    if (snapshot.empty) throw new Error(`Player not found: ${playerIdentifier}`);

    const playerDoc = snapshot.docs[0];
    await playerDoc.ref.update({ isAlive: Boolean(isAlive) });
  } catch (error) {
    console.error('Error setting player isAlive:', error);
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
 * Fetches a player from the room by user ID
 * Admin SDK version of fetchPlayerForRoom
 * @param {string} userID - Discord user ID (unique identifier)
 * @param {string} roomID - Room ID
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>} Player document
 */
async function fetchPlayerForRoom(userID, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('userID', '==', userID).get();
    
    if (snapshot.empty) {
      throw new Error(`Player with userID "${userID}" not found in the game.`);
    }
    
    return snapshot.docs[0];
  } catch (error) {
    console.error(`Error fetching player with userID ${userID}:`, error);
    throw error;
  }
}

/**
 * Sets open season status for a player
 * Admin SDK version of setOpenSznOfPlayerToValueForRoom
 * @param {string} userID - Discord user ID (unique identifier)
 * @param {boolean} value - Open season value (true/false)
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function setOpenSeasonForPlayer(userID, value, roomID) {
  try {
    const playerDoc = await fetchPlayerForRoom(userID, roomID);
    await playerDoc.ref.update({
      openSeason: value,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Error setting open season for userID ${userID}:`, error);
    throw error;
  }
}

/**
 * Checks if a player is in open season
 * Admin SDK version of checkOpenSzn
 * @param {string} userID - Discord user ID (unique identifier)
 * @param {string} roomID - Room ID
 * @returns {Promise<boolean>} True if player is in open season
 */
async function checkOpenSeason(userID, roomID) {
  try {
    const playerDoc = await fetchPlayerForRoom(userID, roomID);
    const playerData = playerDoc.data();
    return playerData.openSeason === true;
  } catch (error) {
    console.error(`Error checking open season for userID ${userID}:`, error);
  }
}

/**
 * Removes a player from the room (deletes the player document)
 * @param {string} userID - Discord user ID (unique identifier)
 * @param {string} roomID - Room ID
 * @returns {Promise<void>}
 */
async function removePlayerForRoom(userID, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('userID', '==', userID).get();

    if (snapshot.empty) {
      throw new Error(`Player with userID ${userID} not found`);
    }

    const playerDoc = snapshot.docs[0];
    const playerData = playerDoc.data();
    const playerName = playerData.name;

    // Kill the player first (unmaps targets/assassins and updates the document)
    await killPlayerForRoom(playerName, roomID);

    // Delete the player document
    await playerDoc.ref.delete();

    console.log(`Player ${playerName} (userID: ${userID}) removed from room ${roomID}.`);
  } catch (error) {
    console.error('Error removing player:', error);
    throw error;
  }
}

/**
 * Generates and assigns targets to all players in a room
 * Uses the target assignment service to generate targets, then updates the database
 * @param {string} roomID - Room ID
 * @returns {Promise<Map>} Map of playerName -> array of target names
 */
async function generateAndAssignTargets(roomID) {
  try {
    const { generateTargets } = require('../game/targetAssignment');
    
    // Fetch all players
    const players = await fetchAllPlayersForRoom(roomID);
    const playerNames = players.map(p => p.name);
    
    if (playerNames.length === 0) {
      throw new Error('No players found in room');
    }
    
    // Generate targets using the service
    const { targetMap, playerData } = generateTargets(playerNames);
    
    // Update database with targets and assassins
    for (const playerName of playerNames) {
      const playerAssassins = playerData[playerName]?.assassins || [];
      await updateTargetsForPlayer(playerName, targetMap.get(playerName) || [], roomID);
      await updateAssassinsForPlayer(playerName, playerAssassins, roomID);
    }
    
    return targetMap;
  } catch (error) {
    console.error('Error generating and assigning targets:', error);
    throw error;
  }
}

/**
 * Checks if a user is in any other active game (excluding the current room)
 * @param {string} userID - Discord user ID
 * @param {string} currentRoomID - Current room ID to exclude from check
 * @returns {Promise<{isInOtherGame: boolean, roomID: string|null}>} Object indicating if user is in another game and which room
 */
async function checkUserInOtherActiveGame(userID, currentRoomID) {
  try {
    // Get all rooms
    const roomsSnapshot = await db.collection('rooms').get();
    
    for (const roomDoc of roomsSnapshot.docs) {
      const roomID = roomDoc.id;
      
      // Skip the current room
      if (roomID === currentRoomID) {
        continue;
      }
      
      // Check if this room has an active game
      const roomData = roomDoc.data();
      if (!roomData.isGameActive) {
        continue;
      }
      
      // Check if user is a player in this room
      const playersRef = roomDoc.ref.collection('players');
      const playerSnapshot = await playersRef.where('userID', '==', userID).get();
      
      if (!playerSnapshot.empty) {
        return { isInOtherGame: true, roomID: roomID };
      }
    }
    
    return { isInOtherGame: false, roomID: null };
  } catch (error) {
    console.error('Error checking user in other active game:', error);
    throw error;
  }
}

/**
 * Validates that all players in a room are not in any other active game
 * @param {string} roomID - Room ID to validate players for
 * @returns {Promise<{isValid: boolean, conflicts: Array<{userID: string, name: string, otherRoomID: string}>}>}
 */
async function validatePlayersNotInOtherActiveGames(roomID) {
  try {
    const players = await fetchAllPlayersForRoom(roomID);
    const conflicts = [];
    
    for (const player of players) {
      const userID = player.userID;
      if (!userID) {
        continue; // Skip players without userID
      }
      
      const checkResult = await checkUserInOtherActiveGame(userID, roomID);
      if (checkResult.isInOtherGame) {
        conflicts.push({
          userID: userID,
          name: player.name,
          otherRoomID: checkResult.roomID
        });
      }
    }
    
    return {
      isValid: conflicts.length === 0,
      conflicts: conflicts
    };
  } catch (error) {
    console.error('Error validating players not in other active games:', error);
    throw error;
  }
}


/**
 * Fetches targets for a player (including open season players)
 * Admin SDK version of fetchTargetsForPlayer
 * @param {string} playerName - Player name
 * @param {string} roomID - Room ID
 * @returns {Promise<Array<string>>} Array of target names
 */
async function fetchTargetsForPlayer(playerName, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');

    // Fetch player and open season players in parallel
    const [playerSnapshot, openSeasonSnapshot] = await Promise.all([
      playersRef.where('name', '==', playerName).get(),
      playersRef.where('openSeason', '==', true).get()
    ]);

    let targets = [];
    if (!playerSnapshot.empty) {
      const playerTargets = playerSnapshot.docs[0].data().targets || [];
      const openSeasonPlayers = openSeasonSnapshot.docs.map(doc => doc.data().name);

      // Find if the player is in open season
      let foundIndex = -1;
      for (let k = 0; k < openSeasonPlayers.length; k++) {
        if (playerName === openSeasonPlayers[k]) {
          foundIndex = k;
          break;
        }
      }

      // If player is in open season, remove them from the list
      if (foundIndex !== -1) {
        const newOpenSzn = [...openSeasonPlayers];
        newOpenSzn.splice(foundIndex, 1);
        targets = Array.from(new Set([...playerTargets, ...newOpenSzn]));
      } else {
        targets = Array.from(new Set([...playerTargets, ...openSeasonPlayers]));
      }
    }

    return targets;
  } catch (error) {
    console.error('Error fetching player targets:', error);
    return [];
  }
}

/**
 * Fetches points value of player
 * Admin SDK version of fetchPointsForPlayerInRoom
 * @param {string} playerName - Player name
 * @param {string} roomID - Room ID
 * @returns {Promise<number>} Player's score
 */
async function fetchPointsForPlayerInRoom(playerName, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snapshot = await playersRef.where('name', '==', playerName).get();

    if (snapshot.empty) {
      throw new Error(`Player ${playerName} not found`);
    }

    return parseInt(snapshot.docs[0].data().score);
  } catch (error) {
    console.error('Error fetching points for player:', error);
    throw error;
  }
}


/**
 * Adds a new log to the room's logs array
 * Admin SDK version of updateLogsForRoom
 * @param {string} newLog - Log message
 * @param {string} color - Log color
 * @param {string} roomID - Room ID
 * @returns {Promise<Array>} Updated logs array
 */
async function updateLogsForRoom(newLog, color, roomID) {
  try {
    const admin = require('firebase-admin');
    const date = new Date();
    const time = date.toLocaleTimeString();

    const roomRef = db.collection('rooms').doc(roomID);
    const roomSnapshot = await roomRef.get();

    if (!roomSnapshot.exists) {
      throw new Error(`Room ${roomID} not found`);
    }

    const newAddition = {
      time: time,
      log: newLog,
      color: color
    };

    // Use FieldValue.arrayUnion for Admin SDK
    await roomRef.update({
      logs: admin.firestore.FieldValue.arrayUnion(newAddition)
    });

    // Fetch and return updated logs
    const updatedSnapshot = await roomRef.get();
    return updatedSnapshot.data().logs;
  } catch (error) {
    console.error('Error updating logList:', error);
    throw error;
  }
}

module.exports = {
  checkForRoomIDDupes,
  createOrUpdateRoom,
  getRoom,
  endGame,
  fetchAllPlayersForRoom,
  fetchAlivePlayersForRoom,
  fetchAllPlayersWithScores,
  addPlayerForRoom,
  updatePointsForPlayer,
  setPointsForPlayer,
  setIsAliveForPlayer,
  updateTargetsForPlayer,
  updateAssassinsForPlayer,
  unmapPlayers,
  killPlayerForRoom,
  fetchPlayerForRoom,
  fetchPlayerByUserIdForRoom,
  fetchAllPlayersForRoom,
  setOpenSeasonForPlayer,
  checkOpenSeason,
  getPlayerByUserID,
  removePlayerForRoom,
  generateAndAssignTargets,
  checkUserInOtherActiveGame,
  validatePlayersNotInOtherActiveGames,
  updateLogsForRoom,
  fetchPointsForPlayerInRoom,
  fetchTargetsForPlayer,
};
