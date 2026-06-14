# Bata POS — Cloud Backup (MongoDB)

Local data (SQLite) automatically syncs with **MongoDB** when the internet is available.

## How it works

1. **App start / internet restored** → Pull from MongoDB → local SQLite (new PC gets all users/data).
2. **After local changes** → Push from SQLite → MongoDB (cloud backup stays updated).
3. Repeats every **30 seconds** while online, and when Electron detects network.

## Setup

### 1. MongoDB (local or Atlas)

**Local:**
```bash
# Install MongoDB Community, then:
mongod
```

**Atlas:** Create cluster → Connect → copy connection string.

### 2. `.env`

```env
MONGODB_URI="mongodb://127.0.0.1:27017/bata-pos"
# or mongodb+srv://user:pass@cluster.mongodb.net/bata-pos
SHOP_ID="bata-store-01"
SYNC_ENABLED="true"
```

Use the same `SHOP_ID` on every PC in the same store.

### 3. Apply database schema

```bash
npm run db:push
```

### 4. Run app

```bash
npm run dev
```

Register users via Postman on one machine → open app on another machine with empty DB → sync pulls users automatically.

## API (check in browser or Postman)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `http://localhost:3000/api/mongo/health` | **MongoDB connected?** (ping test) |
| GET | `http://localhost:3000/api/sync/status` | Mongo + last sync details |
| POST | `http://localhost:3000/api/sync/run` | Run pull + push now |

**MongoDB working example:**
```json
{
  "success": true,
  "configured": true,
  "connected": true,
  "message": "MongoDB is connected and responding",
  "database": "bata-pos",
  "shopId": "bata-store-01",
  "latencyMs": 12
}
```

**Not working:** `"connected": false` and `message` will show the error.

### Fix: `querySrv ECONNREFUSED` (Windows / DNS)

Atlas `mongodb+srv://` needs DNS SRV. If that fails, use **standard URI** in `.env`:

```env
MONGODB_URI="mongodb://USER:PASS@cluster0.weqdqgo.mongodb.net:27017/bata-pos?retryWrites=true&w=majority&tls=true"
```

Also in **MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`).

Restart app after changing `.env`.

## New system checklist

1. Install Bata POS on new PC.
2. Set same `MONGODB_URI` and `SHOP_ID` in `.env`.
3. Connect internet → open app → wait for “Synced” in header.
4. Login with existing staff credentials.

## Disable sync

```env
SYNC_ENABLED="false"
```

Or remove `MONGODB_URI`.
