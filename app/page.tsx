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
import type { Abi, Hex } from 'viem';
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
  const [flipResult, setFlipResult] = useState<{ won: boolean; message: string } | null>(null);
  const [isWaitingForVRF, setIsWaitingForVRF] = useState(false);
  
  const COINFLIP_ADDRESS = "0xf8bb05ab1abb47db42d1e77dea609fe2ac2fb828" as `0x${string}`;

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
      
      // Écouter l'événement CoinFlipResult
      const watchForResult = async () => {
        console.log('Waiting for VRF callback...');
        
        // Récupérer le numéro de bloc de la transaction
        const fromBlock = receipt.blockNumber;
        
        // Polling pour détecter l'événement CoinFlipResult
        const checkInterval = setInterval(async () => {
          try {
            const logs = await publicClient.getLogs({
              address: COINFLIP_ADDRESS,
              event: {
                type: 'event',
                name: 'CoinFlipResult',
                inputs: [
                  { type: 'uint256', name: 'requestId', indexed: false },
                  { type: 'bool', name: 'didWin', indexed: false },
                  { type: 'uint256', name: 'randomValue', indexed: false },
                ],
              },
              fromBlock: fromBlock,
              toBlock: 'latest',
            });
            
            if (logs.length > 0) {
              clearInterval(checkInterval);
              const log = logs[0];
              const { didWin } = log.args as { didWin: boolean };
              
              setIsWaitingForVRF(false);
              setFlipResult({
                won: didWin,
                message: didWin 
                  ? `🎉 Gagné! Vous avez reçu ${parseFloat(betAmount) * 2} ETH!` 
                  : `😢 Perdu! Meilleure chance la prochaine fois.`,
              });
              
              console.log('VRF Result:', didWin ? 'WON' : 'LOST');
            }
          } catch (error) {
            console.error('Error checking for VRF result:', error);
          }
        }, 3000); // Vérifier toutes les 3 secondes
        
        // Arrêter après 2 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (isWaitingForVRF) {
            setIsWaitingForVRF(false);
            setFlipResult({
              won: false,
              message: '⏱️ Délai d\'attente dépassé. Vérifiez votre wallet pour le résultat.',
            });
          }
        }, 120000);
      };
      
      watchForResult();
    }
  };

  // Recalculer les calls à chaque changement de betAmount ou choice
  const calls = useMemo(() => {
    const ethValue = parseEther(betAmount || '0');
    
    // Encoder les données de la fonction
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
  }, [betAmount, choice]);

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

          {/* Résultat */}
          {flipResult && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: flipResult.won ? '#d4edda' : '#f8d7da',
              border: `1px solid ${flipResult.won ? '#28a745' : '#dc3545'}`,
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
            }}>
              {flipResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}