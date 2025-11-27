/**
 * Task service for database operations (server-side)
 * Uses Firebase Admin SDK (via services/firebase/config.js)
 */

const { db } = require('./config');

/**
 * Creates a new task in the database
 * @param {string} guildId - The Discord guild ID (room ID)
 * @param {string} gameId - The game/session ID to scope tasks
 * @param {Object} taskObject - The task plain object
 * @returns {Promise<string>} The created task document ID
 */
async function createTask(guildId, gameId, taskObject) {
  try {
    const taskData = {
      ...taskObject,
      gameId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tasksRef = db.collection('games').doc(guildId).collection('tasks');
    const docRef = await tasksRef.add(taskData);
    console.log(`Task created with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating task in database:', error);
    throw error;
  }
}

/**
 * Gets a task by ID
 * @param {string} guildId
 * @param {string} taskId
 * @returns {Promise<Object>} The task data
 */
async function getTask(guildId, taskId) {
  try {
    const docRef = db.collection('games').doc(guildId).collection('tasks').doc(taskId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error(`Task ${taskId} not found`);
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
}

/**
 * Gets all tasks for a guild, optionally filtered by gameId
 * @param {string} guildId
 * @param {string} gameId - Optional: filter tasks to a specific game
 * @returns {Promise<Array>} Array of task objects
 */
async function getAllTasks(guildId, gameId = null) {
  try {
    let tasksRef = db.collection('games').doc(guildId).collection('tasks');
    let query = tasksRef;
    
    // Filter by gameId if provided
    if (gameId) {
      query = query.where('gameId', '==', gameId);
    }
    
    const snapshot = await query.get();
    const tasks = [];
    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    return tasks;
  } catch (error) {
    console.error('Error getting all tasks:', error);
    throw error;
  }
}

/**
 * Updates a task
 * @param {string} guildId
 * @param {string} taskId
 * @param {Object} updateData
 */
async function updateTask(guildId, taskId, updateData) {
  try {
    const docRef = db.collection('games').doc(guildId).collection('tasks').doc(taskId);
    const dataToUpdate = { ...updateData, updatedAt: new Date() };
    // If task is being marked complete, set completedAt timestamp
    if (updateData && updateData.isComplete === true && !updateData.completedAt) {
      dataToUpdate.completedAt = new Date();
    }
    await docRef.update(dataToUpdate);
    console.log(`Task ${taskId} updated`);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Deletes a task
 */
async function deleteTask(guildId, taskId) {
  try {
    const docRef = db.collection('games').doc(guildId).collection('tasks').doc(taskId);
    await docRef.delete();
    console.log(`Task ${taskId} deleted`);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Marks a task as complete and adds a completer
 */
async function completeTask(guildId, taskId, playerId) {
  try {
    const docRef = db.collection('games').doc(guildId).collection('tasks').doc(taskId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error(`Task ${taskId} not found`);

    const taskData = doc.data();
    const completers = taskData.completers || [];
    if (completers.includes(playerId)) throw new Error(`Player ${playerId} already completed task`);
    if (completers.length >= (taskData.maxCompleters || 1)) throw new Error('Task has reached maximum completers');

    completers.push(playerId);
    const isComplete = completers.length >= (taskData.maxCompleters || 1);
      const updatePayload = { completers, isComplete, updatedAt: new Date() };
      if (isComplete) updatePayload.completedAt = new Date();

      await docRef.update(updatePayload);
      return { id: taskId, ...taskData, completers, isComplete, completedAt: updatePayload.completedAt };
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}

module.exports = {
  createTask,
  getTask,
  getAllTasks,
  updateTask,
  deleteTask,
  completeTask,
};
