import { platform } from '@electron-toolkit/utils';
import { Tray, Menu, shell, nativeImage } from 'electron';
import { join } from 'path';
import logger from '@main/core/logger';
import { APP_PUBLIC_PATH, APP_STORE_PATH } from '@main/utils/hiker/path';
import { toggleWinVisable } from '@main/utils/tool';

const createTrayMenu = () => {
  return Menu.buildFromTemplate([
    {
      label: '打开zyfun',
      click: () => toggleWinVisable(true),
    },
    {
      label: '打开数据目录',
      click: () => shell.openPath(APP_STORE_PATH),
    },
    { label: '关于', role: 'about', },
    { label: '退出', role: 'quit', },
  ]);
};

/**
 * Create system tray
 */
const createSystemTray = () => {
  // const lightIcon = join(APP_PUBLIC_PATH, 'img/icons/tray_light.png');
  const darkIcon = join(APP_PUBLIC_PATH, 'img/icons/tray_dark.png');
  const colorIcon = join(APP_PUBLIC_PATH, 'img/icons/logo.png');

  // Create tray icon
  const icon = nativeImage.createFromPath(platform.isMacOS ? darkIcon : colorIcon);
  const trayIcon = icon.resize({ width: 16, height: 16 });
  if (platform.isMacOS) trayIcon.setTemplateImage(true);
  const mainTray = new Tray(trayIcon);

  if (!mainTray) {
    logger.error('[tray] Failed to create tray');
    return;
  }

  // Set application menu
  Menu.setApplicationMenu(createTrayMenu());
  mainTray.setToolTip('zyfun');

  // Left-click event
  mainTray.on('click', () => toggleWinVisable(true));

  // Tray menu
  if (!platform.isMacOS) mainTray.setContextMenu(createTrayMenu());
  logger.info('[tray][init] completed');
};

export default createSystemTray;
