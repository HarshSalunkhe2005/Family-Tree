import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useFamilyStore = defineStore('family', () => {
  const members = ref(JSON.parse(localStorage.getItem('family-tree-data')) || []);

  watch(members, (val) => {
    localStorage.setItem('family-tree-data', JSON.stringify(val));
  }, { deep: true });

  function generateId() {
    // Collision-safe ID: timestamp + random suffix
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function getChildrenOf(parentId) {
    return members.value.filter(m => m.parentId === parentId);
  }

  function addMember(data) {
    const isSpouseRelation = data.relationType === 'Spouse';

    const newMember = {
      id: generateId(),
      name: data.name,
      gender: data.gender,
      place: data.place || '',
      phone: data.phone || '',
      parentId: isSpouseRelation ? null : (data.parentId || null),
      spouseId: isSpouseRelation ? data.parentId : (data.spouseId || null),
      relationType: data.relationType || 'independent',
      // SPECIAL TAG: Explicitly marks this node as a horizontal relation
      isSpouse: isSpouseRelation,
      x: data.x,
      y: data.y
    };

    // If adding a spouse, we must also update the partner to point back
    if (isSpouseRelation && data.parentId) {
      const partner = members.value.find(m => m.id === data.parentId);
      if (partner) partner.spouseId = newMember.id;
    }

    members.value.push(newMember);
    return newMember.id;
  }

  function updateMember(id, updatedData) {
    const index = members.value.findIndex(m => m.id === id);
    if (index !== -1) members.value[index] = { ...members.value[index], ...updatedData };
  }

  function moveSubtree(id, dx, dy, visited = new Set()) {
    if (visited.has(id)) return;
    visited.add(id);
    const member = members.value.find(m => m.id === id);
    if (!member) return;
    member.x += dx;
    member.y += dy;
    members.value.filter(m => m.parentId === id).forEach(child => {
      moveSubtree(child.id, dx, dy, visited);
    });
    const spouse = members.value.find(m => m.spouseId === id || (m.id === member.spouseId));
    if (spouse && spouse.id !== id) {
      moveSubtree(spouse.id, dx, dy, visited);
    }
  }

  function deleteMember(id) {
    const newMembers = members.value.filter(m => m.id !== id);
    members.value = newMembers.map(m => ({
      ...m,
      parentId: m.parentId === id ? null : m.parentId,
      spouseId: m.spouseId === id ? null : m.spouseId
    }));
  }

  function exportData() {
    return JSON.stringify(members.value, null, 2);
  }

  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        members.value = data;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  return { members, generateId, getChildrenOf, addMember, updateMember, moveSubtree, deleteMember, exportData, importData };
});