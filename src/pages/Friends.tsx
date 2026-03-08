import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Check, X, Swords, Users, Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile?: { display_name: string | null; rating: number; wallet_address: string | null };
}

const Friends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState<{ open: boolean; friendId: string | null }>({ open: false, friendId: null });
  const [inviteStake, setInviteStake] = useState('5');
  const [inviteCurrency, setInviteCurrency] = useState('USDT');
  const [inviteTime, setInviteTime] = useState('10');

  useEffect(() => {
    if (user) loadFriends();
  }, [user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const ch1 = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadFriends())
      .subscribe();
    const ch2 = supabase
      .channel('invites-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites' }, () => {
        // Could show notifications here
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    setIsLoading(true);

    // Friends where I'm user_id
    const { data: sent } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user.id);

    // Friends where I'm friend_id
    const { data: received } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', user.id);

    const allRows = [...(sent || []), ...(received || [])];
    const accepted: FriendRow[] = [];
    const pending: FriendRow[] = [];

    // Fetch profiles for friends
    const friendIds = allRows.map((r: any) => (r.user_id === user.id ? r.friend_id : r.user_id));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, rating, wallet_address')
      .in('id', friendIds.length > 0 ? friendIds : ['none']);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    for (const row of allRows) {
      const otherId = row.user_id === user.id ? row.friend_id : row.user_id;
      const enriched = { ...row, profile: profileMap.get(otherId) } as FriendRow;
      if (row.status === 'accepted') accepted.push(enriched);
      else if (row.status === 'pending' && row.friend_id === user.id) pending.push(enriched);
    }

    setFriends(accepted);
    setPendingReceived(pending);
    setIsLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || !user) return;
    setIsSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, rating')
      .ilike('display_name', `%${searchQuery}%`)
      .neq('id', user.id)
      .limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;
    const { error } = await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId });
    if (error) {
      if (error.code === '23505') toast.info('Solicitud ya enviada');
      else toast.error('Error al enviar solicitud');
    } else {
      toast.success('Solicitud enviada');
      setSearchResults((prev) => prev.filter((p) => p.id !== friendId));
    }
  };

  const acceptRequest = async (id: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    toast.success('Amigo aceptado');
    loadFriends();
  };

  const rejectRequest = async (id: string) => {
    await supabase.from('friendships').delete().eq('id', id);
    toast.info('Solicitud rechazada');
    loadFriends();
  };

  const sendGameInvite = async () => {
    if (!user || !inviteModal.friendId) return;
    const { error } = await supabase.from('game_invites').insert({
      from_user_id: user.id,
      to_user_id: inviteModal.friendId,
      stake_amount: parseFloat(inviteStake),
      currency: inviteCurrency,
      time_control: parseInt(inviteTime) * 60,
    });
    if (error) toast.error('Error al enviar invitación');
    else toast.success('¡Invitación enviada!');
    setInviteModal({ open: false, friendId: null });
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <h1 className="text-2xl font-serif font-bold mb-1">
            <span className="gradient-text">Amigos</span>
          </h1>
          <p className="text-sm text-muted-foreground">Agrega amigos e invítalos a jugar</p>
        </motion.div>

        {/* Search */}
        <div className="glass-card p-4 mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              className="bg-secondary"
            />
            <Button onClick={searchUsers} disabled={isSearching} size="icon" variant="outline">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium">{u.display_name || 'Anónimo'}</p>
                    <p className="text-[10px] text-muted-foreground">Rating: {u.rating}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => sendFriendRequest(u.id)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {pendingReceived.length > 0 && (
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-semibold">Solicitudes pendientes ({pendingReceived.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingReceived.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium">{req.profile?.display_name || 'Anónimo'}</p>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => acceptRequest(req.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => rejectRequest(req.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Mis amigos ({friends.length})</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aún no tienes amigos. ¡Busca y agrega!</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => {
                const otherId = f.user_id === user?.id ? f.friend_id : f.user_id;
                return (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{f.profile?.display_name || 'Anónimo'}</p>
                      <p className="text-[10px] text-muted-foreground">Rating: {f.profile?.rating || 1200}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      onClick={() => setInviteModal({ open: true, friendId: otherId })}
                    >
                      <Swords className="w-3.5 h-3.5 mr-1" />
                      Invitar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Invite Modal */}
      <Dialog open={inviteModal.open} onOpenChange={(open) => setInviteModal({ open, friendId: open ? inviteModal.friendId : null })}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <Swords className="w-5 h-5 text-primary" />
              Invitar a partida
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={inviteCurrency === 'BNB' ? 'default' : 'outline'} onClick={() => setInviteCurrency('BNB')}>BNB</Button>
              <Button variant={inviteCurrency === 'USDT' ? 'default' : 'outline'} onClick={() => setInviteCurrency('USDT')}>USDT</Button>
            </div>
            <Input type="number" value={inviteStake} onChange={(e) => setInviteStake(e.target.value)} placeholder="Apuesta" className="bg-secondary" />
            <Select value={inviteTime} onValueChange={setInviteTime}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutos</SelectItem>
                <SelectItem value="10">10 minutos</SelectItem>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full bg-primary" onClick={sendGameInvite}>Enviar invitación</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Friends;
