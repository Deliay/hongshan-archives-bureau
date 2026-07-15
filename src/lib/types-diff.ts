export type FieldChange =
  | { type: 'value'; oldValue: any; newValue: any }
  | { type: 'i18n'; changedLocales: Record<string, { oldText: string; newText: string }> }

export interface ChangedEntry {
  oldValue: Record<string, any>
  newValue: Record<string, any>
  changed: Record<string, FieldChange>
}

export interface TableDiff {
  tableName: string
  versionOld: string
  versionNew: string
  locale: string
  stats: { added: number; removed: number; changed: number }
  entries: {
    added: Record<string, any>
    removed: Record<string, any>
    changed: Record<string, ChangedEntry>
  }
}

export interface I18nDiff {
  locale: string
  stats: { added: number; removed: number; changed: number }
  added: Record<string, string>
  removed: Record<string, string>
  changed: Record<string, { oldText: string; newText: string }>
}

export interface ManifestFolder {
  name: string
  description?: string
  fileCount: number
  files: string[]
  tableStats?: Record<string, { added: number; removed: number; changed: number }>
}

export interface Manifest {
  generatedAt: string
  folders: ManifestFolder[]
}
