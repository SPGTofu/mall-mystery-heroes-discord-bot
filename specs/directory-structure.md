<!-- e7fd3cce-d403-4fa7-a742-3faffb43af5d 5a602b8e-26ca-4262-8740-4d2b5c775886 -->

# Discord Bot Directory Structure

## Root Level Files

- `index.js` - Main bot entry point
- `package.json` - Dependencies
- `.env` - Environment variables (DISCORD_TOKEN, Firebase config)
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation
- `firebase.json` - Firebase configuration (emulators, functions, storage)
- `storage.rules` - Firebase Storage security rules
- `.firebaserc` - Firebase project configuration

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
├── src/
│   └── services/
│       └── firebase/
│           ├── dbCalls.js           # Firestore database operations (EXISTS - adapted from Firebase func/dbCalls.js)
│           │                         # Contains all CRUD operations:
│           │                         # - Players: fetchAllPlayersForRoom, fetchPlayersByStatusForRoom,
│           │                         #   fetchPlayerForRoom, addPlayerForRoom, removePlayerForRoom,
│           │                         #   updatePointsForPlayer, updateIsAliveForPlayer,
│           │                         #   updateTargetsForPlayer, updateAssassinsForPlayer,
│           │                         #   killPlayerForRoom, fetchTargetsForPlayer, fetchAssassinsForPlayer
│           │                         # - Tasks: fetchAllTasksForRoom, fetchTasksByCompletionForRoom,
│           │                         #   fetchTaskForRoom, addTaskForRoom, updateIsCompleteToTrueForTask,
│           │                         #   updateCompletedByForTask, checkForTaskDupesForRoom
│           │                         # - Game: endGame, checkForRoomIDDupes, fetchTaskIndexThenIncrement
│           │                         # - Logs: fetchAllLogsForRoom, updateLogsForRoom
│           │                         # - Photos: fetchPhotosQueryByAscendingTimestampForRoom
│           │                         # - Open Season: setOpenSznOfPlayerToValueForRoom, checkOpenSzn
│           │                         # - Queries: fetchAlivePlayersQueryByDescendPointsForRoom,
│           │                         #   fetchAlivePlayersByAscendAssassinsLengthForRoom,
│           │                         #   fetchAlivePlayersByAscendTargetsLengthForRoom
│           ├── TargetGenerator.js    # Initial target assignment algorithm (EXISTS - adapted from Firebase func/TargetGenerator.js)
│           │                         # Core algorithm:
│           │                         # - Randomizes player order
│           │                         # - Calculates MAXTARGETS: 3 (15+ players), 2 (6-15), 1 (≤5)
│           │                         # - Assigns targets in circular fashion, preventing self-targeting
│           │                         # - Prevents circular targeting relationships
│           │                         # - Updates targets and assassins in database via dbCalls
│           │                         # - Returns target map for verification
│           ├── RemapPlayers.js       # Target/assassin remapping algorithm (EXISTS - adapted from Firebase func/RemapPlayers.js)
│           │                         # Core algorithm:
│           │                         # - handleTargetRegeneration: assigns new targets to players needing them
│           │                         # - handleAssassinRegeneration: assigns new assassins to players needing them
│           │                         # - Uses randomized player order for fair distribution
│           │                         # - Fallback logic: uses players with lowest assassin/target counts
│           │                         # - Prevents self-targeting, circular targeting, exceeding MAXTARGETS
│           │                         # - Used for revive and reassignment scenarios
│           └── UnmapPlayers.js       # Player unmapping algorithm (EXISTS - adapted from Firebase func/UnmapPlayers.js)
│                                     # Core algorithm:
│                                     # - Removes player from all assassin's targets list
│                                     # - Removes player from all target's assassins list
│                                     # - Clears player's targets and assassins arrays
│                                     # - Used when killing/removing players (called by killPlayerForRoom)
├── services/
│   ├── firebase/
│   │   └── config.js            # Firebase Admin SDK initialization (TO CREATE - adapt from utils/firebase.js)
│   ├── discord/
│   │   ├── channels.js          # Channel management utilities (TO CREATE)
│   │   ├── roles.js             # Role management utilities (TO CREATE)
│   │   ├── permissions.js      # Permission checking utilities (TO CREATE)
│   │   └── messages.js          # Message formatting utilities (TO CREATE)
│   └── game/
│       ├── pointSystem.js       # Point calculation logic (TO CREATE)
│       ├── gameState.js         # Game state management (TO CREATE)
│       └── validation.js        # Game rule validation (TO CREATE)
├── utils/
│   ├── firebase.js              # Firebase client SDK initialization (EXISTS - adapt to Admin SDK for bot)
│   │                             # Currently uses Firebase client SDK with emulator support
│   │                             # Needs adaptation to Firebase Admin SDK for Discord bot
│   ├── permissions.js           # Permission checking (GM, Player, Admin) (TO CREATE)
│   ├── errors.js                # Error handling utilities (TO CREATE)
│   ├── validators.js            # Input validation utilities (TO CREATE)
│   └── formatters.js            # Message formatting helpers (TO CREATE)
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
├── config/
│   ├── channels.js              # Channel name constants (TO CREATE)
│   ├── roles.js                 # Role name constants (TO CREATE)
│   └── gameRules.js             # Game configuration/rules (TO CREATE)
└── specs/
    └── directory-structure.md   # This file - directory structure documentation
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
  - **Current structure**: Files exist in `src/services/firebase/` with actual implementations
    - `dbCalls.js`: Comprehensive Firestore CRUD operations (EXISTS in `src/services/firebase/`)
    - `TargetGenerator.js`: Initial target assignment (EXISTS in `src/services/firebase/`)
    - `RemapPlayers.js`: Target/assassin remapping (EXISTS in `src/services/firebase/`)
    - `UnmapPlayers.js`: Player unmapping (EXISTS in `src/services/firebase/`)
  - **Future structure**: Will need `services/firebase/config.js` for Admin SDK initialization
    - `config.js`: Firebase Admin SDK initialization (TO CREATE - adapt from `utils/firebase.js`)
    - Player operations: fetch, add, remove, update (points, status, targets, assassins)
    - Task operations: fetch, add, update, complete
    - Game state: room management, game ending, task indexing
    - Logs: fetch and update game logs
    - Photos: query operations for photo submissions
    - Open Season: enable/disable and check status
    - Queries: sorted player queries for leaderboards and target assignment
  - `TargetGenerator.js`: Initial target assignment algorithm (EXISTS - adapted from `Firebase func/TargetGenerator.js`)
    - Randomizes player order for fair distribution
    - Calculates MAXTARGETS based on player count (3 for 15+, 2 for 6-15, 1 for ≤5)
    - Assigns targets in circular fashion, preventing self-targeting and circular relationships
    - Updates both targets and assassins in database
  - `RemapPlayers.js`: Target/assassin remapping for revives and reassignments (EXISTS - adapted from `Firebase func/RemapPlayers.js`)
    - Regenerates targets for players needing new targets
    - Regenerates assassins for players needing new assassins
    - Uses fallback logic with players having lowest target/assassin counts
    - Prevents all game rule violations (self-targeting, circular, exceeding limits)
  - `UnmapPlayers.js`: Player unmapping when killed/removed (EXISTS - adapted from `Firebase func/UnmapPlayers.js`)
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

## Current Project Status

### Files That Exist
- ✅ `src/services/firebase/dbCalls.js` - Database operations
- ✅ `src/services/firebase/TargetGenerator.js` - Target assignment algorithm
- ✅ `src/services/firebase/RemapPlayers.js` - Remapping algorithm
- ✅ `src/services/firebase/UnmapPlayers.js` - Unmapping algorithm
- ✅ `utils/firebase.js` - Firebase client SDK initialization
- ✅ `firebase.json` - Firebase configuration
- ✅ `storage.rules` - Storage security rules
- ✅ `.firebaserc` - Firebase project config

### Files To Create
- ⏳ All command files in `commands/` directory
- ⏳ Discord service utilities in `services/discord/`
- ⏳ Game logic files in `services/game/`
- ⏳ Utility files in `utils/` (except firebase.js)
- ⏳ Model files in `models/`
- ⏳ Event handlers in `events/`
- ⏳ Command/event handlers in `handlers/`
- ⏳ Config files in `config/`
- ⏳ `services/firebase/config.js` - Admin SDK initialization (adapt from utils/firebase.js)
