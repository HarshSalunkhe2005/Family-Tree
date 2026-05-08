<template>
  <q-page class="page-root">
    <!-- ═══ TOOLBAR ═══ -->
    <header class="toolbar">
      <div class="toolbar-left">
        <q-icon name="account_tree" size="26px" class="logo-icon" />
        <span class="app-name">Family Tree</span>
      </div>

      <div v-if="tab === 'chart'" class="toolbar-center">
        <q-select v-model="searchModel" :options="searchOptions" use-input hide-selected fill-input
          label="Search member..." dark dense filled color="purple-4" class="search-box"
          @filter="filterFn" @update:model-value="focusNode" popup-content-class="search-popup" />
        <q-btn flat round icon="center_focus_strong" size="sm" class="tool-btn" @click="resetView">
          <q-tooltip>Fit to Screen</q-tooltip>
        </q-btn>
        <div class="toolbar-divider" />
        <q-btn :class="['relation-btn', { active: relationMode }]" icon="route" label="Find Relation"
          dense flat @click="toggleRelationMode" />
        <div class="toolbar-divider" style="margin-left: 12px" />
        <q-btn-toggle
          v-model="language"
          flat dense
          class="q-ml-sm"
          style="border: 1px solid rgba(255,255,255,0.1); border-radius: 6px"
          color="purple-5"
          text-color="grey-5"
          toggle-color="purple-5"
          toggle-text-color="white"
          :options="[{label: 'EN', value: 'en'}, {label: 'HI', value: 'hi'}, {label: 'MR', value: 'mr'}]"
        />
      </div>

      <div class="toolbar-right">
        <q-btn v-if="store.members.length" flat round icon="file_download" size="sm" class="tool-btn" @click="exportTree">
          <q-tooltip>Export Backup</q-tooltip>
        </q-btn>
        <q-btn flat round icon="file_upload" size="sm" class="tool-btn" @click="triggerImport">
          <q-tooltip>Import Backup</q-tooltip>
        </q-btn>
        <div class="toolbar-divider" />
        <q-tabs v-model="tab" dense inline-label class="tab-switch" active-color="purple-4" indicator-color="purple-4">
          <q-tab name="chart" icon="hub" label="Chart" />
          <q-tab name="table" icon="table_chart" label="Directory" />
        </q-tabs>
        <div v-if="store.members.length" class="toolbar-divider" />
        <q-btn v-if="store.members.length" flat round icon="delete_forever" size="sm" class="danger-btn" @click="nukeData">
          <q-tooltip>Clear All Data</q-tooltip>
        </q-btn>
      </div>
    </header>

    <!-- ═══ CONTENT ═══ -->
    <div class="content-area">
      <q-tab-panels v-model="tab" animated class="panels">
        <!-- CHART TAB -->
        <q-tab-panel name="chart" class="chart-panel">
          <div class="canvas-wrap" @contextmenu.prevent="onBgRightClick">
            <VueFlow :nodes="layoutResult.nodes" :edges="layoutResult.edges" :node-types="nodeTypes"
              :fit-view-on-init="true" :min-zoom="0.15" :max-zoom="2.5"
              @nodeClick="onNodeClick" @nodeContextMenu="onNodeRightClick"
              @paneReady="onPaneReady" class="tree-canvas">
              <Background :gap="30" pattern-color="rgba(139, 92, 246, 0.04)" />
            </VueFlow>

            <!-- Empty state -->
            <Transition name="fade">
              <div v-if="store.members.length === 0" class="empty-overlay">
                <div class="empty-content">
                  <q-icon name="family_restroom" size="72px" class="empty-icon" />
                  <h2 class="empty-title">Your Family Tree Starts Here</h2>
                  <p class="empty-desc">Right-click anywhere on the canvas to add your first family member,<br>or click the button below.</p>
                  <q-btn unelevated color="purple-8" icon="add" label="Add First Member" class="empty-btn" @click="openRootDialog" />
                </div>
              </div>
            </Transition>

            <!-- Relation mode banner -->
            <Transition name="slide-down">
              <div v-if="relationMode" class="relation-banner">
                <q-icon name="route" size="18px" />
                <span>Click two members to find their relationship</span>
                <q-badge color="orange-8" :label="`${selectedNodes.length}/2`" />
                <q-btn flat dense round icon="close" size="xs" color="white" @click="toggleRelationMode" />
              </div>
            </Transition>

            <!-- Member count -->
            <div v-if="store.members.length > 0" class="member-badge">
              <q-icon name="people" size="14px" />
              {{ store.members.length }} member{{ store.members.length !== 1 ? 's' : '' }}
            </div>
          </div>
        </q-tab-panel>

        <!-- TABLE TAB -->
        <q-tab-panel name="table" class="table-panel">
          <q-table flat bordered :rows="store.members" :columns="columns" row-key="id" dark
            class="directory-table" :filter="tableFilter" :pagination="{ rowsPerPage: 20 }">
            <template v-slot:top-right>
              <q-input dark dense filled v-model="tableFilter" placeholder="Search members..." color="purple-4" class="table-search">
                <template v-slot:prepend><q-icon name="search" /></template>
              </q-input>
            </template>
            <template v-slot:body-cell-gender="props">
              <q-td :props="props">
                <q-badge :color="props.row.gender === 'male' ? 'blue-8' : 'pink-8'" :label="props.row.gender" class="text-capitalize" />
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="q-gutter-x-xs">
                <q-btn icon="edit" color="cyan-6" flat dense size="sm" @click="openEditDialog(props.row)" />
                <q-btn icon="delete" color="red-6" flat dense size="sm" @click="confirmDelete(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ═══ ADD MEMBER DIALOG ═══ -->
    <q-dialog v-model="addDialog.show" persistent>
      <q-card class="dialog-card purple-dialog">
        <q-card-section class="dialog-header">
          <q-icon :name="addDialog.isRoot ? 'person_add' : 'group_add'" size="sm" />
          <span>{{ addDialog.isRoot ? 'Add Member' : 'Add Relative' }}</span>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-md">
          <q-input v-model="form.name" label="Full Name" dark filled color="purple-4" :rules="[v => !!v || 'Required']" />
          <div class="row q-col-gutter-md">
            <div :class="addDialog.isRoot ? 'col-12' : 'col-6'">
              <q-select v-model="form.gender" :options="genderOpts" label="Gender" dark filled color="purple-4" emit-value map-options />
            </div>
            <div class="col-6" v-if="!addDialog.isRoot">
              <q-select v-model="form.relationType" :options="relationOptions" label="Relation" dark filled color="purple-4" @update:model-value="onRelationChange" />
            </div>
          </div>
          <q-input v-model="form.place" label="City / Place" dark filled color="purple-4" />
          <q-input v-model="form.phone" label="Phone Number" dark filled color="purple-4" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated label="Save Member" color="purple-8" icon="save" :disable="!form.name" @click="saveMember" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ═══ EDIT MEMBER DIALOG ═══ -->
    <q-dialog v-model="editDialog.show" persistent>
      <q-card class="dialog-card cyan-dialog">
        <q-card-section class="dialog-header cyan">
          <q-icon name="edit" size="sm" />
          <span>Edit Member</span>
          <q-space />
          <q-btn icon="close" flat round dense size="sm" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-y-sm q-pa-lg">
          <q-input v-model="editDialog.data.name" label="Name" dark filled color="cyan-4" />
          <q-select v-model="editDialog.data.gender" :options="genderOpts" label="Gender" dark filled color="cyan-4" emit-value map-options />
          <q-input v-model="editDialog.data.place" label="Place" dark filled color="cyan-4" />
          <q-input v-model="editDialog.data.phone" label="Phone" dark filled color="cyan-4" />
        </q-card-section>
        <q-card-actions align="between" class="q-pa-md">
          <q-btn outline icon="delete" label="Delete" color="red-8" @click="confirmDeleteFromEdit" />
          <q-btn unelevated label="Save Changes" icon="save" color="cyan-8" @click="saveEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { computeLayout } from 'src/components/layoutEngine';
