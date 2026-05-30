# Deployment Guide — Railway

This bot is a Node.js Discord bot using Firebase (Firestore). This guide covers deploying it to Railway so it runs 24/7 and auto-deploys on every GitHub push.

---

## Environment Variables You'll Need

Before deploying, collect the values for these variables. You'll enter them in Railway's dashboard.

| Variable | Where to get it |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Your App → Bot → Token |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate new private key (gives you a JSON file — paste the entire JSON as the value) |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General → Project ID |

> **Important:** `FIREBASE_SERVICE_ACCOUNT` should be the full contents of the service account JSON file as a single-line string. Railway stores it securely as an env var.

---

## Step 1 — Push Your Code to GitHub

Make sure your latest code is pushed to GitHub. The `.gitignore` already excludes `.env` and config files, so secrets won't be committed.

```bash
git add .
git commit -m "prep for Railway deployment"
git push
```

---

## Step 2 — Create a Railway Account

1. Go to [railway.app](https://railway.app) and sign up (use your GitHub account for easiest setup)
2. Authorize Railway to access your GitHub repositories

---

## Step 3 — Create a New Railway Project

1. From the Railway dashboard click **New Project**
2. Choose **Deploy from GitHub repo**
3. Select your `mall-mystery-heroes-discord-bot` repository
4. Railway will detect it as a Node.js project automatically

---

## Step 4 — Set Environment Variables

1. In your Railway project, click on the service (the deployed bot)
2. Go to the **Variables** tab
3. Add each variable from the table above:
   - `DISCORD_TOKEN` = your bot token
   - `FIREBASE_SERVICE_ACCOUNT` = the full JSON content of your service account key file
   - `FIREBASE_PROJECT_ID` = your Firebase project ID

---

## Step 5 — Configure the Start Command

Railway should auto-detect `node index.js` from your `package.json` main field. If the bot doesn't start:

1. Go to **Settings** → **Deploy** in your Railway service
2. Set the start command to: `node index.js`

---

## Step 6 — Deploy

1. Railway will have already triggered an initial deploy when you connected the repo
2. Check the **Deployments** tab to see logs
3. You should see:
   ```
   Ready! Logged in as YourBot#1234
   Loaded X commands
   Registered X commands with Discord
   ```
4. Your bot is now live in any Discord server it's been added to

---

## How Auto-Deploy Works

Every time you push to your connected GitHub branch:

1. Railway detects the push (~30 seconds)
2. Builds and restarts the bot (~1-2 minutes total)
3. Bot reconnects to Discord and re-registers all slash commands automatically
4. No manual steps needed

Slash command *behavior* is live immediately on restart. The command definitions visible in Discord's UI (names, options) can take up to an hour to propagate globally, but usually update within a few minutes.

---

## Monitoring & Logs

- **Railway dashboard → Deployments** — see live logs and deploy history
- If the bot crashes, Railway will show the error in the logs and attempt to restart

---

## Costs

- Railway's free tier (Hobby plan trial) gives $5 of credit/month — enough for a small bot
- After the trial, the Hobby plan is $5/month
- A Discord bot at idle uses very little compute, so costs stay low

---

## Troubleshooting

**Bot is online but slash commands don't show up**
- Wait up to an hour for Discord to propagate the command definitions
- Check Railway logs to confirm `Registered X commands with Discord` appeared on startup

**`Error: Used disallowed intents` in logs**
- Go to Discord Developer Portal → Your App → Bot → Privileged Gateway Intents
- Enable **Server Members Intent** (the bot uses `GuildMembers`)

**Firebase connection errors**
- Double-check `FIREBASE_SERVICE_ACCOUNT` is the full JSON (not a file path)
- Confirm `FIREBASE_PROJECT_ID` matches the project the service account belongs to
