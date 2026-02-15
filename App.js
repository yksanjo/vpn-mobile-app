import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// API Service
const API_BASE = 'http://localhost:3001/api';

const api = {
  getStatus: async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return null;
    }
  },
  connect: async (serverId) => {
    const res = await fetch(`${API_BASE}/connection/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });
    return await res.json();
  },
  disconnect: async () => {
    const res = await fetch(`${API_BASE}/connection/disconnect`, {
      method: 'POST'
    });
    return await res.json();
  }
};

// Home Screen
function HomeScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    const data = await api.getStatus();
    if (data) {
      setStatus(data.data);
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    if (status?.connection?.connected) {
      await api.disconnect();
    } else if (status?.servers?.length > 0) {
      await api.connect(status.servers[0].id);
    }
    loadStatus();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  const isConnected = status?.connection?.connected;
  const serverName = status?.connection?.serverName || 'None';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Smart VPN</Text>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#64748b' }]} />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        {isConnected && (
          <Text style={styles.serverText}>Server: {serverName}</Text>
        )}
        <TouchableOpacity
          style={[styles.button, isConnected ? styles.disconnectButton : styles.connectButton]}
          onPress={handleConnect}
        >
          <Text style={styles.buttonText}>
            {isConnected ? 'Disconnect' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.statValue}>{status?.stats?.totalServers || 0}</Text>
          <Text style={styles.statLabel}>Servers</Text>
        </View>
        <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.statValue}>{status?.stats?.activeRules || 0}</Text>
          <Text style={styles.statLabel}>Active Rules</Text>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navSection}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Servers')}>
          <Text style={styles.navIcon}>📡</Text>
          <Text style={styles.navText}>Manage Servers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Rules')}>
          <Text style={styles.navIcon}>🔗</Text>
          <Text style={styles.navText}>Routing Rules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('History')}>
          <Text style={styles.navIcon}>📜</Text>
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Servers Screen
function ServersScreen() {
  const [servers, setServers] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await api.getStatus();
    if (data) {
      setServers(data.data.servers);
      setStatus(data.data.connection);
    }
  };

  const connectToServer = async (serverId) => {
    await api.connect(serverId);
    loadData();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>VPN Servers</Text>
      {servers.map(server => (
        <TouchableOpacity
          key={server.id}
          style={[styles.serverCard, status?.connected && status.serverId === server.id && styles.serverCardActive]}
          onPress={() => connectToServer(server.id)}
        >
          <View style={styles.serverInfo}>
            <Text style={styles.serverName}>{server.name}</Text>
            <Text style={styles.serverHost}>{server.host}</Text>
          </View>
          <View style={styles.serverMeta}>
            <Text style={styles.protocolBadge}>{server.protocol}</Text>
            <Text style={styles.countryBadge}>{server.country}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// Rules Screen
function RulesScreen() {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await api.getStatus();
    if (data) {
      setRules(data.data.rules);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Routing Rules</Text>
      {rules.map(rule => (
        <View key={rule.id} style={styles.ruleCard}>
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleName}>{rule.name}</Text>
            <Text style={styles.rulePattern}>{rule.pattern}</Text>
          </View>
          <View style={[styles.ruleBadge, rule.enabled ? styles.enabledBadge : styles.disabledBadge]}>
            <Text style={styles.ruleBadgeText}>{rule.enabled ? 'Active' : 'Disabled'}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// History Screen
function HistoryScreen() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await fetch(`${API_BASE}/history`);
    const data = await res.json();
    if (data.success) {
      setHistory(data.data);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Connection History</Text>
      {history.map(item => (
        <View key={item.id} style={styles.historyItem}>
          <Text style={styles.historyIcon}>{item.type === 'connect' ? '↑' : '↓'}</Text>
          <View style={styles.historyInfo}>
            <Text style={styles.historyServer}>{item.server}</Text>
            <Text style={styles.historyTime}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Main App
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Servers" component={ServersScreen} />
        <Stack.Screen name="Rules" component={RulesScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
    padding: 20,
    paddingTop: 50,
  },
  card: {
    backgroundColor: '#1e293b',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  serverText: {
    color: '#64748b',
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  connectButton: {
    backgroundColor: '#22c55e',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  statLabel: {
    color: '#64748b',
    marginTop: 5,
  },
  navSection: {
    padding: 20,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  navIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  navText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  serverCard: {
    backgroundColor: '#1e293b',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverCardActive: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  serverHost: {
    color: '#64748b',
    marginTop: 3,
  },
  serverMeta: {
    alignItems: 'flex-end',
  },
  protocolBadge: {
    backgroundColor: '#334155',
    color: '#38bdf8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    fontSize: 12,
  },
  countryBadge: {
    color: '#64748b',
    marginTop: 5,
  },
  ruleCard: {
    backgroundColor: '#1e293b',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleInfo: {
    flex: 1,
  },
  ruleName: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rulePattern: {
    color: '#64748b',
    marginTop: 3,
  },
  ruleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  enabledBadge: {
    backgroundColor: '#22c55e20',
  },
  disabledBadge: {
    backgroundColor: '#64748b20',
  },
  ruleBadgeText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
  },
  historyIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  historyInfo: {
    flex: 1,
  },
  historyServer: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  historyTime: {
    color: '#64748b',
    marginTop: 3,
  },
});