import { getRelationship } from 'src/components/relationFinder';
import { useQuasar } from 'quasar';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const store = useFamilyStore();
const $q = useQuasar();
const { fitView, setCenter } = useVueFlow();
const tab = ref('chart');
const fileInput = ref(null);
const nodeTypes = { familyNode: markRaw(FamilyNode), junctionNode: markRaw(CoupleJunction) };

// ─── State ───
const addDialog = ref({ show: false, isRoot: true, parentId: null });
const editDialog = ref({ show: false, data: {} });
const form = ref({ name: '', gender: 'male', place: '', phone: '', relationType: 'Son' });
const searchModel = ref(null);
const searchOptions = ref([]);

const relationOptions = computed(() => {
  if (addDialog.value.isRoot) return [];
  const parent = store.members.find(m => m.id === addDialog.value.parentId);
  if (!parent) return ['Father', 'Mother', 'Son', 'Daughter', 'Spouse'];
  const spouseLabel = parent.gender === 'male' ? 'Wife' : 'Husband';
  return ['Father', 'Mother', 'Son', 'Daughter', spouseLabel];
});

function onRelationChange(val) {
  if (['Father', 'Son', 'Husband'].includes(val)) form.value.gender = 'male';
  if (['Mother', 'Daughter', 'Wife'].includes(val)) form.value.gender = 'female';
}

