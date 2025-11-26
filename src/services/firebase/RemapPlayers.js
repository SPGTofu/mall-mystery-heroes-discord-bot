/**
 * @fileoverview Player target and assassin remapping system for the Mall Mystery Heroes game
 * 
 * This module provides functionality to dynamically reassign targets and assassins for players
 * in the game. It handles the complex logic of ensuring balanced target distribution while
 * maintaining game rules and preventing circular targeting. The system automatically adjusts
 * the maximum number of targets based on the total number of alive players.
 * 
 * @component RemapPlayers
 * @param {Function} handleRemapping - Callback function to log remapping events
 * @param {Function} createAlert - Function to display error alerts to the user
 * 
 * @features
 * - Dynamic target and assassin assignment for players
 * - Automatic calculation of max targets based on player count
 * - Prevention of circular targeting and self-targeting
 * - Balanced distribution of targets and assassins
 * - Fallback logic for edge cases when optimal assignments aren't possible
 * - Real-time database updates for all player relationships
 * - Comprehensive error handling and logging
 * 
 * @algorithm
 * - MAXTARGETS calculation: 3 targets (15+ players), 2 targets (6-15 players), 1 target (≤5 players)
 * - Randomization of player arrays to ensure fair distribution
 * - Two-phase assignment: targets first, then assassins
 * - Fallback assignment using players with lowest target/assassin counts
 * 
 * @functions
 * - handleRegeneration(): Main orchestrator function that coordinates target and assassin remapping
 * - handleTargetRegeneration(): Assigns new targets to players who need them
 * - handleAssassinRegeneration(): Assigns new assassins to players who need them
 * - randomizeArray(): Shuffles array elements to ensure random assignment order
 * 
 * @state
 * - tempNewTargets: Object storing newly assigned targets for each player
 * - tempNewAssassins: Object storing newly assigned assassins for each player
 * 
 * @constraints
 * - Players cannot target themselves
 * - Players cannot have circular targeting relationships
 * - Maximum targets per player based on total alive players
 * - Players cannot exceed maximum target/assassin limits
 * 
 * @dependencies
 * - Firebase database calls (dbCalls module)
 * - CreateAlert component for error notifications
 * 
 * @returns {Function} handleRegeneration - Function that accepts player arrays and roomID
 * 
 * @example
 * const remapPlayers = RemapPlayers(handleRemapping, createAlert);
 * const [newTargets, newAssassins] = await remapPlayers(
 *   playersNeedingTargets, 
 *   playersNeedingAssassins, 
 *   arrayOfAlivePlayers, 
 *   roomID
 * );
 */

import { useContext } from 'react';
import { fetchAlivePlayersByAscendAssassinsLengthForRoom, 
         fetchAlivePlayersByAscendTargetsLengthForRoom, 
         fetchPlayerForRoom, 
         updateAssassinsForPlayer, 
         updateTargetsForPlayer 
    } from './firebase_calls/dbCalls';
import CreateAlert from './CreateAlert';

