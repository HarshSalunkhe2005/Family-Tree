<template>
  <div :class="['family-node', data.gender === 'male' ? 'node-male' : 'node-female']">
    <Handle type="target" :position="Position.Top" class="hidden-handle" />

    <div class="node-content">
      <div class="node-icon-wrap">
        <q-icon :name="data.gender === 'male' ? 'person' : 'person'" :class="data.gender === 'male' ? 'icon-male' : 'icon-female'" size="22px" />
      </div>
      <div class="node-info">
        <div class="name-text">{{ data.label }}</div>
        <div v-if="data.place" class="place-text">
          <q-icon name="location_on" size="11px" class="q-mr-xs" />{{ data.place }}
        </div>
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" class="hidden-handle" />
    <Handle id="right-port" type="source" :position="Position.Right" class="hidden-handle" />
    <Handle id="left-port" type="target" :position="Position.Left" class="hidden-handle" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core';
defineProps(['data']);
</script>

<style scoped>
.family-node {
  padding: 12px 20px;
  border-radius: 14px;
  min-width: 160px;
  max-width: 220px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.family-node:hover {
  transform: translateY(-2px);
  filter: brightness(1.15);
}

.node-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.node-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-male .node-icon-wrap {
  background: rgba(59, 130, 246, 0.2);
  border: 1.5px solid rgba(59, 130, 246, 0.5);
}
.node-female .node-icon-wrap {
  background: rgba(236, 72, 153, 0.2);
  border: 1.5px solid rgba(236, 72, 153, 0.5);
}

.icon-male { color: #60a5fa; }
.icon-female { color: #f472b6; }

.node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.name-text {
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-text {
  font-size: 11px;
  opacity: 0.6;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-male {
  background: linear-gradient(135deg, #0f1a2e 0%, #162032 100%);
  border: 1.5px solid #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(59, 130, 246, 0.1);
  color: #e0ecff;
}
.node-female {
  background: linear-gradient(135deg, #1e0a1a 0%, #2a1225 100%);
  border: 1.5px solid #ec4899;
  box-shadow: 0 0 20px rgba(236, 72, 153, 0.25), inset 0 1px 0 rgba(236, 72, 153, 0.1);
  color: #ffe0ef;
}

/* Hide Vue Flow handles completely */
.hidden-handle {
  width: 8px !important;
  height: 8px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0;
}
</style>