// Precisa ser o PRIMEIRO import (exigência do react-native-gesture-handler / Stack Navigator).
import 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { iniciarBancoDeDados } from './src/db/database';
import { supabase } from './src/servicos/supabaseClient';
import { SessaoContext, extrairUsuario } from './src/contexto/SessaoContext';
import TelaLogin from './src/telas/TelaLogin';
import MapaSagaDaVinci from './src/telas/MapaSagaDaVinci';
import TelaQuestaoDaVinci from './src/telas/TelaQuestaoDaVinci';
import TelaRankingSocial from './src/telas/TelaRankingSocial';

const Stack = createStackNavigator();

export default function App() {
  const [bancoPronto, setBancoPronto] = useState(false);
  const [erroBanco, setErroBanco] = useState(null);
  const [tentativaBanco, setTentativaBanco] = useState(0);
  const [sessao, setSessao] = useState(undefined); // undefined = ainda verificando

  useEffect(() => {
    let ativo = true;
    iniciarBancoDeDados()
      .then(() => {
        if (ativo) {
          setErroBanco(null);
          setBancoPronto(true);
        }
      })
      .catch((e) => {
        console.log('Erro DB:', e);
        if (ativo) setErroBanco('Não foi possível abrir o banco de dados local.');
      });
    return () => {
      ativo = false;
    };
  }, [tentativaBanco]);

  // Sessão do Supabase: entra direto se já houver login salvo (funciona também offline)
  // e acompanha entradas/saídas durante o uso.
  useEffect(() => {
    let ativo = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (ativo) setSessao(data.session ?? null);
      })
      .catch(() => {
        if (ativo) setSessao(null);
      });

    const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao ?? null);
    });
    return () => {
      ativo = false;
      ouvinte.subscription.unsubscribe();
    };
  }, []);

  // O token é renovado de tempos em tempos e o objeto "sessao" muda;
  // este memo só muda quando o usuário realmente muda.
  const userId = sessao?.user?.id;
  const userEmail = sessao?.user?.email;
  const userNome = sessao?.user?.user_metadata?.username;
  const usuario = useMemo(
    () => (sessao ? extrairUsuario(sessao.user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, userEmail, userNome]
  );

  const sair = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    // Sem internet o logout "global" falha; o logout local sempre funciona.
    if (error) await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const valorSessao = useMemo(() => ({ usuario, sair }), [usuario, sair]);

  if (erroBanco) {
    return (
      <View style={styles.load}>
        <Text style={styles.loadTxt}>{erroBanco}</Text>
        <TouchableOpacity style={styles.botao} onPress={() => setTentativaBanco((t) => t + 1)}>
          <Text style={styles.botaoTxt}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!bancoPronto || sessao === undefined) {
    return (
      <View style={styles.load}>
        <Text style={styles.loadTxt}>Encadernando os manuscritos anatômicos...</Text>
      </View>
    );
  }

  return (
    <SessaoContext.Provider value={valorSessao}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#EBE1C9', borderBottomWidth: 1.5, borderColor: '#3A2E2B' },
            headerTintColor: '#2C221E',
            headerTitleStyle: { fontFamily: 'serif', fontWeight: 'bold' },
          }}
        >
          {usuario ? (
            <>
              <Stack.Screen name="MapaSaga" component={MapaSagaDaVinci} options={{ title: 'Trilha Anatômica' }} />
              <Stack.Screen name="Questao" component={TelaQuestaoDaVinci} options={{ title: 'Desafio Códex' }} />
              <Stack.Screen name="Ranking" component={TelaRankingSocial} options={{ title: 'Rede de Estudos' }} />
            </>
          ) : (
            <Stack.Screen name="Login" component={TelaLogin} options={{ headerShown: false }} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SessaoContext.Provider>
  );
}

const styles = StyleSheet.create({
  load: { flex: 1, backgroundColor: '#F4EEDD', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadTxt: { color: '#2C221E', fontSize: 16, fontFamily: 'serif', fontStyle: 'italic', textAlign: 'center' },
  botao: { backgroundColor: '#3A2E2B', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 2, marginTop: 20 },
  botaoTxt: { color: '#F4EEDD', fontFamily: 'serif', fontWeight: 'bold' },
});
