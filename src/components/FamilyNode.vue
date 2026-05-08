<template>
  <div :class="['family-node', genderClass]" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <Handle type="target" :position="Position.Top" id="top" class="invisible-handle" />

    <div class="node-body">
      <div class="avatar-ring">
        <q-icon :name="data.gender === 'female' ? 'woman' : 'man'" size="22px" />
      </div>
      <div class="node-text">
        <div class="node-name">{{ data.label }}</div>
        <div v-if="data.place" class="node-place">
          <q-icon name="place" size="10px" />
          <span>{{ data.place }}</span>
        </div>
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" id="bottom" class="invisible-handle" />
    <Handle type="source" :position="Position.Right" id="right" class="invisible-handle" />
    <Handle type="target" :position="Position.Left" id="left" class="invisible-handle" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Handle, Position } from '@vue-flow/core';
const props = defineProps(['data']);
const hovered = ref(false);
const genderClass = props.data.gender === 'female' ? 'node-female' : 'node-male';
</script>

<style scoped>
.family-node {
  padding: 14px 18px;
  border-radius: 16px;
  min-width: 180px;
  max-width: 200px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
}

.family-node:hover {
  transform: translateY(-3px) scale(1.02);
  filter: brightness(1.2);
}

.node-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-text {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.node-name {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-place {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  opacity: 0.55;
  white-space: nowrap;
}

/* Male theme */
.node-male {
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
  border: 1.5px solid rgba(96, 165, 250, 0.5);
  box-shadow:
    0 0 0 1px rgba(96, 165, 250, 0.1),
    0 4px 24px rgba(96, 165, 250, 0.15),
    inset 0 1px 0 rgba(96, 165, 250, 0.08);
  color: #e0ecff;
}
.node-male .avatar-ring {
  background: rgba(59, 130, 246, 0.15);
  border: 1.5px solid rgba(96, 165, 250, 0.4);
  color: #60a5fa;
}
.node-male:hover {
  box-shadow:
    0 0 0 1px rgba(96, 165, 250, 0.3),
    0 8px 32px rgba(96, 165, 250, 0.25);
}

/* Female theme */
.node-female {
  background: linear-gradient(145deg, rgba(30, 10, 26, 0.95), rgba(50, 20, 40, 0.9));
  border: 1.5px solid rgba(244, 114, 182, 0.5);
  box-shadow:
    0 0 0 1px rgba(244, 114, 182, 0.1),
    0 4px 24px rgba(244, 114, 182, 0.15),
    inset 0 1px 0 rgba(244, 114, 182, 0.08);
  color: #ffe0ef;
}
.node-female .avatar-ring {
  background: rgba(236, 72, 153, 0.15);
  border: 1.5px solid rgba(244, 114, 182, 0.4);
  color: #f472b6;
}
.node-female:hover {
  box-shadow:
    0 0 0 1px rgba(244, 114, 182, 0.3),
    0 8px 32px rgba(244, 114, 182, 0.25);
}

.invisible-handle {
  width: 8px !important;
  height: 8px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0 !important;
}
</style>