// Wagmi configuration for Web3 wallet connection
import { createConfig, http } from 'wagmi';
import { base, polygon, mainnet } from 'wagmi/chains';
import { coinbaseWallet, metaMask, walletConnect, injected } from 'wagmi/connectors';

// Get WalletConnect project ID from environment
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Supported chains
export const supportedChains = [base, polygon, mainnet] as const;

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({
      appName: 'Producer Tour',
      appLogoUrl: 'https://producer.tour/logo.png',
    }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            metadata: {
              name: 'Producer Tour',
              description: 'Open World Music Game',
              url: 'https://producer.tour',
              icons: ['https://producer.tour/logo.png'],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
    [mainnet.id]: http(),
  },
});

// Contract addresses by chain
export const contractAddresses = {
  // Base
  [base.id]: {
    avatarNFT: '0x...' as `0x${string}`,
    itemNFT: '0x...' as `0x${string}`,
    marketplace: '0x...' as `0x${string}`,
  },
  // Polygon
  [polygon.id]: {
    avatarNFT: '0x...' as `0x${string}`,
    itemNFT: '0x...' as `0x${string}`,
    marketplace: '0x...' as `0x${string}`,
  },
  // Mainnet (optional, for high-value items)
  [mainnet.id]: {
    avatarNFT: '0x...' as `0x${string}`,
    itemNFT: '0x...' as `0x${string}`,
    marketplace: '0x...' as `0x${string}`,
  },
} as const;

// Get contract address for current chain
export function getContractAddress(
  chainId: number,
  contract: 'avatarNFT' | 'itemNFT' | 'marketplace'
): `0x${string}` | undefined {
  const chainContracts = contractAddresses[chainId as keyof typeof contractAddresses];
  return chainContracts?.[contract];
}
