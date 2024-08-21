
# HydrenDashboard

All features:
- Resource Management (Use it to create servers, gift them, etc)
- Coins (AFK Page earning)
- Servers (create, view, edit servers)
- User System (auth, regen password, etc)
- OAuth2 (Discord)
- Store (buy resources with coins)
- Dashboard (view resources & servers)
- Admin (set, add, remove coins/scan images & nodes)

<br>

# Full Stable Release of HydrenDashboard is here

<hr>

# Install Guide

:Warning: You need Skyport already set up on a domain for HydrenDashboard to work

1. Make a Instance of Nodejs and upload the files and start the server you must configure .env first
2. Unarchive the file and set the server to use NodeJS 21
3. Configure `.env`, `/storage/eggs.json` & `/storage/plans.json` with the scan or manuel and ports `/storage/ports.json`
4. Run `npm i`
5. Start the server with `node index.js`

# on VPS

1. install dependencies
 - Git
 - Nodejs 21
 - npm 10
2. Clone the Repo
```git
git clone https://github.com/MrStateGaming1/HydrenDashboard.git
```
3.Enter the Directory and install depencencies
```bash
cd HydrenDashboard && npm i
```
4.Configure Skyport and Auth Settings in .env 
```bash
mv .env_example .env
nano .env
```
5. Start Helaport
```bash
node index.js
```

# Now you can enjoy your dashboard :)
