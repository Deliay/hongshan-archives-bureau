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
      <Handle type="target" position={Position.Left} className="!bg-archive-gold" />
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
        <div className="flex items-center gap-1 mt-1">
          <div className="flex flex-wrap items-center justify-center gap-1">
            {data.recipe.inputs.map(i => (
              <ItemTile key={i.itemId} itemId={i.itemId} amount={i.count} size="sm" showTips={false} />
            ))}
          </div>
          <span className="text-archive-gold text-[10px] shrink-0">→</span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {data.recipe.outputs.map(o => (
              <ItemTile key={o.itemId} itemId={o.itemId} amount={o.count} size="sm" showTips={false} />
            ))}
          </div>
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
    <div className="flex flex-col items-center border border-green-900/60 rounded p-2 bg-archive-ink">
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      {data.machineIcon && (
        <img
          src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/factory/buildingpanelicon/${data.machineIcon}.png`}
          alt=""
          className="w-8 h-8 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      {data.machineName && (
        <div className="text-[10px] text-archive-dust mt-0.5 max-w-[90px] truncate text-center">
          {data.machineName}
        </div>
      )}
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

// 机器节点宽度随配方物品数（输入+输出）变化，与 dagre 布局和 ReactFlow 显式尺寸保持一致
function nodeSize(n: ChainNode): { width: number; height: number } {
  // 源节点含采集机器图标/名称 + 物品 tile + 速率行
  if (n.kind === 'source') return { width: 110, height: 170 }
  if (n.kind !== 'machine') return { width: 80, height: 80 }
  const tiles = (n.recipe?.inputs.length ?? 0) + (n.recipe?.outputs.length ?? 0)
  const width = Math.max(120, tiles * 52 + 40)
  return { width, height: 180 }
}

function layoutGraph(graph: ChainGraphData, t: (key: string, vars?: Record<string, string | number>) => string): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })

  for (const node of graph.nodes) {
    g.setNode(node.key, nodeSize(node))
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to)
  }

  dagre.layout(g)

  const nodes: Node[] = graph.nodes.map(n => {
    const pos = g.node(n.key)
    const { width, height } = nodeSize(n)
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
      label = t('factory.closedLoop')
    } else if (e.cycleType === 'productive') {
      strokeColor = '#C9A96E'
      animated = true
      label = t('factory.productiveLoop', { ratio: (e.cycleRatio ?? 0).toFixed(1) })
    }

    const transportLabel = e.isPipe
      ? t('factory.pipeCount', { count: e.beltCount, rate: e.perMinute.toFixed(0) })
      : t('factory.beltCount', { count: e.beltCount, rate: e.perMinute.toFixed(0) })

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
  const { t } = useI18n()
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => layoutGraph(graph, t), [graph, t])
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
