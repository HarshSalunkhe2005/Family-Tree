/**
 * Family Relationship Finder
 *
 * Finds the relationship between two people by:
 * 1. Building an adjacency graph (parent ↔ child, spouse ↔ spouse)
 * 2. Finding the path between two people
 * 3. Walking the path to determine the exact relationship
 *
 * Returns both the relationship label AND a human-readable explanation.
 */

// ─── Helpers ───

function buildGraph(members) {
  const byId = {};
  members.forEach(m => { byId[m.id] = m; });

  // adjacency: id -> [{ id, relation }]
  const adj = {};
  const addEdge = (from, to, rel) => {
    if (!adj[from]) adj[from] = [];
    adj[from].push({ id: to, relation: rel });
  };

  // 1. Map marriages bidirectionally FIRST
  const spouses = {};
  members.forEach(m => {
    if (m.spouseId && byId[m.spouseId]) {
      spouses[m.id] = m.spouseId;
      spouses[m.spouseId] = m.id;
      addEdge(m.id, m.spouseId, 'spouse');
      addEdge(m.spouseId, m.id, 'spouse'); // Ensure reverse edge
    }
  });

  // 2. Map parent/child bidirectionally (for BOTH parents)
  members.forEach(m => {
    if (m.parentId && byId[m.parentId]) {
      const pid = m.parentId;
      // Link to primary parent
      addEdge(m.id, pid, 'parent');
      addEdge(pid, m.id, 'child');

      // Link to parent's spouse
      const spId = spouses[pid];
      if (spId) {
        addEdge(m.id, spId, 'parent');
        addEdge(spId, m.id, 'child');
      }
    }
  });

  return { adj, byId };
}

function bfsPath(adj, startId, endId) {
  const visited = new Set();
  const queue = [{ id: startId, path: [] }];
  visited.add(startId);

  while (queue.length > 0) {
    const { id, path } = queue.shift();
    if (id === endId) return path;

    const neighbors = adj[id] || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.id)) {
        visited.add(edge.id);
        queue.push({ id: edge.id, path: [...path, { to: edge.id, relation: edge.relation }] });
      }
    }
  }
  return null; // no path found
}

// ─── Main Function ───

