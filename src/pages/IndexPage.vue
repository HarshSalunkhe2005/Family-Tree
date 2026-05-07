<template>
  <q-page class="column bg-midnight text-white overflow-hidden" style="height: 100vh;">
    <div class="bg-dark-soft q-pa-sm row items-center shadow-2 border-b-purple">
      <q-icon name="hub" size="md" color="purple-4" class="q-mr-sm" />
      <div class="text-h6 text-bold text-purple-4 uppercase q-mr-lg">Solver Family Tree</div>
      <div v-if="tab === 'chart'" class="row items-center q-gutter-x-sm">
        <q-select v-model="searchModel" :options="searchOptions" use-input hide-selected fill-input label="Search..." dark dense filled color="purple-4" style="width: 200px" @filter="filterFn" @update:model-value="focusNode" />
        <q-btn flat round icon="refresh" color="purple-4" @click="resetView" />
        <q-btn flat round icon="delete_sweep" color="red-5" @click="nukeStorage"><q-tooltip>Clear All Data</q-tooltip></q-btn>
        <q-btn :outline="!relationMode" :color="relationMode ? 'orange-8' : 'grey-5'" icon="route" label="Relation Search" @click="toggleRelationMode" dense class="q-px-sm" />
      </div>
      <q-space />
      <q-tabs v-model="tab" dense class="text-grey-5" active-color="purple-4" indicator-color="purple-4">
        <q-tab name="chart" label="Lineage Chart" />
        <q-tab name="table" label="Member Directory" />
      </q-tabs>
    </div>

    <q-tab-panels v-model="tab" animated class="col-grow bg-midnight">
      <q-tab-panel name="chart" class="q-pa-none full-height">
        <div class="flow-wrapper relative-position" @contextmenu.prevent="onBgRightClick">
          <VueFlow :nodes="flowNodes" :edges="flowEdges" :node-types="nodeTypes" @nodeClick="onNodeClick" @nodeContextMenu="onNodeRightClick" @nodeDragStop="onNodeDragStop" @paneReady="onPaneReady" class="solver-canvas">
            <Background color="#0a0e14" :gap="20" pattern-color="#1e293b" />
          </VueFlow>
        </div>
      </q-tab-panel>
      <q-tab-panel name="table" class="bg-midnight">
        <q-table flat bordered :rows="store.members" :columns="columns" row-key="id" dark class="bg-dark-soft" :filter="tableFilter">
          <template v-slot:top-right>
            <q-input dark dense filled v-model="tableFilter" placeholder="Search..." color="purple-4" style="width: 300px" />
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn icon="delete" color="red-8" flat dense @click="confirmDeleteFromTable(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="dialog.show" persistent>
      <q-card class="bg-dark-soft text-white border-purple" style="width: 450px; border-radius: 20px;">
        <q-card-section class="row items-center q-pb-none"><div class="text-h6 text-purple-4 text-bold uppercase">{{ dialog.isRoot ? 'New Branch' : 'Add Relative' }}</div><q-space /><q-btn icon="close" flat round dense v-close-popup /></q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-lg">
          <q-input v-model="form.name" label="Full Name" dark filled color="purple-4" />
          <div class="row q-col-gutter-md">
            <div class="col-6"><q-select v-model="form.gender" :options="['male', 'female']" label="Gender" dark filled color="purple-4" /></div>
            <div class="col-6" v-if="!dialog.isRoot"><q-select v-model="form.relationType" :options="['Father', 'Mother', 'Son', 'Daughter', 'Spouse']" label="Relation" dark filled color="purple-4" /></div>
          </div>
          <q-input v-model="form.place" label="City / Place" dark filled color="purple-4" />
          <q-input v-model="form.phone" label="Phone Number" dark filled color="purple-4" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md"><q-btn unelevated label="Save Member" color="purple-8" @click="saveMember" class="full-width" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="info.show" persistent>
      <q-card class="bg-dark-soft text-white border-cyan" style="width: 400px; border-radius: 16px;">
        <q-card-section class="bg-cyan-10 text-bold row items-center q-py-sm">EDIT MEMBER<q-space /><q-btn icon="close" flat round dense v-close-popup /></q-card-section>
        <q-card-section class="q-gutter-y-sm q-pa-lg">
          <q-input v-model="info.data.name" label="Name" dark filled color="cyan-4" />
          <q-select v-model="info.data.gender" :options="['male', 'female']" label="Gender" dark filled color="cyan-4" />
          <q-input v-model="info.data.place" label="Place" dark filled color="cyan-4" />
          <q-input v-model="info.data.phone" label="Phone" dark filled color="cyan-4" />
        </q-card-section>
        <q-card-actions align="between" class="q-pa-md">
          <q-btn outline icon="delete" label="Delete Node" color="red-8" @click="confirmDelete" />
          <q-btn unelevated label="Update Details" color="cyan-8" @click="updateMember" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { useFamilyStore } from 'src/stores/familyStore';
import FamilyNode from 'src/components/FamilyNode.vue';
import { getRelationship } from 'src/components/relationFinder';
import { useQuasar } from 'quasar';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const store = useFamilyStore();
const $q = useQuasar();
const { setCenter, fitView } = useVueFlow();
const tab = ref('chart');
const nodeTypes = { custom: markRaw(FamilyNode) };

