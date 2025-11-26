<!-- e7fd3cce-d403-4fa7-a742-3faffb43af5d 5a602b8e-26ca-4262-8740-4d2b5c775886 -->
# Discord Bot Directory Structure

## Root Level Files

- `index.js` - Main bot entry point
- `package.json` - Dependencies
- `.env` - Environment variables (DISCORD_TOKEN, Firebase config)
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation
- `eslint.config.js` - ESLint configuration
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
│   │   ├── db.js                # Firestore database operations
│   │   ├── storage.js           # Firebase Storage operations
│   │   └── config.js            # Firebase initialization
│   ├── discord/
│   │   ├── channels.js          # Channel management utilities
│   │   ├── roles.js             # Role management utilities
│   │   ├── permissions.js      # Permission checking utilities
│   │   └── messages.js          # Message formatting utilities
│   └── game/
│       ├── targetAssignment.js  # Target assignment algorithm
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

- **firebase/**: All backend database operations
  - `db.js`: Firestore CRUD operations for games, players, tasks
  - `storage.js`: Image/file storage operations
  - `config.js`: Firebase Admin SDK initialization

- **discord/**: Discord API wrapper utilities
  - Channel creation/deletion
  - Role management
  - Permission checks
  - Message formatting

- **game/**: Core game logic
  - Target assignment algorithm
  - Point calculations
  - Game state transitions
  - Validation rules

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