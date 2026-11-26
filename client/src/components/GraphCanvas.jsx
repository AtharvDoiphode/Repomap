import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import dagre from 'dagre';
import {
  Maximize2,
  RotateCcw,
  Columns,
  Rows,
  FileCode2,
} from 'lucide-react';

const NODE_WIDTH = 208; // w-52 in px
const NODE_HEIGHT = 70;

/**
 * Custom FileNode Component
 */
function FileNodeComponent({ data, id }) {
  const isSelected = data.isSelected;
  const isConnected = data.isConnected;
  const hasSelection = data.hasSelection;
  const isDark = data.theme !== 'light';

  const targetPos = data.targetPosition || Position.Left;
  const sourcePos = data.sourcePosition || Position.Right;

  let borderStyle = isDark ? 'border-zinc-800' : 'border-zinc-200';
  if (isSelected) {
    borderStyle = 'border-emerald-400 ring-1 ring-emerald-400/40 shadow-sm';
  } else if (isConnected) {
    borderStyle = 'border-emerald-400/70';
  }

  const opacityStyle = hasSelection && !isSelected && !isConnected ? 'opacity-35' : 'opacity-100';

  return (
    <div
      className={`w-52 border ${borderStyle} ${opacityStyle} transition-all duration-150 rounded select-none shadow-sm group ${
        isDark
          ? 'bg-[#111113] hover:border-zinc-700'
          : 'bg-white hover:border-zinc-300'
      }`}
    >
      <Handle
        type="target"
        position={targetPos}
        className={`w-1.5 h-1.5 ${isDark ? '!bg-zinc-600' : '!bg-zinc-400'} !border-0`}
      />

      {/* Header bar */}
      <div
        className={`px-2.5 py-1.5 flex items-center justify-between gap-1 border-b ${
          isDark
            ? 'border-zinc-800/80 bg-[#141416]'
            : 'border-zinc-100 bg-zinc-50/80'
        }`}
      >
        <span
          className={`font-mono text-xs truncate group-hover:text-emerald-500 ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          }`}
        >
          {data.label}
        </span>
        {data.extension && (
          <span className="text-[10px] font-mono text-emerald-500 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            {data.extension}
          </span>
        )}
      </div>

      {/* Body telemetry */}
      <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span className="truncate max-w-[110px]" title={data.folder}>
          {data.folder}
        </span>
        <span className="shrink-0 text-zinc-400">
          IN:{data.inDegree} OUT:{data.outDegree}
        </span>
      </div>

      <Handle
        type="source"
        position={sourcePos}
        className={`w-1.5 h-1.5 ${isDark ? '!bg-zinc-600' : '!bg-zinc-400'} !border-0`}
      />
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNodeComponent,
};

/**
 * Computes non-overlapping Dagre layout coordinates
 */
function getLayoutedElements(nodes, edges, direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const targetPosition = direction === 'LR' ? Position.Left : Position.Top;
  const sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition,
      sourcePosition,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function GraphCanvasInner({
  nodes: rawNodes = [],
  edges: rawEdges = [],
  selectedNodeId,
  onSelectNode,
  theme = 'dark',
}) {
  const [direction, setDirection] = useState('LR'); // 'LR' or 'TB'
  const { fitView } = useReactFlow();
  const isDark = theme === 'dark';

  // Compute set of directly connected nodes to selectedNodeId
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set();
    const set = new Set();
    rawEdges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, rawEdges]);

  // Transform raw nodes for React Flow
  const preparedNodes = useMemo(() => {
    return rawNodes.map((n) => {
      const isSelected = n.id === selectedNodeId;
      const isConnected = connectedNodeIds.has(n.id);
      return {
        id: n.id,
        type: 'fileNode',
        position: { x: 0, y: 0 },
        data: {
          ...n,
          isSelected,
          isConnected,
          hasSelection: Boolean(selectedNodeId),
          theme,
          targetPosition: direction === 'LR' ? Position.Left : Position.Top,
          sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
        },
      };
    });
  }, [rawNodes, selectedNodeId, connectedNodeIds, direction, theme]);

  // Transform raw edges for React Flow
  const preparedEdges = useMemo(() => {
    return rawEdges.map((e) => {
      const isConnectedToSelected =
        selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);

      const defaultStroke = isDark ? '#3f3f46' : '#a1a1aa';
      const activeStroke = isDark ? '#10b981' : '#059669';

      return {
        id: e.id || `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        animated: Boolean(isConnectedToSelected),
        style: {
          stroke: isConnectedToSelected ? activeStroke : defaultStroke,
          strokeWidth: isConnectedToSelected ? 2 : 1.2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isConnectedToSelected ? activeStroke : defaultStroke,
        },
      };
    });
  }, [rawEdges, selectedNodeId, isDark]);

  // Compute layout with Dagre
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (preparedNodes.length === 0) return { nodes: [], edges: [] };
    return getLayoutedElements(preparedNodes, preparedEdges, direction);
  }, [preparedNodes, preparedEdges, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync state whenever layout or selection updates
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Auto-fit on layout change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 50);
    return () => clearTimeout(timer);
  }, [direction, rawNodes.length, fitView]);

  const handleNodeClick = useCallback(
    (_event, node) => {
      if (onSelectNode) {
        onSelectNode(node.id === selectedNodeId ? null : node.id);
      }
    },
    [onSelectNode, selectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    if (onSelectNode) {
      onSelectNode(null);
    }
  }, [onSelectNode]);

  if (rawNodes.length === 0) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-8 bg-dot-matrix text-center border border-dashed rounded ${
          isDark ? 'border-zinc-800' : 'border-zinc-300'
        }`}
      >
        <FileCode2 size={28} className={isDark ? 'text-zinc-600' : 'text-zinc-400'} />
        <div
          className={`font-mono text-xs uppercase tracking-wider font-semibold mt-2 ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          No Internal Module Imports Detected In Sample
        </div>
        <div className={`text-[11px] font-mono mt-1 max-w-sm ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
          Scanned code files do not have relative dependency linkages, or files are flat utility scripts.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full relative select-none rounded overflow-hidden border transition-colors ${
        isDark
          ? 'bg-[#09090b] border-zinc-800'
          : 'bg-[#fafafa] border-zinc-200'
      }`}
    >
      {/* Floating Hairline Toolbar */}
      <div
        className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 p-1 rounded backdrop-blur-sm border text-xs font-mono shadow-sm ${
          isDark
            ? 'bg-[#111113]/90 border-zinc-800'
            : 'bg-white/90 border-zinc-200'
        }`}
      >
        <div
          className={`flex items-center rounded border p-0.5 ${
            isDark ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-200 bg-zinc-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setDirection('LR')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              direction === 'LR'
                ? isDark
                  ? 'bg-zinc-800 text-emerald-400 font-medium'
                  : 'bg-white text-emerald-600 font-medium shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            title="Left-to-Right Horizontal Flow"
          >
            <Columns size={12} />
            <span>LR</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('TB')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              direction === 'TB'
                ? isDark
                  ? 'bg-zinc-800 text-emerald-400 font-medium'
                  : 'bg-white text-emerald-600 font-medium shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            title="Top-to-Bottom Vertical Flow"
          >
            <Rows size={12} />
            <span>TB</span>
          </button>
        </div>

        {selectedNodeId && (
          <button
            type="button"
            onClick={() => onSelectNode(null)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              isDark
                ? 'border-zinc-800 bg-[#18181b] text-zinc-300 hover:text-emerald-400 hover:border-zinc-700'
                : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:text-emerald-600 hover:border-zinc-300'
            }`}
          >
            <RotateCcw size={11} />
            <span>RESET</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => fitView({ padding: 0.15, duration: 400 })}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
            isDark
              ? 'border-zinc-800 bg-[#18181b] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
          }`}
          title="Fit View"
        >
          <Maximize2 size={11} />
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        minZoom={0.2}
        maxZoom={2.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background
          variant="dots"
          gap={20}
          size={1}
          color={isDark ? '#27272a' : '#d4d4d8'}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={isDark ? '#27272a' : '#e4e4e7'}
          maskColor={isDark ? 'rgba(9, 9, 11, 0.8)' : 'rgba(250, 250, 250, 0.8)'}
          style={{ width: 120, height: 80 }}
        />
      </ReactFlow>
    </div>
  );
}

export default function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
