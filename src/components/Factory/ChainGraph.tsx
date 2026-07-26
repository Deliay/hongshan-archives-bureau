import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
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
          src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${data.machineIcon}.png`}
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
      data: {
        itemId: n.itemId,
        machineId: n.machineId,
        machineName: '',
        machineIcon: '',
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

function renderEdges(svg: SVGSVGElement, nodes: Node[], edges: Edge[]) {
  svg.innerHTML = ''

  const rfContainer = document.querySelector('.react-flow')
  if (!rfContainer) return
  const viewport = rfContainer.querySelector('.react-flow__viewport')
  if (!viewport) return
  const viewportStyle = window.getComputedStyle(viewport)
  const matrix = viewportStyle.transform.match(/matrix\(([^)]+)\)/)
  if (!matrix) return
  const values = matrix[1].split(',').map(Number)
  const scale = values[0]
  const tx = values[4]
  const ty = values[5]

  const nodePositions = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const el = rfContainer.querySelector(`[data-id="${node.id}"]`)
    if (el) {
      const rect = el.getBoundingClientRect()
      const containerRect = rfContainer.getBoundingClientRect()
      nodePositions.set(node.id, {
        x: (rect.left - containerRect.left - tx) / scale + rect.width / scale / 2,
        y: (rect.top - containerRect.top - ty) / scale + rect.height / scale / 2,
      })
    }
  }

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)

  for (const edge of edges) {
    const source = nodePositions.get(edge.source)
    const target = nodePositions.get(edge.target)
    if (!source || !target) continue

    const markerId = `arrow-${edge.id}`
    const color = (edge.style?.stroke as string) || '#C9A96E'

    if (edge.markerEnd) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
      marker.setAttribute('id', markerId)
      marker.setAttribute('viewBox', '0 0 10 10')
      marker.setAttribute('refX', '10')
      marker.setAttribute('refY', '5')
      marker.setAttribute('markerWidth', '8')
      marker.setAttribute('markerHeight', '8')
      marker.setAttribute('orient', 'auto-start-reverse')
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      polygon.setAttribute('points', '0 0, 10 5, 0 10')
      polygon.setAttribute('fill', color)
      marker.appendChild(polygon)
      defs.appendChild(marker)
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const dx = Math.abs(target.x - source.x) * 0.4
    const d = `M ${source.x} ${source.y} C ${source.x + dx} ${source.y}, ${target.x - dx} ${target.y}, ${target.x} ${target.y}`
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', color)
    path.setAttribute('stroke-width', String(edge.style?.strokeWidth || 1.5))
    if (edge.style?.strokeDasharray) {
      path.setAttribute('stroke-dasharray', edge.style.strokeDasharray)
    }
    if (edge.markerEnd) {
      path.setAttribute('marker-end', `url(#${markerId})`)
    }
    svg.appendChild(path)
  }
}

export default function ChainGraph({ graph }: ChainGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => layoutGraph(graph), [graph])
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)
  const svgRef = useRef<SVGSVGElement | null>(null)

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

  useEffect(() => {
    const rfContainer = document.querySelector('.react-flow')
    if (!rfContainer) return

    let existingSvg = rfContainer.querySelector('.chain-custom-edges') as SVGSVGElement | null
    if (!existingSvg) {
      existingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      existingSvg.classList.add('chain-custom-edges')
      existingSvg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1000'
      rfContainer.appendChild(existingSvg)
    }
    svgRef.current = existingSvg

    return () => { existingSvg?.remove() }
  }, [])

  useEffect(() => {
    if (!svgRef.current) return
    requestAnimationFrame(() => {
      if (svgRef.current) renderEdges(svgRef.current, nodes, edges)
    })
  }, [nodes, edges])

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