function resetForm() {
  form.value = { name: '', gender: 'male', place: '', phone: '', relationType: 'Son' };
}

const tableFilter = ref('');
const relationMode = ref(false);
const selectedNodes = ref([]);
const language = ref('en'); // 'en' or 'hi'

const genderOpts = [{ label: '👨 Male', value: 'male' }, { label: '👩 Female', value: 'female' }];

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'gender', label: 'Gender', field: 'gender', align: 'center', sortable: true },
  { name: 'place', label: 'Place', field: 'place', align: 'left', sortable: true },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'center' },
];

// ─── Layout (recomputed reactively whenever members change) ───
const layoutResult = computed(() => computeLayout(store.members));

// ─── Form helpers ───
function resetForm() {
  form.value = { name: '', gender: 'male', place: '', phone: '', relationType: 'Son' };
}

function openRootDialog() {
  addDialog.value = { show: true, isRoot: true, parentId: null };
  resetForm();
}

function openEditDialog(member) {
  editDialog.value = { show: true, data: { ...member } };
}

// ─── Vue Flow ───
function onPaneReady() {
  if (store.members.length > 0) setTimeout(() => fitView({ padding: 0.4 }), 150);
}
function resetView() { fitView({ padding: 0.4, duration: 600 }); }
function filterFn(val, update) {
  update(() => {
    const q = val.toLowerCase();
    searchOptions.value = store.members.map(m => ({ label: m.name, value: m.id })).filter(v => v.label.toLowerCase().includes(q));
  });
}
function focusNode(val) {
  if (!val) return;
  const node = layoutResult.value.nodes.find(n => n.id === val.value);
  if (node) setCenter(node.position.x + 100, node.position.y + 35, { zoom: 1.3, duration: 600 });
}

// ─── Relation Mode ───
function toggleRelationMode() {
  relationMode.value = !relationMode.value;
  selectedNodes.value = [];
}

