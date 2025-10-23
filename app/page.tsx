"use client";
import { useEffect, useState } from "react";
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
import type { Abi, ContractFunctionParameters } from 'viem';
import { parseEther } from 'viem';

import counterAbi from './counter-abi.json';

export default function Home() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const [betAmount, setBetAmount] = useState('0.001');
  const [choice, setChoice] = useState(true);
  
  const COINFLIP_ADDRESS = "0x3bBBef8659b808765a6A66118D60c2732471E3D7" as `0x${string}`;

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  const handleOnStatus = (status: LifecycleStatus) => {
    console.log('Transaction status:', status);
  };

  // Debug log
  const ethValue = parseEther(betAmount || '0');
  console.log('Bet amount:', betAmount);
  console.log('Parsed value (wei):', ethValue.toString());

  const calls = [
    {
      address: COINFLIP_ADDRESS,
      abi: counterAbi.abi as Abi,
      functionName: 'flipCoin',
      args: [choice],
      value: ethValue,
    }
  ];

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

          {/* PARTIE CORRIGÉE */}
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
        </div>
      </div>
    </div>
  );
}