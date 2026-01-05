import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Clock, Swords, AlertTriangle, ExternalLink, Wallet, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CreateGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGame?: (stake: number, currency: string, timeControl: string, gameId?: string) => void;
}

type PaymentMethod = 'balance' | 'wallet';

const CreateGameModal = ({ open, onOpenChange, onCreateGame }: CreateGameModalProps) => {
  const [stake, setStake] = useState('0.01');
  const [timeControl, setTimeControl] = useState('10+0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance');
  const [isCreating, setIsCreating] = useState(false);
  
  const { isConnected: isWalletConnected, isBSC, switchToBSC, chainId, getCurrencySymbol } = useWallet();
  const { createGame, isLoading, isContractDeployed } = useContract();
  const { isAuthenticated, profile, user, refreshProfile } = useAuth();

  const isConnected = isWalletConnected || isAuthenticated;
  const currency = getCurrencySymbol(chainId);
  const hasEnoughBalance = profile && parseFloat(stake) <= profile.balance;

  const handleSwitchNetwork = async () => {
    const success = await switchToBSC(true);
    if (success) {
      toast.success('Cambiado a BSC Testnet');
    }
  };

  const getTimeControlSeconds = (tc: string): number => {
    const minutes = parseInt(tc.split('+')[0]);
    return minutes * 60;
  };

  const handleCreate = async () => {
    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      toast.error('Por favor ingresa una cantidad válida');
      return;
    }

    if (!isConnected) {
      toast.error('Conecta tu cuenta primero');
      return;
    }

    setIsCreating(true);

    try {
      if (paymentMethod === 'balance') {
        // Pay from internal balance
        if (!user || !profile) {
          toast.error('Debes iniciar sesión');
          return;
        }

        if (stakeAmount > profile.balance) {
          toast.error('Balance insuficiente', {
            description: 'Recarga tu wallet desde tu perfil',
          });
          return;
        }

        // Create game in database
        const { data: game, error: gameError } = await supabase
          .from('games')
          .insert({
            creator_id: user.id,
            stake_amount: stakeAmount,
            time_control: getTimeControlSeconds(timeControl),
            status: 'waiting',
            is_smart_contract: false,
            creator_paid: true,
          })
          .select()
          .single();

        if (gameError) throw gameError;

        // Deduct from balance
        const newBalance = profile.balance - stakeAmount;
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', user.id);

        if (balanceError) throw balanceError;

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'game_stake',
          amount: stakeAmount,
          status: 'confirmed',
        });

        await refreshProfile();
        
        onCreateGame?.(stakeAmount, 'BNB', timeControl, game.id);
        toast.success('¡Partida creada!', {
          description: 'Esperando oponente...',
        });
        onOpenChange(false);

      } else {
        // Pay with wallet (smart contract)
        if (!isWalletConnected) {
          toast.error('Conecta tu wallet');
          return;
        }

        if (!isBSC) {
          toast.error('Cambia a BSC primero');
          return;
        }

        if (isContractDeployed) {
          const result = await createGame(stake);
          if (result) {
            // Also create in database for tracking
            if (user) {
              await supabase.from('games').insert({
                creator_id: user.id,
                stake_amount: stakeAmount,
                time_control: getTimeControlSeconds(timeControl),
                status: 'waiting',
                is_smart_contract: true,
                contract_game_id: result.gameId,
                creator_paid: true,
              });
            }
            
            onCreateGame?.(stakeAmount, 'BNB', timeControl, result.gameId);
            onOpenChange(false);
          }
        } else {
          toast.error('Smart contract no desplegado');
        }
      }
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error('Error al crear partida', {
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-serif">
            <Swords className="w-6 h-6 text-primary" />
            Crear Nueva Partida
          </DialogTitle>
          <DialogDescription>
            Configura los parámetros de tu partida y la apuesta
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 py-4"
        >
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'balance' ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setPaymentMethod('balance')}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Balance App</span>
                <span className="text-[10px] text-muted-foreground">
                  {profile?.balance?.toFixed(4) || '0.00'} BNB
                </span>
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'wallet' ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setPaymentMethod('wallet')}
                disabled={!isWalletConnected}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-xs">Wallet Crypto</span>
                <span className="text-[10px] text-muted-foreground">
                  {isWalletConnected ? 'Smart Contract' : 'No conectada'}
                </span>
              </Button>
            </div>
          </div>

          {/* Network Warning for wallet payment */}
          {paymentMethod === 'wallet' && isWalletConnected && !isBSC && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">Red incorrecta</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Cambia a BSC para usar el smart contract
                </p>
                <Button size="sm" variant="outline" onClick={handleSwitchNetwork}>
                  Cambiar a BSC
                </Button>
              </div>
            </div>
          )}

          {/* Balance warning */}
          {paymentMethod === 'balance' && !hasEnoughBalance && parseFloat(stake) > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Balance insuficiente</p>
                <p className="text-xs text-muted-foreground">
                  Tienes {profile?.balance?.toFixed(4) || '0'} BNB. Recarga desde tu perfil.
                </p>
              </div>
            </div>
          )}

          {/* Contract Status for wallet */}
          {paymentMethod === 'wallet' && isWalletConnected && isBSC && (
            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              isContractDeployed 
                ? 'bg-success/10 text-success' 
                : 'bg-muted text-muted-foreground'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isContractDeployed ? 'bg-success' : 'bg-muted-foreground'}`} />
              {isContractDeployed 
                ? 'Smart Contract conectado' 
                : 'Contrato no desplegado'
              }
            </div>
          )}

          {/* Stake Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Cantidad a apostar
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0.01"
                step="0.001"
                min="0"
                className="flex-1 bg-secondary border-border"
              />
              <div className="flex items-center justify-center px-4 bg-secondary border border-border rounded-md text-sm font-medium">
                BNB
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              El ganador recibirá el 97.5% del total (2.5% fee del protocolo)
            </p>
          </div>

          {/* Time Control */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Control de tiempo
            </Label>
            <Select value={timeControl} onValueChange={setTimeControl}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1+0">Bullet 1 min</SelectItem>
                <SelectItem value="3+0">Blitz 3 min</SelectItem>
                <SelectItem value="5+0">Blitz 5 min</SelectItem>
                <SelectItem value="10+0">Rápida 10 min</SelectItem>
                <SelectItem value="15+10">Rápida 15+10</SelectItem>
                <SelectItem value="30+0">Clásica 30 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="glass-card p-4 space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Resumen</h4>
            <div className="flex justify-between text-sm">
              <span>Tu apuesta:</span>
              <span className="font-semibold text-primary">
                {stake} BNB
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Posible ganancia:</span>
              <span className="font-semibold text-success">
                {(parseFloat(stake || '0') * 1.95).toFixed(4)} BNB
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Método:</span>
              <span className="font-mono">
                {paymentMethod === 'balance' ? 'Balance App' : 'Smart Contract'}
              </span>
            </div>
          </div>

          <Button 
            onClick={handleCreate} 
            className="w-full btn-primary-glow bg-primary"
            disabled={
              isLoading || 
              isCreating || 
              !isConnected || 
              (paymentMethod === 'balance' && !hasEnoughBalance) ||
              (paymentMethod === 'wallet' && (!isWalletConnected || !isBSC || !isContractDeployed))
            }
          >
            {isLoading || isCreating ? 'Procesando...' : 'Crear Partida'}
          </Button>

          {paymentMethod === 'wallet' && isBSC && isContractDeployed && (
            <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
              <ExternalLink className="w-3 h-3" />
              La transacción se ejecutará en BSC
            </p>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGameModal;
