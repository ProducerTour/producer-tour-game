// Token Gate component for restricting access based on NFT ownership
import React from 'react';
import { useHasNFT, useHasCollectionNFT } from './hooks';

interface TokenGateProps {
  children: React.ReactNode;
  contractAddress: `0x${string}`;
  tokenId?: bigint; // If provided, checks specific token; otherwise checks any from collection
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export function TokenGate({
  children,
  contractAddress,
  tokenId,
  fallback,
  loadingFallback,
}: TokenGateProps) {
  // Check specific token or any from collection
  const specificCheck = useHasNFT(contractAddress, tokenId);
  const collectionCheck = useHasCollectionNFT(tokenId === undefined ? contractAddress : undefined);

  const { hasNFT, isLoading } = tokenId !== undefined ? specificCheck : collectionCheck;

  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        )}
      </>
    );
  }

  if (!hasNFT) {
    return (
      <>
        {fallback ?? (
          <AccessDeniedMessage contractAddress={contractAddress} tokenId={tokenId} />
        )}
      </>
    );
  }

  return <>{children}</>;
}

// Default access denied message
function AccessDeniedMessage({
  contractAddress,
  tokenId,
}: {
  contractAddress: string;
  tokenId?: bigint;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded-lg border border-red-500/30">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
      <p className="text-gray-400 text-center max-w-md">
        {tokenId !== undefined
          ? `You need to own NFT #${tokenId.toString()} to access this area.`
          : 'You need to own an NFT from this collection to access this area.'}
      </p>
      <a
        href={`https://opensea.io/collection/${contractAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
      >
        View Collection
      </a>
    </div>
  );
}

// In-world token gate (for 3D environments)
interface TokenGate3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  contractAddress: `0x${string}`;
  tokenId?: bigint;
  children: React.ReactNode;
  lockedContent?: React.ReactNode;
}

export function TokenGate3D({
  position,
  rotation = [0, 0, 0],
  contractAddress,
  tokenId,
  children,
  lockedContent,
}: TokenGate3DProps) {
  const specificCheck = useHasNFT(contractAddress, tokenId);
  const collectionCheck = useHasCollectionNFT(tokenId === undefined ? contractAddress : undefined);

  const { hasNFT } = tokenId !== undefined ? specificCheck : collectionCheck;

  return (
    <group position={position} rotation={rotation as [number, number, number]}>
      {hasNFT ? children : lockedContent}
    </group>
  );
}
