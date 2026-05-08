<template>
  <div class="junction-dot">
    <Handle type="target" :position="Position.Left" id="left" class="junc-handle" />
    <Handle type="source" :position="Position.Right" id="right" class="junc-handle" />
    <Handle type="source" :position="Position.Bottom" id="bottom" class="junc-handle" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core';
</script>

<style scoped>
.junction-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, #e879f9, #a855f7);
  border: 2px solid rgba(168, 85, 247, 0.6);
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.5);
}
.junc-handle {
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  background: transparent !important;
  border: none !important;
}
</style>
