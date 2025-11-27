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
 * @param {string} playerId
 * @param {string} roomID
 */
async function killPlayerForRoom(playerId, roomID) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');
    const snap = await playersRef.where('id', '==', playerId).get();

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
 * Revives a player in a room (Admin SDK)
 * - Marks player alive
 * - Adds optional points
 * - Clears targets/assassins
 * - Calls backend remap
 */
async function handleReviveForPlayer(playerId, roomID, points = 0) {
  try {
    const playersRef = db.collection('rooms').doc(roomID).collection('players');

    // Fetch player by userID
    const snap = await playersRef.where('userID', '==', playerId).get();
    if (snap.empty) {
      throw new Error(`Player with userID ${playerId} not found`);
    }

    const playerDoc = snap.docs[0].ref;
    const playerData = snap.docs[0].data();
    const playerName = playerData.name;

    // Mark alive + add points
    await playerDoc.update({
      isAlive: true,
      score: Number(playerData.score || 0) + Number(points),
      targets: [],
      targetsLength: 0,
      assassins: [],
      assassinsLength: 0,
    });

    console.log(`Player ${playerName} revived in room ${roomID}.`);

    // Fetch alive players for remap
    const aliveSnap = await playersRef.where('isAlive', '==', true).get();
    const alivePlayers = aliveSnap.docs.map(doc => doc.data().name);

    // For now: revived player needs both targets & assassins
    const playersNeedingTargets = [playerName];
    const playersNeedingAssassins = [playerName];

    // Backend remap
    if (typeof remapPlayersBackend === "function") {
      await remapPlayersBackend(
        playersNeedingTargets,
        playersNeedingAssassins,
        alivePlayers,
        roomID
      );
    }

    return true;

  } catch (error) {
    console.error("Error reviving player:", error);
    throw error;
  }
}


/**
 * -------------------------------
 * BACKEND REMAP HELPERS (STEP 1)
 * -------------------------------
 * These replace frontend dbCalls. All Admin SDK only.
 */

/** Fetch one player's full document + data */
async function getPlayerData(playerName, roomID) {
  const playersRef = db.collection('rooms').doc(roomID).collection('players');
  const snap = await playersRef.where('name', '==', playerName).get();
  if (snap.empty) return null;
  return { ref: snap.docs[0].ref, data: snap.docs[0].data() };
}

/** Fetch all alive player names */
async function getAlivePlayers(roomID) {
  const playersRef = db.collection('rooms').doc(roomID).collection('players');
  const snap = await playersRef.where('isAlive', '==', true).get();
  return snap.docs.map(doc => doc.data().name);
}

/** Fetch alive players ordered by assassin count ASC */
async function getAlivePlayersOrderedByAssassinCount(roomID, excludeName = null) {
  const playersRef = db.collection('rooms').doc(roomID).collection('players');
  const snap = await playersRef.where('isAlive', '==', true).orderBy('assassinsLength', 'asc').get();
  return snap.docs
    .map(doc => doc.data())
    .filter(p => p.name !== excludeName);
}

/** Fetch alive players ordered by target count ASC */
async function getAlivePlayersOrderedByTargetCount(roomID, excludeName = null) {
  const playersRef = db.collection('rooms').doc(roomID).collection('players');
  const snap = await playersRef.where('isAlive', '==', true).orderBy('targetsLength', 'asc').get();
  return snap.docs
    .map(doc => doc.data())
    .filter(p => p.name !== excludeName);
}

