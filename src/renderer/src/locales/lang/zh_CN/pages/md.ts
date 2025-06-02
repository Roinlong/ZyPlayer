import privacyPolicyMD from './md/privacy-policy.md?raw';
import thumbnailFfmpegMD from './md/thumbnail-ffmpeg.md?raw';
import customPlayerMD from './md/custom-player.md?raw';

export default {
  thumbanilFfmpeg: {
    title: '缩略图使用说明',
    content: thumbnailFfmpegMD,
    confirm: '安装检测',
    cancel: '知道了',
  },
  customPlayer: {
    title: '自定义播放器说明',
    content: customPlayerMD,
    confirm: '知道了',
  },
  privacyPolicy: {
    title: '用户须知',
    content: privacyPolicyMD,
    quitTip: '5秒后自动退出软件',
    confirm: '同意并继续',
    cancel: '不同意',
  },
  label: {
    copy: '复制',
    lang: '语言',
    copySuccess: '复制成功',
    copyError: '复制失败，请检查您的浏览器设置',
  },
};
