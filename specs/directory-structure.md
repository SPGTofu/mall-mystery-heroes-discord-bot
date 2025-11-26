<!-- e7fd3cce-d403-4fa7-a742-3faffb43af5d 5a602b8e-26ca-4262-8740-4d2b5c775886 -->

# Discord Bot Directory Structure

## Root Level Files

- `index.js` - Main bot entry point
- `package.json` - Dependencies
- `.env` - Environment variables (DISCORD_TOKEN, Firebase config)
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation
- `Overview.md` - Project specifications

## Directory Structure

```
mall-mystery-heroes-discord-bot/
├── commands/
│   ├── game/
│   │   ├── create.js          # /game create
│   │   ├── join.js             # /game join
│   │   ├── leave.js            # /game leave
│   │   ├── start.js            # /game start
│   │   └── end.js               # /game end
│   ├── gm/
│   │   └── make.js             # /gm make
│   ├── player/
│   │   ├── unalive.js          # /unalive
│   │   ├── revive.js            # /revive
│   │   └── info.js              # /player
│   ├── task/
│   │   ├── create.js           # /task create
│   │   ├── complete.js          # /task complete
│   │   ├── end.js               # /task end
│   │   └── get.js               # /task get
│   ├── assassination/
│   │   └── kill.js              # /kill
│   ├── openseason/
│   │   ├── start.js             # /openseason start
│   │   └── end.js               # /openseason end
│   ├── broadcast/
│   │   ├── scoreboard.js        # /scoreboard
│   │   └── message.js           # /broadcast
│   └── utility/
│       ├── ping.js              # Existing utility commands
│       └── user.js
├── services/
│   ├── firebase/
│   │   ├── config.js            # Firebase Admin SDK initialization (adapt from client SDK)
│   │   ├── dbCalls.js           # Firestore database operations (adapted from Firebase func/dbCalls.js)
│   │   │                         # Contains all CRUD operations:
│   │   │                         # - Players: fetchAllPlayersForRoom, fetchPlayersByStatusForRoom,
│   │   │                         #   fetchPlayerForRoom, addPlayerForRoom, removePlayerForRoom,
│   │   │                         #   updatePointsForPlayer, updateIsAliveForPlayer,
│   │   │                         #   updateTargetsForPlayer, updateAssassinsForPlayer,
│   │   │                         #   killPlayerForRoom, fetchTargetsForPlayer, fetchAssassinsForPlayer
│   │   │                         # - Tasks: fetchAllTasksForRoom, fetchTasksByCompletionForRoom,
│   │   │                         #   fetchTaskForRoom, addTaskForRoom, updateIsCompleteToTrueForTask,
│   │   │                         #   updateCompletedByForTask, checkForTaskDupesForRoom
│   │   │                         # - Game: endGame, checkForRoomIDDupes, fetchTaskIndexThenIncrement
│   │   │                         # - Logs: fetchAllLogsForRoom, updateLogsForRoom
│   │   │                         # - Photos: fetchPhotosQueryByAscendingTimestampForRoom
│   │   │                         # - Open Season: setOpenSznOfPlayerToValueForRoom, checkOpenSzn
│   │   │                         # - Queries: fetchAlivePlayersQueryByDescendPointsForRoom,
│   │   │                         #   fetchAlivePlayersByAscendAssassinsLengthForRoom,
│   │   │                         #   fetchAlivePlayersByAscendTargetsLengthForRoom
│   │   ├── targetGenerator.js   # Initial target assignment algorithm (adapted from Firebase func/TargetGenerator.js)
│   │   │                         # Core algorithm:
│   │   │                         # - Randomizes player order
│   │   │                         # - Calculates MAXTARGETS: 3 (15+ players), 2 (6-15), 1 (≤5)
│   │   │                         # - Assigns targets in circular fashion, preventing self-targeting
│   │   │                         # - Prevents circular targeting relationships
│   │   │                         # - Updates targets and assassins in database via dbCalls
│   │   │                         # - Returns target map for verification
│   │   ├── remapPlayers.js      # Target/assassin remapping algorithm (adapted from Firebase func/RemapPlayers.js)
│   │   │                         # Core algorithm:
│   │   │                         # - handleTargetRegeneration: assigns new targets to players needing them
│   │   │                         # - handleAssassinRegeneration: assigns new assassins to players needing them
│   │   │                         # - Uses randomized player order for fair distribution
│   │   │                         # - Fallback logic: uses players with lowest assassin/target counts
│   │   │                         # - Prevents self-targeting, circular targeting, exceeding MAXTARGETS
│   │   │                         # - Used for revive and reassignment scenarios
│   │   └── unmapPlayers.js      # Player unmapping algorithm (adapted from Firebase func/UnmapPlayers.js)
│   │                             # Core algorithm:
│   │                             # - Removes player from all assassin's targets list
│   │                             # - Removes player from all target's assassins list
│   │                             # - Clears player's targets and assassins arrays
│   │                             # - Used when killing/removing players (called by killPlayerForRoom)
│   ├── discord/
│   │   ├── channels.js          # Channel management utilities
│   │   ├── roles.js             # Role management utilities
│   │   ├── permissions.js      # Permission checking utilities
│   │   └── messages.js          # Message formatting utilities
│   └── game/
│       ├── pointSystem.js       # Point calculation logic
│       ├── gameState.js         # Game state management
│       └── validation.js        # Game rule validation
├── utils/
│   ├── permissions.js           # Permission checking (GM, Player, Admin)
│   ├── errors.js                # Error handling utilities
│   ├── validators.js            # Input validation utilities
│   └── formatters.js            # Message formatting helpers
├── models/
│   ├── Player.js                # Player data model
│   ├── Game.js                  # Game data model
│   ├── Task.js                  # Task data model
│   └── constants.js             # Game constants (roles, statuses, etc.)
├── events/
│   ├── ready.js                 # Bot ready event
│   ├── interactionCreate.js     # Slash command handler
│   └── messageReactionAdd.js    # Reaction handlers (for confirmations)
├── handlers/
│   ├── commandHandler.js        # Command registration and routing
│   └── eventHandler.js          # Event registration
└── config/
    ├── channels.js              # Channel name constants
    ├── roles.js                 # Role name constants
    └── gameRules.js             # Game configuration/rules
```

