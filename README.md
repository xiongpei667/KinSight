# KinSight 🏠👋

> **Face recognition for family & visitors — all in your browser, no data uploaded.**

KinSight is a web app that uses your camera to recognize known faces (family, friends, frequent visitors) and automatically logs their visits. When a stranger appears, you can register them with name and relationship, and they'll be recognized next time.

All data stays in `localStorage` — nothing is sent to any server.

![KinSight screenshot](https://img.shields.io/badge/status-demo-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎥 **Real-time face detection** | Camera feed with face bounding boxes |
| 🧑 **Known face recognition** | Auto-identifies registered family members |
| 🔔 **Browser notifications** | Alerts when a known person arrives |
| 📝 **Stranger registration** | Capture & label unknown faces with relationship |
| 📋 **Visit timeline** | Chronological log of all visits (known & unknown) |
| 👥 **People management** | Search, edit, delete registered members |
| 🌳 **Family tree** | View by generation (ancestors → parents → self → children) or category (paternal/maternal/immediate) |
| 📊 **Statistics** | Visit counts, hourly distribution, weekly activity, visitor rankings |
| 🌐 **i18n** | Chinese & English UI |
| 💾 **Data portability** | JSON export/import for backup & restore |

---

## 🚀 Quick Start

```bash
# Install
npm install

# Run dev server (opens at http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Prerequisites:**
- A camera (built-in laptop cam, USB webcam)
- Internet connection **on first load** (face recognition models are fetched from CDN)
- `localhost` HTTPS-like environment (Vite dev server works out of the box)

---

## 📖 How to Use

### 1. Start Camera
Click **"Start Camera"** and allow camera access. Face models load automatically on page load.

### 2. Register a Stranger
When an unknown face is detected, it appears in the right panel. Fill in:
- **Name**: e.g. "Uncle John"
- **Relationship**: Select from Chinese kinship terms (大伯, 表哥, etc.)
- **Notes**: Optional description

Click **"Save to Family"** — they'll be recognized next time.

### 3. Monitor
When a registered person is detected, the app shows:
- Their name & relationship
- Recognition confidence
- A browser notification (allow when prompted)

### 4. Explore Data
- **Timeline** tab: Chronological visit history, filterable by recognized/stranger
- **People** tab: All registered members with search & edit
- **Statistics** tab: Visit counts, charts, rankings
- **Settings** tab: Import/export data, clear all

### 5. Family Tree
The family tree auto-organizes members by generation:
```
        祖辈 (Grandparents)
        父辈 (Parents/Siblings)
        同辈 (You/Cousins)
        子辈 (Children/Nieces)
```

Use zoom buttons to adjust view, click a person to see their visit history.

---

## 🏗️ Project Structure

```
src/
├── main.jsx                     # Entry point
├── App.jsx                      # App shell + tab routing
├── App.css                      # Global styles
├── components/
│   ├── CameraView.jsx           # Video preview + detection overlay
│   ├── FamilyTree.jsx           # Generation & category tree
│   ├── PeoplePanel.jsx          # People management (card/list view)
│   ├── PersonDetailModal.jsx    # Person visit history detail
│   ├── RecognizedAlert.jsx      # Recognized person banner
│   ├── RegisterForm.jsx         # Stranger registration form
│   ├── StatsPanel.jsx           # Statistics dashboard + charts
│   └── TimelinePanel.jsx        # Visit history timeline
├── hooks/
│   ├── useFaceRecognition.js    # Face API loading + camera + scan loop
│   └── useLocalStorage.js       # localStorage persistence
├── utils/
│   ├── constants.js             # Config constants (thresholds, URLs)
│   ├── i18n.js                  # Chinese/English translations
│   ├── relations.js             # Kinship categories & generation mapping
│   └── storage.js               # Data read/write + helpers
```

---

## 🧠 Technical Details

### Face Recognition
- **Library**: [face-api.js](https://github.com/vladmandic/face-api) by @vladmandic
- **Model**: TinyFaceDetector + FaceLandmark68 + FaceRecognitionNet (loaded from CDN)
- **Matching**: Euclidean distance between 128-dimensional face descriptors
- **Threshold**: `MATCH_THRESHOLD = 0.48` (adjustable in `src/utils/constants.js`)

### Data Storage
- All data is stored in `localStorage` under key `kinsight-data-v2`
- Format: `{ visitors: [...], visits: [...] }`
- **Visitors**: registered people (name, relation, note, image, face descriptor)
- **Visits**: recognition events (personId, timestamp, snapshot, type)

### Browser Compatibility
- Requires `getUserMedia` (camera) — Chrome, Firefox, Safari, Edge
- Requires `Notification` API — all modern browsers
- Requires `localStorage` — all modern browsers

---

## ⚠️ Known Limitations

- **CDN model dependency**: Face models load from jsdelivr CDN on first visit. Offline use requires self-hosting the models.
- **localStorage quota**: ~5-10 MB limit. Fine for dozens of faces & thousands of visits.
- **Single user**: No multi-user or account system.
- **No backend**: This is a purely client-side demo. For a production doorbell system, consider a native app with persistent camera access.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

## 🙌 Credits

- [face-api.js](https://github.com/vladmandic/face-api) — JavaScript face recognition
- [Vite](https://vitejs.dev) — Build tool
- [React](https://react.dev) — UI framework
- [Lucide](https://lucide.dev) — Icons
