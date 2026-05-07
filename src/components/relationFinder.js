export function getRelationship(members, idA, idB) {
  if (!idA || !idB || idA === idB) return 'Self';

  const personA = members.find(m => m.id === idA);
  const personB = members.find(m => m.id === idB);
  if (!personA || !personB) return 'Unknown';

  // 1. Direct Marriage Check
  if (personA.spouseId === idB || personB.spouseId === idA) return 'Spouse';

  const levels = {};
  const queue = [];
  const processed = new Set();
  const roots = members.filter(m => !m.parentId);
  const startNode = roots.length > 0 ? roots[0] : members[0];
  
  if (startNode) {
    levels[startNode.id] = 0;
    queue.push(startNode.id);
  }

  let head = 0;
  while (head < queue.length) {
    const currId = queue[head++];
    if (processed.has(currId)) continue;
    processed.add(currId);

    const currLevel = levels[currId];
    const currNode = members.find(m => m.id === currId);

    const spouse = members.find(s => s.spouseId === currId || s.id === currNode?.spouseId);
    if (spouse && levels[spouse.id] === undefined) {
      levels[spouse.id] = currLevel;
      queue.push(spouse.id);
    }

    members.filter(m => m.parentId === currId || (spouse && m.parentId === spouse.id)).forEach(child => {
      if (levels[child.id] === undefined) {
        levels[child.id] = currLevel + 1;
        queue.push(child.id);
      }
    });

    if (currNode?.parentId && levels[currNode.parentId] === undefined) {
      levels[currNode.parentId] = currLevel - 1;
      queue.push(currNode.parentId);
    }
  }

  const delta = levels[idB] - levels[idA];
  const genB = personB.gender?.toLowerCase();
  const bPartner = members.find(m => m.spouseId === idB || m.id === personB.spouseId);
  const aPartner = members.find(m => m.spouseId === idA || m.id === personA.spouseId);

  // SAME GENERATION
  if (delta === 0) {
    if (personA.parentId === personB.parentId && personA.parentId !== null) {
      return genB === 'male' ? 'Brother' : 'Sister';
    }
    if (bPartner && personA.parentId === bPartner.parentId && personA.parentId !== null) {
      return genB === 'male' ? 'Brother-in-law' : 'Sister-in-law';
    }
    return 'Relative';
  }
  
  // ONE GENERATION DOWN
  if (delta === 1) {
    const bIsDirectChild = personB.parentId === idA || (personA.spouseId && personB.parentId === personA.spouseId);
    if (bIsDirectChild) return genB === 'male' ? 'Son' : 'Daughter';
    
    if (bPartner) {
        const partnerIsAChild = bPartner.parentId === idA || (personA.spouseId && bPartner.parentId === personA.spouseId);
        if (partnerIsAChild) return genB === 'male' ? 'Son-in-law' : 'Daughter-in-law';
    }
    return genB === 'male' ? 'Nephew' : 'Niece';
  }

  // ONE GENERATION UP
  if (delta === -1) {
    // CRITICAL FIX: If B is married to A's parent, B is A's parent
    const bIsDirectParent = personA.parentId === idB || (personA.parentId && members.find(m => m.id === personA.parentId)?.spouseId === idB);
    if (bIsDirectParent) return genB === 'male' ? 'Father' : 'Mother';
    
    if (aPartner) {
        const partnerIsBParent = aPartner.parentId === idB || (personB.spouseId && aPartner.parentId === personB.spouseId);
        if (partnerIsBParent) return genB === 'male' ? 'Father-in-law' : 'Mother-in-law';
    }
    return genB === 'male' ? 'Uncle' : 'Aunt';
  }

  if (delta === 2) return genB === 'male' ? 'Grandson' : 'Granddaughter';
  if (delta === -2) return genB === 'male' ? 'Grandfather' : 'Grandmother';

  return delta > 0 ? 'Descendant' : 'Ancestor';
}