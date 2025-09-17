import detox, { device } from 'detox';
import config from '../.detoxrc.json';

detox.beforeAll(async () => {
  await detox.init(config, { launchApp: false });
  await device.launchApp({ newInstance: true });
});

detox.afterAll(async () => {
  await detox.cleanup();
});
