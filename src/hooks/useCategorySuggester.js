import { useMemo } from 'react'
import { useStore } from '../store/StoreProvider.jsx'
import { buildCategoryModel, suggestCategory } from '../utils/categorySuggest.js'

/**
 * View-model for category suggestion. Builds the frequency model from the
 * (persisted) expense list and exposes a stable `suggest(note)` plus the
 * last-used category for the no-match fallback.
 */
export function useCategorySuggester() {
  const { state } = useStore()

  return useMemo(() => {
    const model = buildCategoryModel(state.expenses)
    return {
      suggest: (note) => suggestCategory(model, note),
      lastCategoryId: model.lastCategoryId,
    }
  }, [state.expenses])
}
