export enum BlockExplorerEnum {
  // The single SWARM block explorer. SwarmTestnet is not indexed by any Zcash
  // explorer, so the upstream Zcashexplorer / Cipherscan / Zexplorer options
  // are gone — they could only ever produce dead links here.
  Swarmexplorer = 'Swarmexplorer',
  None = 'None',
}
