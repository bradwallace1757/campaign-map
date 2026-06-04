# Campaign Map — How To Use

---

## Every Session: Starting the App

1. Open Claude and say **"Start the campaign map"**
2. Wait for two terminal windows to open
3. Open your browser and go to: **http://localhost:5173**
4. Click the **🔒 GM** button (top right) to enter GM mode

---

## Importing a Session Transcript

1. Start the app (steps above)
2. Click **✨ Import** in the toolbar
3. Paste your session notes or transcript into the box
4. Click **Parse Transcript →** and wait ~10 seconds
5. Review proposed nodes and connections — click any to reject them
6. Click **Add X items to map →** to confirm

---

## Editing the Map with AI

1. Start the app (steps above — proxy required)
2. Click **🛠 Edit Map** in the toolbar
3. Type your instruction in plain English
   - e.g. *"Remove the edge between Sparkle and the Zhentarim"*
   - e.g. *"Update Odvar Finch's summary to hide his devil's bargain"*
4. Click **Propose Changes →** and wait ~10 seconds
5. Review each proposed change — click any to reject
6. Click **Apply X changes →** to confirm

---

## Adding / Editing Things Manually

- **Add a node:** GM mode → click **+ Add** in toolbar
- **Edit a node:** Click the node → detail panel → click **✏️ Edit**
- **Add a connection:** Click a node → detail panel → click **🔗**
- **Delete a node:** Click the node → detail panel → click **🗑**

---

## Publishing Updates to Players

Do this after each session when you're happy with the map:

1. Start the app (dev server only — proxy not needed)
2. In GM mode, click **↓ Export**
3. A file called **campaign-map.json** downloads to your Downloads folder
4. **Rename it** to **map.json**
5. Move it to:
   ```
   C:\Users\bradl\OneDrive\Documents\Claude\DnD Memory\campaign-map\public\data\
   ```
   (Replace the existing map.json file)
6. Open Claude and say **"Deploy the campaign map"**
7. Wait ~60 seconds, then the live site updates automatically

**Player link:** https://bradwallace1757.github.io/campaign-map/

---

## Tips

- The app **auto-saves** to your browser — you won't lose work if you close the tab
- Players see the map in **read-only mode** — they can search, click nodes, and pan/zoom but cannot edit anything
- Your **API key** lives in the `.env` file — never share or upload that file
- If the proxy terminal shows an error, just tell Claude to restart it

---

## Quick Reference — What Claude Can Do For You

| Say this to Claude | What happens |
|--------------------|--------------|
| "Start the campaign map" | Opens dev server + proxy terminals |
| "Deploy the campaign map" | Builds and pushes the latest map to the player link |
| "Restart the proxy" | Fixes issues with Import / Edit Map |
