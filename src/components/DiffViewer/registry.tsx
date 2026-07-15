import type { ComponentType } from 'react'
import type { TableDiff } from '../../lib/types-diff'
import DiffViewer from './DiffViewer'

export interface TableDiffComponentProps {
  diff: TableDiff
}

const registry = new Map<string, ComponentType<TableDiffComponentProps>>()

export function registerTableDiffComponent(
  tableName: string,
  component: ComponentType<TableDiffComponentProps>,
) {
  registry.set(tableName, component)
}

export function getTableDiffComponent(
  tableName: string,
): ComponentType<TableDiffComponentProps> {
  return registry.get(tableName) ?? DiffViewer
}
