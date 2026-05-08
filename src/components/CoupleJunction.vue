<template>
  <div class="couple-junction">
    <Handle id="left-port" type="target" :position="Position.Left" class="junction-handle" />
    <Handle id="right-port" type="source" :position="Position.Right" class="junction-handle" />
    <Handle type="source" :position="Position.Bottom" class="junction-handle" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core';
</script>

<style scoped>
.couple-junction {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d946ef;
  border: 2px solid #a21caf;
  box-shadow: 0 0 12px rgba(217, 70, 239, 0.5);
}
.junction-handle {
  width: 1px !important;
  height: 1px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0;
}
</style>