function onNodeClick({ node }) {
  if (node.type === 'junctionNode') return; // ignore junctions

  if (relationMode.value) {
    selectedNodes.value.push(node.id);
    const member = store.members.find(m => m.id === node.id);
    $q.notify({ message: `Selected: ${member?.name}`, color: 'orange-8', position: 'bottom', timeout: 1000 });

    if (selectedNodes.value.length === 2) {
      const [a, b] = selectedNodes.value;
      const personA = store.members.find(m => m.id === a);
      const personB = store.members.find(m => m.id === b);
      const result = getRelationship(store.members, a, b, language.value);

      let msgHtml = '';
      if (language.value === 'hi') {
        msgHtml = `<div style="text-align:center;padding:12px 0">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">
            <div style="padding:6px 16px;border-radius:10px;background:${personA?.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'};border:1px solid ${personA?.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'};font-size:14px;font-weight:600">${personA?.name}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">
            <div style="padding:6px 16px;border-radius:10px;background:${personB?.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'};border:1px solid ${personB?.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'};font-size:14px;font-weight:600">${personB?.name}</div>
          </div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-bottom:4px">KE / KI (के / की)</div>
          <div style="font-size:28px;font-weight:800;color:#a78bfa;margin:8px 0;letter-spacing:1px">${result.label}</div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-top:4px;margin-bottom:16px">HAIN (हैं)</div>
          ${result.explanation ? `<div style="color:#9ca3af;font-size:12px;margin-top:8px;padding:8px 12px;background:rgba(139,92,246,0.08);border-radius:8px;border:1px solid rgba(139,92,246,0.15)">${result.explanation}</div>` : ''}
        </div>`;
      } else if (language.value === 'mr') {
        msgHtml = `<div style="text-align:center;padding:12px 0">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">
            <div style="padding:6px 16px;border-radius:10px;background:${personA?.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'};border:1px solid ${personA?.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'};font-size:14px;font-weight:600">${personA?.name}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">
            <div style="padding:6px 16px;border-radius:10px;background:${personB?.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'};border:1px solid ${personB?.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'};font-size:14px;font-weight:600">${personB?.name}</div>
          </div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-bottom:4px">CHE / CHI (चे / ची)</div>
          <div style="font-size:28px;font-weight:800;color:#a78bfa;margin:8px 0;letter-spacing:1px">${result.label}</div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-top:4px;margin-bottom:16px">AHET / AHE (आहेत / आहे)</div>
          ${result.explanation ? `<div style="color:#9ca3af;font-size:12px;margin-top:8px;padding:8px 12px;background:rgba(139,92,246,0.08);border-radius:8px;border:1px solid rgba(139,92,246,0.15)">${result.explanation}</div>` : ''}
        </div>`;
      } else {
        msgHtml = `<div style="text-align:center;padding:12px 0">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px">
            <div style="padding:6px 16px;border-radius:10px;background:${personA?.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'};border:1px solid ${personA?.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'};font-size:14px;font-weight:600">${personA?.name}</div>
          </div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-bottom:4px">IS THE</div>
          <div style="font-size:28px;font-weight:800;color:#a78bfa;margin:8px 0;letter-spacing:1px">${result.label}</div>
          <div style="font-size:11px;color:#6b7280;letter-spacing:2px;margin-top:4px;margin-bottom:16px">OF</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px">
            <div style="padding:6px 16px;border-radius:10px;background:${personB?.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'};border:1px solid ${personB?.gender === 'female' ? 'rgba(244,114,182,0.3)' : 'rgba(96,165,250,0.3)'};font-size:14px;font-weight:600">${personB?.name}</div>
          </div>
          ${result.explanation ? `<div style="color:#9ca3af;font-size:12px;margin-top:8px;padding:8px 12px;background:rgba(139,92,246,0.08);border-radius:8px;border:1px solid rgba(139,92,246,0.15)">${result.explanation}</div>` : ''}
        </div>`;
      }

      $q.dialog({
        title: '🔗 Relationship Found',
        message: msgHtml,
        html: true, dark: true, ok: { color: 'purple-8', label: 'Done', unelevated: true },
      });
      selectedNodes.value = [];
      relationMode.value = false;
    }
    return;
  }

  // Normal click: open edit dialog
  const member = store.members.find(m => m.id === node.id);
  if (member) openEditDialog(member);
}

// ─── Right-click handlers ───
function onNodeRightClick({ event, node }) {
  if (node.type === 'junctionNode') return;
  event.stopPropagation();
  event.preventDefault();
  addDialog.value = { show: true, isRoot: false, parentId: node.id };
  resetForm();
}

function onBgRightClick() {
  addDialog.value = { show: true, isRoot: true, parentId: null };
  resetForm();
}

