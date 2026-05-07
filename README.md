<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Quasar-2.16-1976D2?style=for-the-badge&logo=quasar&logoColor=white" alt="Quasar" />
  <img src="https://img.shields.io/badge/Vue_Flow-1.48-3b82f6?style=for-the-badge" alt="Vue Flow" />
  <img src="https://img.shields.io/badge/Pinia-3.0-ffd859?style=for-the-badge" alt="Pinia" />
  <img src="https://img.shields.io/badge/Vite-Powered-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

# 🌳 FamilyTree

> An interactive family lineage visualizer — build, explore, and understand family relationships through a beautiful node-based graph interface.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Interactive Lineage Chart** | Drag-and-drop node graph powered by Vue Flow with animated edges and a dark canvas |
| **Smart Relationship Finder** | Select any two members and instantly compute their relationship (Father, Aunt, Son-in-law, Grandmother, etc.) |
| **Contextual Member Management** | Right-click to add relatives (Father, Mother, Son, Daughter, Spouse) with auto-positioning |
| **Member Directory** | Searchable, sortable table view of all family members |
| **Subtree Dragging** | Move a member and all their descendants + spouse follow along |
| **Persistent Storage** | Data saved to `localStorage` — works fully offline, no backend needed |
| **Dark Theme** | Sleek midnight UI with color-coded nodes (blue = male, pink = female, magenta = spouse links) |

---

## 🖼️ Preview

<table>
  <tr>
    <td align="center"><strong>Lineage Chart</strong></td>
    <td align="center"><strong>Member Directory</strong></td>
  </tr>
  <tr>
    <td><em>Interactive node graph with drag & zoom</em></td>
    <td><em>Searchable table with inline actions</em></td>
  </tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm ≥ 6.13.4

### Installation

```bash
# Clone the repository
git clone https://github.com/HarshSalunkhe2005/Family-Tree.git
cd Family-Tree

# Install dependencies
npm install
```

### Development

```bash
# Start the dev server with hot-reload
npm run dev
```

The app will open automatically at [http://localhost:9000](http://localhost:9000).

### Production Build

```bash
# Build for production (SPA)
npm run build
```

Output is generated in the `dist/spa` directory.

---

## 🏗️ Architecture

```
src/
├── App.vue                        # Root component
├── assets/                        # Static assets
├── boot/                          # Quasar boot files
├── components/
│   ├── FamilyNode.vue             # Custom Vue Flow node renderer
│   └── relationFinder.js          # BFS-based relationship computation
├── css/
│   ├── app.scss                   # Global styles
│   └── quasar.variables.scss      # Quasar theme variables
├── layouts/
│   └── MainLayout.vue             # App shell layout
├── pages/
│   ├── IndexPage.vue              # Main application page
│   └── ErrorNotFound.vue          # 404 handler
├── router/                        # Vue Router configuration
└── stores/
    ├── index.js                   # Pinia store initialization
    └── familyStore.js             # Family data store (CRUD + subtree ops)
```

### Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **UI Framework** | [Vue 3](https://vuejs.org/) (Composition API) | Reactive component system |
| **Component Library** | [Quasar](https://quasar.dev/) v2 | Material Design components, dialogs, tables |
| **Graph Engine** | [Vue Flow](https://vueflow.dev/) | Interactive node-graph rendering |
| **State Management** | [Pinia](https://pinia.vuejs.org/) v3 | Centralized store with localStorage sync |
| **Build Tool** | [Vite](https://vitejs.dev/) | Fast HMR & optimized builds |

### How It Works

1. **Data Model** — Each family member is a flat object with `id`, `name`, `gender`, `parentId`, `spouseId`, and `x/y` coordinates stored in a Pinia store backed by `localStorage`.
2. **Graph Rendering** — Vue Flow converts the flat member list into interactive nodes and edges. Parent→child links are animated blue; spouse links are straight magenta.
3. **Relationship Algorithm** — A BFS traversal from the tree root assigns generation levels to each member. The generation delta between two selected members determines their relationship label.

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build production SPA bundle |
| `npm run lint` | Run ESLint on source files |
| `npm run format` | Format code with Prettier |

---

## 📄 License

This project is private and not published under an open-source license.

---

## 👤 Author

**Harsh Salunkhe** — [@HarshSalunkhe2005](https://github.com/HarshSalunkhe2005)
