/**
 * Hierarchical Family Tree Layout Engine
 *
 * Computes (x, y) positions for every member + junction nodes.
 * Uses a top-down, level-based approach:
 *   1. Find all root individuals (no parentId, or parentId not in the set)
 *   2. BFS down the tree assigning levels
 *   3. Place spouses side by side on the same level
 *   4. Create junction nodes at the midpoint of each couple
 *   5. Center children below the junction
 *   6. Space everything to avoid overlap
 */

const NODE_W = 200;     // node width
const NODE_H = 70;      // node height
const H_GAP = 60;       // horizontal gap between siblings
const V_GAP = 120;      // vertical gap between generations
const SPOUSE_GAP = 80;  // gap between spouses (inside the couple)
const JUNCTION_SIZE = 12;

export function computeLayout(members) {
  if (!members || members.length === 0) return { nodes: [], edges: [], junctions: [] };

  // Build lookup maps
  const byId = {};
  members.forEach(m => { byId[m.id] = m; });

  // Find roots: members with no valid parentId.
  // EXCLUDE people who "married in" (no parentId, but spouse HAS a parentId) — they're not true roots.
  const roots = members.filter(m => {
    if (m.parentId && byId[m.parentId]) return false; // has a valid parent → not root
    if (m.spouseId && byId[m.spouseId]) {
      const spouse = byId[m.spouseId];
      if (spouse.parentId && byId[spouse.parentId]) return false; // spouse has a parent → this person married in
    }
    return true;
  });

  // Build adjacency: parent -> children
  const childrenOf = {};
  members.forEach(m => {
    if (m.parentId && byId[m.parentId]) {
      const pid = m.parentId;
      if (!childrenOf[pid]) childrenOf[pid] = [];
      childrenOf[pid].push(m.id);
    }
  });

  // Deduplicate: if both spouses have children listed, merge them under a "couple key"
  // Also, for a couple, children should only appear once
  const coupleKey = (a, b) => [a, b].sort().join('::');
  const coupleChildren = {}; // coupleKey -> [childIds]
  const memberCouple = {};   // memberId -> coupleKey (if has spouse)

  members.forEach(m => {
    if (m.spouseId && byId[m.spouseId]) {
      const ck = coupleKey(m.id, m.spouseId);
      memberCouple[m.id] = ck;
      if (!coupleChildren[ck]) coupleChildren[ck] = new Set();
    }
  });

  // Assign children to couples
  members.forEach(m => {
    if (m.parentId && byId[m.parentId]) {
      const parent = byId[m.parentId];
      const ck = memberCouple[parent.id];
      if (ck) {
        coupleChildren[ck].add(m.id);
      }
    }
  });

  // BFS to assign levels, starting from roots
  const level = {};
  const visited = new Set();
  const queue = [];

  // Seed roots at level 0 (don't pre-assign spouses — BFS handles that)
  const processedRoots = new Set();
  roots.forEach(r => {
    if (processedRoots.has(r.id)) return;
    processedRoots.add(r.id);
    level[r.id] = 0;
    queue.push(r.id);
  });

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    if (visited.has(id)) continue;
    visited.add(id);
    const currLevel = level[id];
    const m = byId[id];

    // Process spouse at same level
    if (m.spouseId && byId[m.spouseId] && level[m.spouseId] === undefined) {
      level[m.spouseId] = currLevel;
      queue.push(m.spouseId);
    }

    // Process children at next level
    const kids = childrenOf[id] || [];
    kids.forEach(kidId => {
      if (level[kidId] === undefined) {
        level[kidId] = currLevel + 1;
        queue.push(kidId);
      }
    });
  }

  // Handle any unvisited members (disconnected)
  members.forEach(m => {
    if (level[m.id] === undefined) {
      level[m.id] = 0;
      visited.add(m.id);
    }
  });

  // Group members by level
  const levels = {};
  members.forEach(m => {
    const l = level[m.id] || 0;
    if (!levels[l]) levels[l] = [];
    levels[l].push(m.id);
  });

  // For each level, order members: couples together, then singles
  const sortedLevels = {};
  Object.keys(levels).forEach(l => {
    const ids = levels[l];
    const ordered = [];
    const placed = new Set();

    ids.forEach(id => {
      if (placed.has(id)) return;
      const m = byId[id];
      placed.add(id);

      if (m.spouseId && byId[m.spouseId] && level[m.spouseId] == l && !placed.has(m.spouseId)) {
        // Place couple together (male on left by convention)
        placed.add(m.spouseId);
        if (m.gender === 'male') {
          ordered.push({ type: 'couple', left: m.id, right: m.spouseId });
        } else {
          ordered.push({ type: 'couple', left: m.spouseId, right: m.id });
        }
      } else {
        ordered.push({ type: 'single', id: m.id });
      }
    });

    sortedLevels[l] = ordered;
  });

  function getChildUnits(unit) {
    let kids = [];
    if (unit.type === 'couple') {
      const ck = coupleKey(unit.left, unit.right);
      if (coupleChildren[ck]) kids = [...coupleChildren[ck]];
      else {
        kids = [...(childrenOf[unit.left] || []), ...(childrenOf[unit.right] || [])];
        kids = [...new Set(kids)];
      }
    } else {
      kids = childrenOf[unit.id] || [];
    }

    if (kids.length === 0) return [];

    const childLevel = (level[kids[0]] ?? 0);
    return (sortedLevels[childLevel] || []).filter(u => {
      if (u.type === 'single') return kids.includes(u.id);
      if (u.type === 'couple') return kids.includes(u.left) || kids.includes(u.right);
      return false;
    });
  }

  const unitWidthCache = new Map();
  function getUnitWidth(unit) {
    const key = unit.type === 'couple' ? `${unit.left}-${unit.right}` : unit.id;
    if (unitWidthCache.has(key)) return unitWidthCache.get(key);

    let ownWidth = unit.type === 'couple' ? (NODE_W * 2 + SPOUSE_GAP) : NODE_W;
    const childUnits = getChildUnits(unit);
    
    if (childUnits.length === 0) {
      unitWidthCache.set(key, ownWidth);
      return ownWidth;
    }

    let childrenWidth = 0;
    childUnits.forEach((cu, i) => {
      childrenWidth += getUnitWidth(cu);
      if (i < childUnits.length - 1) childrenWidth += H_GAP;
    });

    const w = Math.max(ownWidth, childrenWidth);
    unitWidthCache.set(key, w);
    return w;
  }

  const positions = {}; // memberId -> { x, y }
  const junctions = []; // { id, x, y, coupleKey }

  // Assign X positions recursively starting from roots
  const rootUnits = sortedLevels[0] || [];
  let totalRootWidth = 0;
  rootUnits.forEach((u, i) => {
    totalRootWidth += getUnitWidth(u);
    if (i < rootUnits.length - 1) totalRootWidth += H_GAP;
  });

  let currentRootX = -totalRootWidth / 2;

  function placeUnit(unit, startX, l) {
    const y = l * (NODE_H + V_GAP);
    const w = getUnitWidth(unit);
    const ownWidth = unit.type === 'couple' ? (NODE_W * 2 + SPOUSE_GAP) : NODE_W;
    
    // Center the actual node(s) within the reserved width `w`
    const offset = (w - ownWidth) / 2;
    const nodeX = startX + offset;

    if (unit.type === 'couple') {
      positions[unit.left] = { x: nodeX, y };
      positions[unit.right] = { x: nodeX + NODE_W + SPOUSE_GAP, y };

      const jx = nodeX + NODE_W + SPOUSE_GAP / 2 - JUNCTION_SIZE / 2;
      const jy = y + NODE_H / 2 - JUNCTION_SIZE / 2;
      const ck = coupleKey(unit.left, unit.right);
      junctions.push({ id: `junc-${ck}`, x: jx, y: jy, coupleKey: ck, leftId: unit.left, rightId: unit.right });
    } else {
      positions[unit.id] = { x: nodeX, y };
    }

    // Place children
    const childUnits = getChildUnits(unit);
    if (childUnits.length > 0) {
      let childrenWidth = 0;
      childUnits.forEach((cu, i) => {
        childrenWidth += getUnitWidth(cu);
        if (i < childUnits.length - 1) childrenWidth += H_GAP;
      });

      // Start placing children centered under this unit's allocated width
      let childStartX = startX + (w - childrenWidth) / 2;
      childUnits.forEach(cu => {
        placeUnit(cu, childStartX, l + 1);
        childStartX += getUnitWidth(cu) + H_GAP;
      });
    }
  }

  // Place all root trees
  rootUnits.forEach(u => {
    placeUnit(u, currentRootX, 0);
    currentRootX += getUnitWidth(u) + H_GAP;
  });

  // Build final node list
  const nodes = members.map(m => ({
    id: m.id,
    type: 'familyNode',
    position: positions[m.id] || { x: 0, y: 0 },
    data: { label: m.name, gender: m.gender, place: m.place, phone: m.phone },
    draggable: false,
  }));

  // Add junction nodes
  junctions.forEach(j => {
    nodes.push({
      id: j.id,
      type: 'junctionNode',
      position: { x: j.x, y: j.y },
      data: {},
      draggable: false,
      selectable: false,
    });
  });

  // Build edge list
  const edges = [];
  const spouseSet = new Set();
  const junctionMap = {}; // memberId -> junctionId
  junctions.forEach(j => {
    junctionMap[j.leftId] = j.id;
    junctionMap[j.rightId] = j.id;
  });

  members.forEach(m => {
    // Parent -> child edges
    if (m.parentId && byId[m.parentId]) {
      const juncId = junctionMap[m.parentId];
      if (juncId) {
        edges.push({
          id: `e-child-${m.id}`,
          source: juncId,
          target: m.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#60a5fa', strokeWidth: 2 },
        });
      } else {
        edges.push({
          id: `e-child-${m.id}`,
          source: m.parentId,
          target: m.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#60a5fa', strokeWidth: 2 },
        });
      }
    }

    // Spouse edges (through junction)
    if (m.spouseId && byId[m.spouseId]) {
      const ck = coupleKey(m.id, m.spouseId);
      if (!spouseSet.has(ck)) {
        spouseSet.add(ck);
        const junc = junctions.find(j => j.coupleKey === ck);
        if (junc) {
          edges.push({
            id: `e-spouse-l-${ck}`,
            source: junc.leftId,
            target: junc.id,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'straight',
            style: { stroke: '#e879f9', strokeWidth: 2 },
          });
          edges.push({
            id: `e-spouse-r-${ck}`,
            source: junc.id,
            target: junc.rightId,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'straight',
            style: { stroke: '#e879f9', strokeWidth: 2 },
          });
        }
      }
    }
  });

  return { nodes, edges };
}
