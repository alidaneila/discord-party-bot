# Discord Party Bot

Bot untuk bikin party dungeon run di Discord,.

## Setup

### 1. Clone & Install
npm install
```

### 2. Buat file `.env`
Copy dari `.env.example`, lalu isi:
```
DISCORD_TOKEN=   ← dari Discord Developer Portal > Bot > Token
CLIENT_ID=       ← dari OAuth2 > General > Application ID  
GUILD_ID=        ← klik kanan server Discord > Copy Server ID
```

> Aktifkan **Developer Mode** di Discord: Settings → Advanced → Developer Mode (untuk copy id server sama chanel)

### 3. Discord Developer Portal
1. Buka https://discord.com/developers/applications
2. New Application → beri nama
3. Pergi ke Bot → Reset Token → copy ke `.env`
4. Di Bot : matikan "Public Bot" kalau hanya untuk server sendiri
5. Di **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Read Message History`,'view chanel', 'embed links', nei lupa lagi, intinya yg diperluin aja buat fungsi botnya
   - Copy URL, buka di browser, invite bot ke server

### 4. Deploy slash commands
node deploy-commands.js
```

### 5. Jalankan bot
npm start
```

---

## Cara Pakai

| Command | Fungsi |

| `/createparty GDN HC` | Buat party baru |

Setelah party dibuat, semua orang bisa klik tombol role untuk join.

### Tombol
| Tombol | Siapa | Fungsi |

| Role buttons (FU, PR, dll) | Semua | Join role tersebut |
| Cancel My Role | Semua | Keluar dari role |
| Lock Party | Host | Kunci party (tidak bisa join) |
| Done | Host | Tutup party, semua tombol disable |
| Remove Member | Host | menghapus member yg join|
| Cancel Run | Host | Membatalkan Party|

---

## Struktur File

discord-party-bot/
├── commands/
│   └── createParty.js          ← Slash command untuk membuat party
├── components/
│   └── removeMemberMenu.js     ← Komponen select menu untuk menghapus anggota party
├── data/
│   └── parties.json            ← Penyimpanan data party
├── events/
│   └── interactionCreate.js    ← Handler semua interaction (slash command, button, select menu)
├── node_modules/
├── .env                        ← Token Discord (tidak diupload) nnti bikin sndri dr salinan .env.axample
├── .env.example                ← Contoh konfigurasi environment
├── config.js                   ← Konfigurasi role, channel, dan pengaturan bot
├── deploy-commands.js          ← Register slash commands ke Discord
├── discloud.config             ← Konfigurasi deployment Discloud (hanya kl mau deploy pk discloud)
├── embedBuilder.js             ← Builder embed party
├── index.js                    ← Entry point bot
├── package.json                ← Metadata dan dependencies project
├── package-lock.json
├── partyManager.js             ← Logika CRUD data party
├── threadManager.js            ← Manajemen thread untuk setiap party
└── README.md