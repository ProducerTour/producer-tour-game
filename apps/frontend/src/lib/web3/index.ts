// Web3 module exports
export { wagmiConfig, supportedChains, contractAddresses, getContractAddress } from './config';
export { WalletProvider } from './WalletProvider';
export {
  useWallet,
  useWalletAuth,
  useOwnedNFTs,
  useOwnedGameAssets,
  useHasNFT,
  useHasCollectionNFT,
  resolveIPFS,
} from './hooks';
export type { OwnedNFT } from './hooks';
export { TokenGate, TokenGate3D } from './TokenGate';
