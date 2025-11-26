## Overview

Mall mystery heroes is an assassins-style game where there is a gamemaster and some number of players. During game play, players are secretly assigned targets and their objective is to gain points by killing their targets. The way that a target is killed is by taking an identifiable picture of them which the gamemaster then can approve or reject. If a target is killed, the assassin gains all their points and will get a new target. The game continues until the gamemaster announces the game is over, and at the end the player with the highest score wins.

On top of the standard process of each player having certain targets, there is also an option for the gamemaster to declare “open season” on a particular player. When this is declared, any player can kill the specified player, regardless of whether they originally had them as a target. The gamemaster can also end “open season” on a given player when they decide to.

Aside from killing other players, the other aspect of the game is completing tasks. The gamemaster defines tasks and assigns them a certain reward, which can be either a number of points or being revived if you are a dead player. When a dead player is revived, they receive new targets and other players are assigned to target them.

User Types:

- Game master (Assignable)  
- Player (Assignable)

Task Types:

- Task  
- Revival Mission

Player Status Types:

- Alive  
- Dead

Channels

- General  
  - The main chat?  
- Game Masters Output  
  - Outputs all GM commands  
- DM(Channel with Sub-chanels)   
  - Groups DM chanels  
    

Commands:  
**Game Status**

- /game create **(GM Permission)**  
  - Game master command that initializes the game.   
  - Creates a room on the backend  
  - This command ensures the bot’s scope is the current server with the current settings.  
  - Removes all channels/categories not general, and clear data  
  - Create a ‘DMs’ group/category  
  - Create a ‘Game Masters’ channel with only GMs and bot  
  - Reset all roles  
  - Bot send out a message of rules in general channel and pins it  
- /game join \[user’s real name\]  **(Player Permission)**  
  - Player command to join the already created game.  
  - Joins created room on the backend  
  - Assign user ‘player’ role  
  - Assign user ‘alive’ status  
  - Not executable if a game/room does not exist  
  - Bot should change the user’s nickname to their real name.  
  - Creates a ‘DMs’ channel between player, bot, and GM to communicate targets.  
    - On creation of the channel, the bot sends a welcome message, along with an explanation of the channel.   
    - The welcome message tells them to @GM before the game to test.  
- /game leave **(Player Permission)**  
  - Removes ‘player’ role from user.  
  - Removes ‘alive’ or ‘dead’ status.  
  - Kills them in game (same function as unalive player)  
  - Delete their DMs  
- /game start **(GM Permission)**  
  - Assignment of targets  
  - Bot countdown, then @everyone GL HF  
  - Commands should not work before this point other than /game commands (also no /game end)  
- /game end **(GM Permission)**  
  - Send message about  
    - Game ending  
    - Leaderboard \+ points  
    - Congratulations to @player for winning  
  - All commands should not work past this point, except for /game create  
  - Reset all roles (GM included)

**GM Maker**

- /gm make @user **(Admin Permission)**  
  - Remove all roles  
  - Assign the GM role to user  
  - Admin should only be able to do so (assuming admin are the gms)

**Player Status**

- /unalive @target **(GM Permission)**  
  - Basically an undo  
  - Remove ‘alive’ if it exists, and add ‘dead’ status if not already.  
    - If already dead, don't die again  
  - Reset points and targets (them and their assassins)  
  - Should require an additional confirmation (emote to confirm)  
  - Broadcast that @target is dead in the general channel  
- /revive @target **(GM Permission)**  
  - Remove ‘dead’ if it exists, and add ‘alive’ role if not already  
    - If already alive, don’t re-alive again.  
  - Assign ‘alive’ status to player  
  - Generate new targets  
  - Add to targets list of other players  
  - Send new target list to relevant private channels under ‘DMs’ with updated targets to:  
    - Newly revived player and the players who have the revived player as a target  
  - Broadcast that the target is back in the general channel 

**Tasks**

- /task create \[task\_name\] \[task\_description\] \[task\_type\] \[max completers\] \[points\] **(GM Permission)**  
  - Send out a message to general chat describing the task  
  - Add task to backend  
- /task complete \[task\_name\] \[player\] **(GM Permission)**  
  - Check if max completers of players is fulfilled   
  - Mark that user completed a task in backend   
  - Broadcast to *general* a message saying player completed and now has x amount of spots left  
- /task end **(GM Permission**)  
  - Broadcasts a message on \#general that the task has been completed  
  - End the task on backend  
- /task get \[broadcast: on/off\]**(GM Permission)**  
  - Prints out all active tasks to Game Masters chat  
  - Broadcast to *general* if on. Else just print in Game Masters.  
    - Task title \+ description  
    - Point value  
    - Number of spots left

**Assassination**

- /kill @assassin @target **(GM Permission)**  
  - Check if kill makes sense (Error Check with Firebase)  
    - Check if @target and @assassin have ‘alive’ roles. Else, returns error.  
  - Give assassin points  
  - Unalive player (same function)  
    - Set target’s points to 0  
    - Reset target’s targets (them and their assassins)  
    - Change alive/dead and open season status accordingly.   
  - Broadcast a message out to the *general* chat that the assassin killed the target

**Broadcast**

- /scoreboard \[k-rank\] \[broadcast: on/off\] **(ALL Permission)**  
  - Shows the top k players within the game showing their points  
    - Broadcasts to *general* if broadcast is on.  
    - Otherwise, whispers to individuals

**Open Season**

- /openseason start @player **(GM Permission)**  
  - Allows all players to kill @player  
  - Broadcast message to all players about it  
  - If @player is already open season, send error  
  - Give ‘open season’ attribute  
- /openseason end @player **(GM Permission)**  
  - Ends ability for all players to kill @player  
  - Broadcast message to all players about it  
  - If @player does not have open season role, send error  
  - Remove ‘open season’ attribute

- /player @player **(GM Permission)**  
  - Fetches a data of a player for GM into \#GameMaster  
    - Name  
    - Points  
    - Alive status  
    - Targets  
    - Assassins  
    - isOpenSzn  
  - If @everyone, return all players  
  - Returns message in Game Masters channel

**Broadcasting**

- /broadcast \[title\] \[description\] **(GM Permission)**  
  - Create a broadcast message in general and doing @player  
    - Title is bolded and description is normal message