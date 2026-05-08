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

  members.forEach(m => {
    if (m.parentId && byId[m.parentId]) {
      addEdge(m.id, m.parentId, 'parent');
      addEdge(m.parentId, m.id, 'child');
    }
    if (m.spouseId && byId[m.spouseId]) {
      addEdge(m.id, m.spouseId, 'spouse');
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

  const path = bfsPath(adj, idA, idB);
  if (!path || path.length === 0) {
    return { label: 'No Connection', explanation: `${personA.name} and ${personB.name} are not connected in this tree` };
  }

  // Count steps in each direction
  const steps = path.map(s => s.relation);
  const gB = personB.gender === 'female' ? 'f' : 'm';

  // ─── Direct relationships (path length 1) ───
  if (steps.length === 1) {
    if (steps[0] === 'spouse') return { label: gB === 'f' ? 'Wife' : 'Husband', explanation: `${personA.name}'s ${gB === 'f' ? 'wife' : 'husband'}` };
    if (steps[0] === 'parent') return { label: gB === 'f' ? 'Mother' : 'Father', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'mother' : 'father'}` };
    if (steps[0] === 'child') return { label: gB === 'f' ? 'Daughter' : 'Son', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'daughter' : 'son'}` };
  }

  // ─── Path length 2 ───
  if (steps.length === 2) {
    const [s1, s2] = steps;

    // parent → parent = grandparent
    if (s1 === 'parent' && s2 === 'parent') return { label: gB === 'f' ? 'Grandmother' : 'Grandfather', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'grandmother' : 'grandfather'}` };
    // child → child = grandchild
    if (s1 === 'child' && s2 === 'child') return { label: gB === 'f' ? 'Granddaughter' : 'Grandson', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'granddaughter' : 'grandson'}` };
    // parent → child = sibling (same parent, different person)
    if (s1 === 'parent' && s2 === 'child') return { label: gB === 'f' ? 'Sister' : 'Brother', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'sister' : 'brother'}` };
    // parent → spouse = step-parent (parent's spouse)
    if (s1 === 'parent' && s2 === 'spouse') return { label: gB === 'f' ? 'Mother' : 'Father', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'mother' : 'father'} (by marriage)` };
    // child → spouse = child-in-law
    if (s1 === 'child' && s2 === 'spouse') return { label: gB === 'f' ? 'Daughter-in-law' : 'Son-in-law', explanation: `${personB.name} is married to ${personA.name}'s ${byId[path[0].to]?.gender === 'female' ? 'daughter' : 'son'}` };
    // spouse → parent = parent-in-law
    if (s1 === 'spouse' && s2 === 'parent') return { label: gB === 'f' ? 'Mother-in-law' : 'Father-in-law', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'mother' : 'father'}-in-law` };
    // spouse → child = stepchild
    if (s1 === 'spouse' && s2 === 'child') return { label: gB === 'f' ? 'Daughter' : 'Son', explanation: `${personB.name} is ${personA.name}'s step-${gB === 'f' ? 'daughter' : 'son'}` };
  }

  // ─── Path length 3 ───
  if (steps.length === 3) {
    const [s1, s2, s3] = steps;

    // parent → parent → parent = great-grandparent
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'parent') return { label: gB === 'f' ? 'Great-Grandmother' : 'Great-Grandfather', explanation: `${personB.name} is ${personA.name}'s great-${gB === 'f' ? 'grandmother' : 'grandfather'}` };
    // child → child → child = great-grandchild
    if (s1 === 'child' && s2 === 'child' && s3 === 'child') return { label: gB === 'f' ? 'Great-Granddaughter' : 'Great-Grandson', explanation: `${personB.name} is ${personA.name}'s great-${gB === 'f' ? 'granddaughter' : 'grandson'}` };

    // parent → parent → child = uncle/aunt (parent's sibling)
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'child') return { label: gB === 'f' ? 'Aunt' : 'Uncle', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'aunt' : 'uncle'} (parent's sibling)` };
    // parent → child → child = nephew/niece (sibling's child)
    if (s1 === 'parent' && s2 === 'child' && s3 === 'child') return { label: gB === 'f' ? 'Niece' : 'Nephew', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'niece' : 'nephew'}` };

    // parent → child → spouse = sibling-in-law
    if (s1 === 'parent' && s2 === 'child' && s3 === 'spouse') return { label: gB === 'f' ? 'Sister-in-law' : 'Brother-in-law', explanation: `${personB.name} is married to ${personA.name}'s sibling` };
    // spouse → parent → child = sibling-in-law (spouse's sibling)
    if (s1 === 'spouse' && s2 === 'parent' && s3 === 'child') return { label: gB === 'f' ? 'Sister-in-law' : 'Brother-in-law', explanation: `${personB.name} is ${personA.name}'s spouse's sibling` };

    // spouse → parent → parent = grandparent-in-law
    if (s1 === 'spouse' && s2 === 'parent' && s3 === 'parent') return { label: gB === 'f' ? 'Grandmother-in-law' : 'Grandfather-in-law', explanation: `${personB.name} is ${personA.name}'s spouse's ${gB === 'f' ? 'grandmother' : 'grandfather'}` };

    // parent → parent → spouse = step-grandparent or grandparent by marriage
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'spouse') return { label: gB === 'f' ? 'Grandmother' : 'Grandfather', explanation: `${personB.name} is ${personA.name}'s ${gB === 'f' ? 'grandmother' : 'grandfather'} (by marriage)` };

    // child → child → spouse = grandchild's spouse
    if (s1 === 'child' && s2 === 'child' && s3 === 'spouse') return { label: gB === 'f' ? 'Granddaughter-in-law' : 'Grandson-in-law', explanation: `${personB.name} is married to ${personA.name}'s ${byId[path[1].to]?.gender === 'female' ? 'granddaughter' : 'grandson'}` };

    // spouse → child → spouse = child-in-law
    if (s1 === 'spouse' && s2 === 'child' && s3 === 'spouse') return { label: gB === 'f' ? 'Daughter-in-law' : 'Son-in-law', explanation: `${personB.name} is married to ${personA.name}'s step-child` };
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
      return { label: 'Cousin-in-law', explanation: `${personB.name} is married to ${personA.name}'s cousin` };
    }
    // spouse → parent → parent → child = spouse's uncle/aunt or cousin context
    if (s1 === 'spouse' && s2 === 'parent' && s3 === 'parent' && s4 === 'child') {
      return { label: gB === 'f' ? 'Aunt-in-law' : 'Uncle-in-law', explanation: `${personB.name} is ${personA.name}'s spouse's ${gB === 'f' ? 'aunt' : 'uncle'}` };
    }
    // parent → parent → parent → child = great-uncle/aunt
    if (s1 === 'parent' && s2 === 'parent' && s3 === 'parent' && s4 === 'child') {
      return { label: gB === 'f' ? 'Great-Aunt' : 'Great-Uncle', explanation: `${personB.name} is ${personA.name}'s great-${gB === 'f' ? 'aunt' : 'uncle'}` };
    }
    // parent → child → child → child = grand-nephew/niece
    if (s1 === 'parent' && s2 === 'child' && s3 === 'child' && s4 === 'child') {
      return { label: gB === 'f' ? 'Grand-Niece' : 'Grand-Nephew', explanation: `${personB.name} is ${personA.name}'s sibling's grandchild` };
    }
    // parent × 4 = great-great-grandparent
    if (steps.every(s => s === 'parent')) {
      return { label: gB === 'f' ? 'Great-Great-Grandmother' : 'Great-Great-Grandfather', explanation: `${personB.name} is ${personA.name}'s great-great-${gB === 'f' ? 'grandmother' : 'grandfather'}` };
    }
    // child × 4 = great-great-grandchild
    if (steps.every(s => s === 'child')) {
      return { label: gB === 'f' ? 'Great-Great-Granddaughter' : 'Great-Great-Grandson', explanation: `${personB.name} is ${personA.name}'s great-great-${gB === 'f' ? 'granddaughter' : 'grandson'}` };
    }
  }

  // ─── Fallback: generic analysis ───
  const upCount = steps.filter(s => s === 'parent').length;
  const downCount = steps.filter(s => s === 'child').length;
  const spouseInPath = steps.includes('spouse');

  if (upCount > 0 && downCount === 0 && !spouseInPath) {
    const greats = upCount > 2 ? 'Great-'.repeat(upCount - 2) : '';
    const base = upCount >= 2 ? (gB === 'f' ? 'Grandmother' : 'Grandfather') : (gB === 'f' ? 'Mother' : 'Father');
    return { label: `${greats}${base}`, explanation: `${personB.name} is ${upCount} generation${upCount > 1 ? 's' : ''} above ${personA.name}` };
  }

  if (downCount > 0 && upCount === 0 && !spouseInPath) {
    const greats = downCount > 2 ? 'Great-'.repeat(downCount - 2) : '';
    const base = downCount >= 2 ? (gB === 'f' ? 'Granddaughter' : 'Grandson') : (gB === 'f' ? 'Daughter' : 'Son');
    return { label: `${greats}${base}`, explanation: `${personB.name} is ${downCount} generation${downCount > 1 ? 's' : ''} below ${personA.name}` };
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