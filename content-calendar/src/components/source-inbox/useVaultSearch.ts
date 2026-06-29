import { useState } from 'react';
import { ingestVault, searchVault, type VaultHit } from '../../vault/vaultClient';

/**
 * Semantic vault search — ranks vault *passages* by meaning (vector search in
 * API mode, lexical fallback locally), plus a re-index action. Search and
 * re-index share one busy/error surface but report results differently (hits
 * vs. a notice), so this keeps its own cohesive state.
 */
export function useVaultSearch() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<VaultHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setHits(await searchVault(q));
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vault search failed.');
    } finally {
      setBusy(false);
    }
  };

  const reindex = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await ingestVault();
      setNotice(
        r.files === 0
          ? 'No vault indexed (point the app at a backend with VAULT_PATH set).'
          : `Re-indexed ${r.files} file(s): ${r.embedded} embedded, ${r.skipped} unchanged.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vault re-index failed.');
    } finally {
      setBusy(false);
    }
  };

  return { query, setQuery, hits, searched, busy, error, notice, search, reindex };
}
