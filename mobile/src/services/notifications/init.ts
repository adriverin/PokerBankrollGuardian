import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function initNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    if (request.status !== 'granted') {
      throw new Error('Notification permissions denied');
    }
  }
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Session reminders',
    importance: Notifications.AndroidImportance.DEFAULT
  });
  await Notifications.setNotificationChannelAsync('stake-alerts', {
    name: 'Stake alerts',
    importance: Notifications.AndroidImportance.HIGH
  });
  await Notifications.setNotificationChannelAsync('sim-complete', {
    name: 'Simulation complete',
    importance: Notifications.AndroidImportance.DEFAULT
  });
}
