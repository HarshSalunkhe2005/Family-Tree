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

  // Helper: get the direct parent (or parent's spouse) of a person
  function getParentIds(personId) {
    const p = members.find(m => m.id === personId);
    if (!p || !p.parentId) return [];
    const parent = members.find(m => m.id === p.parentId);
    if (!parent) return [p.parentId];
    const ids = [parent.id];
    if (parent.spouseId) ids.push(parent.spouseId);
    const spouseOfParent = members.find(m => m.spouseId === parent.id);
    if (spouseOfParent) ids.push(spouseOfParent.id);
    return [...new Set(ids)];
  }

  // SAME GENERATION
  if (delta === 0) {
    // Sibling check
    if (personA.parentId && personB.parentId) {
      const parentsA = getParentIds(idA);
      const parentsB = getParentIds(idB);
      const sharedParent = parentsA.some(p => parentsB.includes(p));
      if (sharedParent) {
        return genB === 'male' ? 'Brother' : 'Sister';
      }
    }

    // Sibling-in-law: B's spouse is A's sibling
    if (bPartner) {
      const parentsA = getParentIds(idA);
      const parentsBPartner = getParentIds(bPartner.id);
      if (parentsA.length > 0 && parentsBPartner.length > 0 && parentsA.some(p => parentsBPartner.includes(p))) {
        return genB === 'male' ? 'Brother-in-law' : 'Sister-in-law';
      }
    }

    // Cousin check: shared grandparent but different parents
    if (personA.parentId && personB.parentId && personA.parentId !== personB.parentId) {
      const grandparentsA = getParentIds(personA.parentId);
      const grandparentsB = getParentIds(personB.parentId);
      // Also check spouse's parentId
      const parentASpouse = members.find(m => m.spouseId === personA.parentId || m.id === members.find(x => x.id === personA.parentId)?.spouseId);
      const parentBSpouse = members.find(m => m.spouseId === personB.parentId || m.id === members.find(x => x.id === personB.parentId)?.spouseId);
      if (parentASpouse?.parentId) grandparentsA.push(...getParentIds(parentASpouse.id));
      if (parentBSpouse?.parentId) grandparentsB.push(...getParentIds(parentBSpouse.id));

      const sharedGrandparent = grandparentsA.some(g => grandparentsB.includes(g));
      if (sharedGrandparent) {
        return 'Cousin';
      }
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
  if (delta === 3) return genB === 'male' ? 'Great-Grandson' : 'Great-Granddaughter';
  if (delta === -3) return genB === 'male' ? 'Great-Grandfather' : 'Great-Grandmother';

  return delta > 0 ? 'Descendant' : 'Ancestor';
}