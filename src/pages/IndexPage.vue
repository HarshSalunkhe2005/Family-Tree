<template>
  <q-page class="column bg-midnight text-white overflow-hidden" style="height: 100vh;">
    <!-- TOOLBAR -->
    <div class="toolbar-wrap bg-dark-soft q-pa-sm row items-center shadow-2 border-b-accent" style="flex-shrink: 0;">
      <q-icon name="account_tree" size="md" color="purple-4" class="q-mr-sm" />
      <div class="text-h6 text-bold text-purple-4 q-mr-lg app-title">Family Tree</div>

      <div v-if="tab === 'chart'" class="row items-center q-gutter-x-sm">
        <q-select v-model="searchModel" :options="searchOptions" use-input hide-selected fill-input label="Search member..." dark dense filled color="purple-4" style="width: 200px" @filter="filterFn" @update:model-value="focusNode" />
        <q-btn flat round icon="center_focus_strong" color="purple-4" @click="resetView"><q-tooltip>Fit to View</q-tooltip></q-btn>
        <q-separator vertical dark class="q-mx-xs" />
        <q-btn :outline="!relationMode" :color="relationMode ? 'orange-8' : 'grey-5'" icon="route" label="Find Relation" @click="toggleRelationMode" dense class="q-px-sm" />
      </div>

      <q-space />

      <div class="row items-center q-gutter-x-sm">
        <q-btn flat round icon="file_download" color="teal-4" @click="exportTree" v-if="store.members.length"><q-tooltip>Export JSON</q-tooltip></q-btn>
        <q-btn flat round icon="file_upload" color="teal-4" @click="triggerImport"><q-tooltip>Import JSON</q-tooltip></q-btn>
        <q-separator vertical dark class="q-mx-xs" />
        <q-tabs v-model="tab" dense class="text-grey-5" active-color="purple-4" indicator-color="purple-4">
          <q-tab name="chart" icon="hub" label="Lineage Chart" />
          <q-tab name="table" icon="table_chart" label="Directory" />
        </q-tabs>
        <q-separator vertical dark class="q-mx-xs" v-if="store.members.length" />
        <q-btn flat round icon="delete_forever" color="red-4" @click="nukeStorage" v-if="store.members.length"><q-tooltip>Clear All Data</q-tooltip></q-btn>
      </div>
    </div>

    <!-- TAB PANELS -->
    <q-tab-panels v-model="tab" animated class="bg-midnight" style="flex: 1 1 auto; width: 100%; min-height: 0;">
      <q-tab-panel name="chart" class="q-pa-none" style="height: 100%;">
        <div class="flow-wrapper" style="position: relative; width: 100%; height: 100%;" @contextmenu.prevent="onBgRightClick">
          <VueFlow :nodes="flowNodes" :edges="flowEdges" :node-types="nodeTypes" :fit-view-on-init="true" @nodeClick="onNodeClick" @nodeContextMenu="onNodeRightClick" @nodeDragStop="onNodeDragStop" @paneReady="onPaneReady" class="solver-canvas">
            <Background color="#0a0e14" :gap="24" pattern-color="#141c28" />
          </VueFlow>

          <!-- EMPTY STATE (above canvas) -->
          <div v-if="store.members.length === 0" class="empty-state">
            <q-icon name="family_restroom" size="80px" color="purple-4" class="q-mb-md" style="opacity: 0.4" />
            <div class="text-h5 text-purple-3 q-mb-sm" style="opacity: 0.7">Your Family Tree Starts Here</div>
            <div class="text-grey-5 text-body1 q-mb-lg">Right-click anywhere on the canvas to add your first member</div>
            <q-btn outline color="purple-4" icon="add" label="Add First Member" @click="openRootDialog" />
          </div>

          <!-- RELATION MODE INDICATOR -->
          <div v-if="relationMode" class="relation-indicator">
            <q-icon name="route" class="q-mr-sm" />
            <span>Click two members to find their relationship</span>
            <span class="q-ml-sm text-bold">({{ selectedNodes.length }}/2 selected)</span>
            <q-btn flat dense icon="close" color="white" class="q-ml-sm" @click="toggleRelationMode" />
          </div>

          <!-- MEMBER COUNT -->
          <div v-if="store.members.length > 0" class="member-count">
            <q-icon name="people" size="16px" class="q-mr-xs" />
            {{ store.members.length }} member{{ store.members.length > 1 ? 's' : '' }}
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="table" class="bg-midnight">
        <q-table flat bordered :rows="store.members" :columns="columns" row-key="id" dark class="bg-dark-soft styled-table" :filter="tableFilter" :pagination="{ rowsPerPage: 15 }">
          <template v-slot:top-right>
            <q-input dark dense filled v-model="tableFilter" placeholder="Search members..." color="purple-4" style="width: 300px">
              <template v-slot:prepend><q-icon name="search" /></template>
            </q-input>
          </template>
          <template v-slot:body-cell-gender="props">
            <q-td :props="props">
              <q-badge :color="props.row.gender === 'male' ? 'blue-8' : 'pink-8'" :label="props.row.gender" class="text-capitalize" />
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn icon="edit" color="cyan-6" flat dense @click="openEditFromTable(props.row)" class="q-mr-xs"><q-tooltip>Edit</q-tooltip></q-btn>
              <q-btn icon="delete" color="red-6" flat dense @click="confirmDeleteFromTable(props.row)"><q-tooltip>Delete</q-tooltip></q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>

    <!-- ADD MEMBER DIALOG -->
    <q-dialog v-model="dialog.show" persistent>
      <q-card class="bg-dark-soft text-white border-purple dialog-card">
        <q-card-section class="row items-center q-pb-none">
          <q-icon :name="dialog.isRoot ? 'person_add' : 'group_add'" color="purple-4" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-purple-4 text-bold">{{ dialog.isRoot ? 'New Member' : 'Add Relative' }}</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-lg">
          <q-input v-model="form.name" label="Full Name" dark filled color="purple-4" :rules="[v => !!v || 'Name is required']" />
          <div class="row q-col-gutter-md">
            <div :class="dialog.isRoot ? 'col-12' : 'col-6'">
              <q-select v-model="form.gender" :options="genderOptions" label="Gender" dark filled color="purple-4" emit-value map-options />
            </div>
            <div class="col-6" v-if="!dialog.isRoot">
              <q-select v-model="form.relationType" :options="relationOptions" label="Relation to this person" dark filled color="purple-4" />
            </div>
          </div>
          <q-input v-model="form.place" label="City / Place" dark filled color="purple-4" />
          <q-input v-model="form.phone" label="Phone Number" dark filled color="purple-4" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup class="q-mr-sm" />
          <q-btn unelevated label="Save Member" color="purple-8" icon="save" @click="saveMember" :disable="!form.name" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- EDIT MEMBER DIALOG -->
    <q-dialog v-model="info.show" persistent>
      <q-card class="bg-dark-soft text-white border-cyan dialog-card">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="edit" color="cyan-4" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-cyan-4 text-bold">Edit Member</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-y-sm q-pa-lg">
          <q-input v-model="info.data.name" label="Name" dark filled color="cyan-4" />
          <q-select v-model="info.data.gender" :options="genderOptions" label="Gender" dark filled color="cyan-4" emit-value map-options />
          <q-input v-model="info.data.place" label="Place" dark filled color="cyan-4" />
          <q-input v-model="info.data.phone" label="Phone" dark filled color="cyan-4" />
        </q-card-section>
        <q-card-actions align="between" class="q-pa-md">
          <q-btn outline icon="delete" label="Delete" color="red-8" @click="confirmDelete" />
          <q-btn unelevated label="Save Changes" icon="save" color="cyan-8" @click="updateMember" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- HIDDEN FILE INPUT -->
    <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleImport" />
  </q-page>