// ─── CRUD ───
function saveMember() {
  if (!form.value.name) return;

  if (!addDialog.value.isRoot) {
    const selectedId = addDialog.value.parentId;
    const selectedNode = store.members.find(m => m.id === selectedId);
    const rel = form.value.relationType;

    if (['Father', 'Mother'].includes(rel)) {
      const isAddingFather = rel === 'Father';
      const addedGender = isAddingFather ? 'male' : 'female';
      form.value.gender = addedGender; // Enforce gender

      if (selectedNode.parentId) {
        // Node already has a primary parent
        const primaryParent = store.members.find(m => m.id === selectedNode.parentId);
        if (primaryParent) {
          if (primaryParent.gender === addedGender) {
            $q.notify({ message: `This member already has a ${rel}.`, color: 'red-8', icon: 'error' });
            return;
          }
          if (primaryParent.spouseId) {
            $q.notify({ message: `Both parents are already defined.`, color: 'red-8', icon: 'error' });
            return;
          }
          // Add as spouse to the primary parent
          store.addMember({ ...form.value, parentId: primaryParent.id, relationType: 'Spouse' });
        } else {
          // Fallback if primaryParent is missing
          const newId = store.addMember({ ...form.value, parentId: null, spouseId: null });
          store.updateMember(selectedId, { parentId: newId });
        }
      } else {
        // No parent exists yet
        const newId = store.addMember({ ...form.value, parentId: null, spouseId: null });
        store.updateMember(selectedId, { parentId: newId });
      }
    } else if (['Son', 'Daughter'].includes(rel)) {
      form.value.gender = rel === 'Son' ? 'male' : 'female';
      store.addMember({ ...form.value, parentId: selectedId, spouseId: null });
    } else if (['Spouse', 'Husband', 'Wife'].includes(rel)) {
      if (selectedNode.spouseId) {
        $q.notify({ message: 'This member already has a spouse.', color: 'red-8', icon: 'error' });
        return;
      }
      if (rel === 'Husband') form.value.gender = 'male';
      if (rel === 'Wife') form.value.gender = 'female';
      store.addMember({ ...form.value, parentId: selectedId, relationType: 'Spouse' });
    }
  } else {
    store.addMember({ ...form.value, parentId: null, spouseId: null });
  }

  addDialog.value.show = false;
  const name = form.value.name;
  resetForm();
  $q.notify({ message: `${name} added`, color: 'purple-8', icon: 'check_circle', position: 'bottom', timeout: 1200 });
  nextTick(() => setTimeout(() => fitView({ padding: 0.4, duration: 500 }), 100));
}

function saveEdit() {
  store.updateMember(editDialog.value.data.id, editDialog.value.data);
  editDialog.value.show = false;
  $q.notify({ message: 'Updated', color: 'cyan-8', icon: 'check_circle', position: 'bottom', timeout: 1200 });
}

function confirmDelete(member) {
  $q.dialog({ title: 'Delete', message: `Remove "${member.name}"?`, cancel: { flat: true }, dark: true, ok: { color: 'red-8', label: 'Delete' } })
    .onOk(() => {
      store.deleteMember(member.id);
      $q.notify({ message: 'Removed', color: 'red-8', icon: 'delete', position: 'bottom', timeout: 1200 });
      nextTick(() => setTimeout(() => fitView({ padding: 0.4, duration: 500 }), 100));
    });
}

function confirmDeleteFromEdit() {
  const member = editDialog.value.data;
  editDialog.value.show = false;
  confirmDelete(member);
}

function nukeData() {
  $q.dialog({
    title: 'Clear Everything',
    message: 'This permanently deletes your entire family tree. Cannot be undone.',
    cancel: { flat: true, color: 'grey-5' },
    ok: { color: 'red-8', label: 'Delete All', icon: 'delete_forever' },
    dark: true, persistent: true,
  }).onOk(() => {
    store.clearAll();
    $q.notify({ message: 'All data cleared', color: 'red-8', position: 'bottom' });
  });
}

