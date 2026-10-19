import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { colores } from '@/theme';

SplashScreen.preventAutoHideAsync();

const temaNavegacion = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colores.fondo, card: colores.fondo },
};

export default function RootLayout() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  return (
    <AuthProvider>
      <ThemeProvider value={temaNavegacion}>
        <StatusBar style="light" />
        <Navegacion fuentesListas={fuentesCargadas || Boolean(errorFuentes)} />
      </ThemeProvider>
    </AuthProvider>
  );
}

function Navegacion({ fuentesListas }) {
  const { usuario, cargando } = useAuth();
  const listo = fuentesListas && !cargando;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(usuario)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movimiento" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