</template>

<script setup>
import { ref, computed, markRaw, nextTick } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { useFamilyStore } from 'src/stores/familyStore';
import FamilyNode from 'src/components/FamilyNode.vue';
import CoupleJunction from 'src/components/CoupleJunction.vue';
import { getRelationship } from 'src/components/relationFinder';
import { useQuasar } from 'quasar';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const store = useFamilyStore();
const $q = useQuasar();
const { setCenter, fitView, screenToFlowCoordinate } = useVueFlow();
const tab = ref('chart');
const nodeTypes = { custom: markRaw(FamilyNode), junction: markRaw(CoupleJunction) };
const fileInput = ref(null);

const dialog = ref({ show: false, isRoot: true, parentId: null, x: 0, y: 0 });
const info = ref({ show: false, data: {} });
const form = ref({ name: '', gender: 'male', place: '', phone: '', relationType: 'Son' });
const searchModel = ref(null);
const searchOptions = ref([]);
const tableFilter = ref('');
const relationMode = ref(false);
const selectedNodes = ref([]);

const genderOptions = [
  { label: '👨 Male', value: 'male' },
  { label: '👩 Female', value: 'female' }
];
const relationOptions = ['Father', 'Mother', 'Son', 'Daughter', 'Spouse'];

function resetForm() {
  form.value = { name: '', gender: 'male', place: '', phone: '', relationType: 'Son' };
}

