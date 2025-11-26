/**
 * Task service for database operations (server-side)
 * Uses Firebase Admin SDK (via services/firebase/config.js)
 */

const { db } = require('./config');

/**
 * Creates a new task in the database
 * @param {string} guildId - The Discord guild ID (room ID)
 * @param {Object} taskObject - The task plain object
 * @returns {Promise<string>} The created task document ID
 */
async function createTask(guildId, taskObject) {
  try {
    const taskData = {
      ...taskObject,
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
 * Gets all tasks for a guild
 * @param {string} guildId
 * @returns {Promise<Array>} Array of task objects
 */
async function getAllTasks(guildId) {
  try {
    const tasksRef = db.collection('games').doc(guildId).collection('tasks');
    const snapshot = await tasksRef.get();
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
    await docRef.update({ ...updateData, updatedAt: new Date() });
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

    await docRef.update({ completers, isComplete, updatedAt: new Date() });
    return { id: taskId, ...taskData, completers, isComplete };
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
