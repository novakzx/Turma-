import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Pede permissão de notificação, pega o token do Expo Push Service e
 * salva em profiles.push_token (é o que a Edge Function notificar-aviso
 * usa pra saber pra onde mandar — ver supabase/functions/notificar-aviso).
 *
 * Silenciosamente não faz nada em simulador/emulador (push exige device
 * físico) e se o projeto ainda não tem EAS configurado (sem
 * `projectId`, o que só acontece antes da Fase 6 rodar `eas init`) — não
 * é erro, é só a infra de push ainda não estar 100% ligada nesse device.
 */
export async function registrarPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const permissaoAtual = await Notifications.getPermissionsAsync();
  let status = permissaoAtual.status;
  if (status !== 'granted') {
    const pedido = await Notifications.requestPermissionsAsync();
    status = pedido.status;
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  if (error) throw error;
}