const dialog = ref({ show: false, isRoot: true, parentId: null, x: 0, y: 0 });
const info = ref({ show: false, data: {} });
const form = ref({ name: '', gender: 'male', place: '', phone: '', relationType: 'Son' });
const searchModel = ref(null);
const searchOptions = ref([]);
const tableFilter = ref('');
const relationMode = ref(false);
const selectedNodes = ref([]);

function nukeStorage() {
  $q.dialog({ title: 'Nuke Data', message: 'Clear entire tree?', cancel: true, dark: true }).onOk(() => {
    localStorage.removeItem('family-tree-data');
    window.location.reload();
  });
}

function toggleRelationMode() {
  relationMode.value = !relationMode.value;
  selectedNodes.value = [];
  if (relationMode.value) $q.notify({ message: 'Select 2 members', color: 'orange-8' });
}

function onNodeClick({ node }) {
  if (relationMode.value) {
    selectedNodes.value.push(node.id);
    if (selectedNodes.value.length === 2) {
      try {
        const res = getRelationship(store.members, selectedNodes.value[0], selectedNodes.value[1]);
        const nameA = store.members.find(m => m.id === selectedNodes.value[0])?.name || 'A';
        const nameB = store.members.find(m => m.id === selectedNodes.value[1])?.name || 'B';
        $q.dialog({ title: 'Result', message: `${nameB} is the ${res} of ${nameA}`, dark: true });
      } catch { $q.notify({ message: 'Error', color: 'red-8' }); }
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

function focusNode(val) { if (val) { const m = store.members.find(x => x.id === val.value); setCenter(m.x + 70, m.y + 30, { zoom: 1.2, duration: 800 }); } }
function resetView() { fitView({ padding: 0.2, duration: 800 }); }
function onPaneReady() { fitView(); }

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'gender', label: 'Gender', field: 'gender', align: 'center', sortable: true },
  { name: 'place', label: 'Place', field: 'place', align: 'left', sortable: true },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'id', align: 'center' }
];

const flowNodes = computed(() => store.members.map(m => ({ id: m.id, type: 'custom', position: { x: m.x, y: m.y }, data: { label: m.name, gender: m.gender } })));

const flowEdges = computed(() => {
  const edges = [];
  store.members.forEach(m => {
    if (m.parentId) {
      edges.push({ id: `e-p-${m.id}`, source: m.parentId, target: m.id, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } });
    }
    if (m.spouseId) {
      edges.push({ id: `e-s-${m.id}`, source: m.id, target: m.spouseId, sourceHandle: 'right-port', targetHandle: 'left-port', type: 'straight', style: { stroke: '#ff00ff', strokeWidth: 4 } });
    }
  });
  return edges;
});

function updateMember() { store.updateMember(info.value.data.id, info.value.data); info.value.show = false; }
function confirmDelete() { $q.dialog({ title: 'Delete', message: 'Remove?', cancel: true, dark: true }).onOk(() => { store.deleteMember(info.value.data.id); info.value.show = false; }); }
function confirmDeleteFromTable(member) { $q.dialog({ title: 'Delete', message: 'Remove?', cancel: true, dark: true }).onOk(() => store.deleteMember(member.id)); }
function onNodeRightClick({ event, node }) { event.stopPropagation(); event.preventDefault(); const m = store.members.find(x => x.id === node.id); dialog.value = { show: true, isRoot: false, parentId: node.id, x: m.x, y: m.y }; }
function onBgRightClick(event) { dialog.value = { show: true, isRoot: true, x: event.offsetX, y: event.offsetY }; }
function onNodeDragStop({ node }) { const m = store.members.find(x => x.id === node.id); if (m) { const dx = node.position.x - m.x; const dy = node.position.y - m.y; store.moveSubtree(node.id, dx, dy); } }

function saveMember() {
  if (!form.value.name) return;
  let newX = dialog.value.x; let newY = dialog.value.y;
  let sId = null; let pId = dialog.value.parentId;

  if (!dialog.value.isRoot) {
    if (['Father', 'Mother'].includes(form.value.relationType)) {
      newY -= 160;
      store.addMember({ ...form.value, x: newX, y: newY });
      const newParentId = store.members[store.members.length - 1].id;
      store.updateMember(dialog.value.parentId, { parentId: newParentId });
      dialog.value.show = false;
      return;
    } else if (['Son', 'Daughter'].includes(form.value.relationType)) {
      newY += 160;
    } else if (form.value.relationType === 'Spouse') {
      newX += 220; sId = dialog.value.parentId; pId = null;
    }
  }

  store.addMember({ ...form.value, parentId: pId, spouseId: sId, x: newX, y: newY });
  if (sId) {
    const all = store.members;
    const newId = all[all.length - 1].id;
    store.updateMember(sId, { spouseId: newId });
  }
  dialog.value.show = false;
  form.value = { name: '', gender: 'male', place: '', phone: '', relationType: 'Son' };
}
</script>

<style lang="scss">
.bg-midnight { background-color: #0a0e14 !important; }
.bg-dark-soft { background-color: #111827 !important; }
.border-purple { border: 2px solid #9c27b0; }
.border-cyan { border: 2px solid #00bcd4; }
.border-b-purple { border-bottom: 2px solid #9c27b0; }
.flow-wrapper { width: 100%; height: calc(100vh - 60px); }
.solver-canvas { width: 100%; height: 100%; pointer-events: all; }
.vue-flow__attribution { display: none; }
.custom-search-menu { max-height: 250px !important; overflow-y: auto !important; background: #111827 !important; border: 1px solid #9c27b0; }
</style>