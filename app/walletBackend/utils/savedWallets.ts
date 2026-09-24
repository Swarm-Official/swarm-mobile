import RPCModule from '@app/RPCModule';
import { errorKeyed } from '@app/AppState';
import { callFfi } from '@app/walletBackend/ffi';

export type SavedWallet = { id: string; number: number; active: boolean };

export async function savedWallets() {
  const response = await callFfi(RPCModule.savedWallets());
  if (!response.ok) return errorKeyed('wallets.read-error');
  try {
    const wallets: unknown = JSON.parse(response.value);
    if (!Array.isArray(wallets) || !wallets.every(isSavedWallet)) {
      return errorKeyed('wallets.read-error');
    }
    return { kind: 'wallets' as const, wallets };
  } catch {
    return errorKeyed('wallets.read-error');
  }
}

function isSavedWallet(wallet: unknown): wallet is SavedWallet {
  return (
    typeof wallet === 'object' &&
    !!wallet &&
    'id' in wallet &&
    typeof wallet.id === 'string' &&
    'number' in wallet &&
    typeof wallet.number === 'number' &&
    'active' in wallet &&
    typeof wallet.active === 'boolean'
  );
}

export async function selectWallet(id: string) {
  const paused = await callFfi(RPCModule.pauseSyncProcess());
  if (!paused.ok) return errorKeyed('wallets.switch-error');
  return openSavedWallet(id);
}

export async function openSavedWallet(id: string) {
  const selected = await callFfi(RPCModule.selectWallet(id));
  return selected.ok
    ? { kind: 'selected' as const }
    : errorKeyed('wallets.switch-error');
}
