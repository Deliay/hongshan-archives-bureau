---
description: i18n 补全、缓存修复与语言切换体验优化 - 代码实现方案
type: Fleeting
---

# i18n 补全、缓存修复与语言切换体验 - 实现方案

**对应技术方案**: [[20260720-i18n-cache-optimization|工程优化：i18n 补全、缓存修复与语言切换体验]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-20
**开发分支**: `feat/i18n-cache-optimization`

## 1. 实现概览

将已评审通过的技术方案转化为可执行的代码实现清单。实现过程中复用现有 API、缓存机制与 i18n 架构，不新增后端服务，不修改现有数据模型。

| 步骤 | 目标 | 涉及文件 |

| 步骤 | 目标 | 涉及文件 |
|------|------|----------|
| 1 | 创建实现分支 | `feat/i18n-cache-optimization` |
| 2 | 修复缓存版本时序 | `src/lib/cache.ts` |
| 3 | 单条 i18n API 缓存 | `src/lib/api.ts` |
| 4 | 语言切换清空旧数据 | `src/hooks/useData.ts` |
| 5 | 种族/阵营缓存 key 带 locale | `src/hooks/useData.ts` |
| 6 | 补齐 CUSTOM 缺失 key | `scripts/generate-i18n-dicts.ts` |
| 7 | 重新生成 14 语言字典 | `src/i18n/dicts/*.json`、`src/i18n/index.tsx` |
| 8 | 新增 i18n 一致性校验脚本 | `scripts/verify-i18n.ts`、`package.json` |
| 9 | 更新开发流程文档 | `AGENTS.md`、`docs/engineering/references/i18n-spec.md` |
| 10 | 补充单元/组件/E2E 测试 | `src/lib/__tests__/cache.test.ts`、`src/i18n/index.test.ts`、`src/components/Layout/Sidebar.test.tsx`、`tests/e2e/src/*` |
| 11 | 全量验证 | `npm run lint && npm run test && npm run build` |

## 步骤 1：创建实现分支

```bash
git checkout main
git checkout -b feat/i18n-cache-optimization
```

## 步骤 2：修复缓存版本时序

**文件：`src/lib/cache.ts`**

当前问题：`currentVersion` 初始为 `null`，`initCache` 是异步的，在版本返回前其他 `getCachedData` 调用会写出 `null:` 前缀。

修改：

```ts
let currentVersion: string | null = null
let versionPromise: Promise<string> | null = null

export function initCache(): Promise<string> {
  if (!versionPromise) {
    versionPromise = (async () => {
      const version = await fetch('https://endfield-assets.fffdan.com/version').then(r => r.text())
      const old = await idbGet<string>('_version')
      if (old != null && old !== version) {
        await idbClear()
        memoryCache.clear()
      }
      await idbSet('_version', version)
      currentVersion = version
      return version
    })()
  }
  return versionPromise
}

export async function getCachedData<T>(
  table: string,
  fetcher: () => Promise<T>,
  key?: string
): Promise<T> {
  if (!versionPromise) await initCache()
  // ... 原逻辑保持不变
}
```

关键点：
- `initCache` 返回单例 promise，避免重复请求 `/version`。
- `getCachedData` 若无版本则先等待 `initCache()`，确保 `cacheKey` 始终有有效前缀。
- 版本变化时同时清空 IndexedDB 和内存缓存。

## 步骤 3：单条 i18n API 缓存

**文件：`src/lib/api.ts`**

把 `fetchI18nText` 改为走 `getCachedData`，key 使用显式前缀 `__i18n_text_${locale}`：

```ts
export async function fetchI18nText(locale: string, id: string): Promise<string> {
  return getCachedData<string>(`__i18n_text_${locale}`, async () => {
    return trackFetch(`正在解析文本 (${locale})`, async () => {
      const res = await fetch(`${API_BASE}/i18n/${locale}/${id}`)
      if (!res.ok) return ''
      return res.text()
    }, 'api.fetchingText', { locale })
  }, id)
}
```

缓存 key 最终为 `${version}:__i18n_text_${locale}:${id}`。

## 步骤 4：语言切换清空旧数据

**文件：`src/hooks/useData.ts`**

当前 `useData` 在依赖变化时只置 `loading=true`，不清空 `data`，导致切换语言时仍显示旧语言。

修改：

```ts
function useData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    setData(null) // 新增
    fetcher()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
```

可选增强：在 `useEffect` 中加 `cancelled` 标志，防止快速切换语言时旧请求覆盖新数据：

```ts
useEffect(() => {
  let cancelled = false
  setLoading(true)
  setError(null)
  setData(null)
  fetcher()
    .then(d => { if (!cancelled) setData(d) })
    .catch(e => { if (!cancelled) setError(e.message) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, deps)
```

## 步骤 5：种族/阵营缓存 key 带 locale

**文件：`src/hooks/useData.ts`**

`useRaceDetail` 与 `useFactionDetail` 中聚合缓存 key 目前不含 locale：

- `__built_races` → `__built_races_${locale}`
- `__built_factions` → `__built_factions_${locale}`
- `__i18n_search_${raceId}` → `__i18n_search_${locale}_${raceId}`
- `__i18n_search_${factionId}` → `__i18n_search_${locale}_${factionId}`

## 步骤 6：补齐 CUSTOM 缺失 key

**文件：`scripts/generate-i18n-dicts.ts`**

在 `CUSTOM` 中追加以下 21 个 key，每个 key 必须提供全部 14 个 locale 的本土翻译，不允许占位、留空或复制中文。

### 新增 key 清单

| Key | 说明 |
|-----|------|
| `common.loadingArchive` | LoadingToast 单条加载 |
| `common.loadingRequestCount` | LoadingToast 多条加载计数 |
| `common.loadingSlow` | LoadingToast 慢速提示 |
| `common.loadingFailed` | LoadingToast 失败标题 |
| `common.loadingRetry` | LoadingToast 重试按钮 |
| `nav.search` | 侧边栏/面包屑/首页的「档案搜索」 |
| `nav.searchDesc` | 首页「档案搜索」描述 |
| `search.title` | 搜索页标题 |
| `search.placeholder` | 搜索输入框占位 |
| `search.searchButton` | 搜索按钮 |
| `search.noResults` | 无结果提示 |
| `search.resultCount` | 结果计数（如「找到 32 条相关记载」） |
| `search.source` | 来源 |
| `search.relatedRecords` | 相关记载 |
| `search.hint` | 空态提示 |
| `search.prev` | 分页上一页 |
| `search.next` | 分页下一页 |
| `search.searchMore` | 搜索更多 |
| `item.explain` | ItemChangePanel 道具说明 |
| `diff.skillId` | WeaponChangePanel 技能 ID |
| `weapon.sortByRarity` | WeaponList 按稀有度排序 |

### 14 语言翻译对照表

> 说明：CN/TC/EN/JP/KR/RU 沿用现有字典中已确认的优质翻译；MX/BR/DE/FR/VN/TH/ID/IT 为本次新增本土翻译。

#### common.loadingArchive

| Locale | Translation |
|--------|-------------|
| CN | 正在调阅档案 |
| TC | 正在調閱檔案 |
| EN | Loading archive... |
| JP | 檔案を調閲中 |
| KR | 아카이브 불러오는 중 |
| RU | Загрузка архива... |
| MX | Cargando archivo... |
| BR | Carregando arquivo... |
| DE | Archiv wird geladen... |
| FR | Chargement de l'archive... |
| VN | Đang tải hồ sơ... |
| TH | กำลังโหลดเอกสารเก็บถาวร... |
| ID | Memuat arsip... |
| IT | Caricamento dell'archivio... |

#### common.loadingRequestCount

| Locale | Translation |
|--------|-------------|
| CN | 正在调阅 {{count}} 份档案 |
| TC | 正在調閱 {{count}} 份檔案 |
| EN | Loading {{count}} archives... |
| JP | {{count}} 件の檔案を調閲中 |
| KR | 아카이브 {{count}}건 불러오는 중 |
| RU | Загружается {{count}} архивов... |
| MX | Cargando {{count}} archivos... |
| BR | Carregando {{count}} arquivos... |
| DE | {{count}} Archive werden geladen... |
| FR | Chargement de {{count}} archives... |
| VN | Đang tải {{count}} hồ sơ... |
| TH | กำลังโหลดเอกสารเก็บถาวร {{count}} ฉบับ... |
| ID | Memuat {{count}} arsip... |
| IT | Caricamento di {{count}} archivi... |

#### common.loadingSlow

| Locale | Translation |
|--------|-------------|
| CN | 档案数据较大，请稍候… |
| TC | 檔案數據較大，請稍候… |
| EN | Archive data is large, please wait... |
| JP | 檔案データが大きいため、しばらくお待ちください |
| KR | 아카이브 데이터가 큽니다. 잠시만 기다려 주세요… |
| RU | Архивные данные велики, подождите… |
| MX | Los datos del archivo son grandes, espere por favor… |
| BR | Os dados do arquivo são grandes, aguarde… |
| DE | Die Archivdaten sind groß, bitte warten… |
| FR | Les données de l'archive sont volumineuses, veuillez patienter… |
| VN | Dữ liệu hồ sơ lớn, vui lòng chờ… |
| TH | ข้อมูลเอกสารเก็บถาวรมีขนาดใหญ่ โปรดรอสักครู่… |
| ID | Data arsip besar, harap tunggu… |
| IT | I dati dell'archivio sono voluminosi, attendere… |

#### common.loadingFailed

| Locale | Translation |
|--------|-------------|
| CN | 调阅失败 |
| TC | 調閱失敗 |
| EN | Failed to load |
| JP | 調閲に失敗しました |
| KR | 불러오기 실패 |
| RU | Не удалось загрузить |
| MX | Error al cargar |
| BR | Falha ao carregar |
| DE | Laden fehlgeschlagen |
| FR | Échec du chargement |
| VN | Tải thất bại |
| TH | โหลดล้มเหลว |
| ID | Gagal memuat |
| IT | Caricamento non riuscito |

#### common.loadingRetry

| Locale | Translation |
|--------|-------------|
| CN | 重试 |
| TC | 重試 |
| EN | Retry |
| JP | 再試行 |
| KR | 다시 시도 |
| RU | Повторить |
| MX | Reintentar |
| BR | Tentar novamente |
| DE | Erneut versuchen |
| FR | Réessayer |
| VN | Thử lại |
| TH | ลองอีกครั้ง |
| ID | Coba lagi |
| IT | Riprova |

#### nav.search / search.title

| Locale | Translation |
|--------|-------------|
| CN | 档案搜索 |
| TC | 檔案搜索 |
| EN | Archive Search |
| JP | 檔案検索 |
| KR | 아카이브 검색 |
| RU | Поиск по архиву |
| MX | Búsqueda de archivo |
| BR | Busca de arquivo |
| DE | Archivsuche |
| FR | Recherche d'archives |
| VN | Tìm kiếm hồ sơ |
| TH | ค้นหาเอกสารเก็บถาวร |
| ID | Pencarian Arsip |
| IT | Ricerca archivio |

#### nav.searchDesc

| Locale | Translation |
|--------|-------------|
| CN | 跨表关键词检索 |
| TC | 跨表關鍵詞檢索 |
| EN | Cross-table keyword search |
| JP | テーブル横断キーワード検索 |
| KR | 테이블 교차 키워드 검색 |
| RU | Поиск по ключевым словам в разных таблицах |
| MX | Búsqueda por palabra clave entre tablas |
| BR | Busca por palavra-chave entre tabelas |
| DE | Tabellenübergreifende Stichwortsuche |
| FR | Recherche par mot-clé entre tables |
| VN | Tìm kiếm từ khóa giữa các bảng |
| TH | ค้นหาคำสำคัญข้ามตาราง |
| ID | Pencarian kata kunci antar-tabel |
| IT | Ricerca per parola chiave tra tabelle |

#### search.placeholder

| Locale | Translation |
|--------|-------------|
| CN | 搜索档案关键词… |
| TC | 搜索檔案關鍵詞… |
| EN | Search archive keywords… |
| JP | 檔案のキーワードを検索… |
| KR | 아카이브 키워드 검색… |
| RU | Поиск по ключевым словам архива… |
| MX | Buscar palabras clave del archivo… |
| BR | Buscar palavras-chave do arquivo… |
| DE | Archivstichwörter suchen… |
| FR | Rechercher des mots-clés d'archive… |
| VN | Tìm kiếm từ khóa hồ sơ… |
| TH | ค้นหาคำสำคัญของเอกสารเก็บถาวร… |
| ID | Cari kata kunci arsip… |
| IT | Cerca parole chiave dell'archivio… |

#### search.searchButton

| Locale | Translation |
|--------|-------------|
| CN | 搜索 |
| TC | 搜索 |
| EN | Search |
| JP | 検索 |
| KR | 검색 |
| RU | Поиск |
| MX | Buscar |
| BR | Buscar |
| DE | Suchen |
| FR | Rechercher |
| VN | Tìm kiếm |
| TH | ค้นหา |
| ID | Cari |
| IT | Cerca |

#### search.noResults

| Locale | Translation |
|--------|-------------|
| CN | 未找到相关记载 |
| TC | 未找到相關記載 |
| EN | No related records found |
| JP | 関連記録が見つかりません |
| KR | 관련 기록을 찾을 수 없습니다 |
| RU | Связанные записи не найдены |
| MX | No se encontraron registros relacionados |
| BR | Nenhum registro relacionado encontrado |
| DE | Keine verwandten Einträge gefunden |
| FR | Aucun enregistrement associé trouvé |
| VN | Không tìm thấy hồ sơ liên quan |
| TH | ไม่พบบันทึกที่เกี่ยวข้อง |
| ID | Tidak ditemukan catatan terkait |
| IT | Nessun record correlato trovato |

#### search.resultCount

| Locale | Translation |
|--------|-------------|
| CN | 找到 {{count}} 条相关记载 |
| TC | 找到 {{count}} 條相關記載 |
| EN | Found {{count}} related records |
| JP | {{count}} 件の関連記録が見つかりました |
| KR | {{count}}건의 관련 기록을 찾았습니다 |
| RU | Найдено {{count}} связанных записей |
| MX | Se encontraron {{count}} registros relacionados |
| BR | Foram encontrados {{count}} registros relacionados |
| DE | {{count}} verwandte Einträge gefunden |
| FR | {{count}} enregistrements associés trouvés |
| VN | Đã tìm thấy {{count}} hồ sơ liên quan |
| TH | พบบันทึกที่เกี่ยวข้อง {{count}} รายการ |
| ID | Ditemukan {{count}} catatan terkait |
| IT | Trovati {{count}} record correlati |

#### search.source

| Locale | Translation |
|--------|-------------|
| CN | 来源 |
| TC | 來源 |
| EN | Source |
| JP | 出典 |
| KR | 출처 |
| RU | Источник |
| MX | Fuente |
| BR | Fonte |
| DE | Quelle |
| FR | Source |
| VN | Nguồn |
| TH | แหล่งที่มา |
| ID | Sumber |
| IT | Fonte |

#### search.relatedRecords

| Locale | Translation |
|--------|-------------|
| CN | 相关记载 |
| TC | 相關記載 |
| EN | Related Records |
| JP | 関連記録 |
| KR | 관련 기록 |
| RU | Связанные записи |
| MX | Registros relacionados |
| BR | Registros relacionados |
| DE | Verwandte Einträge |
| FR | Enregistrements associés |
| VN | Hồ sơ liên quan |
| TH | บันทึกที่เกี่ยวข้อง |
| ID | Catatan terkait |
| IT | Record correlati |

#### search.hint

| Locale | Translation |
|--------|-------------|
| CN | 输入关键词后按 Enter 开始搜索 |
| TC | 輸入關鍵詞後按 Enter 開始搜索 |
| EN | Enter keywords and press Enter to search |
| JP | キーワードを入力し、Enter キーで検索 |
| KR | 키워드를 입력하고 Enter 키를 눌러 검색하세요 |
| RU | Введите ключевые слова и нажмите Enter для поиска |
| MX | Introduce palabras clave y pulsa Enter para buscar |
| BR | Digite palavras-chave e pressione Enter para buscar |
| DE | Stichwörter eingeben und mit Enter suchen |
| FR | Saisissez des mots-clés et appuyez sur Entrée pour rechercher |
| VN | Nhập từ khóa và nhấn Enter để tìm kiếm |
| TH | ป้อนคำสำคัญแล้วกด Enter เพื่อค้นหา |
| ID | Masukkan kata kunci lalu tekan Enter untuk mencari |
| IT | Inserisci le parole chiave e premi Invio per cercare |

#### search.prev

| Locale | Translation |
|--------|-------------|
| CN | 上一页 |
| TC | 上一頁 |
| EN | Previous |
| JP | 前へ |
| KR | 이전 |
| RU | Назад |
| MX | Anterior |
| BR | Anterior |
| DE | Zurück |
| FR | Précédent |
| VN | Trang trước |
| TH | ก่อนหน้า |
| ID | Sebelumnya |
| IT | Precedente |

#### search.next

| Locale | Translation |
|--------|-------------|
| CN | 下一页 |
| TC | 下一頁 |
| EN | Next |
| JP | 次へ |
| KR | 다음 |
| RU | Далее |
| MX | Siguiente |
| BR | Próximo |
| DE | Weiter |
| FR | Suivant |
| VN | Trang sau |
| TH | ถัดไป |
| ID | Berikutnya |
| IT | Successivo |

#### search.searchMore

| Locale | Translation |
|--------|-------------|
| CN | 搜索更多 |
| TC | 搜索更多 |
| EN | Search More |
| JP | さらに検索 |
| KR | 더 검색하기 |
| RU | Искать больше |
| MX | Buscar más |
| BR | Buscar mais |
| DE | Mehr suchen |
| FR | Rechercher plus |
| VN | Tìm kiếm thêm |
| TH | ค้นหาเพิ่มเติม |
| ID | Cari lebih banyak |
| IT | Cerca altro |

#### item.explain

| Locale | Translation |
|--------|-------------|
| CN | 道具说明 |
| TC | 道具說明 |
| EN | Item Explanation |
| JP | アイテム説明 |
| KR | 아이템 설명 |
| RU | Пояснение предмета |
| MX | Explicación del objeto |
| BR | Explicação do item |
| DE | Gegenstandsbeschreibung |
| FR | Explication de l'objet |
| VN | Giải thích vật phẩm |
| TH | คำอธิบายไอเทม |
| ID | Penjelasan item |
| IT | Spiegazione oggetto |

#### diff.skillId

| Locale | Translation |
|--------|-------------|
| CN | 技能 ID |
| TC | 技能 ID |
| EN | Skill ID |
| JP | スキルID |
| KR | 스킬 ID |
| RU | ID навыка |
| MX | ID de habilidad |
| BR | ID da habilidade |
| DE | Fähigkeits-ID |
| FR | ID de compétence |
| VN | ID kỹ năng |
| TH | ID ทักษะ |
| ID | ID keterampilan |
| IT | ID abilità |

#### weapon.sortByRarity

| Locale | Translation |
|--------|-------------|
| CN | 稀有度 |
| TC | 稀有度 |
| EN | Rarity |
| JP | レアリティ |
| KR | 희귀도 |
| RU | Редкость |
| MX | Rareza |
| BR | Raridade |
| DE | Seltenheit |
| FR | Rareté |
| VN | Độ hiếm |
| TH | ความหายาก |
| ID | Kelangkaan |
| IT | Rarità |

## 步骤 7：重新生成 14 语言字典

```bash
node scripts/generate-i18n-dicts.ts
```

预期输出：
- `src/i18n/dicts/{CN,TC,EN,JP,KR,RU,MX,BR,DE,FR,VN,TH,ID,IT}.json` 均包含新增 key
- `src/i18n/index.tsx` 的 import 列表不变（仍为 14 个 locale）

## 步骤 8：新增 i18n 一致性校验脚本

**文件：`scripts/verify-i18n.ts`**

功能：
1. 扫描 `src/**/*.tsx` 中所有 `t('...')` 调用（忽略 `.test.` 文件与测试目录）。
2. 扫描 `scripts/generate-i18n-dicts.ts` 的 `OFFICIAL_IDS` + `CUSTOM`。
3. 报出「代码使用但生成脚本未定义」的 key（error，退出码非 0）。
4. 报出「生成脚本定义但代码未使用」的 key（warning）。
5. 检查每个 `CUSTOM` key 是否 14 个语言都有非空值（error）。

**文件：`package.json`**

新增脚本并接入 lint/build：

```json
{
  "scripts": {
    "verify:i18n": "node scripts/verify-i18n.ts",
    "lint": "oxlint && npm run verify:i18n",
    "build": "npm run verify:i18n && tsc -b && vite build"
  }
}
```

## 步骤 9：更新开发流程文档

### 9.1 `AGENTS.md`

在「Agents Guide」末尾新增「i18n 添加流程」小节：

```markdown
### i18n 添加流程

所有 UI 文案必须通过 `scripts/generate-i18n-dicts.ts` 生成，禁止直接修改 `src/i18n/dicts/*.json`。

1. **确定文本**：在代码中使用 `t('namespace.key')` 确定 key。
2. **逐语言翻译**：
   - 若是游戏已有官方文案，在 `scripts/generate-i18n-dicts.ts` 的 `OFFICIAL_IDS` 中新增 `key → id` 映射。
   - 若是站点自定义文案，在 `CUSTOM` 中新增 key。
   - 每个 `CUSTOM` key 必须提供全部 14 个语言（CN/TC/EN/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT）的本土翻译，**不允许使用任何语言占位、不允许留空、不允许直接复制中文**。
3. **重新生成**：运行 `node scripts/generate-i18n-dicts.ts`。
4. **校验**：运行 `npm run lint && npm run test && npm run build`。
```

### 9.2 `docs/engineering/references/i18n-spec.md`

更新「添加或修改翻译」小节：
- 强调不允许直接编辑 `src/i18n/dicts/*.json`
- 指向 `AGENTS.md` 的流程说明

## 步骤 10：补充测试

### 10.1 单元测试

**新建 `src/lib/__tests__/cache.test.ts`**
- `initCache` 单例：多次调用返回同一 promise，不重复请求 `/version`。
- `getCachedData` 在版本未就绪时会先等待 `initCache`。
- 版本变化时清空内存与 IndexedDB 缓存。
- `cacheKey` 使用显式前缀，不出现 `null:`。

**更新 `src/i18n/index.test.ts`**
- 新增 key 在所有 14 locale 都能取到非 key 值。
- `search.resultCount` 变量插值正确。
- `nav.search` 在 MX/TH 等小语种不再显示中文。

### 10.2 组件测试

**更新 `src/components/Layout/Sidebar.test.tsx`**
- 切换语言后 `nav.search` 显示目标语言。
- 语言下拉包含全部 14 个 locale。

**更新 `src/components/Search/ArchiveSearchResults.test.tsx`**
- `search.resultCount` 显示本地化计数文案。
- `search.prev` / `search.next` 分页按钮本地化。

### 10.3 E2E 测试

**更新 `tests/e2e/src/archive-search.spec.ts`**
- 切换语言后搜索页标题、占位符、结果计数显示对应语言。
- 切换语言后 `/archive/races/:id` 或 `/archive/factions/:id` 标题与成员名跟随变化。

**更新 `tests/e2e/src/navigation.spec.ts`**
- 侧边栏「档案搜索」在切换语言后显示目标语言。

## 步骤 11：全量验证

```bash
node scripts/generate-i18n-dicts.ts
npm run verify:i18n
npm run lint
npm run test
npm run build
```

## 交付物

1. `feat/i18n-cache-optimization` 分支
2. 代码改动：
   - `src/lib/cache.ts`
   - `src/lib/api.ts`
   - `src/hooks/useData.ts`
   - `scripts/generate-i18n-dicts.ts`
   - `scripts/verify-i18n.ts`
   - `package.json`
   - `src/i18n/dicts/*.json`（重新生成）
   - `src/i18n/index.tsx`（重新生成）
3. 文档改动：
   - `AGENTS.md`
   - `docs/engineering/references/i18n-spec.md`
4. 测试改动：
   - `src/lib/__tests__/cache.test.ts`
   - `src/i18n/index.test.ts`
   - `src/components/Layout/Sidebar.test.tsx`
   - `src/components/Search/ArchiveSearchResults.test.tsx`
   - `tests/e2e/src/archive-search.spec.ts`
   - `tests/e2e/src/navigation.spec.ts`

## 验收标准

- [ ] `node scripts/generate-i18n-dicts.ts` 可重复执行且不丢失任何 key。
- [ ] `npm run verify:i18n` 通过，无 error。
- [ ] `npm run lint && npm run test && npm run build` 全部通过。
- [ ] IndexedDB 中不存在 `null:` 前缀 key。
- [ ] 语言切换时页面展示骨架屏，不再显示旧语言数据。
- [ ] `/archive/races/:id` 与 `/archive/factions/:id` 切换语言后标题与成员名跟随变化。
- [ ] 导航栏「档案搜索」与搜索页「找到 32 条相关记载」在 14 个语言下均正确显示。
- [ ] `AGENTS.md` 已写入 i18n 添加流程。
