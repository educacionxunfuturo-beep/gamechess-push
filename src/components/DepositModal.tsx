import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Copy, Check, Loader2, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { parseEther, BrowserProvider } from 'ethers';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Platform wallet address for deposits (should be the same across all users)
const PLATFORM_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f1bA3c';

const DepositModal = ({ isOpen, onClose }: DepositModalProps) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { user, profile, refreshProfile } = useAuth();
  const { isConnected, address, balance, isBSC, switchToBSC } = useWallet();

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PLATFORM_WALLET);
    setCopied(true);
    toast.success('Dirección copiada');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async () => {
    if (!isConnected || !address || !user) {
      toast.error('Conecta tu wallet primero');
      return;
    }

    if (!isBSC) {
      const switched = await switchToBSC(true);
      if (!switched) {
        toast.error('Debes estar en BSC para depositar');
        return;
      }
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    if (parseFloat(balance || '0') < depositAmount) {
      toast.error('Balance insuficiente en tu wallet');
      return;
    }

    setIsLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Send BNB to platform wallet
      const tx = await signer.sendTransaction({
        to: PLATFORM_WALLET,
        value: parseEther(amount),
      });

      toast.loading('Procesando depósito...', { id: 'deposit' });
      
      await tx.wait();

      // Record transaction in database
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: depositAmount,
        tx_hash: tx.hash,
        wallet_address: address,
        status: 'confirmed',
      });

      if (txError) throw txError;

      // Update profile balance
      const newBalance = (profile?.balance || 0) + depositAmount;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          balance: newBalance,
          total_deposited: (profile?.total_deposited || 0) + depositAmount,
          wallet_address: address
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      
      toast.success('¡Depósito exitoso!', { 
        id: 'deposit',
        description: `${depositAmount} BNB añadidos a tu cuenta`
      });
      
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error('Error al depositar', { 
        id: 'deposit',
        description: error.message || 'Intenta nuevamente'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [0.01, 0.05, 0.1, 0.5];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center">
                <ArrowDown className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Depositar BNB</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!isConnected ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Conecta tu wallet para depositar
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current balance info */}
              <div className="glass-card p-4 bg-primary/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Balance en app:</span>
                  <span className="font-bold text-primary">{profile?.balance?.toFixed(4) || '0.0000'} BNB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Balance en wallet:</span>
                  <span className="font-mono text-sm">{parseFloat(balance || '0').toFixed(4)} BNB</span>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Monto a depositar</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16 text-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    BNB
                  </span>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAmount(quickAmount.toString())}
                  >
                    {quickAmount}
                  </Button>
                ))}
              </div>

              {!isBSC && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning">
                    ⚠️ Debes cambiar a BSC Testnet para depositar
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => switchToBSC(true)}
                  >
                    Cambiar a BSC
                  </Button>
                </div>
              )}

              <Button
                className="w-full h-12"
                onClick={handleDeposit}
                disabled={isLoading || !amount || !isBSC}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Depositar {amount || '0'} BNB
              </Button>

              {/* Manual deposit info */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  O envía BNB manualmente a esta dirección:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs truncate">
                    {PLATFORM_WALLET}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopyAddress}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DepositModal;