// ─── Import / Export ───
function exportTree() {
  const blob = new Blob([store.exportData()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  $q.notify({ message: 'Exported', color: 'teal-8', icon: 'download', position: 'bottom' });
}
function triggerImport() { fileInput.value?.click(); }
function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    if (store.importData(ev.target.result)) {
      $q.notify({ message: `Imported ${store.members.length} members`, color: 'teal-8', icon: 'check', position: 'bottom' });
      nextTick(() => setTimeout(() => fitView({ padding: 0.4, duration: 600 }), 200));
    } else {
      $q.notify({ message: 'Invalid file', color: 'red-8', icon: 'error' });
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
</script>

<style lang="scss">
/* ═══ Page ═══ */
.page-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #060a10;
  color: #e2e8f0;
  overflow: hidden;
}

/* ═══ Toolbar ═══ */
.toolbar {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  flex-shrink: 0;
  gap: 12px;
  z-index: 10;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon { color: #a78bfa; }
.app-name {
  font-size: 17px;
  font-weight: 800;
  color: #a78bfa;
  letter-spacing: 1px;
}
.toolbar-center {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}
.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}
.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(139, 92, 246, 0.15);
  margin: 0 4px;
}
.search-box { width: 190px; }
.search-popup { background: #1e1b4b !important; border: 1px solid rgba(139, 92, 246, 0.3); }
.tool-btn { color: #a78bfa !important; }
.danger-btn { color: #f87171 !important; }
.relation-btn {
  color: #9ca3af !important;
  border: 1px solid rgba(156, 163, 175, 0.2);
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  transition: all 0.2s;
  &.active {
    color: #fb923c !important;
    border-color: rgba(251, 146, 60, 0.5);
    background: rgba(251, 146, 60, 0.1);
  }
}
.tab-switch {
  .q-tab { font-size: 12px; min-height: 36px; }
}

/* ═══ Content ═══ */
.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.panels {
  flex: 1;
  min-height: 0;
  background: transparent !important;
}
.chart-panel, .table-panel {
  height: 100%;
  padding: 0 !important;
}
.canvas-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}
.tree-canvas {
  width: 100%;
  height: 100%;
}
.vue-flow__attribution { display: none !important; }

/* ═══ Empty state ═══ */
.empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}
.empty-content {
  text-align: center;
  pointer-events: all;
}
.empty-icon { color: rgba(139, 92, 246, 0.3); }
.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: rgba(167, 139, 250, 0.6);
  margin: 16px 0 8px;
}
.empty-desc {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}
.empty-btn { border-radius: 12px; padding: 10px 24px; }

/* ═══ Relation banner ═══ */
.relation-banner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(234, 88, 12, 0.92);
  color: white;
  padding: 8px 20px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(234, 88, 12, 0.3);
}

/* ═══ Member badge ═══ */
.member-badge {
  position: absolute;
  bottom: 12px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(15, 23, 42, 0.85);
  color: #6b7280;
  padding: 5px 12px;
  border-radius: 16px;
  font-size: 11px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  z-index: 5;
}

/* ═══ Table ═══ */
.table-panel { padding: 16px !important; background: #060a10; }
.directory-table {
  background: rgba(15, 23, 42, 0.6) !important;
  border-color: rgba(139, 92, 246, 0.15) !important;
  th {
    color: #a78bfa !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    font-size: 10px !important;
    letter-spacing: 1.2px;
  }
}
.table-search { width: 280px; }

/* ═══ Dialogs ═══ */
.dialog-card {
  width: 420px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.97) !important;
  backdrop-filter: blur(24px);
  color: #e2e8f0;
}
.purple-dialog { border: 1px solid rgba(139, 92, 246, 0.3); }
.cyan-dialog { border: 1px solid rgba(6, 182, 212, 0.3); }
.dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #a78bfa;
  padding-bottom: 0;
  &.cyan { color: #22d3ee; }
}

/* ═══ Transitions ═══ */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translate(-50%, -20px); }
</style>