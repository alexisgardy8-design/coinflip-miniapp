"use client";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { 
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";
import type { LifecycleStatus } from "@coinbase/onchainkit/transaction";
import styles from "./page.module.css";
import type { Abi, Hex, Log } from 'viem';
import { parseEther, encodeFunctionData, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

import counterAbi from './counter-abi.json';

// Client public pour lire les événements
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export default function Home() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const [betAmount, setBetAmount] = useState('0.001');
  const [choice, setChoice] = useState(true);
  const [flipResult, setFlipResult] = useState<{ won: boolean; winAmount: number } | null>(null);
  const [isWaitingForVRF, setIsWaitingForVRF] = useState(false);
  
  const COINFLIP_ADDRESS = "0xc0c7fa70Ed28fbb3AcF07a5BBc8c2A297F0e8292" as `0x${string}`;

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  const handleOnStatus = (status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    if (status.statusName === 'success' && status.statusData?.transactionReceipts?.[0]) {
      const receipt = status.statusData.transactionReceipts[0];
      console.log('Transaction successful:', receipt.transactionHash);
      
      // Réinitialiser l'état précédent
      setFlipResult(null);
      setIsWaitingForVRF(true);
      
      // Écouter l'événement CoinFlipResult en temps réel
      const watchForResult = async () => {
        console.log('Watching for VRF callback...');
        
        // Utiliser watchContractEvent pour écouter en temps réel
        const unwatch = publicClient.watchContractEvent({
          address: COINFLIP_ADDRESS,
          abi: counterAbi.abi as Abi,
          eventName: 'CoinFlipResult',
          onLogs: (logs) => {
            console.log('CoinFlipResult event received:', logs);
            
            if (logs.length > 0) {
              // Typage explicite pour les logs d'événements
              type CoinFlipResultLog = Log & {
                args: {
                  requestId: bigint;
                  didWin: boolean;
                  randomValue: bigint;
                };
              };
              
              const didWin = (logs[0] as CoinFlipResultLog).args.didWin;
              
              setIsWaitingForVRF(false);
              setFlipResult({
                won: didWin,
                winAmount: parseFloat(betAmount) * 2,
              });
              
              console.log('VRF Result:', didWin ? 'WON' : 'LOST');
              unwatch(); // Arrêter l'écoute
            }
          },
          pollingInterval: 1000, // Vérifier chaque seconde
        });
        
        // Timeout de sécurité après 3 minutes
        setTimeout(() => {
          console.log('Timeout reached, stopping watch');
          unwatch();
          if (isWaitingForVRF) {
            setIsWaitingForVRF(false);
            setFlipResult({
              won: false,
              winAmount: 0,
            });
          }
        }, 180000);
      };
      
      watchForResult();
    }
  };

  // Recalculer les calls à chaque changement de betAmount ou choice
  const calls = useMemo(() => {
    // Si on a un résultat et qu'on a gagné, préparer un appel à claimWinnings
    if (flipResult && flipResult.won) {
      const claimData: Hex = encodeFunctionData({
        abi: counterAbi.abi as Abi,
        functionName: 'claimWinnings',
        args: [],
      });
      
      return [
        {
          to: COINFLIP_ADDRESS,
          data: claimData,
          value: BigInt(0),
        }
      ];
    }
    
    // Sinon, préparer un appel à flipCoin
    const ethValue = parseEther(betAmount || '0');
    
    const callData: Hex = encodeFunctionData({
      abi: counterAbi.abi as Abi,
      functionName: 'flipCoin',
      args: [choice],
    });
    
    console.log('Creating transaction with:');
    console.log('Bet amount:', betAmount, 'ETH');
    console.log('Value in wei:', ethValue.toString());
    console.log('Choice:', choice ? 'Pile' : 'Face');
    
    return [
      {
        to: COINFLIP_ADDRESS,
        data: callData,
        value: ethValue,
      }
    ];
  }, [betAmount, choice, flipResult]);

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <Wallet />
      </header>

      <div className={styles.content}>
        <Image
          priority
          src="/sphere.svg"
          alt="Sphere"
          width={200}
          height={200}
        />
        <h1 className={styles.title}>CoinFlip Game</h1>

        <div style={{ 
          margin: '30px 0', 
          padding: '20px', 
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          backgroundColor: '#fafafa',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>🎯 Lancer un Flip</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Mise (ETH): </label>
            <input 
              type="text" 
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Choix: </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setChoice(true)}
                style={{ 
                  flex: 1,
                  padding: '10px',
                  backgroundColor: choice ? '#0070f3' : '#f0f0f0',
                  color: choice ? 'white' : 'black',
                  border: '1px solid #ccc',
                  borderRadius: '6px'
                }}
              >
                🪙 Pile
              </button>
              <button 
                onClick={() => setChoice(false)}
                style={{ 
                  flex: 1,
                  padding: '10px',
                  backgroundColor: !choice ? '#0070f3' : '#f0f0f0',
                  color: !choice ? 'white' : 'black',
                  border: '1px solid #ccc',
                  borderRadius: '6px'
                }}
              >
                🪙 Face
              </button>
            </div>
          </div>

          {/* Transaction */}
          {!flipResult ? (
            <Transaction
              calls={calls}
              onStatus={handleOnStatus}
            >
              <TransactionButton 
                className={styles.transactionButton}
                text="🎲 Lancer le Flip!"
              />
              <TransactionSponsor />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          ) : flipResult.won ? (
            <Transaction
              calls={calls}
              onStatus={(status) => {
                console.log('Claim status:', status);
                if (status.statusName === 'success') {
                  // Réinitialiser après réclamation
                  setFlipResult(null);
                }
              }}
            >
              <TransactionButton 
                className={styles.transactionButton}
                text={`💰 Claim ${flipResult.winAmount} ETH`}
              />
              <TransactionSponsor />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          ) : (
            <div style={{
              padding: '15px',
              backgroundColor: '#f8d7da',
              border: '1px solid #dc3545',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#721c24',
            }}>
              😢 You Lost! Better luck next time.
              <button
                onClick={() => setFlipResult(null)}
                style={{
                  marginTop: '10px',
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🎲 Try Again
              </button>
            </div>
          )}

          {/* Statut VRF */}
          {isWaitingForVRF && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div>⏳ En attente du tirage VRF...</div>
              <div style={{ fontSize: '12px', marginTop: '5px', color: '#856404' }}>
                Cela peut prendre 30-60 secondes
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}