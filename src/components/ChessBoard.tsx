import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Board,
  Square,
  Piece,
  PieceColor,
  PIECE_SYMBOLS,
  createInitialBoard,
  isValidMove,
  getValidMoves,
  makeMove,
  isKingInCheck,
  isCheckmate,
} from '@/lib/chess';

interface ChessBoardProps {
  onGameEnd?: (winner: PieceColor) => void;
  playerColor?: PieceColor;
  disabled?: boolean;
}

type ViewMode = '2d' | '3d';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const ChessBoard = ({ onGameEnd, playerColor = 'white', disabled = false }: ChessBoardProps) => {
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [inCheck, setInCheck] = useState<PieceColor | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (disabled) return;

      const clickedSquare: Square = { row, col };
      const piece = board[row][col];

      if (selectedSquare) {
        if (isValidMove(board, selectedSquare, clickedSquare, currentTurn)) {
          const newBoard = makeMove(board, selectedSquare, clickedSquare);
          if (isKingInCheck(newBoard, currentTurn)) {
            setSelectedSquare(null);
            setValidMoves([]);
            return;
          }
          setBoard(newBoard);
          setLastMove({ from: selectedSquare, to: clickedSquare });
          setSelectedSquare(null);
          setValidMoves([]);
          const nextTurn = currentTurn === 'white' ? 'black' : 'white';
          if (isCheckmate(newBoard, nextTurn)) {
            onGameEnd?.(currentTurn);
            return;
          }
          setInCheck(isKingInCheck(newBoard, nextTurn) ? nextTurn : null);
          setCurrentTurn(nextTurn);
        } else {
          if (piece && piece.color === currentTurn) {
            setSelectedSquare(clickedSquare);
            setValidMoves(getValidMoves(board, clickedSquare, currentTurn));
          } else {
            setSelectedSquare(null);
            setValidMoves([]);
          }
        }
      } else {
        if (piece && piece.color === currentTurn) {
          setSelectedSquare(clickedSquare);
          setValidMoves(getValidMoves(board, clickedSquare, currentTurn));
        }
      }
    },
    [board, selectedSquare, currentTurn, disabled, onGameEnd]
  );

  const isSquareHighlighted = (row: number, col: number) =>
    validMoves.some((m) => m.row === row && m.col === col);
  const isSquareSelected = (row: number, col: number) =>
    selectedSquare?.row === row && selectedSquare?.col === col;
  const isLastMoveSquare = (row: number, col: number) =>
    (lastMove?.from.row === row && lastMove?.from.col === col) ||
    (lastMove?.to.row === row && lastMove?.to.col === col);
  const isKingSquare = (row: number, col: number) => {
    const piece = board[row][col];
    return piece?.type === 'king' && piece.color === inCheck;
  };

  const renderPiece = (piece: Piece | null) => {
    if (!piece) return null;
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="select-none leading-none"
        style={{
          fontSize: viewMode === '3d' ? '2.2rem' : '2.8rem',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
        }}
      >
        {PIECE_SYMBOLS[piece.type][piece.color]}
      </motion.span>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn & Status */}
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${currentTurn === 'white' ? 'bg-amber-100' : 'bg-stone-800'}`} />
        <span className="text-sm font-medium text-foreground">
          {currentTurn === 'white' ? 'Blancas' : 'Negras'}
        </span>
        {inCheck && <span className="text-destructive font-bold text-sm animate-pulse">¡JAQUE!</span>}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
          className="ml-2 text-xs gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          {viewMode === '2d' ? '3D' : '2D'}
        </Button>
      </div>

      {/* Board Container */}
      <div
        className="relative"
        style={
          viewMode === '3d'
            ? {
                perspective: '800px',
                perspectiveOrigin: '50% 30%',
              }
            : {}
        }
      >
        <div
          className="relative rounded-lg overflow-hidden shadow-2xl"
          style={
            viewMode === '3d'
              ? {
                  transform: 'rotateX(35deg) rotateZ(0deg)',
                  transformStyle: 'preserve-3d',
                }
              : {}
          }
        >
          {/* Board with ranks/files */}
          <div className="flex">
            {/* Rank labels (left) */}
            <div className="flex flex-col">
              <div className="w-5 h-0" /> {/* corner spacer */}
              {RANKS.map((rank) => (
                <div
                  key={rank}
                  className="w-5 flex items-center justify-center text-[10px] font-mono text-muted-foreground"
                  style={{ height: viewMode === '3d' ? '3rem' : '3.5rem' }}
                >
                  {rank}
                </div>
              ))}
            </div>

            <div>
              {/* File labels (top) */}
              <div className="flex">
                {FILES.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-center text-[10px] font-mono text-muted-foreground h-5"
                    style={{ width: viewMode === '3d' ? '3rem' : '3.5rem' }}
                  >
                    {file}
                  </div>
                ))}
              </div>

              {/* The board grid */}
              <div
                className="grid grid-cols-8 border border-amber-900/60 rounded-sm"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const highlighted = isSquareHighlighted(rowIndex, colIndex);
                    const selected = isSquareSelected(rowIndex, colIndex);
                    const lastMv = isLastMoveSquare(rowIndex, colIndex);
                    const kingDanger = isKingSquare(rowIndex, colIndex);

                    return (
                      <motion.div
                        key={`${rowIndex}-${colIndex}`}
                        whileHover={{ scale: disabled ? 1 : 1.03 }}
                        whileTap={{ scale: disabled ? 1 : 0.97 }}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        className="relative flex items-center justify-center cursor-pointer transition-colors duration-100"
                        style={{
                          width: viewMode === '3d' ? '3rem' : '3.5rem',
                          height: viewMode === '3d' ? '3rem' : '3.5rem',
                          background: kingDanger
                            ? 'radial-gradient(circle, hsl(0 70% 45%), hsl(0 60% 30%))'
                            : selected
                            ? 'radial-gradient(circle, hsl(45 90% 55%), hsl(45 70% 40%))'
                            : lastMv
                            ? isLight
                              ? 'linear-gradient(135deg, #c9a94e, #b89340)'
                              : 'linear-gradient(135deg, #7a6830, #6a5820)'
                            : isLight
                            ? 'linear-gradient(135deg, #f0d9b5, #e8c98e)'
                            : 'linear-gradient(135deg, #b58863, #8b6637)',
                          ...(disabled ? { cursor: 'not-allowed', opacity: 0.85 } : {}),
                        }}
                      >
                        <AnimatePresence>
                          {highlighted && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute z-10"
                              style={{
                                width: piece ? '100%' : '30%',
                                height: piece ? '100%' : '30%',
                                borderRadius: piece ? '0' : '50%',
                                background: piece
                                  ? 'rgba(20, 85, 30, 0.35)'
                                  : 'radial-gradient(circle, rgba(20, 85, 30, 0.6), rgba(20, 85, 30, 0.3))',
                                border: piece ? '3px solid rgba(20, 85, 30, 0.5)' : 'none',
                              }}
                            />
                          )}
                        </AnimatePresence>
                        {renderPiece(piece)}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
