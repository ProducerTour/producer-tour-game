// Web3 hooks for wallet and NFT interactions
import { useAccount, useConnect, useDisconnect, useSignMessage, useReadContracts } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { erc721Abi } from 'viem';

// Hook to check wallet connection
export function useWallet() {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isPending,
    chainId: chain?.id,
    chainName: chain?.name,
    connectors,
    connect,
    disconnect,
    error: connectError,
  };
}

// Hook for signing messages (used for auth)
export function useWalletAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const signAuthMessage = async (nonce: string): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const message = `Sign this message to authenticate with Producer Tour.\n\nNonce: ${nonce}`;
    return signMessageAsync({ message });
  };

  return { signAuthMessage };
}

// NFT ownership types
export interface OwnedNFT {
  contractAddress: string;
  tokenId: bigint;
  tokenUri?: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    model?: string; // 3D model URL
    attributes?: { trait_type: string; value: string | number }[];
  };
}

// Hook to fetch owned NFTs from a specific collection
export function useOwnedNFTs(
  contractAddress: `0x${string}` | undefined,
  tokenIds: bigint[]
) {
  const { address } = useAccount();

  const contracts = tokenIds.map((tokenId) => ({
    address: contractAddress!,
    abi: erc721Abi,
    functionName: 'ownerOf' as const,
    args: [tokenId],
  }));

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contractAddress ? contracts : [],
    query: {
      enabled: !!contractAddress && !!address && tokenIds.length > 0,
    },
  });

  const ownedTokenIds: bigint[] = [];
  if (data && address) {
    data.forEach((result, index) => {
      if (result.result && (result.result as string).toLowerCase() === address.toLowerCase()) {
        ownedTokenIds.push(tokenIds[index]);
      }
    });
  }

  return {
    ownedTokenIds,
    isLoading,
    error,
    refetch,
  };
}

// Hook to fetch all game assets owned by the user
export function useOwnedGameAssets() {
  const { address, chainId } = useAccount();

  return useQuery({
    queryKey: ['owned-game-assets', address, chainId],
    queryFn: async (): Promise<OwnedNFT[]> => {
      if (!address || !chainId) return [];

      // In production, this would query an indexer like The Graph or Alchemy
      // For now, return mock data
      const response = await fetch(`/api/assets/owned?wallet=${address}&chain=${chainId}`);
      if (!response.ok) return [];

      const assets = await response.json();
      return assets.map((asset: any) => ({
        contractAddress: asset.contract,
        tokenId: BigInt(asset.tokenId),
        tokenUri: asset.tokenUri,
        metadata: asset.metadata,
      }));
    },
    enabled: !!address && !!chainId,
    staleTime: 60 * 1000, // 1 minute cache
  });
}

// Hook to check if user owns a specific NFT (for token gating)
export function useHasNFT(
  contractAddress: `0x${string}` | undefined,
  tokenId?: bigint
) {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContracts({
    contracts: contractAddress && tokenId !== undefined
      ? [
          {
            address: contractAddress,
            abi: erc721Abi,
            functionName: 'ownerOf',
            args: [tokenId],
          },
        ]
      : [],
    query: {
      enabled: !!contractAddress && !!address && tokenId !== undefined,
    },
  });

  const hasNFT =
    data?.[0]?.result &&
    (data[0].result as string).toLowerCase() === address?.toLowerCase();

  return { hasNFT: !!hasNFT, isLoading, error };
}

// Hook to check if user owns any NFT from a collection
export function useHasCollectionNFT(contractAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContracts({
    contracts: contractAddress
      ? [
          {
            address: contractAddress,
            abi: erc721Abi,
            functionName: 'balanceOf',
            args: [address!],
          },
        ]
      : [],
    query: {
      enabled: !!contractAddress && !!address,
    },
  });

  const balance = data?.[0]?.result as bigint | undefined;
  const hasNFT = balance !== undefined && balance > 0n;

  return { hasNFT, balance, isLoading, error };
}

// Resolve IPFS URLs to HTTP gateway
export function resolveIPFS(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/');
  }
  return url;
}