/** Randomize any array */
function randomizeArrayBackend(array) {
  for (let i = 0; i < array.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * -------------------------------
 * BACKEND REMAP STEP 2:
 * handleTargetRegenerationBackend
 * -------------------------------
 * Pure Admin SDK rewrite of FE handleTargetRegeneration
 */
async function handleTargetRegenerationBackend(playersNeedingTargets, alivePlayers, MAXTARGETS, roomID) {
  const tempNewTargets = {};

  for (const player of playersNeedingTargets) {
    const playerInfo = await getPlayerData(player, roomID);
    if (!playerInfo) {
      console.error(`Target regen error: player ${player} not found`);
      continue;
    }

    const playerData = playerInfo.data;
    let newTargetArray = [...(playerData.targets || [])];

    const randomizedAlive = randomizeArrayBackend([...alivePlayers]);

    // Primary target search
    for (const possible of randomizedAlive) {
      if (possible === player) continue;

      const possibleInfo = await getPlayerData(possible, roomID);
      if (!possibleInfo) continue;
      const possibleData = possibleInfo.data;

      if (
        possibleData.assassinsLength >= MAXTARGETS ||
        possibleData.targets.includes(player) ||
        newTargetArray.includes(possible) ||
        newTargetArray.length >= MAXTARGETS
      ) {
        continue;
      }

      newTargetArray.push(possible);

      // Update assassins for possible target
      const updatedAssassins = [...possibleData.assassins, player];
      await updateAssassinsForPlayer(possible, updatedAssassins, roomID);
    }

    // Fallback - least assassins
    if (newTargetArray.length < MAXTARGETS) {
      const fallbackList = await getAlivePlayersOrderedByAssassinCount(roomID, player);

      for (const f of fallbackList) {
        if (newTargetArray.length >= MAXTARGETS) break;

        if (f.name === player) continue;
        if (newTargetArray.includes(f.name)) continue;

        newTargetArray.push(f.name);
        const fAssassinsUpdated = [...f.assassins, player];
        await updateAssassinsForPlayer(f.name, fAssassinsUpdated, roomID);
      }
    }

    // Final write
    tempNewTargets[player] = newTargetArray.filter(t => !(playerData.targets || []).includes(t));
    await updateTargetsForPlayer(player, newTargetArray, roomID);
  }

  return tempNewTargets;
}

/**
 * -------------------------------
 * BACKEND REMAP STEP 3:
 * handleAssassinRegenerationBackend
 * -------------------------------
 * Pure Admin SDK rewrite of FE handleAssassinRegeneration
 */
async function handleAssassinRegenerationBackend(playersNeedingAssassins, alivePlayers, MAXTARGETS, roomID) {
  const tempNewAssassins = {};

  for (const player of playersNeedingAssassins) {
    const playerInfo = await getPlayerData(player, roomID);
    if (!playerInfo) {
      console.error(`Assassin regen error: player ${player} not found`);
      continue;
    }

    const playerData = playerInfo.data;
    let newAssassinArray = [...(playerData.assassins || [])];

    const randomizedAlive = randomizeArrayBackend([...alivePlayers]);

    // Primary assassin search
    for (const possible of randomizedAlive) {
      if (possible === player) continue;

      const possibleInfo = await getPlayerData(possible, roomID);
      if (!possibleInfo) continue;
      const possibleData = possibleInfo.data;

      if (
        possibleData.targetsLength >= MAXTARGETS ||
        possibleData.assassins.includes(player) ||
        newAssassinArray.includes(possible) ||
        newAssassinArray.length >= MAXTARGETS
      ) {
        continue;
      }

      newAssassinArray.push(possible);

      // Update the target's targets field
      const updatedTargets = [...possibleData.targets, player];
      await updateTargetsForPlayer(possible, updatedTargets, roomID);
    }

    // Fallback — least targets
    if (newAssassinArray.length < MAXTARGETS) {
      const fallbackList = await getAlivePlayersOrderedByTargetCount(roomID, player);

      for (const f of fallbackList) {
        if (newAssassinArray.length >= MAXTARGETS) break;

        if (f.name === player) continue;
        if (newAssassinArray.includes(f.name)) continue;

        newAssassinArray.push(f.name);

        const updatedTargets = [...f.targets, player];
        await updateTargetsForPlayer(f.name, updatedTargets, roomID);
      }
    }

    tempNewAssassins[player] = newAssassinArray.filter(t => !(playerData.assassins || []).includes(t));
    await updateAssassinsForPlayer(player, newAssassinArray, roomID);
  }

  return tempNewAssassins;
}

/**
 * -------------------------------
 * BACKEND REMAP STEP 4:
 * remapPlayersBackend (orchestrator)
 * -------------------------------
 * Mirrors FE handleRegeneration()
 */
async function remapPlayersBackend(playersNeedingTargets, playersNeedingAssassins, alivePlayers, roomID) {
  try {
    // Determine MAXTARGETS exactly like FE logic
    const MAXTARGETS =
      alivePlayers.length > 15 ? 3 :
      alivePlayers.length > 5  ? 2 :
                                 1;

    // Run target regeneration
    const newTargets = await handleTargetRegenerationBackend(
      playersNeedingTargets,
      alivePlayers,
      MAXTARGETS,
      roomID
    );

    // Run assassin regeneration
    const newAssassins = await handleAssassinRegenerationBackend(
      playersNeedingAssassins,
      alivePlayers,
      MAXTARGETS,
      roomID
    );

    console.log("Backend remap complete:", { newTargets, newAssassins });

    return { newTargets, newAssassins };
  } catch (err) {
    console.error("Error in remapPlayersBackend:", err);
    throw err;
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
  handleReviveForPlayer,
  remapPlayersBackend,
};
