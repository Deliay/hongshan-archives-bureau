import { useMemo, useState, useCallback, useEffect } from 'react'
import { ReactFlow, Handle, Position, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import ItemTile from '../Items/ItemTile'
import { ASSET_BASE } from '../../lib/adapter'
import { useI18n } from '../../i18n'
import type { ChainGraph as ChainGraphData } from '../../lib/factory/types'

interface ChainGraphProps {
  graph: ChainGraphData
}

function ItemNode({ data }: { data: { itemId: string; perMinute: number; isTarget?: boolean } }) {
  return (
    <div className={`relative ${data.isTarget ? 'ring-2 ring-archive-gold rounded' : ''}`}>
      <Handle type="source" position={Position.Right} className="!bg-archive-gold" />
      <Handle type="target" position={Position.Left} className="!bg-archive-gold" />
      <div className="flex flex-col items-center">
        <ItemTile itemId={data.itemId} size="sm" showTips={true} />
        {data.perMinute > 0 && (
          <div className="text-[10px] text-archive-gold mt-0.5 font-medium">{data.perMinute.toFixed(1)}/m</div>
        )}
      </div>
    </div>
  )
}

function MachineNode({ data }: { data: { machineId: string; machineName: string; machineIcon: string } }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!bg-archive-lead" />
      <Handle type="target" position={Position.Left} className="!bg-archive-lead" />
      {data.machineIcon && (
        <img
          src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingpanelicon/${data.machineIcon}.png`}
          alt=""
          className="w-8 h-8 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="text-[10px] text-archive-dust mt-0.5 max-w-[80px] truncate text-center">{data.machineName}</div>
    </div>
  )
}

function SourceNode({ data }: { data: { itemId: string; perMinute: number } }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      <ItemTile itemId={data.itemId} size="sm" showTips={true} />
      <div className="text-[10px] text-green-400 mt-0.5">{data.perMinute.toFixed(1)}/m</div>
      <div className="text-[9px] text-archive-lead">{t('factory.sourceNode')}</div>
    </div>
  )
}

function LeafNode({ data }: { data: { itemId: string } }) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!bg-archive-lead" />
      <Handle type="target" position={Position.Left} className="!bg-archive-lead" />
      <ItemTile itemId={data.itemId} size="sm" showTips={true} />
    </div>
  )
}

const nodeTypes = {
  item: ItemNode,
  machine: MachineNode,
  source: SourceNode,
  leaf: LeafNode,
}

function layoutGraph(graph: ChainGraphData): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })

  for (const node of graph.nodes) {
    const width = node.kind === 'machine' ? 100 : 80
    const height = node.kind === 'machine' ? 60 : 80
    g.setNode(node.key, { width, height })
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to)
  }

  dagre.layout(g)

  const nodes: Node[] = graph.nodes.map(n => {
    const pos = g.node(n.key)
    const width = n.kind === 'machine' ? 100 : 80
    const height = n.kind === 'machine' ? 60 : 80
    return {
      id: n.key,
      type: n.kind === 'item' ? (n.itemId && !graph.edges.some(e => e.from === `leaf:${n.itemId}` && e.to === n.key) ? 'item' : 'leaf') : n.kind === 'source' ? 'source' : 'machine',
      position: { x: (pos?.x ?? 0) - width / 2, y: (pos?.y ?? 0) - height / 2 },
      width,
      height,
      data: {
        itemId: n.itemId,
        machineId: n.machineId,
        machineName: n.machineName ?? '',
        machineIcon: n.machineIcon ?? '',
        perMinute: n.perMinute,
        isTarget: n.isTarget,
      },
    }
  })

  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    type: e.isCycle ? 'smoothstep' : 'bezier',
    style: { stroke: e.isCycle ? '#f59e0b' : '#C9A96E', strokeWidth: e.isCycle ? 2 : 1.5, strokeDasharray: e.isCycle ? '5 5' : undefined },
    markerEnd: e.isCycle ? undefined : { type: 'arrowclosed' as const, color: '#C9A96E', width: 20, height: 20 },
    label: e.isCycle ? '↻' : undefined,
    animated: e.isCycle,
  }))

  return { nodes, edges }
}

export default function ChainGraph({ graph }: ChainGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => layoutGraph(graph), [graph])
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  if (graph.nodes.length === 0) return null

  return (
    <div className="h-[600px] w-full border border-archive-border rounded bg-archive-ink">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  )
}