export function getRelationship(members, idA, idB) {
  if (!idA || !idB) return { label: 'Unknown', explanation: '' };
  if (idA === idB) return { label: 'Self', explanation: 'Same person' };

  const { adj, byId } = buildGraph(members);
  const personA = byId[idA];
  const personB = byId[idB];
  if (!personA || !personB) return { label: 'Unknown', explanation: 'Could not find one or both members' };

  // To find "What is A to B", we find the path FROM B TO A.
  const path = bfsPath(adj, idB, idA);
  if (!path || path.length === 0) {
    return { label: 'No Connection', explanation: `${personA.name} and ${personB.name} are not connected in this tree` };
  }

  // Count steps in the B -> A direction
  const steps = path.map(s => s.relation);
  const gA = personA.gender === 'female' ? 'f' : 'm';

  // ─── Direct relationships (path length 1) ───
  if (steps.length === 1) {
    if (steps[0] === 'spouse') return { label: gA === 'f' ? 'Wife' : 'Husband', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'wife' : 'husband'}` };
    if (steps[0] === 'parent') return { label: gA === 'f' ? 'Mother' : 'Father', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'mother' : 'father'}` };
    if (steps[0] === 'child') return { label: gA === 'f' ? 'Daughter' : 'Son', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'daughter' : 'son'}` };
  }

  // ─── Path length 2 ───
  if (steps.length === 2) {
    const [s1, s2] = steps;

    // parent → parent = grandparent
    if (s1 === 'parent' && s2 === 'parent') return { label: gA === 'f' ? 'Grandmother' : 'Grandfather', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'grandmother' : 'grandfather'}` };
    // child → child = grandchild
    if (s1 === 'child' && s2 === 'child') return { label: gA === 'f' ? 'Granddaughter' : 'Grandson', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'granddaughter' : 'grandson'}` };
    // parent → child = sibling (same parent, different person)
    if (s1 === 'parent' && s2 === 'child') return { label: gA === 'f' ? 'Sister' : 'Brother', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'sister' : 'brother'}` };
    // parent → spouse = step-parent (never hits if parents are mapped properly, but fallback)
    if (s1 === 'parent' && s2 === 'spouse') return { label: gA === 'f' ? 'Mother' : 'Father', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'mother' : 'father'} (by marriage)` };
    // child → spouse = child-in-law
    if (s1 === 'child' && s2 === 'spouse') return { label: gA === 'f' ? 'Daughter-in-law' : 'Son-in-law', explanation: `${personA.name} is married to ${personB.name}'s ${byId[path[0].to]?.gender === 'female' ? 'daughter' : 'son'}` };
    // spouse → parent = parent-in-law
    if (s1 === 'spouse' && s2 === 'parent') return { label: gA === 'f' ? 'Mother-in-law' : 'Father-in-law', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'mother' : 'father'}-in-law` };
    // spouse → child = stepchild
    if (s1 === 'spouse' && s2 === 'child') return { label: gA === 'f' ? 'Daughter' : 'Son', explanation: `${personA.name} is ${personB.name}'s step-${gA === 'f' ? 'daughter' : 'son'}` };
  }

  // ─── Path length 3 ───
  if (steps.length === 3) {
    const [s1, s2, s3] = steps;

    // parent → parent → parent = great-grandparent
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'parent') return { label: gA === 'f' ? 'Great-Grandmother' : 'Great-Grandfather', explanation: `${personA.name} is ${personB.name}'s great-${gA === 'f' ? 'grandmother' : 'grandfather'}` };
    // child → child → child = great-grandchild
    if (s1 === 'child' && s2 === 'child' && s3 === 'child') return { label: gA === 'f' ? 'Great-Granddaughter' : 'Great-Grandson', explanation: `${personA.name} is ${personB.name}'s great-${gA === 'f' ? 'granddaughter' : 'grandson'}` };

    // parent → parent → child = uncle/aunt (parent's sibling)
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'child') return { label: gA === 'f' ? 'Aunt' : 'Uncle', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'aunt' : 'uncle'} (parent's sibling)` };
    // parent → child → child = nephew/niece (sibling's child)
    if (s1 === 'parent' && s2 === 'child' && s3 === 'child') return { label: gA === 'f' ? 'Niece' : 'Nephew', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'niece' : 'nephew'}` };

    // parent → child → spouse = sibling-in-law
    if (s1 === 'parent' && s2 === 'child' && s3 === 'spouse') return { label: gA === 'f' ? 'Sister-in-law' : 'Brother-in-law', explanation: `${personA.name} is married to ${personB.name}'s sibling` };
    // spouse → parent → child = sibling-in-law (spouse's sibling)
    if (s1 === 'spouse' && s2 === 'parent' && s3 === 'child') return { label: gA === 'f' ? 'Sister-in-law' : 'Brother-in-law', explanation: `${personA.name} is ${personB.name}'s spouse's sibling` };

    // spouse → parent → parent = grandparent-in-law
    if (s1 === 'spouse' && s2 === 'parent' && s3 === 'parent') return { label: gA === 'f' ? 'Grandmother-in-law' : 'Grandfather-in-law', explanation: `${personA.name} is ${personB.name}'s spouse's ${gA === 'f' ? 'grandmother' : 'grandfather'}` };

    // parent → parent → spouse = grandparent by marriage
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'spouse') return { label: gA === 'f' ? 'Grandmother' : 'Grandfather', explanation: `${personA.name} is ${personB.name}'s ${gA === 'f' ? 'grandmother' : 'grandfather'} (by marriage)` };

    // child → child → spouse = grandchild's spouse
    if (s1 === 'child' && s2 === 'child' && s3 === 'spouse') return { label: gA === 'f' ? 'Granddaughter-in-law' : 'Grandson-in-law', explanation: `${personA.name} is married to ${personB.name}'s ${byId[path[1].to]?.gender === 'female' ? 'granddaughter' : 'grandson'}` };

    // spouse → child → spouse = child-in-law
    if (s1 === 'spouse' && s2 === 'child' && s3 === 'spouse') return { label: gA === 'f' ? 'Daughter-in-law' : 'Son-in-law', explanation: `${personA.name} is married to ${personB.name}'s step-child` };
  }

  // ─── Path length 4 ───
  if (steps.length === 4) {
    const [s1, s2, s3, s4] = steps;

    // parent → parent → child → child = cousin
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'child' && s4 === 'child') {
      return { label: 'Cousin', explanation: `${personA.name} and ${personB.name} are first cousins (share grandparents)` };
    }
    // parent → parent → child → spouse = cousin's spouse (cousin-in-law)
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'child' && s4 === 'spouse') {
      return { label: 'Cousin-in-law', explanation: `${personA.name} is married to ${personB.name}'s cousin` };
    }
    // spouse → parent → parent → child = spouse's uncle/aunt
    if (s1 === 'spouse' && s2 === 'parent' && s3 === 'parent' && s4 === 'child') {
      return { label: gA === 'f' ? 'Aunt-in-law' : 'Uncle-in-law', explanation: `${personA.name} is ${personB.name}'s spouse's ${gA === 'f' ? 'aunt' : 'uncle'}` };
    }
    // parent → parent → parent → child = great-uncle/aunt
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'parent' && s4 === 'child') {
      return { label: gA === 'f' ? 'Great-Aunt' : 'Great-Uncle', explanation: `${personA.name} is ${personB.name}'s great-${gA === 'f' ? 'aunt' : 'uncle'}` };
    }
    // parent → child → child → child = grand-nephew/niece
    if (s1 === 'parent' && s2 === 'child' && s3 === 'child' && s4 === 'child') {
      return { label: gA === 'f' ? 'Grand-Niece' : 'Grand-Nephew', explanation: `${personA.name} is ${personB.name}'s sibling's grandchild` };
    }
    // parent × 4 = great-great-grandparent
    if (steps.every(s => s === 'parent')) {
      return { label: gA === 'f' ? 'Great-Great-Grandmother' : 'Great-Great-Grandfather', explanation: `${personA.name} is ${personB.name}'s great-great-${gA === 'f' ? 'grandmother' : 'grandfather'}` };
    }
    // child × 4 = great-great-grandchild
    if (steps.every(s => s === 'child')) {
      return { label: gA === 'f' ? 'Great-Great-Granddaughter' : 'Great-Great-Grandson', explanation: `${personA.name} is ${personB.name}'s great-great-${gA === 'f' ? 'granddaughter' : 'grandson'}` };
    }
  }

  // ─── Fallback: generic analysis ───
  const upCount = steps.filter(s => s === 'parent').length;
  const downCount = steps.filter(s => s === 'child').length;
  const spouseInPath = steps.includes('spouse');

  if (upCount > 0 && downCount === 0 && !spouseInPath) {
    const greats = upCount > 2 ? 'Great-'.repeat(upCount - 2) : '';
    const base = upCount >= 2 ? (gA === 'f' ? 'Grandmother' : 'Grandfather') : (gA === 'f' ? 'Mother' : 'Father');
    return { label: `${greats}${base}`, explanation: `${personA.name} is ${upCount} generation${upCount > 1 ? 's' : ''} above ${personB.name}` };
  }

  if (downCount > 0 && upCount === 0 && !spouseInPath) {
    const greats = downCount > 2 ? 'Great-'.repeat(downCount - 2) : '';
    const base = downCount >= 2 ? (gA === 'f' ? 'Granddaughter' : 'Grandson') : (gA === 'f' ? 'Daughter' : 'Son');
    return { label: `${greats}${base}`, explanation: `${personA.name} is ${downCount} generation${downCount > 1 ? 's' : ''} below ${personB.name}` };
  }

  if (upCount > 0 && downCount > 0) {
    if (upCount === downCount) {
      const cousinLevel = upCount - 1;
      if (cousinLevel === 1) return { label: 'Cousin', explanation: `${personA.name} and ${personB.name} are first cousins` };
      if (cousinLevel === 2) return { label: 'Second Cousin', explanation: `${personA.name} and ${personB.name} are second cousins (share great-grandparents)` };
      return { label: `${ordinal(cousinLevel)} Cousin`, explanation: `${personA.name} and ${personB.name} share an ancestor ${upCount} generations up` };
    }
    const minGen = Math.min(upCount, downCount);
    const removed = Math.abs(upCount - downCount);
    const cousinLevel = minGen - 1;
    if (cousinLevel >= 1) {
      return { label: `${ordinal(cousinLevel)} Cousin ${removed}× removed`, explanation: `${personA.name} and ${personB.name} are ${ordinal(cousinLevel)} cousins, ${removed} generation${removed > 1 ? 's' : ''} apart` };
    }
  }

  // Absolute fallback
  const totalSteps = steps.length;
  const suffix = spouseInPath ? ' (by marriage)' : '';
  return { label: `Extended Family${suffix}`, explanation: `${personA.name} and ${personB.name} are connected through ${totalSteps} step${totalSteps > 1 ? 's' : ''} in the family tree` };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}