import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useFamilyStore = defineStore('family', () => {
  const members = ref(JSON.parse(localStorage.getItem('family-tree-data')) || []);

  watch(members, (val) => {
    localStorage.setItem('family-tree-data', JSON.stringify(val));
  }, { deep: true });

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function addMember(data) {
    const newMember = {
      id: generateId(),
      name: data.name,
      gender: data.gender || 'male',
      place: data.place || '',
      phone: data.phone || '',
      parentId: data.parentId || null,
      spouseId: data.spouseId || null,
      relationType: data.relationType || 'independent',
    };

    // If adding a spouse, update the partner
    if (data.relationType === 'Spouse' && data.parentId) {
      newMember.spouseId = data.parentId;
      newMember.parentId = null;
      const partner = members.value.find(m => m.id === data.parentId);
      if (partner) partner.spouseId = newMember.id;
    }

    members.value.push(newMember);
    return newMember.id;
  }

  function updateMember(id, updatedData) {
    const index = members.value.findIndex(m => m.id === id);
    if (index !== -1) {
      members.value[index] = { ...members.value[index], ...updatedData };
    }
  }

  function deleteMember(id) {
    // Unlink spouse
    const member = members.value.find(m => m.id === id);
    if (member?.spouseId) {
      const spouse = members.value.find(m => m.id === member.spouseId);
      if (spouse) spouse.spouseId = null;
    }
    // Orphan children
    members.value.forEach(m => {
      if (m.parentId === id) m.parentId = null;
    });
    members.value = members.value.filter(m => m.id !== id);
  }

  function getChildrenOf(parentId) {
    return members.value.filter(m => m.parentId === parentId);
  }

  // Get all children of a couple (both parent IDs)
  function getCoupleChildren(id1, id2) {
    return members.value.filter(m => m.parentId === id1 || m.parentId === id2);
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

  function clearAll() {
    members.value = [];
    localStorage.removeItem('family-tree-data');
  }

  return {
    members, generateId, addMember, updateMember, deleteMember,
    getChildrenOf, getCoupleChildren, exportData, importData, clearAll
  };
});