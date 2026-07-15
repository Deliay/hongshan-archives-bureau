import { registerTableDiffComponent } from './registry'
import CharacterDiff from './CharacterDiff'
import WeaponDiff from './WeaponDiff'

registerTableDiffComponent('CharacterTable', CharacterDiff)
registerTableDiffComponent('WeaponBasicTable', WeaponDiff)