## Key Files Description

### Commands Structure

Each command file exports a handler function that:

- Validates permissions
- Processes input
- Calls Firebase services
- Manages Discord state (roles, channels)
- Sends appropriate responses

### Services Layer

- **firebase/**: All backend database operations (adapted from `Firebase func/` folder)
  - `config.js`: Firebase Admin SDK initialization (adapt from client SDK to Admin SDK)
  - `dbCalls.js`: Comprehensive Firestore CRUD operations (adapted from `Firebase func/dbCalls.js`)
    - Player operations: fetch, add, remove, update (points, status, targets, assassins)
    - Task operations: fetch, add, update, complete
    - Game state: room management, game ending, task indexing
    - Logs: fetch and update game logs
    - Photos: query operations for photo submissions
    - Open Season: enable/disable and check status
    - Queries: sorted player queries for leaderboards and target assignment
  - `targetGenerator.js`: Initial target assignment algorithm (adapted from `Firebase func/TargetGenerator.js`)
    - Randomizes player order for fair distribution
    - Calculates MAXTARGETS based on player count (3 for 15+, 2 for 6-15, 1 for ≤5)
    - Assigns targets in circular fashion, preventing self-targeting and circular relationships
    - Updates both targets and assassins in database
  - `remapPlayers.js`: Target/assassin remapping for revives and reassignments (adapted from `Firebase func/RemapPlayers.js`)
    - Regenerates targets for players needing new targets
    - Regenerates assassins for players needing new assassins
    - Uses fallback logic with players having lowest target/assassin counts
    - Prevents all game rule violations (self-targeting, circular, exceeding limits)
  - `unmapPlayers.js`: Player unmapping when killed/removed (adapted from `Firebase func/UnmapPlayers.js`)
    - Removes player from all assassin's targets lists
    - Removes player from all target's assassins lists
    - Clears player's own targets and assassins arrays
    - Called automatically by `killPlayerForRoom` in dbCalls.js

- **discord/**: Discord API wrapper utilities
  - Channel creation/deletion (General, Game Masters, DMs)
  - Role management (GM, Player, Alive, Dead)
  - Permission checks (GM, Player, Admin permissions)
  - Message formatting (embeds, announcements, DMs)

- **game/**: Core game logic and validation
  - `pointSystem.js`: Point calculation logic (transfer on kill, task rewards)
  - `gameState.js`: Game state management (pre-game, active, ended)
  - `validation.js`: Game rule validation (kill validation, target validation)

### Models

Data structures and schemas for:

- Player (points, status, targets, assassins, openSeason)
- Game (state, players, tasks, settings)
- Task (name, description, type, maxCompleters, points, completers)

### Events

- `ready.js`: Bot initialization, command registration
- `interactionCreate.js`: Route slash commands to handlers
- `messageReactionAdd.js`: Handle confirmation reactions (e.g., /unalive)

### Handlers

- `commandHandler.js`: Auto-register commands from commands/ directory
- `eventHandler.js`: Auto-register events from events/ directory

### Config

Centralized constants for:

- Channel names (General, Game Masters, DMs)
- Role names (GM, Player, Alive, Dead)
- Game rules and settings
