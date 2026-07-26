import { useMemo, useState, useCallback, useEffect } from 'react'
import { ReactFlow, Handle, Position, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import ItemTile from '../Items/ItemTile'
import { ASSET_BASE } from '../../lib/adapter'
import { useI18n } from '../../i18n'
import type { ChainGraph as ChainGraphData, ChainNode } from '../../lib/factory/types'

interface ChainGraphProps {
  graph: ChainGraphData
}

function TargetNode({ data }: { data: ChainNode }) {
  const { t } = useI18n()
  return (
    <div className="relative ring-2 ring-archive-gold rounded p-2">
      <Handle type="source" position={Position.Right} className="!bg-archive-gold" />
      <div className="flex flex-col items-center">
        <ItemTile itemId={data.itemId} size="sm" showTips={true} />
        <div className="text-[10px] text-archive-gold mt-0.5 font-medium">
          {data.actualPm.toFixed(1)}/min
        </div>
        <div className="text-[9px] text-archive-lead">{t('factory.targetNode')}</div>
      </div>
    </div>
  )
}

function MachineNode({ data }: { data: ChainNode }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center border border-archive-border rounded p-2 bg-archive-ink">
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
      <div className="text-[10px] text-archive-dust mt-0.5 max-w-[80px] truncate text-center">
        {data.machineName}
      </div>
      {data.machineCount != null && data.machineCount > 0 && (
        <div className="text-[10px] text-archive-gold font-medium">
          ×{data.machineCount}
        </div>
      )}
      {data.recipe && (
        <div className="text-[8px] text-archive-lead mt-1 max-w-[100px] truncate">
          {data.recipe.inputs.map(i => i.itemId).join(' + ')} → {data.recipe.outputs.map(o => `${o.itemId}×${o.count}`).join(', ')}
        </div>
      )}
      <div className="text-[9px] text-archive-dust mt-0.5">
        {t('factory.actualOutput')}: {data.actualPm.toFixed(1)}/min
        {data.supplyLimited && (
          <span className="text-orange-500"> ({t('factory.supplyLimited')})</span>
        )}
      </div>
      {data.demandPm !== data.actualPm && (
        <div className="text-[9px] text-archive-lead">
          {t('factory.demand')}: {data.demandPm.toFixed(1)}/min
        </div>
      )}
    </div>
  )
}

function SourceNode({ data }: { data: ChainNode }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      <ItemTile itemId={data.itemId} size="sm" showTips={true} />
      <div className="text-[10px] text-green-400 mt-0.5">{data.actualPm.toFixed(1)}/min</div>
      <div className="text-[9px] text-archive-lead">{t('factory.sourceNode')}</div>
      {data.supplyLimited && (
        <div className="text-[8px] text-orange-500">{t('factory.supplyLimited')}</div>
      )}
    </div>
  )
}

const nodeTypes = {
  target: TargetNode,
  machine: MachineNode,
  source: SourceNode,
}

function layoutGraph(graph: ChainGraphData): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })

  for (const node of graph.nodes) {
    const width = node.kind === 'machine' ? 120 : 80
    const height = node.kind === 'machine' ? 100 : 80
    g.setNode(node.key, { width, height })
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to)
  }

  dagre.layout(g)

  const nodes: Node[] = graph.nodes.map(n => {
    const pos = g.node(n.key)
    const width = n.kind === 'machine' ? 120 : 80
    const height = n.kind === 'machine' ? 100 : 80
    return {
      id: n.key,
      type: n.kind,
      position: { x: (pos?.x ?? 0) - width / 2, y: (pos?.y ?? 0) - height / 2 },
      width,
      height,
      data: n as unknown as Record<string, unknown>,
    }
  })

  const edges: Edge[] = graph.edges.map((e, i) => {
    let strokeColor = '#C9A96E'
    let strokeDasharray: string | undefined
    let animated = false
    let label = ''

    if (e.isPipe) {
      strokeColor = '#3b82f6'
      strokeDasharray = '8 4'
    }

    if (e.cycleType === 'closed') {
      strokeColor = '#f59e0b'
      strokeDasharray = '5 5'
      animated = true
      label = '↻ 封闭'
    } else if (e.cycleType === 'productive') {
      strokeColor = '#C9A96E'
      animated = true
      label = `净产出 ${(e.cycleRatio ?? 0).toFixed(1)}`
    }

    const transportLabel = e.isPipe
      ? `管道×${e.beltCount} (${e.perMinute.toFixed(0)}/min)`
      : `传送带×${e.beltCount} (${e.perMinute.toFixed(0)}/min)`

    return {
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      style: { stroke: strokeColor, strokeWidth: 1.5, strokeDasharray },
      markerEnd: { type: 'arrowclosed' as const, color: strokeColor, width: 20, height: 20 },
      label: label || transportLabel,
      animated,
    }
  })

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
