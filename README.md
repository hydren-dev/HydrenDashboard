![Login Page](https://github-production-user-asset-6210df.s3.amazonaws.com/164923658/359977458-4199b55a-67b8-476c-98f5-953d51c51386.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240821%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240821T152016Z&X-Amz-Expires=300&X-Amz-Signature=b22c21f9135b6681cb50c0d324823578dc95354e24b87a552033dbb02b1d7186&X-Amz-SignedHeaders=host&actor_id=164923658&key_id=0&repo_id=845004282)
![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/164923658/359978078-f0ee3ee6-03f6-4c6f-a2ba-4f374e802fce.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240821%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240821T152159Z&X-Amz-Expires=300&X-Amz-Signature=bc28e9672eb5bd0a95d6db26d048f1aa4f8c40b673e474c4f8c724a116ab9e7a&X-Amz-SignedHeaders=host&actor_id=164923658&key_id=0&repo_id=845004282)
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
- API (Info)

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
5. Start HydrenDashboard
```bash
node index.js
```

# Now you can enjoy your dashboard :)

# Api Refrence

## Check User
**/api/applications/user/info**
<br>
**Params**
- key
- email
## Check User Coins
**/api/applications/user/coins**
<br>
**Params**
- key
- email
## Add Coins
**/api/addcoins**
<br>
**Params**
- email
- coins
- key
## Get Every User Information
**/api/application**
<br>
**Params**
- key


### This How The Fully api Works