function openRootDialog() {
  dialog.value = { show: true, isRoot: true, x: 0, y: 0 };
  resetForm();
}

function nukeStorage() {
  $q.dialog({
    title: 'Clear All Data',
    message: 'This will permanently delete your entire family tree. This action cannot be undone.',
    cancel: { flat: true, color: 'grey-5' },
    ok: { color: 'red-8', label: 'Delete Everything', icon: 'delete_forever' },
    dark: true,
    persistent: true
  }).onOk(() => {
    localStorage.removeItem('family-tree-data');
    window.location.reload();
  });
}

function toggleRelationMode() {
  relationMode.value = !relationMode.value;
  selectedNodes.value = [];
}

function onNodeClick({ node }) {
  if (relationMode.value) {
    selectedNodes.value.push(node.id);
    const member = store.members.find(m => m.id === node.id);
    $q.notify({ message: `Selected: ${member?.name || 'Unknown'}`, color: 'orange-8', position: 'bottom', timeout: 1200 });

    if (selectedNodes.value.length === 2) {
      try {
        const res = getRelationship(store.members, selectedNodes.value[0], selectedNodes.value[1]);
        const nameA = store.members.find(m => m.id === selectedNodes.value[0])?.name || 'A';
        const nameB = store.members.find(m => m.id === selectedNodes.value[1])?.name || 'B';
        $q.dialog({
          title: '🔗 Relationship Found',
          message: `<div class="text-center q-pa-sm">
            <div class="text-body1 q-mb-md">${nameA}</div>
            <div class="text-caption text-grey-5">↕</div>
            <div class="text-h5 text-bold text-purple-4 q-my-sm">${res}</div>
            <div class="text-caption text-grey-5">↕</div>
            <div class="text-body1 q-mt-md">${nameB}</div>
          </div>`,
          html: true,
          dark: true,
          ok: { color: 'purple-8', label: 'Got it' }
        });
      } catch { $q.notify({ message: 'Could not determine relationship', color: 'red-8' }); }
      selectedNodes.value = [];
      relationMode.value = false;
    }
    return;
  }
  const person = store.members.find(m => m.id === node.id);
  if (person) { info.value.data = JSON.parse(JSON.stringify(person)); info.value.show = true; }
}

function filterFn(val, update) {
  update(() => {
    const needle = val.toLowerCase();
    searchOptions.value = store.members.map(m => ({ label: m.name, value: m.id })).filter(v => v.label.toLowerCase().indexOf(needle) > -1);
  });
}

function focusNode(val) { if (val) { const m = store.members.find(x => x.id === val.value); if (m) setCenter(m.x + 90, m.y + 30, { zoom: 1.2, duration: 800 }); } }
function resetView() { fitView({ padding: 0.5, duration: 800 }); }
function onPaneReady() { if (store.members.length > 0) setTimeout(() => fitView({ padding: 0.5 }), 200); }

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'gender', label: 'Gender', field: 'gender', align: 'center', sortable: true },
  { name: 'place', label: 'Place', field: 'place', align: 'left', sortable: true },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'id', align: 'center' }
];

// NODE WIDTH constant for midpoint calculations
const NODE_MID = 90; // approx half of average node width

// Build couple junction lookup: parentId -> junctionId
const coupleMap = computed(() => {
  const map = {};
  const seen = new Set();
  store.members.forEach(m => {
    if (m.spouseId) {
      const key = [m.id, m.spouseId].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        const jId = `junction-${key}`;
        map[m.id] = jId;
        map[m.spouseId] = jId;
      }
    }
  });
  return map;
});

