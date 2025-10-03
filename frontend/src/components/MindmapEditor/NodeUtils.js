export function shouldAutoLayout(rfNodes) {
    if (rfNodes.length < 2) return false;
    const nearlyZero = rfNodes.every(n => Math.abs(n.position.x) < 1e-3 && Math.abs(n.position.y) < 1e-3);
    if (nearlyZero) return true;
    const freq = {};
    rfNodes.forEach(n => {
        const k = `${Math.round(n.position.x)}:${Math.round(n.position.y)}`;
        freq[k] = (freq[k] || 0) + 1;
    });
    const maxCnt = Math.max(...Object.values(freq));
    return maxCnt / rfNodes.length >= 0.7;
}

export function stableInitialLayout(rfNodes, rfEdges) {
    const map = new Map(rfNodes.map(n => [n.id, { ...n, children: [], parent: null, leafCount: 1 }]));
    rfEdges.forEach(e => {
        const p = map.get(e.source);
        const c = map.get(e.target);
        if (p && c) { p.children.push(c); c.parent = p; }
    });
    const root = [...map.values()].find(n => n.data.isRoot);
    if (!root) return rfNodes;

    map.forEach(n => n.children.sort((a,b)=> a.id.localeCompare(b.id)));

    // Leaf count
    const calcLeaves = (node) => {
        if (!node.children.length) { node.leafCount = 1; return 1; }
        let sum = 0;
        node.children.forEach(ch => { sum += calcLeaves(ch); });
        node.leafCount = Math.max(sum, 1);
        return node.leafCount;
    };
    calcLeaves(root);

    const ROOT_X = root.position.x;
    const ROOT_Y = root.position.y;
    const LEVEL_X_ROOT = 260;
    const LEVEL_X_STEP = 180;
    const LEVEL_Y = 140;

    root.data.side = 'center';
    root.position = { x: ROOT_X, y: ROOT_Y };

    const firstChildren = root.children;
    const rightSide = [];
    const leftSide = [];
    firstChildren.forEach((c, i) => (i % 2 === 0 ? rightSide : leftSide).push(c));

    const layoutBranch = (node, side) => {
        if (!node.children.length) return;
        const totalLeaves = node.children.reduce((acc,n)=> acc + n.leafCount, 0);
        let startY = node.position.y - ((totalLeaves - 1) * LEVEL_Y)/2;
        node.children.forEach(ch => {
            const blockHeight = (ch.leafCount - 1) * LEVEL_Y;
            ch.position = {
                x: node.position.x + (side === 'left' ? -LEVEL_X_STEP : LEVEL_X_STEP),
                y: startY + blockHeight/2
            };
            ch.data.side = side;
            layoutBranch(ch, side);
            startY += ch.leafCount * LEVEL_Y;
        });
    };

    const layoutSideGroup = (arr, isRight) => {
        if (!arr.length) return;
        const totalLeaves = arr.reduce((acc,n)=> acc + n.leafCount, 0);
        let startY = ROOT_Y - ((totalLeaves - 1) * LEVEL_Y)/2;
        arr.forEach(ch => {
            const blockHeight = (ch.leafCount - 1) * LEVEL_Y;
            ch.position = {
                x: ROOT_X + (isRight ? LEVEL_X_ROOT : -LEVEL_X_ROOT),
                y: startY + blockHeight/2
            };
            ch.data.side = isRight ? 'right' : 'left';
            layoutBranch(ch, ch.data.side);
            startY += ch.leafCount * LEVEL_Y;
        });
    };

    layoutSideGroup(rightSide, true);
    layoutSideGroup(leftSide, false);

    return rfNodes.map(n => map.get(n.id));
}