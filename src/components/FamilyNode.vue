<template>
  <div :class="['family-node', data.gender === 'male' ? 'node-male' : 'node-female']">
    <Handle type="target" :position="Position.Top" />
    
    <div class="node-content text-center">
      <div class="text-bold name-text">{{ data.label }}</div>
    </div>

    <Handle type="source" :position="Position.Bottom" />

    <Handle id="right-port" type="source" :position="Position.Right" class="side-handle" />
    <Handle id="left-port" type="target" :position="Position.Left" class="side-handle" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core';
defineProps(['data']);
</script>

<style scoped>
.family-node {
  padding: 14px 28px;
  border-radius: 12px;
  min-width: 140px;
  text-transform: uppercase;
  font-weight: 800;
  position: relative;
}
.node-male {
  background: #1e293b;
  border: 2px solid #3b82f6;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
  color: #eff6ff;
}
.node-female {
  background: #1e293b;
  border: 2px solid #ec4899;
  box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);
  color: #fff1f2;
}
.side-handle {
  background: #fff !important;
  width: 8px !important;
  height: 8px !important;
  border: 1px solid #000;
}
</style>