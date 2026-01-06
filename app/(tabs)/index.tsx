import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, RefreshControl, SafeAreaView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons'; // Icônes natives Expo

// Types stricts
type Order = {
  id: string;
  status: string;
  total_amount: number;
  delivery_address: string | null;
  delivery_fee?: number;
  customer_name: string | null;
  customer_phone: string | null;
  store: { name: string; address: string }; // Via jointure
};

export default function DriverDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrder, setMyOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'available' | 'active'>('available');
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer l'ID du driver connecté
    const getDriverId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDriverId(user.id);
      }
    };
    getDriverId();
  }, []);

  useEffect(() => {
    if (!driverId) return;
    
    fetchData();
    
    // Abonnement Temps Réel (Simple)
    const channel = supabase.channel('driver-app')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData(); // On recharge tout bêtement au moindre changement
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const fetchData = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      // 1. Chercher si j'ai une course en cours
      const { data: activeData } = await supabase
        .from('orders')
        .select('*, store:stores(name, address)')
        .eq('driver_id', driverId)
        .in('status', ['out_for_delivery'])
        .maybeSingle();

      if (activeData) {
        setMyOrder(activeData);
        setTab('active'); // Force l'onglet actif
      } else {
        setMyOrder(null);
      }

      // 2. Chercher les commandes disponibles (Prêtes et sans chauffeur)
      const { data: pendingData } = await supabase
        .from('orders')
        .select('*, store:stores(name, address)')
        .eq('status', 'ready')
        .eq('order_type', 'delivery')
        .is('driver_id', null);

      if (pendingData) setAvailableOrders(pendingData);

    } catch (error) {
      console.log('Erreur fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS LOGISTIQUES ---

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'out_for_delivery', 
        driver_id: driverId 
      })
      .eq('id', orderId);

    if (error) Alert.alert("Erreur", "Impossible d'accepter (déjà prise ?)");
    else fetchData();
  };

  const confirmPickup = async () => {
    if (!myOrder) return;
    await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', myOrder.id);
    fetchData();
  };

  const confirmDelivery = async () => {
    if (!myOrder) return;
    // On valide la livraison ET le paiement
    await supabase
      .from('orders')
      .update({ 
        status: 'delivered',
        payment_status: 'collected' // Statut conforme à l'enum DB
      })
      .eq('id', myOrder.id);
    
    Alert.alert("Livraison terminée 💰", "Commande livrée et encaissée.");
    fetchData();
    setTab('available');
  };

  // --- RENDU ---

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{item.id}</Text>
        <Text style={styles.price}>{item.total_amount} DH</Text>
      </View>
      
      <View style={styles.row}>
        <Ionicons name="restaurant" size={16} color="#666" />
        <Text style={styles.infoText}>{item.store?.name || 'Restaurant'}</Text>
      </View>
      
      <View style={styles.row}>
        <Ionicons name="location" size={16} color="#666" />
        <Text style={styles.infoText}>{item.delivery_address}</Text>
      </View>

      <View style={styles.row}>
        <Ionicons name="person" size={16} color="#666" />
        <Text style={styles.infoText}>{item.customer_name || 'Client'}</Text>
      </View>

      <TouchableOpacity style={styles.acceptButton} onPress={() => acceptOrder(item.id)}>
        <Text style={styles.acceptButtonText}>ACCEPTER LA COURSE</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveScreen = () => {
    if (!myOrder) return (
        <View style={styles.center}>
            <Text>Aucune course active.</Text>
            <TouchableOpacity onPress={() => setTab('available')} style={styles.link}>
                <Text style={{color: 'blue'}}>Voir les disponibles</Text>
            </TouchableOpacity>
        </View>
    );

    const isOutForDelivery = myOrder.status === 'out_for_delivery';

    return (
      <View style={styles.activeContainer}>
        <View style={styles.bigCard}>
            <Text style={styles.statusBadge}>
                {isOutForDelivery ? 'EN ROUTE VERS CLIENT 🛵' : 'EN ROUTE VERS RESTO 🍳'}
            </Text>
            
            <Text style={styles.bigPrice}>{myOrder.total_amount} DH</Text>
            <Text style={styles.paymentMethod}>à encaisser (CASH)</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>DESTINATION :</Text>
            <Text style={styles.bigAddress}>{myOrder.delivery_address || 'Adresse non disponible'}</Text>
            
            <Text style={styles.label}>CLIENT :</Text>
            <Text style={styles.clientName}>{myOrder.customer_name || 'Client'}</Text>
            <Text style={styles.phone}>{myOrder.customer_phone || ''}</Text>

            <View style={{flex: 1}} />

            {!isOutForDelivery ? (
                <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#f97316'}]} onPress={confirmPickup}>
                    <Text style={styles.actionText}>J'AI RÉCUPÉRÉ LA COMMANDE</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#16a34a'}]} onPress={confirmDelivery}>
                    <Text style={styles.actionText}>CONFIRMER LIVRAISON & PAIEMENT</Text>
                </TouchableOpacity>
            )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity 
            style={[styles.tab, tab === 'available' && styles.activeTab]} 
            onPress={() => setTab('available')}
        >
            <Text style={[styles.tabText, tab === 'available' && styles.activeTabText]}>Disponibles ({availableOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tab, tab === 'active' && styles.activeTab]} 
            onPress={() => setTab('active')}
        >
            <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>Ma Course {myOrder ? '🔴' : ''}</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENU */}
      {tab === 'available' ? (
        <FlatList
          data={availableOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
          ListEmptyComponent={
            <View style={styles.center}>
                <Ionicons name="bicycle" size={50} color="#ccc" />
                <Text style={{color: '#999', marginTop: 10}}>Aucune commande prête...</Text>
            </View>
          }
        />
      ) : (
        renderActiveScreen()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 5 },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: 'black' },
  tabText: { fontWeight: 'bold', color: '#9ca3af' },
  activeTabText: { color: 'black' },
  list: { padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderId: { fontWeight: 'bold', fontSize: 16 },
  price: { fontWeight: 'bold', fontSize: 18, color: '#16a34a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoText: { color: '#374151' },
  acceptButton: { backgroundColor: 'black', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  acceptButtonText: { color: 'white', fontWeight: 'bold' },
  
  // Styles Active Screen
  activeContainer: { flex: 1, padding: 20 },
  bigCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  statusBadge: { backgroundColor: '#e0f2fe', color: '#0284c7', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, fontWeight: 'bold', marginBottom: 20, overflow: 'hidden' },
  bigPrice: { fontSize: 40, fontWeight: '900', color: '#111' },
  paymentMethod: { color: '#666', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#eee', width: '100%', marginBottom: 20 },
  label: { fontSize: 12, color: '#999', fontWeight: 'bold', alignSelf: 'flex-start', marginTop: 10 },
  bigAddress: { fontSize: 18, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 10 },
  clientName: { fontSize: 16, alignSelf: 'flex-start' },
  phone: { fontSize: 16, color: 'blue', alignSelf: 'flex-start' },
  actionButton: { width: '100%', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 10 },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 10 }
});