// Pass place to node data for subtitle display + add junction nodes
const flowNodes = computed(() => {
  const nodes = store.members.map(m => ({
    id: m.id, type: 'custom',
    position: { x: m.x, y: m.y },
    data: { label: m.name, gender: m.gender, place: m.place }
  }));

  // Add invisible junction dots at the midpoint of each couple
  const seen = new Set();
  store.members.forEach(m => {
    if (m.spouseId) {
      const key = [m.id, m.spouseId].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        const spouse = store.members.find(s => s.id === m.spouseId);
        if (spouse) {
          nodes.push({
            id: `junction-${key}`,
            type: 'junction',
            position: {
              x: (m.x + spouse.x) / 2 + NODE_MID,
              y: m.y + 18
            },
            data: {},
            draggable: false,
            selectable: false,
          });
        }
      }
    }
  });
  return nodes;
});

// Edges: spouse links split through junction, children connect from junction
const flowEdges = computed(() => {
  const edges = [];
  const spouseEdgeSet = new Set();

  store.members.forEach(m => {
    // CHILD → PARENT edges
    if (m.parentId) {
      const junctionId = coupleMap.value[m.parentId];
      if (junctionId) {
        // Parent has a spouse → route child edge from junction dot
        edges.push({ id: `e-p-${m.id}`, source: junctionId, target: m.id, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } });
      } else {
        // Single parent → direct edge
        edges.push({ id: `e-p-${m.id}`, source: m.parentId, target: m.id, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } });
      }
    }

    // SPOUSE edges (split into left→junction→right)
    if (m.spouseId) {
      const key = [m.id, m.spouseId].sort().join('-');
      if (!spouseEdgeSet.has(key)) {
        spouseEdgeSet.add(key);
        const junctionId = `junction-${key}`;
        const spouse = store.members.find(s => s.id === m.spouseId);
        if (spouse) {
          // Determine left/right by x position
          const leftId = m.x <= spouse.x ? m.id : spouse.id;
          const rightId = m.x <= spouse.x ? spouse.id : m.id;
          edges.push({ id: `e-sl-${key}`, source: leftId, target: junctionId, sourceHandle: 'right-port', targetHandle: 'left-port', type: 'straight', style: { stroke: '#d946ef', strokeWidth: 2.5 } });
          edges.push({ id: `e-sr-${key}`, source: junctionId, target: rightId, sourceHandle: 'right-port', targetHandle: 'left-port', type: 'straight', style: { stroke: '#d946ef', strokeWidth: 2.5 } });
        }
      }
    }
  });
  return edges;
});

function updateMember() {
  store.updateMember(info.value.data.id, info.value.data);
  info.value.show = false;
  $q.notify({ message: 'Member updated', color: 'cyan-8', icon: 'check_circle', position: 'bottom', timeout: 1500 });
}
function confirmDelete() {
  $q.dialog({ title: 'Delete Member', message: `Remove "${info.value.data.name}" from the tree?`, cancel: { flat: true }, dark: true, ok: { color: 'red-8', label: 'Delete' } })
    .onOk(() => { store.deleteMember(info.value.data.id); info.value.show = false; $q.notify({ message: 'Member removed', color: 'red-8', icon: 'delete', position: 'bottom', timeout: 1500 }); });
}
function confirmDeleteFromTable(member) {
  $q.dialog({ title: 'Delete Member', message: `Remove "${member.name}"?`, cancel: { flat: true }, dark: true, ok: { color: 'red-8', label: 'Delete' } })
    .onOk(() => { store.deleteMember(member.id); $q.notify({ message: 'Member removed', color: 'red-8', icon: 'delete', position: 'bottom', timeout: 1500 }); });
}
function openEditFromTable(member) {
  info.value.data = JSON.parse(JSON.stringify(member));
  info.value.show = true;
}
function onNodeRightClick({ event, node }) {
  event.stopPropagation(); event.preventDefault();
  const m = store.members.find(x => x.id === node.id);
  dialog.value = { show: true, isRoot: false, parentId: node.id, x: m.x, y: m.y };
  resetForm();
}
function onBgRightClick(event) {
  // When tree is empty, place at origin; otherwise use flow coordinates
  if (store.members.length === 0) {
    dialog.value = { show: true, isRoot: true, x: 0, y: 0 };
  } else {
    const flowPos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });
    dialog.value = { show: true, isRoot: true, x: flowPos.x, y: flowPos.y };
  }
  resetForm();
}
function onNodeDragStop({ node }) {
  const m = store.members.find(x => x.id === node.id);
  if (m) { const dx = node.position.x - m.x; const dy = node.position.y - m.y; store.moveSubtree(node.id, dx, dy); }
}