const RemapPlayers = (handleRemapping, createAlert) => {
    const tempNewTargets = {};
    const tempNewAssassins = {};

    //randomizes order of array
    const randomizeArray = (array) => {
        for (let i = 0; i < array.length; i++) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    const handleTargetRegeneration = async (playersNeedingTarget, arrayOfAlivePlayers, MAXTARGETS, roomID) => {
        try {
            for (const player of playersNeedingTarget) {
                const randomizedAlivePlayers = randomizeArray(arrayOfAlivePlayers);
                
                //finds player in db and retrieves targets
                const playerDoc = await fetchPlayerForRoom(player, roomID);
                if (playerDoc === null) {
                    return createAlert('error', 'Error', 'Target Not Found', 1500);
                }
                const playerData = playerDoc.data();
                let newTargetArray = [...playerData.targets];
                
                //finds possible targets for player
                for (const possibleTarget of randomizedAlivePlayers) {
                    const possibleTargetDoc = await fetchPlayerForRoom(possibleTarget, roomID);
                    if (possibleTargetDoc === null) {
                        return createAlert('error', 'Error', 'Target Not Found', 1500);
                    }
                    const possibleTargetData = possibleTargetDoc.data();
                    
                    if (possibleTargetData.assassins.length >= MAXTARGETS || //checks if possible target has Max assassins
                        possibleTargetData.targets.includes(player) || //checks if possible target is targeting player
                        newTargetArray.includes(possibleTarget) || //checks if player is already targeting possible target
                        possibleTarget === player || //checks if target is the same as player
                        newTargetArray.length >= MAXTARGETS //checks if player has max targets
                        ) {
                            console.log('continue');
                            continue;
                    }
                    //adds possible target to targets
                    newTargetArray.push(possibleTarget);

                    //updates target's assassins in db
                    await updateAssassinsForPlayer(possibleTarget, [...possibleTargetData.assassins, player], roomID);
                    await handleRemapping("New target for " + player + ": " + possibleTarget);
                    console.log(`Assassins updated for ${possibleTarget} in database (loop1): ${possibleTargetData.assassins}`);

                    //breaks loop if player has max targets
                    if (newTargetArray.length >= MAXTARGETS) {
                        console.log('breaking');
                        break;
                    }
                }

                //final case if no suitable matches were found
                if (newTargetArray.length < MAXTARGETS - 1 || newTargetArray.length === 0) {
                    console.error('running final case for targets on ', player);
                    try {
                        const lastCaseTargetForPlayer = await fetchAlivePlayersByAscendAssassinsLengthForRoom(roomID, player);
                        console.log(`lastCaseTargetForPlayer: `, lastCaseTargetForPlayer);
                        for (const target of lastCaseTargetForPlayer) {
                            if (target) {
                                newTargetArray.push(target.name);
                                await updateAssassinsForPlayer(target.name, [...target.assassins, player], roomID);
                                await handleRemapping("New target for " + player + ": " + target.name);
                            }
                            if (newTargetArray.length >= MAXTARGETS) {
                                break;
                            }
                        }
                    } catch (error) {
                        console.error('Error finding last case target: ', error);
                    }
                }
                const newTargetsForPlayer = newTargetArray.filter(target => !playerData.targets.includes(target));
                tempNewTargets[player] = newTargetsForPlayer;
                await updateTargetsForPlayer(player, newTargetArray, roomID);
                console.log(`Targets updated for ${player} in database: ${newTargetArray}`);
            } 
        }catch (error) {
            console.error('Error updating targets: ', error);
        }
    }

    const handleAssassinRegeneration = async (playersNeedingAssassins, arrayOfAlivePlayers, MAXTARGETS, roomID) => {
        try {
            for (const player of playersNeedingAssassins) {
                const randomizedAlivePlayers = randomizeArray(arrayOfAlivePlayers);
                
                //finds player in db and retrieves assassins
                const playerDoc = await fetchPlayerForRoom(player, roomID);
                if (playerDoc === null) {
                    return createAlert('error', 'Error', 'Target Not Found', 1500);
                }
                const playerData = playerDoc.data();
                let newAssassinArray = [...playerData.assassins];

                //finds possible assassins for player
                for (const possibleAssassin of randomizedAlivePlayers) {
                    const possibleAssassinDoc = await fetchPlayerForRoom(possibleAssassin, roomID);
                    if (possibleAssassinDoc === null) {
                        return createAlert('error', 'Error', 'Target Not Found', 1500);
                    }
                    const possibleAssassinData = possibleAssassinDoc.data();

                    if (possibleAssassinData.targets.length >= MAXTARGETS || //checks if possible target has Max targets
                        possibleAssassinData.assassins.includes(player) || //checks if possible target is targeting player
                        newAssassinArray.includes(possibleAssassin) || //checks if player is already targeting possible target
                        possibleAssassin === player || //checks if target is the same as player
                        newAssassinArray.length >= MAXTARGETS //checks if player has max targets
                        ) {
                            continue;
                    }

                    //adds possible target to targets
                    newAssassinArray.push(possibleAssassin);

                    //updates target's targets in db
                    await updateTargetsForPlayer(possibleAssassin, [...possibleAssassinData.targets, player], roomID);
                    await handleRemapping("New target for " + player + ": " + possibleAssassin);
                    console.log(`Targets updated for ${possibleAssassin} in database (loop2): ${possibleAssassinData.targets}`);

                    //breaks loop if player has max targets
                    if (newAssassinArray.length >= MAXTARGETS) {
                        console.log('breaking');
                        break;
                    }
                }

                //final case if no suitable matches were found
                if (newAssassinArray.length < MAXTARGETS - 1 || newAssassinArray.length === 0) {
                    console.error('running final case for assassins on ', player);
                    try {
                        const lastCaseAssassinForPlayer = await fetchAlivePlayersByAscendTargetsLengthForRoom(roomID, player);
                        console.log(`lastCaseAssassinForPlayer: `, lastCaseAssassinForPlayer);
                        for (const possibleLastCaseAssassin of lastCaseAssassinForPlayer) {
                            if (possibleLastCaseAssassin) {
                                newAssassinArray.push(possibleLastCaseAssassin.name);
                                await updateTargetsForPlayer(possibleLastCaseAssassin.name, [...possibleLastCaseAssassin.targets, player], roomID);
                                await handleRemapping("New target for " + possibleLastCaseAssassin.name + ": " + player);
                            }
                            if (newAssassinArray.length >= MAXTARGETS) {
                                break;
                            }
                        }
                    } catch (error) {
                        console.error('Error finding last case target: ', error);
                    }
                }
                const newAssassinsForPlayer = newAssassinArray.filter(assassin => !playerData.assassins.includes(assassin));
                tempNewAssassins[player] = newAssassinsForPlayer;

                //updates player's assassins in db
                await updateAssassinsForPlayer(player, newAssassinArray, roomID);
                console.log(`Assassins updated for ${player} in database: ${newAssassinArray}`);
            }
        } catch (error) {
            console.error('Error updating assassins: ', error);
        }
    }
    const handleRegeneration = async (playersNeedingTarget, playersNeedingAssassins, arrayOfAlivePlayers, roomID) => {
        try {
            const MAXTARGETS = arrayOfAlivePlayers.length > 15 ? 3 : (arrayOfAlivePlayers.length > 5 ? 2 : 1); //defines what max targets each player should be assigned
            await handleTargetRegeneration(playersNeedingTarget, arrayOfAlivePlayers, MAXTARGETS, roomID);
            await handleAssassinRegeneration(playersNeedingAssassins, arrayOfAlivePlayers, MAXTARGETS, roomID);
            return [tempNewTargets, tempNewAssassins];
        } catch(error) {
            console.error("Error regenerating: ", error);
            createAlert('error', 'Error Regenerating Targets', 'Check console', 1500);
        }
    }

    return handleRegeneration;
}
 
export default RemapPlayers;