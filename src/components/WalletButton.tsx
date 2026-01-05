import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ChevronDown, Copy, ExternalLink, RefreshCw, AlertTriangle, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import ConnectModal from './ConnectModal';
import { useNavigate } from 'react-router-dom';

const WalletButton = () => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const navigate = useNavigate();
  
  const {
    isConnected: isWalletConnected,
    isConnecting,
    address,
    balance,
    chainId,
    isBSC,
    disconnect: disconnectWallet,
    refreshBalance,
    switchToBSC,
    getNetworkName,
    getCurrencySymbol,
  } = useWallet();

  const { isAuthenticated, profile, signOut } = useAuth();

  const isConnected = isWalletConnected || isAuthenticated;

  const handleDisconnect = async () => {
    if (isWalletConnected) {
      disconnectWallet();
    }
    if (isAuthenticated) {
      await signOut();
    }
    toast.info('Desconectado');
  };

  const handleSwitchToBSC = async () => {
    const success = await switchToBSC(true);
    if (success) {
      toast.success('Cambiado a BSC Testnet');
    } else {
      toast.error('Error al cambiar de red');
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Dirección copiada');
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string | number | null) => {
    if (bal === null || bal === undefined) return '0.00';
    const num = typeof bal === 'string' ? parseFloat(bal) : bal;
    return num.toFixed(4);
  };

  const getExplorerUrl = () => {
    if (chainId === 56) return `https://bscscan.com/address/${address}`;
    if (chainId === 97) return `https://testnet.bscscan.com/address/${address}`;
    return `https://etherscan.io/address/${address}`;
  };

  // Get display info based on auth type
  const getDisplayInfo = () => {
    if (isWalletConnected && address) {
      return {
        name: formatAddress(address),
        balance: formatBalance(balance),
        currency: getCurrencySymbol(chainId),
        showNetwork: true,
      };
    }
    if (isAuthenticated && profile) {
      return {
        name: profile.display_name || profile.email?.split('@')[0] || 'Usuario',
        balance: formatBalance(profile.balance),
        currency: 'BNB',
        showNetwork: false,
      };
    }
    return null;
  };

  const displayInfo = getDisplayInfo();

  if (!isConnected) {
    return (
      <>
        <Button
          onClick={() => setShowConnectModal(true)}
          disabled={isConnecting}
          className="btn-primary-glow bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? 'Conectando...' : 'Conectar'}
        </Button>
        <ConnectModal 
          isOpen={showConnectModal} 
          onClose={() => setShowConnectModal(false)} 
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-primary/50 hover:border-primary gap-2">
            {displayInfo?.showNetwork && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-2 h-2 rounded-full ${isBSC ? 'bg-success' : 'bg-warning'}`}
              />
            )}
            {!displayInfo?.showNetwork && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <div className="flex flex-col items-start text-left">
              <span className="font-mono text-xs">{displayInfo?.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {displayInfo?.balance} {displayInfo?.currency}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground mb-1">Balance en GameBet</p>
            <p className="font-mono font-semibold">
              {displayInfo?.balance} {displayInfo?.currency}
            </p>
            {isWalletConnected && (
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isBSC ? 'bg-success' : 'bg-warning'}`} />
                <p className="text-xs text-muted-foreground">
                  {getNetworkName(chainId)}
                </p>
              </div>
            )}
          </div>
          
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Mi Perfil
          </DropdownMenuItem>
          
          {isWalletConnected && !isBSC && (
            <DropdownMenuItem onClick={handleSwitchToBSC} className="text-warning">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Cambiar a BSC
            </DropdownMenuItem>
          )}
          
          {isWalletConnected && address && (
            <>
              <DropdownMenuItem onClick={copyAddress}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar dirección
              </DropdownMenuItem>
              <DropdownMenuItem onClick={refreshBalance}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar balance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(getExplorerUrl(), '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver en Explorer
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Desconectar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConnectModal 
        isOpen={showConnectModal} 
        onClose={() => setShowConnectModal(false)} 
      />
    </>
  );
};

export default WalletButton;
