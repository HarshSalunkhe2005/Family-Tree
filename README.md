# Family Tree Desktop Application 🌳

A modern, highly deterministic, and mathematically precise family tree visualization tool built with Quasar Framework, Vue 3, and Electron. It features advanced bidirectional graph-traversal kinship detection to calculate relationships accurately in English, Hindi, and Marathi.

## 🌟 Key Features

### 1. Advanced Kinship Calculator
The application uses a Breadth-First Search (BFS) graph traversal engine to calculate relationships between any two individuals in the tree.
- **Path Length Analysis**: Dynamically determines if a relationship is a primary connection (Parent/Spouse/Child) or extended (Cousins, In-laws, Great-Grandparents).
- **Trilingual Support**: Displays relationships natively in **English**, **Hindi**, and **Marathi**.
- **Gender-Precise Routing**: In Indian cultures, relationships are gender-specific. The kinship engine determines exact lineage (e.g., distinguishing between a *Dada* [Father's Father] and *Nana* [Mother's Father], or *Kaka* [Father's Brother] and *Mama* [Mother's Brother]).

### 2. Recursive Bounding-Box Layout Engine
The entire family tree is visually constructed using a custom deterministic mathematical layout engine.
- Calculates recursive "bounding-box" widths for entire subtrees.
- Ensures all children are perfectly centered below their specific parent-nodes without overlapping cousins or extended families.
- Edges explicitly route from the exact middle of a spousal junction straight down to descendants.

### 3. "Bulletproof" Data Integrity
We enforce rigorous validation rules to ensure the family tree data never gets logically corrupted:
- **Max 1 Parent per Gender**: A child can only have one biological father and one biological mother.
- **No Orphan Nodes**: Deleting a primary parent seamlessly transfers custody of all children to the surviving spouse.
- **Spouse Overwrite Protection**: Prevents assigning multiple active spouses to a single node. Adding a new biological parent when one already exists intelligently maps them as a spouse.
- **Auto-Gender Enforcement**: Dynamically updates UI forms to prompt "Add Husband" / "Add Wife" depending on the target node's gender, automatically enforcing the correct gender to prevent human entry error.

### 4. Glassmorphism UI & Export
- Crafted with a modern dark-mode aesthetic featuring blurred backdrops and a futuristic color palette.
- **Local Storage Driven**: Data persists to local storage, keeping the application entirely local and private.
- **JSON Backup**: Seamlessly export the entire tree to a JSON file for backup or import to another machine.

## 🛠 Tech Stack
- **Framework**: Vue 3 (Composition API) + Quasar Framework
- **Visualization**: Vue Flow (`@vue-flow/core`)
- **Desktop Runtime**: Electron (`quasar build -m electron`)
- **Styling**: TailwindCSS-inspired Utility Classes + Custom SCSS
- **Icons**: Material Icons

## 🚀 Getting Started

### Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npx quasar dev
   ```

### Building for Desktop (Electron)
To build a production-ready desktop executable (e.g., `.exe` for Windows or `.dmg` for Mac):
```bash
npx quasar build -m electron
```
The packaged executable will be available in the `dist/electron` directory.

## 📂 File Architecture Highlight
- `src/pages/IndexPage.vue`: The primary layout, Vue Flow canvas integration, toolbar, and Dialog state logic.
- `src/components/layoutEngine.js`: The custom recursive mathematical engine used to plot X/Y coordinates for all nodes and edges to avoid intersection.
- `src/components/relationFinder.js`: The BFS Graph Traversal logic containing the translation engines for English, Hindi, and Marathi kinship algorithms.
- `src/stores/familyStore.js`: Pinia state management ensuring data integrity and correct cascading deletions.
- `src/components/FamilyNode.vue` & `CoupleJunction.vue`: Custom Vue Flow node types for aesthetic rendering.

---
*Built with ❤️ for Family.*