function saveMember() {
  if (!form.value.name) return;
  let newX = dialog.value.x; let newY = dialog.value.y;
  let sId = null; let pId = dialog.value.parentId;

  if (!dialog.value.isRoot) {
    if (['Father', 'Mother'].includes(form.value.relationType)) {
      newY -= 180;
      const savedName = form.value.name;
      const newId = store.addMember({ ...form.value, x: newX, y: newY });
      store.updateMember(dialog.value.parentId, { parentId: newId });
      dialog.value.show = false;
      resetForm();
      $q.notify({ message: `${savedName} added as parent`, color: 'purple-8', icon: 'check_circle', position: 'bottom', timeout: 1500 });
      setTimeout(() => fitView({ padding: 0.5, duration: 600 }), 100);
      return;
    } else if (['Son', 'Daughter'].includes(form.value.relationType)) {
      // FIX: Offset siblings horizontally so they don't stack
      const existingChildren = store.getChildrenOf(pId);
      // Also count children of spouse
      const parent = store.members.find(m => m.id === pId);
      let spouseChildren = [];
      if (parent?.spouseId) {
        spouseChildren = store.getChildrenOf(parent.spouseId);
      }
      const allChildren = [...existingChildren, ...spouseChildren];
      const siblingCount = allChildren.length;
      newY += 180;
      newX += (siblingCount * 220) - ((siblingCount * 220) / 2);
    } else if (form.value.relationType === 'Spouse') {
      newX += 250; sId = dialog.value.parentId; pId = null;
    }
  }

  store.addMember({ ...form.value, parentId: pId, spouseId: sId, x: newX, y: newY });
  if (sId) {
    const all = store.members;
    const newId = all[all.length - 1].id;
    store.updateMember(sId, { spouseId: newId });
  }
  dialog.value.show = false;
  const savedName = form.value.name;
  resetForm();
  $q.notify({ message: `${savedName} added to tree`, color: 'purple-8', icon: 'check_circle', position: 'bottom', timeout: 1500 });
  setTimeout(() => fitView({ padding: 0.5, duration: 600 }), 100);
}

// EXPORT / IMPORT
function exportTree() {
  const data = store.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `family-tree-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  $q.notify({ message: 'Tree exported successfully', color: 'teal-8', icon: 'file_download', position: 'bottom' });
}
function triggerImport() { fileInput.value?.click(); }
function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const success = store.importData(e.target.result);
    if (success) {
      $q.notify({ message: `Imported ${store.members.length} members`, color: 'teal-8', icon: 'check_circle', position: 'bottom' });
      nextTick(() => fitView({ padding: 0.5, duration: 800 }));
    } else {
      $q.notify({ message: 'Invalid file format', color: 'red-8', icon: 'error' });
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
</script>

<style lang="scss">
.bg-midnight { background-color: #080c12 !important; }
.bg-dark-soft { background-color: #111827 !important; }
.border-purple { border: 1.5px solid #9c27b0; }
.border-cyan { border: 1.5px solid #00bcd4; }
.border-b-accent { border-bottom: 1.5px solid rgba(156, 39, 176, 0.4); }
.solver-canvas { width: 100%; height: 100%; pointer-events: all; }
.vue-flow__attribution { display: none; }
.app-title { letter-spacing: 1px; font-size: 18px !important; }

.toolbar-wrap {
  backdrop-filter: blur(12px);
  background: rgba(17, 24, 39, 0.95) !important;
  z-index: 10;
}

.dialog-card {
  width: 440px;
  border-radius: 16px;
  backdrop-filter: blur(20px);
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
  text-align: center;
}
.empty-state > * {
  pointer-events: all;
}

.relation-indicator {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245, 124, 0, 0.9);
  color: white;
  padding: 8px 20px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(245, 124, 0, 0.3);
}

.member-count {
  position: absolute;
  bottom: 12px;
  right: 16px;
  background: rgba(17, 24, 39, 0.85);
  color: #9ca3af;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(156, 39, 176, 0.2);
  z-index: 5;
}

.styled-table {
  .q-table__top { border-bottom: 1px solid rgba(156, 39, 176, 0.2); }
  th { color: #a78bfa !important; font-weight: 700 !important; text-transform: uppercase; font-size: 11px !important; letter-spacing: 1px; }
}
</style>