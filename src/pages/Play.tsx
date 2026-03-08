import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, MessageSquare, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import ChessBoard from '@/components/ChessBoard';
import GameTimer from '@/components/GameTimer';
import StakeDisplay from '@/components/StakeDisplay';
import type { PieceColor } from '@/lib/chess';
import { toast } from 'sonner';
import { useContract } from '@/hooks/useContract';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Play = () => {
  const [isGameActive] = useState(true);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [gameResult, setGameResult] = useState<{ winner: PieceColor; reason: string } | null>(null);
  const { withdraw } = useContract();
  const { user, refreshProfile } = useAuth();

  const handleGameEnd = async (winner: PieceColor) => {
    setGameResult({ winner, reason: 'Jaque mate' });

    // Auto-withdraw from smart contract
    try {
      const txHash = await withdraw('USDT');
      if (txHash) {
        toast.success('¡Fondos enviados a tu wallet!', { description: `TX: ${txHash.slice(0, 10)}...` });
        // Update total_won in profile
        if (user) {
          await (supabase.rpc as any)('increment_total_won', { user_id: user.id, amount: 0.095 });
          await refreshProfile();
        }
      }
    } catch {
      // If no contract balance, that's ok (might be balance-based game)
    }
  };

  const handleResign = () => {
    setShowResignDialog(false);
    setGameResult({
      winner: 'black', // Assuming player is white
      reason: 'Rendición',
    });
    toast.info('Te has rendido. El oponente gana la partida.');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="grid lg:grid-cols-[1fr_auto_300px] gap-6 items-start">
          {/* Left Panel - Game Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 order-2 lg:order-1"
          >
            <GameTimer
              initialTime={600}
              currentTurn={currentTurn}
              playerColor="white"
              isGameActive={isGameActive && !gameResult}
            />

            <StakeDisplay
              stake={0.05}
              currency="ETH"
              player1="0x1234...5678"
              player2="0xabcd...ef01"
            />
          </motion.div>

          {/* Center - Chess Board */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="order-1 lg:order-2"
          >
            <ChessBoard
              onGameEnd={handleGameEnd}
              playerColor="white"
              disabled={!!gameResult}
            />
          </motion.div>

          {/* Right Panel - Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 order-3"
          >
            <div className="glass-card p-4">
              <h3 className="font-serif font-semibold mb-4">Controles</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSoundOn(!isSoundOn)}
                >
                  {isSoundOn ? (
                    <Volume2 className="w-4 h-4 mr-2" />
                  ) : (
                    <VolumeX className="w-4 h-4 mr-2" />
                  )}
                  Sonido
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Ofrecer tablas
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowResignDialog(true)}
                  disabled={!!gameResult}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Rendirse
                </Button>
              </div>
            </div>

            {/* Move History */}
            <div className="glass-card p-4">
              <h3 className="font-serif font-semibold mb-3">Movimientos</h3>
              <div className="h-40 overflow-y-auto text-sm space-y-1">
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-6">1.</span>
                  <span>e4</span>
                  <span>e5</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-6">2.</span>
                  <span>Nf3</span>
                  <span>Nc6</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-6">3.</span>
                  <span>Bb5</span>
                  <span className="text-muted-foreground">...</span>
                </div>
              </div>
            </div>

            {/* Game Info */}
            <div className="glass-card p-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Partida ID:</strong> #12345
              </p>
              <p>
                <strong className="text-foreground">Control:</strong> 10+0 Rápida
              </p>
              <p>
                <strong className="text-foreground">Red:</strong> Ethereum Mainnet
              </p>
            </div>
          </motion.div>
        </div>

        {/* Game Result Overlay */}
        {gameResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 text-center max-w-md"
            >
              <div className="text-6xl mb-4">
                {gameResult.winner === 'white' ? '♔' : '♚'}
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">
                ¡{gameResult.winner === 'white' ? 'Blancas' : 'Negras'} Ganan!
              </h2>
              <p className="text-muted-foreground mb-6">{gameResult.reason}</p>
              <div className="glass-card p-4 mb-6">
                <p className="text-sm text-muted-foreground">Premio transferido</p>
                <p className="text-2xl font-bold text-success">0.095 ETH</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
                  Nueva Partida
                </Button>
                <Button className="flex-1 bg-primary" onClick={() => window.location.href = '/lobby'}>
                  Volver al Lobby
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>

      {/* Resign Confirmation Dialog */}
      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres rendirte?</AlertDialogTitle>
            <AlertDialogDescription>
              Perderás la partida y tu apuesta de 0.05 ETH será transferida a tu oponente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResign}
              className="bg-destructive hover:bg-destructive/90"
            >
              Rendirse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Play;
