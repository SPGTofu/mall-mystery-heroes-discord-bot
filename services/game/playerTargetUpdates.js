const CHANNELS = require('../../config/channels');
const { createEmbed } = require('../discord/messages');
const { fetchAllPlayersForRoom, remapPlayersBackend } = require('../firebase/dbCallsAdapter');

function normalizeChannelName(name) {
  return typeof name === 'string'
    ? name.trim().toLowerCase().replace(/\s+/g, '-')
    : null;
}

function getDmsCategory(guild) {
  if (!guild || !guild.channels) {
    return null;
  }

  return guild.channels.cache.find(
    ch => ch.type === 4 && ch.name.toLowerCase() === CHANNELS.DMS_CATEGORY.toLowerCase()
  ) || null;
}

function getPlayerDmChannel(dmsCategory, playerName) {
  if (!dmsCategory || !dmsCategory.children || !playerName) {
    return null;
  }

  const normalizedName = normalizeChannelName(playerName);
  if (!normalizedName) {
    return null;
  }

  return dmsCategory.children.cache.find(
    ch => ch.type === 0 && ch.name.toLowerCase() === normalizedName
  ) || null;
}

function buildPlayerMapById(players = []) {
  const map = new Map();
  players.forEach(player => {
    if (player && player.userID) {
      map.set(player.userID, player);
    }
  });
  return map;
}

function dedupeIds(ids = []) {
  return Array.from(new Set((ids || []).filter(Boolean)));
}

async function notifyPlayerEliminated(dmsCategory, playerId, playerName) {
  if (!dmsCategory) {
    console.warn('DMs category not found. Skipping elimination DM.');
    return;
  }

  const dmChannel = getPlayerDmChannel(dmsCategory, playerName);
  if (!dmChannel) {
    console.warn(`DM channel not found for eliminated player ${playerName}.`);
    return;
  }

  const eliminationEmbed = createEmbed({
    title: '💀 Eliminated',
    description: 'You currently have no active targets. Please wait for the Game Masters to send you missions.',
    color: 0x555555,
    timestamp: true,
  });

  try {
    await dmChannel.send({ content: `<@${playerId}>`, embeds: [eliminationEmbed] });
  } catch (err) {
    console.error(`Failed to DM eliminated player ${playerName}:`, err);
  }
}

async function notifyPlayersOfNewTargets({ dmsCategory, playersById, newTargets }) {
  if (!dmsCategory || !newTargets || !playersById) {
    return;
  }

  const entries = Object.entries(newTargets);
  for (const [playerId, targetIds] of entries) {
    if (!targetIds || targetIds.length === 0) {
      continue;
    }

    const playerData = playersById.get(playerId);
    if (!playerData) {
      continue;
    }

    const dmChannel = getPlayerDmChannel(dmsCategory, playerData.name);
    if (!dmChannel) {
      console.warn(`DM channel not found for player ${playerData.name}.`);
      continue;
    }

    const currentTargets = Array.isArray(playerData.targets) ? playerData.targets : [];
    const aggregatedTargetIds = Array.from(new Set([...(currentTargets || []), ...targetIds]));

    const targetNames = aggregatedTargetIds.map(targetId => {
      const targetPlayer = playersById.get(targetId);
      return targetPlayer ? targetPlayer.name : `Unknown (${targetId})`;
    });

    const description = targetNames.length > 0
      ? `Here is your full current target list:
${targetNames.map((name, idx) => `${idx + 1}. **${name}**`).join('\n')}

Good luck!`
      : 'You currently have no active targets. Stand by for missions from the Game Masters.';

    const targetEmbed = createEmbed({
      title: '🎯 Target Update',
      description,
      color: 0xff4500,
      timestamp: true,
    });

    try {
      await dmChannel.send({ content: `<@${playerId}>`, embeds: [targetEmbed] });
    } catch (err) {
      console.error(`Failed to send target update to ${playerData.name}:`, err);
    }
  }
}

function convertAssassinAssignmentsToTargetMap(newAssassins = {}) {
  const converted = {};

  Object.entries(newAssassins || {}).forEach(([targetId, assassinIds]) => {
    if (!Array.isArray(assassinIds) || assassinIds.length === 0) {
      return;
    }

    assassinIds.forEach(assassinId => {
      if (!assassinId) {
        return;
      }

      if (!converted[assassinId]) {
        converted[assassinId] = [];
      }

      if (!converted[assassinId].includes(targetId)) {
        converted[assassinId].push(targetId);
      }
    });
  });

  return converted;
}

function mergeTargetAssignments(...maps) {
  const merged = {};

  maps.forEach(map => {
    if (!map) {
      return;
    }

    Object.entries(map).forEach(([playerId, targetIds]) => {
      if (!playerId || !Array.isArray(targetIds) || targetIds.length === 0) {
        return;
      }

      if (!merged[playerId]) {
        merged[playerId] = [];
      }

      targetIds.forEach(targetId => {
        if (!targetId) {
          return;
        }

        if (!merged[playerId].includes(targetId)) {
          merged[playerId].push(targetId);
        }
      });
    });
  });

  return merged;
}

async function remapAndNotifyTargets({
  guild,
  roomID,
  playersNeedingTargets = [],
  playersNeedingAssassins = [],
  dmsCategoryOverride = null,
}) {
  if (
    (!playersNeedingTargets || playersNeedingTargets.length === 0) &&
    (!playersNeedingAssassins || playersNeedingAssassins.length === 0)
  ) {
    return null;
  }

  let players;
  try {
    players = await fetchAllPlayersForRoom(roomID);
  } catch (err) {
    console.error('Failed to fetch players for remap:', err);
    return null;
  }

  const alivePlayers = players
    .filter(player => player.isAlive)
    .map(player => player.userID)
    .filter(Boolean);

  if (alivePlayers.length === 0) {
    return null;
  }

  let remapResult;
  try {
    remapResult = await remapPlayersBackend(
      playersNeedingTargets,
      playersNeedingAssassins,
      alivePlayers,
      roomID
    );
  } catch (err) {
    console.error('Error remapping players:', err);
    return null;
  }

  const dmsCategory = dmsCategoryOverride || getDmsCategory(guild);
  if (!dmsCategory) {
    console.warn('DMs category not found. Skipping target update DMs.');
    return remapResult;
  }

  const playersById = buildPlayerMapById(players);
  const assassinAssignmentMap = convertAssassinAssignmentsToTargetMap(remapResult.newAssassins);
  const targetsToNotify = mergeTargetAssignments(remapResult.newTargets, assassinAssignmentMap);

  if (Object.keys(targetsToNotify).length > 0) {
    await notifyPlayersOfNewTargets({
      dmsCategory,
      playersById,
      newTargets: targetsToNotify,
    });
  }

  return remapResult;
}

module.exports = {
  getDmsCategory,
  notifyPlayerEliminated,
  notifyPlayersOfNewTargets,
  remapAndNotifyTargets,
  dedupeIds,
};
