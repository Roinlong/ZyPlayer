/*!
 * @module drpy3
 * @brief T3数据处理核心库
 * @version 3.1.1
 * 
 * @original-author hjdhnx
 * @original-source {@link https://github.com/hjdhnx/hipy-server/blob/master/app/t4/files/drpy3_libs/drpy3.js | Source on GitHub}
 * 
 * @modified-by HiramWong <admin@catni.cn>
 * @modification-date 2023-04-09T18:37:11+08:00
 * @modification-description 使用TypeScript适配, 适用于JavaScript项目, 并采取措施防止 Tree-Shaking 删除关键代码
 * 
 * **防止 Tree-Shake 说明**:
 * - 为了确保 `drpy3.ts` 中的函数和变量不被 Tree Shaking, 已采取以下措施：
 *   - 作用域参数举例：`[a, b, c].forEach(item => item.length)` —— 显式遍历数组元素防止数组相关操作被优化掉。
 *   - 作用域函数举例：`let temp = _; temp.stringify({});` —— 对于 `_` 符合的对象，确保其方法被调用，防止被误删。
 *   - 全局函数与参数举例：`keepUnUse.useful._` —— 对于 `_` 符合的对象，确保其方法被调用，防止被误删。
 * 
 * --- 
 */


import CryptoJS from 'crypto-js';
import cheerio from "./cheerio.min";
import joinUrl from 'url';
import { getMubans } from './template';
import gbkTool from './gbk';
import { pdfh as pdfhModule, pdfa as pdfaModule, pd as pdModule, local, req } from './drpyInject';

const init_test = () => {
  const test_data = {
    "version": VERSION,
    "rkey": RKEY,
    "rule": rule
  }
  console.log(test_data);
}

/**
 * 执行预处理代码
 */
const pre = () => {
  let preprocessCode = rule["预处理"]?.trim();

  if (typeof preprocessCode === 'string' && preprocessCode !== '') {
    console.log("执行预处理代码:" + preprocessCode);

    if (preprocessCode.startsWith('js:')) {
      preprocessCode = preprocessCode.replace('js:', '');
    }

    try {
      // 在 code 中可以执行 GET 或者 POST 请求，并修改 rule.headers 中的 cookie
      // 直接操作 rule_fetch_params.headers.Cookie
      eval(preprocessCode);
    } catch (e) {
      console.log('预处理执行失败:', e);
    }
  }
};

let rule = {};
// @ts-ignore
let vercode = typeof pdfl === 'function' ? 'drpy3.1' : 'drpy3';
const VERSION = `${vercode} 3.9.49beta36 202400308`;
/** 已知问题记录
 * 1.影魔的jinjia2引擎不支持 {{fl}}对象直接渲染 (有能力解决的话尽量解决下，支持对象直接渲染字符串转义,如果加了|safe就不转义)[影魔牛逼，最新的文件发现这问题已经解决了]
 * Array.prototype.append = Array.prototype.push; 这种js执行后有毛病,for in 循环列表会把属性给打印出来 (这个大毛病需要重点排除一下)
 * 2.import es6py.js但是里面的函数没有被装载进来.比如drpy规则报错setResult2 is undefiend(合并文件了可以不管了)
 * 3.无法重复导入cheerio(怎么解决drpy和parseTag里都需要导入cheerio的问题) 无法在副文件导入cheerio (现在是全部放在drpy一个文件里了,凑合解决?)
 * 4.有个错误不知道哪儿来的 executeScript: com.quickjs.JSObject$Undefined cannot be cast to java.lang.String 在 点击选集播放打印init_test_end后面打印(貌似不影响使用)
 * 5.需要实现 stringify 函数,比起JSON.strifngify函数,它会原封不动保留中文不会编码unicode
 * 6.base64Encode,base64Decode,md5函数还没有实现 (抄影魔代码实现了)
 * 7.eval(getCryptoJS());还没有实现 (可以空实现了,以后遇到能忽略)
 * done: jsp:{pdfa,pdfh,pd},json:{pdfa,pdfh,pd},jq:{pdfa,pdfh,pd}
 * 8.req函数不支持传递字符串的data参数 {'content-type':'text/plain'} 类型数据，因此无法直接调用alist的ocr接口
 * /

/** 以下是内置变量和解析方法 **/
var MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36';
const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36';
const UA = 'Mozilla/5.0';
const UC_UA = 'Mozilla/5.0 (Linux; U; Android 9; zh-CN; MI 9 Build/PKQ1.181121.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.5.5.1035 Mobile Safari/537.36';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
// console.log(UA,UC_UA,IOS_UA);
const RULE_CK = 'cookie'; // 源cookie的key值
// const KEY = typeof(key)!=='undefined'&&key?key:'drpy_' + (rule.title || rule.host); // 源的唯一标识
const CATE_EXCLUDE = '首页|留言|APP|下载|资讯|新闻|动态';
const TAB_EXCLUDE = '猜你|喜欢|下载|剧情|热播';
const OCR_RETRY = 3; // ocr验证重试次数
// const OCR_API = 'http://dm.mudery.com:10000';//ocr在线识别接口
// const OCR_API = 'http://192.168.3.239:5705/parse/ocr';//ocr在线识别接口
// const OCR_API = 'http://cms.nokia.press/parse/ocr';//ocr在线识别接口
// const OCR_API = 'http://cms.nokia.press:5707/parse/ocr';//ocr在线识别接口
const OCR_API = 'http://drpy.nokia.press:8028/ocr/drpy/text';//ocr在线识别接口
if (typeof MY_URL === 'undefined') {
  var MY_URL; // 全局注入变量,pd函数需要
}
var HOST;
var RKEY; // 源的唯一标识
var fetch;
var print;
var log;
var rule_fetch_params;
var fetch_params; // 每个位置单独的
var oheaders;
// var play_url; // 二级详情页注入变量,为了适配js模式0 (不在这里定义了,直接二级里定义了个空字符串)
var _pdfh;
var _pdfa;
var _pd;
var pdfh = pdfh;
var pdfa = pdfa;
var pd = pd;
// const DOM_CHECK_ATTR = ['url', 'src', 'href', 'data-original', 'data-src'];
const DOM_CHECK_ATTR = /(url|src|href|-original|-src|-play|-url|style)$/;
// 过滤特殊链接,不走urlJoin
const SPECIAL_URL = /^(ftp|magnet|thunder|ws):/;
const NOADD_INDEX = /:eq|:lt|:gt|:first|:last|^body$|^#/;  // 不自动加eq下标索引
const URLJOIN_ATTR = /(url|src|href|-original|-src|-play|-url|style)$/;  // 需要自动urljoin的属性
const SELECT_REGEX = /:eq|:lt|:gt|#/g;
const SELECT_REGEX_A = /:eq|:lt|:gt/g;

/**
 es6py扩展
 */
if (typeof Object.assign != 'function') {
  Object.assign = function () {
    var target = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
}
if (!String.prototype.includes) {
  String.prototype.includes = function (search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }

    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function (searchElement, fromIndex) {
      if (this == null) {//this是空或者未定义，抛出错误
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);//将this转变成对象
      var len = o.length >>> 0;//无符号右移0位，获取对象length属性，如果未定义就会变成0

      if (len === 0) {//length为0直接返回false未找到目标值
        return false;
      }

      var n = fromIndex | 0;//查找起始索引
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);//计算正确起始索引，因为有可能是负值

      while (k < len) {//从起始索引处开始循环
        if (o[k] === searchElement) {//如果某一位置与寻找目标相等，返回true，找到了
          return true;
        }
        k++;
      }
      return false;//未找到，返回false
    }
  });
}
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (prefix){
    return this.slice(0, prefix.length) === prefix;
  };
}
if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}
// Object.prototype["myValues"] = (obj) => {
//   if(obj == null) {
//     throw new TypeError("Cannot convert undefined or null to object");
//   }
//   let res= [];
//   for(let k in obj){
//     if (obj.hasOwnProperty(k)) { //需判断是否是本身的属性
//       res.push(obj[k]);
//     }
//   }
//   return res;
// }
// if (typeof Object.prototype["values"] !== 'function') {
//   Object.prototype["values"] = (obj) => {
//     if(obj ==null) {
//       throw new TypeError("Cannot convert undefined or null to object");
//     }
//     let res=[]
//     for(let k in obj){
//       if(obj.hasOwnProperty(k)){//需判断是否是本身的属性
//         res.push(obj[k]);
//       }
//     }
//     return res;
//   }
// }
if (typeof Array.prototype.join !== 'function') {
  Array.prototype.join = function (emoji) {
    // emoji = emoji||',';
    emoji = emoji||'';
    let self = this;
    let str = "";
    let i = 0;
    if (!Array.isArray(self)) {throw String(self)+'is not Array'}
    if(self.length===0){return ''}
    if (self.length === 1){return String(self[0])}
    i = 1;
    str = this[0];
    for (; i < self.length; i++) {
      str += String(emoji)+String(self[i]);
    }
    return str;
  };
}

// 去除字符串末尾的字符
const rstrip = (str, chars) =>{
  let regex = new RegExp(chars + "$");
  return str.replace(regex, "");
}

Array.prototype["append"] = Array.prototype.push;
String.prototype["strip"] = String.prototype.trim;

const isGenuine = (vipUrl: string) => {
  let flag = new RegExp('qq\.com|iqiyi\.com|youku\.com|mgtv\.com|bilibili\.com|sohu\.com|ixigua\.com|pptv\.com|miguvideo\.com|le\.com|1905\.com|fun\.tv');
  return flag.test(vipUrl);
}

const urlDeal = (vipUrl) => {
  if (!vipUrl) return '';

  if (!isGenuine(vipUrl)) return vipUrl;

  if (!/miguvideo/.test(vipUrl)) {
    vipUrl = vipUrl.split('#')[0].split('?')[0];
  }

  return vipUrl;
}

// 设置结果
const setResult = (d) => {
  if(!Array.isArray(d)) return [];
  VODS = [];

  VODS = d.map(it => {
    const {
      url: vod_id = '',
      title: vod_name = '',
      desc: vod_remarks = '',
      content: vod_content = '',
      pic_url: vod_pic = it.img || '',
      tname: type_name = '',
      tid: type_id = '',
      year: vod_year = '',
      actor: vod_actor = '',
      director: vod_director = '',
      area: vod_area = ''
    } = it;

    return {
      vod_id,
      vod_name,
      vod_remarks,
      vod_content,
      vod_pic,
      type_name,
      type_id,
      vod_year,
      vod_actor,
      vod_director,
      vod_area
    };
  });
  return VODS;
}

// 设置结果2
const setResult2 = (res) => {
  VODS = res?.list || [];
  return VODS
}

// 设置首页结果
const setHomeResult = (res) => {
  if (!res || typeof res !== 'object') {
    return [];
  }
  
  return setResult(res.list);
};

// 猫了个咪
const rc = (js) =>{
  if (js === 'maomi_aes.js') {
    const key = CryptoJS.enc.Utf8.parse("625222f9149e961d");
    const iv = CryptoJS.enc.Utf8.parse("5efdtf6060e2o330");

    const decrypt = (word) => {
      word = CryptoJS.enc.Hex.parse(word);
      const decrypted = CryptoJS.AES.decrypt(CryptoJS.enc.Base64.stringify(word), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    };

    const encrypt = (word) => {
      const encrypted = CryptoJS.AES.encrypt(word, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return encrypted.ciphertext.toString();
    };

    return { De: decrypt, En: encrypt };
  }
  return {};
};
    

// 千万不要用for in 推荐 forEach (for in 会打乱顺序)
//猫函数
const maoss = (jxurl, ref, key) => {
  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  var html;
  // @ts-ignore
  eval(getCryptoJS());
  try {
    var getVideoInfo = function (text) {
      return CryptoJS.AES.decrypt(text, key, {iv: iv, padding: CryptoJS.pad.Pkcs7}).toString(CryptoJS.enc.Utf8);
    };
    let temp:any = { getVideoInfo }; // 防止tree-shake
    temp.stringify({}); // 防止tree-shake
    var token_key = key == undefined ? 'dvyYRQlnPRCMdQSe' : key;
    if (ref) {
      html = request(jxurl, {
        headers: {
          'Referer': ref
        }
      });
    } else {
      html = request(jxurl);
    }

    if (html.indexOf('&btwaf=') != -1) {
      html = request(jxurl + '&btwaf' + html.match(/&btwaf(.*?)"/)[1], {
        headers: {
          'Referer': ref
        }
      })
    }
    var token_iv = html.split('_token = "')[1].split('"')[0];
    var key = CryptoJS.enc.Utf8.parse(token_key);
    var iv = CryptoJS.enc.Utf8.parse(token_iv);

    eval(html.match(/var config = {[\s\S]*?}/)[0] + '');

    // @ts-ignore
    if (!config.url.startsWith('http')) {
      // @ts-ignore
      config.url = CryptoJS.AES.decrypt(config.url, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8)
    }
    // @ts-ignore
    return config.url;
  } catch (e) {
    return '';
  }
}

const urlencode = (str) => {
  str = `${str}`;
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}

const base64Encode = (text: string) => {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));
}

const base64Decode = (text: string) => {
  return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text));
}

const md5 = (text: string) => {
  return `${CryptoJS.MD5(text)}`;
}

/**
 * 字符串按指定编码
 * @param input
 * @param encoding
 * @returns {*}
 */
const encodeStr = (input, encoding) => {
  encoding = encoding || 'gbk';
  
  if (encoding.startsWith('gb')) {
    const strTool = gbkTool();
    input = strTool.encode(input);
  }
  
  return input;
};

/**
 * 字符串指定解码
 * @param input
 * @param encoding
 * @returns {*}
 */
const decodeStr = (input, encoding) => {
  encoding = encoding || 'gbk';

  if (encoding.startsWith('gb')) {
    const strTool = gbkTool();
    input = strTool.decode(input);
  }

  return input;
};

// 封装的RSA加解密类
const RSA = {
  encode: (data, key, option) => {
    // @ts-ignore
    if (typeof rsaEncrypt === 'function') {
      if (!option || typeof option !== 'object') {
        // @ts-ignore
        return rsaEncrypt(data, key);
      } else {
        // @ts-ignore
        return rsaEncrypt(data, key, option);
      }
    }
    return false;
  },
  decode: (data, key, option) => {
    // @ts-ignore
    if (typeof rsaDecrypt === 'function') {
      if (!option || typeof option !== 'object') {
        // @ts-ignore
        return rsaDecrypt(data, key);
      } else {
        // @ts-ignore
        return rsaDecrypt(data, key, option);
      }
    }
    return false;
  }
};

/**
 * 获取壳子返回的代理地址
 * @returns {string|*}
 */
const getProxyUrl = () => {
  // @ts-ignore
  if (typeof getProxy === 'function') {//判断壳子里有getProxy函数就执行取返回结果。否则取默认的本地
    // @ts-ignore
    return getProxy(true);
  } else {
    return 'http://127.0.0.1:9978/proxy?do=js';
  }
};

/**
 * 强制正序算法
 * @param lists  待正序列表
 * @param key 正序键
 * @param option 单个元素处理函数
 * @returns {*}
 */
const forceOrder = (lists, key, option) => {
  const start = Math.floor(lists.length / 2);
  const end = Math.min(lists.length - 1, start + 1);

  if (start >= end) return lists;
  
  let first = lists[start];
  let second = lists[end];

  if (key) {
    try {
      first = first[key];
      second = second[key];
    } catch (e) {}
  }

  if (option && typeof option === 'function') {
    try {
      first = option(first);
      second = option(second);
    } catch (e) {}
  }

  first = String(first);
  second = String(second);

  // console.log(first,second);
  if (first.match(/(\d+)/) && second.match(/(\d+)/)) {
    const num1 = Number(first.match(/(\d+)/)[1]);
    const num2 = Number(second.match(/(\d+)/)[1]);
    
    if (num1 > num2) {
      lists.reverse();
    }
  }
  
  return lists;
};

let VODS: any = [];// 一级或者搜索需要的数据列表
let VOD: any = {};// 二级的单个数据
let TABS: any = [];// 二级的自定义线路列表 如: TABS=['道长在线','道长在线2']
let LISTS: any = [];// 二级的自定义选集播放列表 如: LISTS=[['第1集$http://1.mp4','第2集$http://2.mp4'],['第3集$http://1.mp4','第4集$http://2.mp4']]
globalThis.encodeUrl = urlencode;
globalThis.urlencode = urlencode;

/**
 *  url拼接
 * @param fromPath 初始当前页面url
 * @param nowPath 相对当前页面url
 * @returns {*}
 */
const urljoin = (fromPath, nowPath) => {
  fromPath = fromPath || '';
  nowPath = nowPath || '';
  return joinUrl.resolve(fromPath, nowPath);
}

var urljoin2 = urljoin;

// 内置 pdfh,pdfa,pd
const defaultParser = {
  pdfh: pdfhModule,
  pdfa: pdfaModule,
  pd: pdModule
};

/**
 * pdfh原版优化,能取style属性里的图片链接
 * @param html 源码
 * @param parse 解析表达式
 * @returns {string|*}
 */
const pdfh2 = (html, parse) => {
  let html2 = html;

  try {
    if (typeof html !== 'string') {
      html2 = html.rr(html.ele).toString();
    }
  } catch (e) {
    console.log('html对象转文本发生了错误:', e);
  }

  let result = defaultParser.pdfh(html2, parse);
  let option = parse.includes('&&') ? parse.split('&&').slice(-1)[0] : parse.split(' ').slice(-1)[0];
  
  if (/style/.test(option.toLowerCase()) && /url\(/.test(result)) {
    try {
      result = result.match(/url\((.*?)\)/)![1];
      result = result.replace(/^['|"](.*)['|"]$/, "$1");
    } catch (e) {}
  }

  return result
}

/**
 * pdfa原版优化,可以转换jq的html对象
 * @param html
 * @param parse
 * @returns {*}
 */
const pdfa2 = (html, parse) => {
  let html2 = html;

  try {
    if (typeof html !== 'string') {
      html2 = html.rr(html.ele).toString();
    }
  } catch (e) {
    console.log('html对象转文本发生了错误:', e);
  }

  return defaultParser.pdfa(html2, parse);
}

/**
 * pd原版方法重写-增加自动urljoin
 * @param html
 * @param parse
 * @param uri
 * @returns {*}
 */
const pd2 = (html, parse, uri) => {
  let ret = pdfh2(html, parse);

  if (typeof uri === 'undefined' || !uri) uri = '';

  if (DOM_CHECK_ATTR.test(parse) && !SPECIAL_URL.test(ret)) {
    if (/http/.test(ret)) {
      ret = ret.substring(ret.indexOf('http'));
    } else {
      ret = urljoin(MY_URL, ret);
    }
  }

  return ret;
}

const parseTags = {
  jsp:{
    pdfh: pdfh2,
    pdfa: pdfa2,
    pd: pd2,
  },
  json: {
    pdfh(html, parse) {
      if (!parse || !parse.trim()) {
        return '';
      }
      if (typeof html === 'string') {
        html = JSON.parse(html);
      }
      parse = parse.trim();
      if (!parse.startsWith('$.')) {
        parse = '$.' + parse;
      }
      parse = parse.split('||');
      for (let ps of parse) {
        let ret = cheerio.jp(ps, html);
        if (Array.isArray(ret)) {
          ret = ret[0] || '';
        } else {
          ret = ret || '';
        }
        if (ret && typeof ret !== 'string') {
          ret = ret.toString();
        }
        if (ret) {
          return ret;
        }
      }
      return '';
    },
    pdfa(html, parse) {
      if (!parse || !parse.trim()) {
        return '';
      }
      if (typeof html === 'string') {
        html = JSON.parse(html);
      }
      parse = parse.trim();
      if (!parse.startsWith('$.')) {
        parse = '$.' + parse;
      }
      let ret = cheerio.jp(parse, html);
      if (Array.isArray(ret) && Array.isArray(ret[0]) && ret.length === 1) {
        return ret[0] || [];
      }
      return ret || [];
    },
    pd(html, parse) {
      let ret = parseTags.json.pdfh(html, parse);
      if (ret) {
        return urljoin(MY_URL, ret);
      }
      return ret;
    },
  },
  jq: {
    pdfh(html, parse) {
      if (!html || !parse || !parse.trim()) {
        return '';
      }
      parse = parse.trim();
      let result = defaultParser.pdfh(html, parse);
      return result;
    },
    pdfa(html, parse) {
      if (!html || !parse || !parse.trim()) {
        return [];
      }
      parse = parse.trim();
      let result = defaultParser.pdfa(html, parse);
      return result;
    },
    pd(html, parse, base_url) {
      if (!html || !parse || !parse.trim()) {
        return '';
      }
      parse = parse.trim();
      base_url = base_url || MY_URL;
      return defaultParser.pd(html, parse, base_url);
    },
  },
  getParse(p0) { // 自动获取解析标签
    if (p0.startsWith('jsp:')) {
      return this.jsp;
    } else if (p0.startsWith('json:')) {
      return this.json;
    } else if (p0.startsWith('jq:')) {
      return this.jq;
    } else {
      return this.jq;
    }
  },
};

const stringify = JSON.stringify;
const jsp = parseTags.jsp;
const jq = parseTags.jq;

/*** 后台需要实现的java方法并注入到js中 ***/

/**
 * 读取本地文件->应用程序目录
 * @param filePath
 * @returns {string}
 */
// const readFile = (filePath) => {
//   filePath = filePath || './uri.min.js';
//   var fd = os.open(filePath);
//   var buffer = new ArrayBuffer(1024);
//   var len = os.read(fd, buffer, 0, 1024);
//   console.log(len);
//   let text = String.fromCharCode.apply(null, new Uint8Array(buffer));
//   console.log(text);
//   return text
// }

/**
 * 处理返回的json数据
 * @param html
 * @returns {*}
 */
const dealJson = (html: string) => {
  try {
    html = html.trim();
    if (!/^[\[{].*[\]}]$/.test(html)) {
      const match = html.match(/.*?\{(.*)\}/m);
      if (match) {
        html = `{${match[1]}}`;
      }
    }
  } catch (e) {}

  try {
    html = JSON.parse(html);
  } catch (e) {}

  return html;
}

/**
 * 验证码识别逻辑,需要java实现(js没有bytes类型,无法调用后端的传递图片二进制获取验证码文本的接口)
 * @type {{api: string, classification: (function(*=): string)}}
 */
var OcrApi = {
  api: OCR_API,
  classification: (img) => {
    let code: any = '';

    try {
      console.log('[t3]通过drpy_ocr验证码接口过验证...');
      let html = request(OCR_API, { data: { img: img }, headers: { 'User-Agent': PC_UA }, method: 'POST' }, true);
      code = html || '';
    } catch (e) {
      console.log('[t3]OCR识别验证码发生错误', e);
    }

    return code;
  }
};

/**
 * 验证码识别
 * @param url 验证码图片链接
 * @returns {string} 验证成功后的cookie
 */
const verifyCode = (url) => {
  let cnt = 0;
  let host = getHome(url);
  let cookie = '';

  while (cnt < OCR_RETRY) {
    try{
      let yzm_url = `${host}/index.php/verify/index.html`;
      console.log(`[t3]验证码链接: ${yzm_url}`);
      let hhtml = request(yzm_url, { withHeaders: true, toBase64: true }, true);
      let json = JSON.parse(JSON.stringify(hhtml));

      if (!cookie) {
        let setCk = Object.keys(json).find(it => it.toLowerCase() === 'set-cookie');
        cookie = setCk ? json[setCk].split(';')[0] : '';
      }

      let img = json.body;
      let code = OcrApi.classification(img);
      console.log(`[t3]第${cnt + 1}次验证码识别结果: ${code}`);
      let submit_url = `${host}/index.php/ajax/verify_check?type=search&verify=${code}`;

      let html: any = request(submit_url, { headers: { Cookie: cookie, 'User-Agent': MOBILE_UA }, method: 'POST' });
      html = JSON.parse(html);

      if (html.msg === 'ok') {
        console.log(`[t3]第${cnt + 1}次验证码提交成功`);
        return cookie;
      } else if (html.msg !== 'ok' && cnt + 1 >= OCR_RETRY) {
        cookie = '';
      }
    } catch (e) {
      console.log(`[t3]第${cnt + 1}次验证码提交失败`, e);
      if (cnt + 1 >= OCR_RETRY) {
        cookie = '';
      }
    }
    cnt += 1;
  }
  return cookie
}

/**
 * 存在数据库配置表里, key字段对应值value,没有就新增,有就更新,调用此方法会清除key对应的内存缓存
 * @param k 键
 * @param v 值
 * @returns {*}
 */
const setItem = (k, v) => {
  local.set(RKEY, k, v);
  console.log(`[t3][cache][set]${RKEY}${k}:${v}`);
}

/**
 * 获取数据库配置表对应的key字段的value，没有这个key就返回value默认传参.需要有缓存,第一次获取后会存在内存里
 * @param k 键
 * @param v 值
 * @returns {*}
 */
const getItem = (k, v) => {
  const res = local.get(RKEY, k, v);
  console.log(`[t3][cache][get]${res}`)
  return res;
}

/**
 * 删除数据库key对应的一条数据,并清除此key对应的内存缓存
 * @param k
 */
const clearItem = (k) => {
  local.delete(RKEY, k);
}

/*** js自封装的方法 ***/

/**
 * 获取链接的host(带http协议的完整链接)
 * @param url 任意一个正常完整的Url,自动提取根
 * @returns {string}
 */
const getHome = (url) => {
  if (!url) return '';

  try {
    url = new URL(url).origin;
  } catch (e) {
    console.error('[t3]URL 解析失败:', e);
  }

  return url;
};

/**
 * get参数编译链接,类似python params字典自动拼接
 * @param url 访问链接
 * @param obj 参数字典
 * @returns {*}
 */
const buildUrl = (url: string, obj: any = {}) => {
  const queryString = Object.entries(obj)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string | number | boolean)}`)
    .join('&');

  if (!url.includes('?') && queryString) url += '?';
  if (queryString) url += (url.endsWith('?') ? '' : '&') + queryString;

  return url;
};

/**
 * 远程依赖执行函数
 * @param url 远程js地址
 */
const $require = (url) => {
  // @ts-ignore
  eval(request(url));
}


/**
 * 海阔网页请求函数完整封装
 * @param url 请求链接
 * @param obj 请求对象 {headers:{},method:'',timeout:5000,body:'',withHeaders:false}
 * @param ocr_flag 标识此flag是用于请求ocr识别的,自动过滤content-type指定编码
 * @returns {string|string|DocumentFragment|*}
 */
const request = (url: string, obj: any = undefined, ocr_flag: boolean = false) => {
  if (typeof obj === 'undefined' || !obj) {
    if (!fetch_params || !fetch_params.headers) {
      const headers = {
        'User-Agent': MOBILE_UA,
      };
      if (rule["headers"]) {
        Object.assign(headers, rule["headers"]);
      }
      if (!fetch_params) {
        fetch_params = {};
      }
      fetch_params.headers = headers;
    }
    if (!fetch_params.headers.Referer) {
      fetch_params.headers.Referer = getHome(url);
    }
    obj = fetch_params;
  } else {
    const headers = obj.headers || {};
    const keys = Object.keys(headers).map(it => it.toLowerCase());
    if (!keys.includes('user-agent')) {
      headers['User-Agent'] = MOBILE_UA;
    }
    obj.headers = headers;
  }
  if (rule["encoding"] && rule["encoding"] !== 'utf-8' && !ocr_flag) {
    if (!obj.headers.hasOwnProperty('Content-Type') && !obj.headers.hasOwnProperty('content-type')) { // 手动指定了就不管
      obj.headers["Content-Type"] = 'text/html; charset=' + rule["encoding"];
    }
  }
  if (typeof obj.body !== 'undefined' && obj.body && typeof obj.body === 'string') {
    if (!obj.headers.hasOwnProperty('Content-Type') && !obj.headers.hasOwnProperty('content-type')) {
      obj.headers["Content-Type"] = 'application/x-www-form-urlencoded; charset=' + rule["encoding"];
    }
  } else if (typeof obj.body !== 'undefined' && obj.body && typeof obj.body === 'object') {
    obj.data = obj.body;
    delete obj.body;
  }
  if (!url) return obj.withHeaders ? '{}' : '';
  if (obj.toBase64) { // 返回base64,用于请求图片
    obj.buffer = 2;
    delete obj.toBase64;
  }
  console.log(`[t3][request]url:${url}| method:${obj.method || 'GET'}| body:${obj.body || ''}`);
  const res = req(url, obj);
  const html = res["content"] || '';
  if (obj.withHeaders) {
    let htmlWithHeaders = res.headers;
    htmlWithHeaders!.body = html;
    return JSON.stringify(htmlWithHeaders);
  } else {
    return html;
  }
};

/**
 *  快捷post请求
 * @param url 地址
 * @param obj 对象
 * @returns {string|DocumentFragment|*}
 */
const post = (url: string, obj) => {
  obj.method = 'POST';
  return request(url, obj);
}

fetch = request;
print = (data: any = '') => {
  if (data === undefined || data === null || data === '') {
    console.log('[t3]null or empty data');
    return;
  }

  if (typeof data === 'object') {
    if (Object.keys(data).length > 0) {
      try {
        console.log(`[t3${JSON.stringify(data)}`);
      } catch (e) {
        console.log(`[t3${typeof data}:${data.length}`);
      }
    } else {
      console.log('[t3null object');
    }
  } else {
    console.log(data);
  }
};
log = print;

/**
 * 检查宝塔验证并自动跳过获取正确源码
 * @param html 之前获取的html
 * @param url 之前的来源url
 * @param obj 来源obj
 * @returns {string|DocumentFragment|*}
 */
const checkHtml = (html, url: string, obj) => {
  const matchBtwaf = html.match(/\?btwaf=(.*?)"/);
  if (matchBtwaf) {
    const btwaf = matchBtwaf[1];
    const newUrl = url.split('#')[0] + '?btwaf' + btwaf;
    console.log('[t3]宝塔验证访问链接:' + newUrl);
    html = request(newUrl, obj);
  }

  return html;
};

/**
 * 带一次宝塔验证的源码获取
 * @param url 请求链接
 * @param obj 请求参数
 * @returns {string|DocumentFragment}
 */
const getCode = (url, obj) => {
  let html = request(url, obj);
  html = checkHtml(html, url, obj);
  return html;
};

/**
 * 源rule专用的请求方法,自动注入cookie
 * @param url 请求链接
 * @returns {string|DocumentFragment}
 */
const getHtml = (url) => {
  let obj = {};
  if (rule["headers"]) obj["headers"] = rule["headers"];
  let cookie = getItem(RULE_CK,'');
  if (cookie) {
    console.log(cookie)
    if (obj["headers"] && ! Object.keys(obj["headers"]).map(it => it.toLowerCase()).includes('cookie')) {
      console.log('[t3]历史无cookie,新增过验证后的cookie');
      obj["headers"]['Cookie'] = cookie;
    } else if(obj["headers"] && obj["headers"].cookie && obj["headers"].cookie !== cookie) {
      obj["headers"]['Cookie'] = cookie;
      console.log('[t3]历史有小写过期的cookie,更新过验证后的cookie');
    } else if(obj["headers"] && obj["headers"].Cookie && obj["headers"].Cookie !== cookie) {
      obj["headers"]['Cookie'] = cookie;
      console.log('[t3]历史有大写过期的cookie,更新过验证后的cookie');
    } else if(!obj["headers"]) {
      obj["headers"] = { Cookie: cookie };
      console.log('[t3]历史无headers,更新过验证后的含cookie的headers');
    }
  }
  let html = getCode(url,obj);
  return html;
};

/**
 * 首页分类解析，筛选暂未实现
 * @param homeObj 首页传参对象
 * @returns {string}
 */
const homeParse = (homeObj) => {
  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  let classes: any = [];

  if (homeObj.class_name && homeObj.class_url) {
    let names = homeObj.class_name.split('&');
    let urls = homeObj.class_url.split('&');
    let cnt = Math.min(names.length, urls.length);

    for (let i = 0; i < cnt; i++) {
      classes.push({
        type_id: urls[i],
        type_name: names[i]
      });
    }
  }

  if (homeObj.class_parse) {
    let p = homeObj.class_parse.split(';');
    let _ps = parseTags.getParse(p[0]);
    _pdfa = _ps.pdfa;
    _pdfh = _ps.pdfh;
    _pd = _ps.pd;
    MY_URL = rule["url"];

    if (p.length >= 3) { // 可以不写正则
      try {
        let html = getHtml(homeObj.MY_URL);
        if (html) {
          homeHtmlCache = html;
          let list = _pdfa(html, p[0]);
          if (list && list.length > 0) {
            list.forEach((it,idex) => {
              try {
                let name = _pdfh(it, p[1]);
                if (homeObj.cate_exclude && (new RegExp(homeObj.cate_exclude).test(name))) return;
                let url = _pd(it, p[2]);
                if (p.length > 3 && p[3]) {
                  let exp = new RegExp(p[3]);
                  url = url.match(exp)[1];
                }

                classes.push({
                  type_id: url.trim(),
                  type_name: name.trim()
                });
              } catch (e) {
                console.log(`[t3]分类列表定位第${idex}个元素正常报错:` , e);
              }
            });
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
  // 排除分类
  classes = classes.filter(it => !homeObj.cate_exclude || !(new RegExp(homeObj.cate_exclude).test(it["type_name"])));

  let resp = {
    'class': classes
  };

  if (homeObj.filter) resp["filters"] = homeObj.filter;

  return resp;
}

/**
 * 推荐和搜索单字段继承一级
 * @param p 推荐或搜索的解析分割;列表
 * @param pn 自身列表序号
 * @param pp  一级解析分割;列表
 * @param ppn 继承一级序号
 * @returns {*}
 */
const getPP = (p, pn, pp, ppn) => {
  let ps = '';
  try {
    ps = p[pn] === '*' && pp.length > ppn ? pp[ppn] : p[pn];
  } catch (e) {}
  return ps;
};

/**
 *  首页推荐列表解析
 * @param homeVodObj
 * @returns {string}
 */
const homeVodParse = (homeVodObj) => {
  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  MY_URL = homeVodObj.homeUrl;
  let d: any = [];
  let t1 = Date.now();
  let p = homeVodObj["推荐"];

  if (p === '*' && rule["一级"]) {
    homeVodObj.double = false;
    p = rule["一级"];
  }

  if (!p || typeof p !== 'string') return '{}';

  p = p.trim();
  let pp = rule["一级"].split(';');

  if (p.startsWith('js:')) {
    const TYPE = 'home';
    var input = MY_URL;
    [TYPE, input].map(item =>{item.length}); // 防止tree-shake
    HOST = rule["host"];
    eval(p.replace('js:', ''));
    d = VODS;
  } else {
    p = p.split(';');

    if (!homeVodObj.double && p.length < 5) return '{}';
    else if (homeVodObj.double && p.length < 6)  return '{}';

    let p0 = getPP(p, 0, pp, 0);
    let _ps = parseTags.getParse(p0);
    _pdfa = _ps.pdfa;
    _pdfh = _ps.pdfh;
    _pd = _ps.pd;
    const is_json = p0.startsWith('json:');
    p0 = p0.replace(/^(jsp:|json:|jq:)/, '');

    let html = homeHtmlCache || getHtml(MY_URL);
    homeHtmlCache = undefined;

    if (is_json) html = dealJson(html);

    try {
      if (homeVodObj.double) {
        let items = _pdfa(html, p0);
        const p1 = getPP(p, 1, pp, 0);
        const p2 = getPP(p, 2, pp, 1);
        const p3 = getPP(p, 3, pp, 2);
        const p4 = getPP(p, 4, pp, 3);
        const p5 = getPP(p, 5, pp, 4);
        const p6 = getPP(p, 6, pp, 5);

        for (let item of items) {
          let items2 = _pdfa(item, p1);
          for (let item2 of items2) {
            try {
              const title = _pdfh(item2, p2);
              const img = _pd(item2, p3) || '';
              const desc = _pdfh(item2, p4) || '';
              let links: any = [];

              for (let _p5 of p5.split('+')) {
                let link = !homeVodObj.detailUrl ? _pd(item2, _p5, MY_URL) : _pdfh(item2, _p5);
                links.push(link);
              }

              let content = p.length > 6 && p[6] ? _pdfh(item2, p6) : '';
              let vid = links.join('$');

              if (rule['二级'] === '*') vid += `@@${title}@@${img}`;

              const vod = {
                vod_name: title,
                vod_pic: img,
                vod_remarks: desc,
                vod_content: content,
                vod_id: vid
              };

              d.push(vod);
            } catch (e) {
              console.log('[t3]首页列表双层定位处理发生错误:', e);
            }
          }
        }
      } else {
        let items = _pdfa(html, p0);
        const p1 = getPP(p, 1, pp, 1);
        const p2 = getPP(p, 2, pp, 2);
        const p3 = getPP(p, 3, pp, 3);
        const p4 = getPP(p, 4, pp, 4);
        const p5 = getPP(p, 5, pp, 5);

        for (let item of items) {
          try {
            const title = _pdfh(item, p1);
            const img = _pd(item, p2, MY_URL) || '';
            const desc = _pdfh(item, p3) || '';
            let links: any = [];

            for (let _p5 of p4.split('+')) {
              let link = !homeVodObj.detailUrl ? _pd(item, _p5, MY_URL) : _pdfh(item, _p5);
              links.push(link);
            }

            let content = p.length > 5 && p[5] ? _pdfh(item, p5) : '';
            let vid = links.join('$');
            if (rule['二级'] === '*') vid += `@@${title}@@${img}`;

            const vod = {
              vod_name: title,
              vod_pic: img,
              vod_remarks: desc,
              vod_content: content,
              vod_id: vid
            };

            d.push(vod);
          } catch (e) {
            console.log('首页列表单层定位处理发生错误:', e);
          }
        }
      }
    } catch (e) {}
  }

  let t2 = Date.now();
  console.log(`[t3]加载首页推荐耗时:${t2 - t1}毫秒`);

  if (rule["图片来源"]) {
    // @ts-ignore
    d.filter(it => it["vod_pic"] && it["vod_pic"].startsWith('http'))
      .forEach(it => {
        // @ts-ignore
        it["vod_pic"] += rule["图片来源"];
      });
  }

  return { list: d };
};

/**
 * 一级分类页数据解析
 * @param cateObj
 * @returns {string}
 */
const categoryParse = (cateObj) => {
  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  let p = cateObj["一级"];
  if (!p || typeof p !== 'string') return '{}';
  let d: any = [];
  let url = cateObj.url.replaceAll('fyclass', cateObj.tid);

  if (cateObj.pg === 1 && url.includes('[') && url.includes(']')) {
    url = url.split('[')[1].split(']')[0];
  } else if(cateObj.pg > 1 && url.includes('[') && url.includes(']')) {
    url = url.split('[')[0];
  }

  if (rule["filter_url"]) {
    if (!/fyfilter/.test(url)) {
      url += (!url.endsWith('&') && !rule["filter_url"].startsWith('&')) ? '&' : '';
      url += rule["filter_url"];
    } else {
      url = url.replace('fyfilter', rule["filter_url"]);
    }

    let fl = cateObj.filter ? cateObj.extend : {};
    // 自动合并 不同分类对应的默认筛选
    if (rule["filter_def"] && typeof rule["filter_def"] === 'object') {
      try {
        if (Object.keys(rule["filter_def"]).length > 0 && rule["filter_def"].hasOwnProperty(cateObj.tid)) {
          let self_fl_def = rule["filter_def"][cateObj.tid];
          if (self_fl_def && typeof self_fl_def === 'object') {
            // 引用传递转值传递,避免污染self变量
            let fl_def = JSON.parse(JSON.stringify(self_fl_def));
            fl = Object.assign(fl_def, fl);
          }
        }
      } catch (e) {
        console.log('合并不同分类对应的默认筛选出错:', e);
      }
    }

    let new_url = cheerio.jinja2(url, { fl: fl });
    url = new_url;
  }
  if (/fypage/.test(url)) {
    if (url.includes('(') && url.includes(')')) {
      let url_rep = url.match(/.*?\((.*)\)/)[1];
      let cnt_page = url_rep.replaceAll('fypage', cateObj.pg);
      let cnt_pg = eval(cnt_page);
      url = url.replaceAll(url_rep, cnt_pg).replaceAll('(', '').replaceAll(')', '');
    } else {
      url = url.replaceAll('fypage', cateObj.pg);
    }
  }

  MY_URL = url;
  p = p.trim();
  const MY_CATE = cateObj.tid;

  if (p.startsWith('js:')) {
    var MY_FL = cateObj.extend;
    const TYPE = 'cate';
    var input = MY_URL;
    const MY_PAGE = cateObj.pg;
    var desc = '';
    [MY_FL, TYPE, input, MY_PAGE, desc].map(item =>{item.length}); // 防止tree-shake
    eval(p.trim().replace('js:', ''));
    d = VODS;
  } else {
    p = p.split(';');
    if (p.length < 5) return '{}';
    const _ps = parseTags.getParse(p[0]);
    _pdfa = _ps.pdfa;
    _pdfh = _ps.pdfh;
    _pd = _ps.pd;
    const is_json = p[0].startsWith('json:');
    p[0] = p[0].replace(/^(jsp:|json:|jq:)/, '');

    try {
      let html: any = getHtml(MY_URL);
      if (html) {
        if (is_json) html = dealJson(html);
        let list = _pdfa(html, p[0]);
        list.forEach(it => {
          let links = p[4].split('+').map(p4 => {
            return !rule["detailUrl"] ? _pd(it, p4, MY_URL) : _pdfh(it, p4);
          });

          let link = links.join('$');
          let vod_id = rule["detailUrl"] ? MY_CATE + '$' + link : link;

          let vod_name = _pdfh(it, p[1]).replace(/\n|\t/g,'').trim();
          let vod_pic = _pd(it, p[2], MY_URL);

          if (rule["二级"] === '*') vod_id += `@@${vod_name}@@${vod_pic}`;

          d.push({
            vod_id,
            vod_name,
            vod_pic,
            vod_remarks: _pdfh(it, p[3]).replace(/\n|\t/g,'').trim(),
          });
        });
      }
    } catch (e) {
      console.log(e);
    }
  }

  if (rule["图片来源"]) {
    d.filter(it => it["vod_pic"] && it["vod_pic"].startsWith('http'))
      .forEach(it => {
        it["vod_pic"] += rule["图片来源"];
      });
  }

  let pagecount = 0;
  if (rule["pagecount"] && typeof rule["pagecount"] === 'object' && rule["pagecount"].hasOwnProperty(MY_CATE)) {
    pagecount = parseInt(rule["pagecount"][MY_CATE]);
  }

  const nodata = {
    list: [{
      vod_name: '无数据,防无限请求',
      vod_id: 'no_data',
      vod_remarks: '不要点,会崩的',
      vod_pic: 'https://ghproxy.net/https://raw.githubusercontent.com/hjdhnx/dr_py/main/404.jpg'
    }],
    total: 1,
    pagecount: 1,
    page: 1,
    limit: 1
  };

  const vod = d.length < 1 ? nodata : {
    'page': parseInt(cateObj.pg),
    'pagecount': pagecount || 999,
    'limit': 20,
    'total': 999,
    'list': d,
  };

  return vod;
}

/**
 * 搜索列表数据解析
 * @param searchObj
 * @returns {string}
 */
const searchParse = (searchObj) => {
  if (!searchObj.searchUrl) return '{}';

  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  let d: any = [];
  let p = searchObj.搜索 === '*' && rule["一级"] ? rule["一级"] : searchObj["搜索"];

  if (!p || typeof p !== 'string') return '{}';

  p = p.trim();
  let pp = rule["一级"].split(';');
  let url = searchObj.searchUrl.replaceAll('**', searchObj.wd);

  if (searchObj.pg === 1 && url.includes('[')&&url.includes(']')&&!url.includes('#')) {
    url = url.split('[')[1].split(']')[0];
  } else if(searchObj.pg > 1 && url.includes('[')&&url.includes(']')&&!url.includes('#')) {
    url = url.split('[')[0];
  }

  if (/fypage/.test(url)) {
    if (url.includes('(')&&url.includes(')')) {
      let url_rep = url.match(/.*?\((.*)\)/)[1];
      let cnt_page = url_rep.replaceAll('fypage', searchObj.pg);
      let cnt_pg = eval(cnt_page);
      url = url.replaceAll(url_rep,cnt_pg).replaceAll('(','').replaceAll(')','');
    } else {
      url = url.replaceAll('fypage',searchObj.pg);
    }
  }

  MY_URL = url;
  if (p.startsWith('js:')) {
    const TYPE = 'search';
    const MY_PAGE = searchObj.pg;
    const KEY = searchObj.wd;
    var input = MY_URL;
    var detailUrl = rule["detailUrl"] || '';
    [TYPE, MY_PAGE, KEY, input, detailUrl].map(item =>{item.length}); // 防止tree-shake
    eval(p.trim().replace('js:',''));
    d = VODS;
  } else {
    p = p.split(';');

    if (p.length < 5) return '{}';

    let p0 = getPP(p, 0, pp, 0);
    let _ps = parseTags.getParse(p0);
    _pdfa = _ps.pdfa;
    _pdfh = _ps.pdfh;
    _pd = _ps.pd;
    let is_json = p0.startsWith('json:');
    p0 = p0.replace(/^(jsp:|json:|jq:)/,'');

    try {
      let req_method = MY_URL.split(';').length > 1 ? MY_URL.split(';')[1].toLowerCase() : 'get';
      let html;

      if (req_method === 'post' || req_method === 'postjson') {
        let rurls = MY_URL.split(';')[0].split('#');
        let rurl = rurls[0];
        let params = rurls.length > 1 ? rurls[1] : '';

        if (req_method === 'postjson') {
          try {
            params = JSON.parse(params);
          } catch (e) {
            params = '{}';
          }
        }

        let _fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
        let postData = { body: params };
        Object.assign(_fetch_params, postData);
        html = post(rurl, _fetch_params);
      } else {
        html = getHtml(MY_URL);
      }

      if (html) {
        if (/系统安全验证|输入验证码/.test(html)) {
          let cookie = verifyCode(MY_URL);
          if (cookie) {
            console.log(`[t3][search]本次成功过验证, cookie:${cookie}`);
            setItem(RULE_CK, cookie);
          } else {
            console.log(`[t3][search]本次自动过搜索验证失败, cookie:${cookie}`);
          }
          html = getHtml(MY_URL);
        }

        if(!html.includes(searchObj.wd)){
          console.log(`[t3][search]疑似搜索失败, 结果未包含关键字, 源数据:${html}`);
        }

        if (is_json) html = dealJson(html);

        let list = _pdfa(html, p0);
        let p1 = getPP(p, 1, pp, 1);
        let p2 = getPP(p, 2, pp, 2);
        let p3 = getPP(p, 3, pp, 3);
        let p4 = getPP(p, 4, pp, 4);
        let p5 = getPP(p, 5, pp, 5);

        list.forEach(it => {
          let links = p4.split('+').map(_p4 => {
            return !rule["detailUrl"] ? _pd(it, _p4, MY_URL) : _pdfh(it, _p4)
          });
          let link = links.join('$');
          let content = (p.length > 5 && p[5]) ? _pdfh(it, p5) : '';
          let vod_id = link;
          let vod_name = _pdfh(it, p1).replace(/\n|\t/g,'').trim();
          let vod_pic = _pd(it, p2, MY_URL);

          if (rule["二"] === '*') vod_id += `@@${vod_name}@@${vod_pic}`;

          const ob = {
            'vod_id': vod_id,
            'vod_name': vod_name,
            'vod_pic': vod_pic,
            'vod_remarks': _pdfh(it, p3).replace(/\n|\t/g,'').trim(),
            'vod_content': content.replace(/\n|\t/g,'').trim(),
          };
          d.push(ob);
        });
      }
    } catch (e) {
      console.log('[t3][search]错误:', e);
      return '{}'
    }
  }

  if (rule["图片来源"]) {
    // @ts-ignore
    d.filter(it => it["vod_pic"] && it["vod_pic"].startsWith('http'))
      .forEach(it => {
        // @ts-ignore
        it["vod_pic"] += rule["图片来源"];
      });
  }  

  return {
    'page': parseInt(searchObj.pg),
    'pagecount': 10,
    'limit': 20,
    'total': 100,
    'list': d,
  };
}

/**
 * 二级详情页数据解析
 * @param detailObj
 * @returns {string}
 */
const detailParse = (detailObj) => {
  let t1 = Date.now();
  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  let orId = detailObj.orId;
  let vod_name = '片名';
  let vod_pic = '';
  let vod_id = orId;
  if (rule["二级"] === '*') {
    let extra = orId.split('@@');
    vod_name = extra.length > 1 ? extra[1] : vod_name;
    vod_pic = extra.length > 2 ? extra[2] : vod_pic;
  }

  let vod = {
    vod_id: vod_id,
    vod_name: vod_name,
    vod_pic: vod_pic,
    type_name: "类型",
    vod_year: "年份",
    vod_area: "地区",
    vod_remarks: "更新信息",
    vod_actor: "主演",
    vod_director: "导演",
    vod_content: "简介"
  };
  let p = detailObj.二级;
  let url = detailObj.url;
  let detailUrl = detailObj.detailUrl;
  let fyclass = detailObj.fyclass;
  [fyclass].map(item =>{item.length}); // 防止tree-shake
  let tab_exclude = detailObj.tab_exclude;
  let html = detailObj.html || '';
  MY_URL = url;
  if (detailObj.二级访问前) {
    try {
      console.log(`[t3]尝试在二级访问前执行代码:${detailObj.二级访问前}`);
      eval(detailObj.二级访问前.trim().replace('js:',''));
    } catch (e) {
      console.log('[t3]二级访问前执行代码出现错误:', e)
    }
  }

  if (p === '*') {
    vod["vod_play_from"] = '道长在线';
    vod["vod_remarks"] = detailUrl;
    vod["vod_actor"] = '没有二级,只有一级链接直接嗅探播放';
    vod["vod_content"] = MY_URL;
    vod["vod_play_url"] = '嗅探播放$' + MY_URL.split('@@')[0];
  } else if (typeof p === 'string' && p.trim().startsWith('js:')) {
    const TYPE = 'detail';
    var input = MY_URL;
    var play_url = '';
    [TYPE, input, play_url].map(item =>{item.length}); // 防止tree-shake
    eval(p.trim().replace('js:',''));
    vod = VOD;
  } else if(p && typeof p === 'object') {
    let tt1 = Date.now();
    if (!html) html = getHtml(MY_URL);
    console.log(`[t3]二级${MY_URL}仅获取源码耗时:${Date.now()- tt1}毫秒`);
    let _ps;
    if (p.is_json) {
      console.log('[t3]二级是json');
      _ps = parseTags.json;
      html = dealJson(html);
    } else if(p.is_jsp) {
      console.log('[t3]二级是jsp');
      _ps = parseTags.jsp;
    } else if(p.is_jq) {
      console.log('[t3]二级是jq');
      _ps = parseTags.jq;
    } else {
      console.log('[t3]二级默认jq');
      _ps = parseTags.jq;
    }
    let tt2 = Date.now();
    console.log(`[t3]二级${MY_URL}获取并装载源码耗时:${tt2 - tt1}毫秒`);
    _pdfa = _ps.pdfa;
    _pdfh = _ps.pdfh;
    _pd = _ps.pd;
    if (p.title) {
      let p1 = p.title.split(';');
      vod.vod_name = _pdfh(html, p1[0]).replace(/\n|\t/g,'').trim();
      let type_name = p1.length > 1 ? _pdfh(html, p1[1]).replace(/\n|\t/g,'').replace(/ /g,'').trim() : '';
      vod.type_name = type_name || vod.type_name;
    }
    if (p.desc) {
      try {
        let p1 = p.desc.split(';');
        vod.vod_remarks =  _pdfh(html, p1[0]).replace(/\n|\t/g,'').trim();
        vod.vod_year = p1.length > 1 ? _pdfh(html, p1[1]).replace(/\n|\t/g,'').trim() : '';
        vod.vod_area = p1.length > 2 ? _pdfh(html, p1[2]).replace(/\n|\t/g,'').trim() : '';
        vod.vod_actor = p1.length > 3 ? _pdfh(html, p1[3]).replace(/\n|\t/g,'').trim() : '';
        vod.vod_director = p1.length > 4 ? _pdfh(html, p1[4]).replace(/\n|\t/g,'').trim() : '';
      } catch (e) {}
    }
    if (p.content) {
      try {
        let p1 = p.content.split(';');
        vod.vod_content =  _pdfh(html, p1[0]).replace(/\n|\t/g,'').trim();
      }
      catch (e) {}
    }
    if (p.img) {
      try{
        let p1 = p.img.split(';');
        vod.vod_pic =  _pd(html, p1[0],MY_URL);
      }
      catch (e) {}
    }

    let vod_play_from = '$$$';
    let playFrom: any = [];
    if (p["重定向"] && p["重定向"].startsWith('js:')) {
      console.log('开始执行重定向代码:' + p.重定向);
      html = eval(p["重定向"].replace('js:',''));
    }

    if (p.tabs) {
      if (p.tabs.startsWith('js:')) {
        console.log('[t3]开始执行tabs代码:'+p.tabs);
        var input = MY_URL;
        eval(p.tabs.replace('js:', ''));
        playFrom = TABS;
      } else {
        let p_tab = p.tabs.split(';')[0];
        let vHeader = _pdfa(html, p_tab);
        let tab_text = p.tab_text || 'body&&Text';
        // print('tab_text:'+tab_text);
        let new_map = {};
        for (let v of vHeader) {
          let v_title = _pdfh(v,tab_text).trim();
          if(tab_exclude&& (new RegExp(tab_exclude)).test(v_title)){
            continue;
          }
          if(!new_map.hasOwnProperty(v_title)){
            new_map[v_title] = 1;
          }else{
            new_map[v_title] += 1;
          }
          if(new_map[v_title]>1){
            v_title+=Number(new_map[v_title]-1);
          }
          playFrom.push(v_title);
        }
      }
    } else { 
      playFrom = ['道长在线']
    }
    vod["vod_play_from"] = playFrom.join(vod_play_from);

    let vod_play_url = '$$$';
    let vod_tab_list: any = [];
    if (p.lists) {
      if (p.lists.startsWith('js:')) {
          print('开始执行lists代码:' + p.lists);
          try {
            var input = MY_URL;
            var play_url = '';
            eval(p.lists.replace('js:',''));
            for (let i in LISTS) {
              if (LISTS.hasOwnProperty(i)) {
                try {
                  LISTS[i] = LISTS[i].map(it => it.split('$').slice(0,2).join('$'));
                } catch (e) {
                  console.log('格式化LISTS发生错误:', e);
                }
              }
            }
            vod_play_url = LISTS.map(it => it.join('#')).join(vod_play_url);
          } catch (e) {
            console.log('js执行lists: 发生错误:', e);
          }
        } else {
          let list_text = p.list_text || 'body&&Text';
          let list_url = p.list_url || 'a&&href';
          let is_tab_js = p.tabs.trim().startsWith('js:');
          for (let i=0; i < playFrom.length; i++) {
            let tab_name = playFrom[i];
            let tab_ext =  p.tabs.split(';').length > 1 && !is_tab_js ? p.tabs.split(';')[1] : '';
            let p1 = p.lists.replaceAll('#idv', tab_name).replaceAll('#id', i);
            tab_ext = tab_ext.replaceAll('#idv', tab_name).replaceAll('#id', i);
            let tabName = tab_ext ? _pdfh(html, tab_ext) : tab_name;
            [tabName].map(item =>{item.length}); // 防止tree-shake
            let new_vod_list: any = [];
            let tt1 = Date.now();
            // @ts-ignore
            if (typeof pdfl === 'function') {
              // @ts-ignore
              new_vod_list = pdfl(html, p1, list_text, list_url, MY_URL);
            } else {
              let vodList = [];
              try {
                vodList =  _pdfa(html, p1);
              } catch (e) {}
              for (let i = 0; i < vodList.length; i++) {
                let it = vodList[i];
                new_vod_list.push(_pdfh(it, list_text).trim() + '$' + _pd(it, list_url, MY_URL));
              }
            }
            if (new_vod_list.length > 0) {
              new_vod_list = forceOrder(new_vod_list,'',x=>x.split('$')[0]);
              console.log(`[t3]drpy影响性能代码共计列表数循环次数:${new_vod_list.length},耗时:${Date.now() - tt1}毫秒`);
            }
            let vlist = new_vod_list.join('#');
            vod_tab_list.push(vlist);
          }
          vod_play_url = vod_tab_list.join(vod_play_url);
        }
    }
    vod["vod_play_url"] = vod_play_url;
  }
  if(rule["图片来源"] && vod.vod_pic && vod.vod_pic.startsWith('http')){
    vod.vod_pic = vod.vod_pic + rule["图片来源"];
  }
  if(!vod.vod_id||(vod_id.includes('$') && vod.vod_id!==vod_id)){
    vod.vod_id = vod_id;
  }
  let t2 = Date.now();
  console.log(`[t3]加载二级界面${MY_URL}耗时:${t2 - t1}毫秒`);
  vod = vodDeal(vod);

  return {
    list: [vod]
  };
}

/**
 * 获取二级待返回的播放线路没处理时的索引关系
 * @param vod
 * @returns {{}}
 */
const get_tab_index = (vod) => {
  const obj = {};
  vod.vod_play_from.split('$$$').forEach((it, index) => {
    obj[it] = index;
  });
  return obj;
};

/**
 * 处理待返回的vod数据|线路去除,排序,重命名
 * @param vod
 * @returns {*}
 */
const vodDeal = (vod) => {
  let vod_play_from = vod.vod_play_from.split('$$$');
  let vod_play_url = vod.vod_play_url.split('$$$');

  // 移除指定线路后的列表
  let tab_removed_list = vod_play_from;
  // 排序后的线路列表
  let tab_ordered_list = vod_play_from;
  // 线路重命名后的列表
  let tab_renamed_list = vod_play_from;
  // 定义实际要返回线路
  let tab_list = vod_play_from;
  // 选集列表根据线路排序
  let play_ordered_list = vod_play_url;

  // 判断有移除线路或者线路排序
  if (rule["tab_remove"]?.length > 0 || rule["tab_order"]?.length > 0) {
    // 获取原来线路的索引下标
    let tab_index_dict = get_tab_index(vod);

    if (rule["tab_remove"]?.length > 0) {
      tab_removed_list = vod_play_from.filter(it => !rule["tab_remove"].includes(it));
      tab_list = tab_removed_list;
    }

    if (rule["tab_order"]?.length > 0) {
      let tab_order = rule["tab_order"];
      tab_ordered_list = tab_removed_list.sort((a, b) => {
        return (tab_order.indexOf(a) === -1 ? 9999 : tab_order.indexOf(a)) - (tab_order.indexOf(b) === -1 ? 9999 : tab_order.indexOf(b));
      });
      tab_list = tab_ordered_list;
    }
    play_ordered_list = tab_list.map(it => vod_play_url[tab_index_dict[it]]);
  }

  if (rule["tab_rename"] && typeof rule["tab_rename"] === 'object' && Object.keys(rule["tab_rename"]).length > 0) {
    tab_renamed_list = tab_list.map(it => rule["tab_rename"][it] || it);
    tab_list = tab_renamed_list;
  }
  vod.vod_play_from = tab_list.join('$$$');
  vod.vod_play_url = play_ordered_list.join('$$$');
  return vod
}

/**
 * 判断是否需要解析
 * @param url
 * @returns {number|number}
 */
const tellIsJx = (url: string) => {
  try {
    const is_vip = !/\.(m3u8|mp4|m4a)$/.test(url.split('?')[0]) && isGenuine(url);
    return is_vip ? 1 : 0;
  } catch (e) {
    console.error('Error in tellIsJx:', e);
    return 1;
  }
};

/**
 * 选集播放点击事件解析
 * @param playObj
 * @returns {string}
 */
const playParse = (playObj) => {
  fetch_params = JSON.parse(JSON.stringify(rule_fetch_params));
  MY_URL = playObj.url;
  if (!/http/.test(MY_URL)) {
    try {
      MY_URL = base64Decode(MY_URL);
    } catch (e) {}
  }
  MY_URL = decodeURIComponent(MY_URL);
  var input = MY_URL;  //注入给免嗅js

  const common_play = {
    parse: 1,
    url: input,
    jx: tellIsJx(input)
  };

  let lazy_play = common_play;
  if (rule["play_parse"] && rule["lazy"] && typeof rule["lazy"] === 'string') {
    try {
      console.log(rule)
      const lazy_code = rule["lazy"].replace('js:','').trim();
      console.log('开始执行js免嗅=>' + lazy_code);
      eval(lazy_code);
      lazy_play = typeof input === 'object' ? input : {
        parse: 1,
        jx: tellIsJx(input),
        url: input
      };
    } catch (e) {
      console.log('js免嗅错误:', e);
    }
  }
  // print('play_json:'+typeof(rule.play_json));
  // console.log(Array.isArray(rule.play_json));
  if (Array.isArray(rule["play_json"]) && rule["play_json"].length > 0) { // 数组情况判断长度大于0
    const web_url = lazy_play.url;
    for (const pjson of rule["play_json"]) {
      if (pjson.re && (pjson.re === '*' || web_url.match(new RegExp(pjson.re)))) {
        if (pjson.json && typeof pjson.json === 'object') {
          lazy_play = Object.assign(lazy_play, pjson.json);
          break;
        }
      }
    }
  } else if(rule["play_json"] && !Array.isArray(rule["play_json"])) { // 其他情况 非[] 判断true/false
    lazy_play = Object.assign(lazy_play, { jx: 1 });
  } else if(!rule["play_json"]) { // 不解析传0
    lazy_play = Object.assign(lazy_play, { jx: 0 });
  }

  console.log(JSON.stringify(lazy_play));
  return lazy_play;
}

/**
 * 本地代理解析规则
 * @param params
 */
const proxyParse = (proxyObj) => {
  var input = proxyObj.params;

  if (proxyObj.proxy_rule) {
    console.log('准备执行本地代理规则:\n' + proxyObj.proxy_rule);

    try {
      eval(proxyObj.proxy_rule);

      if (input && input !== proxyObj.params && Array.isArray(input) && input.length === 3) {
        return input;
      } else {
        return [404, 'text/plain', 'Not Found'];
      }
    } catch (e) {
      return [500, 'text/plain', '代理规则错误: ' + e];
    }
  } else {
    return [404, 'text/plain', 'Not Found'];
  }
}

/**
 * 辅助嗅探解析规则
 * @param isVideoObj
 * @returns {boolean}
 */
const isVideoParse = (isVideoObj) => {
  var input = isVideoObj.url;

  if (!isVideoObj.t) { // t为假代表默认传的正则字符串
    const re_matcher = new RegExp(isVideoObj.isVideo, 'i');  // /g匹配多个,/i不区分大小写,/m匹配多行
    return re_matcher.test(input);
  } else {
    try {
      eval(isVideoObj.isVideo);
      return typeof input === 'boolean' ? input : false;
    } catch (e) {
      console.log('执行嗅探规则发生错误:', e);
      return false
    }
  }
}

/**
 * js源预处理特定返回对象中的函数
 * @param ext
 */
const init = (ext) => {
  console.log('[t3]init');
  try {
    let muban = getMubans();
    if (typeof ext == 'object') rule = ext;
    else if (typeof ext == 'string') {
      if (ext.startsWith('http')) {
        let js: any = request(ext, {'method':'GET'});
        if (js) eval(js.replace('var rule', 'rule'));
      } else eval(ext.replace('var rule', 'rule'));
    }
    if (rule["模板"] && muban.hasOwnProperty(rule["模板"])) {
      console.log(`继承模板:${rule["模板"]}`);
      rule = Object.assign(muban[rule["模板"]], rule);
    }
    /** 处理一下 rule规则关键字段没传递的情况 **/
    let rule_cate_excludes = (rule["cate_exclude"] || '').split('|').filter(it => it.trim());
    let rule_tab_excludes = (rule["tab_exclude"] || '').split('|').filter(it => it.trim());
    rule_cate_excludes = rule_cate_excludes.concat(CATE_EXCLUDE.split('|').filter(it => it.trim()));
    rule_tab_excludes = rule_tab_excludes.concat(TAB_EXCLUDE.split('|').filter(it => it.trim()));

    rule["cate_exclude"] = rule_cate_excludes.join('|');
    rule["tab_exclude"] = rule_tab_excludes.join('|');
    rule["host"] = rstrip(rule["host"] || '', '/');
    HOST = rule["host"];
    if (rule["hostJs"]) {
      console.log(`[t3][publish]检测到hostJs,准备执行...`);
      try {
        eval(rule["hostJs"]);
        rule["host"] = rstrip(HOST, '/');
        console.log(`[t3][publish]最新域名为${rule["host"]}`)
      } catch (e) {
        console.log(`[t3][publish]执行${rule["hostJs"]}获取host发生错误:${e}`);
      }
    }
    rule["url"] = rule["url"] || '';
    rule["double"] = rule["double"] || false;
    rule["homeUrl"] = rule["homeUrl"] || '';
    rule["detailUrl"] = rule["detailUrl"] || '';
    rule["searchUrl"] = rule["searchUrl"] || '';
    rule["homeUrl"] = rule["host"] && rule["homeUrl"] ? urljoin(rule["host"], rule["homeUrl"]) : (rule["homeUrl"] || rule["host"]);
    rule["detailUrl"] = rule["host"] && rule["detailUrl"] ? urljoin(rule["host"], rule["detailUrl"]) : rule["detailUrl"];
    rule["二级访问前"] = rule["二级访问前"] ||'';
    if(rule["url"].includes('[') && rule["url"].includes(']')){
      let u1 = rule["url"].split('[')[0];
      let u2 = rule["url"].split('[')[1].split(']')[0];
      rule["url"] = rule["host"] && rule["url"] ? urljoin(rule["host"], u1) + '['+urljoin(rule["host"], u2)+']' : rule["url"];
    } else {
      rule["url"] = rule["host"] && rule["url"] ? urljoin(rule["host"], rule["url"]) : rule["url"];
    }
    if(rule["searchUrl"].includes('[') && rule["searchUrl"].includes(']') && !rule["searchUrl"].includes('#')){
      let u1 = rule["searchUrl"].split('[')[0];
      let u2 = rule["searchUrl"].split('[')[1].split(']')[0];
      rule["searchUrl"] = rule["host"] && rule["searchUrl"] ? urljoin(rule["host"], u1) + '['+urljoin(rule["host"], u2)+']' : rule["searchUrl"];
    } else {
      rule["searchUrl"] = rule["host"] && rule["searchUrl"] ? urljoin(rule["host"], rule["searchUrl"]) : rule["searchUrl"];
    }

    rule["timeout"] = rule["timeout"] || 5000;
    rule["encoding"] = rule["编码"] || rule["encoding"] || 'utf-8';
    rule["search_encoding"] = rule["搜索编码"] || rule["search_encoding"] || '';
    rule["图片来源"] = rule["图片来源"] || '';
    rule["play_json"] = rule.hasOwnProperty('play_json') ? rule["play_json"] : [];
    rule["pagecount"] = rule.hasOwnProperty('pagecount') ? rule["pagecount"]: {};
    rule["proxy_rule"] = rule.hasOwnProperty('proxy_rule') ? rule["proxy_rule"] : '';
    rule["sniffer"] = rule.hasOwnProperty('sniffer') ? rule["sniffer"] : '';
    rule["sniffer"] = !!(rule["sniffer"] && rule["sniffer"]!=='0' && rule["sniffer"]!=='false');

    rule["isVideo"] = rule.hasOwnProperty('isVideo') ? rule["isVideo"] : '';

    rule["tab_remove"] = rule.hasOwnProperty('tab_remove') ? rule["tab_remove"] : [];
    rule["tab_order"] = rule.hasOwnProperty('tab_order') ? rule["tab_order"] : [];
    rule["tab_rename"] = rule.hasOwnProperty('tab_rename') ? rule["tab_rename"] : {};

    if (rule["headers"] && typeof(rule["headers"]) === 'object') {
      try {
        let header_keys = Object.keys(rule["headers"]);
        for (let k of header_keys) {
          if (k.toLowerCase() === 'user-agent') {
            let v = rule["headers"][k];
            if(['MOBILE_UA','PC_UA','UC_UA','IOS_UA','UA'].includes(v)){
              rule["headers"][k] = eval(v);
            }
          } else if (k.toLowerCase() === 'cookie') {
            let v = rule["headers"][k];
            if (v && v.startsWith('http')) {
              try {
                v = fetch(v);
                rule["headers"][k] = v;
              } catch (e) {
                console.log(`[t3][init]从${v}获取cookie发生错误:${e}`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`[t3][init]处理headers发生错误:${e}`);
      }
    }

    rule_fetch_params  = {'headers': rule["headers"] || false, 'timeout': rule["timeout"], 'encoding': rule["encoding"]};
    oheaders = rule["headers"] || {};
    // @ts-ignore
    RKEY = typeof key !=='undefined' && key ? key : 'drpy_' + (rule["title"] || rule["host"]);
    pre();
    init_test();
  } catch (e) {
    console.info('[t3][init]init_test发生错误:', e);
  }
}

let homeHtmlCache: any = undefined;

/**
 * js源获取首页分类和筛选特定返回对象中的函数
 * @param filter 筛选条件字典对象
 * @returns {string}
 */
const home = () => {
  const homeObj = {
    filter: rule["filter"] || false,
    MY_URL: rule["homeUrl"],
    class_name: rule["class_name"] || '',
    class_url: rule["class_url"] || '',
    class_parse: rule["class_parse"] || '',
    cate_exclude: rule["cate_exclude"],
  };

  console.log("[t3]home");
  return homeParse(homeObj);
};

/**
 * js源获取首页推荐数据列表特定返回对象中的函数
 * @param params
 * @returns {string}
 */
const homeVod = () => {
  const homeVodObj = {
    推荐: rule["推荐"],
    double: rule["double"],
    homeUrl: rule["homeUrl"],
    detailUrl: rule["detailUrl"]
  };

  console.log("[t3]homeVod");
  return homeVodParse(homeVodObj);
};

/**
 * js源获取分类页一级数据列表特定返回对象中的函数
 * @param tid 分类id
 * @param pg 页数
 * @param filter 当前选中的筛选条件
 * @param extend 扩展
 * @returns {string}
 */
const category = (tid, pg, filter, extend) => {
  const cateObj = {
    url: rule["url"],
    一级: rule["一级"],
    tid: tid,
    pg: parseInt(pg),
    filter: filter,
    extend: extend
  };

  console.log("[t3]category");
  return categoryParse(cateObj);
};

/**
 * js源获取二级详情页数据特定返回对象中的函数
 * @param vod_url 一级列表中的vod_id或者是带分类的自拼接 vod_id 如 fyclass$vod_id
 * @returns {string}
 */
const detail = (vod_url) => {
  let orId = vod_url;
  let fyclass = '';

  if (vod_url.includes('$')) {
    let tmp = vod_url.split('$');
    fyclass = tmp[0];
    vod_url = tmp[1];
  }

  let detailUrl = vod_url.split('@@')[0];
  let url;

  if (!detailUrl.startsWith('http') && !detailUrl.includes('/')) {
    url = rule["detailUrl"].replaceAll('fyid', detailUrl).replaceAll('fyclass',fyclass);
  } else if (detailUrl.includes('/')) {
    url = urljoin(rule["homeUrl"], detailUrl);
  } else {
    url = detailUrl;
  }

  let detailObj = {
    orId: orId,
    url: url,
    二级: rule["二级"],
    二级访问前: rule['二级访问前'],
    detailUrl: detailUrl,
    fyclass: fyclass,
    tab_exclude: rule["tab_exclude"],
  };

  console.log('[t3]detail');
  return detailParse(detailObj);
};

/**
 * js源选集按钮播放点击事件特定返回对象中的函数
 * @param flag 线路名
 * @param id 播放按钮的链接
 * @param flags 全局配置的flags是否需要解析的标识列表
 * @returns {string}
 */
const play = (flag, id, flags) => {
  const playObj = {
    url: id,
    flag,
    flags
  }

  console.log('[t3]play');
  return playParse(playObj);
}

/**
 * js源搜索返回的数据列表特定返回对象中的函数
 * @param wd 搜索关键字
 * @param quick 是否来自快速搜索
 * @returns {string}
 */
const search = (wd, quick, pg) => {
  let search_encoding = rule["search_encoding"]?.toLowerCase() || rule["encoding"]?.toLowerCase();
  
  if (search_encoding !== 'utf-8') {
    wd = encodeStr(wd, search_encoding);
  }

  const searchObj = {
    searchUrl: rule["searchUrl"],
    搜索: rule["搜索"],
    wd,
    pg: pg || 1,
    quick: quick,
  };

  return searchParse(searchObj);
};

/**
 * js源本地代理返回的数据列表特定返回对象中的函数
 * @param params 代理链接参数比如 /proxy?do=js&url=https://wwww.baidu.com => params就是 {do:'js','url':'https://wwww.baidu.com'}
 * @returns {*}
 */
const proxy = (params: string) => {
  let proxy_rule = rule["proxy_rul"]?.trim() || "";
  
  if (proxy_rule.startsWith('js:')) {
    proxy_rule = proxy_rule.replace('js:', '');
  }
  
  const proxyObj = {
    params: params,
    proxy_rule: proxy_rule
  };
  
  return proxyParse(proxyObj);
};

/**
 * 是否启用辅助嗅探功能,启用后可以根据isVideo函数进行手动识别为视频的链接地址。默认为false
 * @returns {*|boolean|boolean}
 */
const sniffer = () => {
  const enable_sniffer = rule["sniffer"] || false;
  
  if (enable_sniffer) {
    console.log('开始执行辅助嗅探代理规则...');
  }
  
  return enable_sniffer;
};

/**
 * 启用辅助嗅探功能后根据次函数返回的值识别地址是否为视频
 * @param url
 * @returns {boolean}
 */
const isVideo = (url: string) => {
  let t = 0;
  let is_video = rule["isVideo"]?.trim();

  if (is_video?.startsWith('js:')) {
    is_video = is_video.replace('js:', '');
    t = 1;
  };

  const isVideoObj = {
    url: url,
    isVideo: is_video,
    t: t,
  };
  
  const result = isVideoParse(isVideoObj);

  if (result) {
    console.log(`成功执行辅助嗅探规则并检测到视频地址:\n${rule["isVideo"]}`);
  };
  return result;
};

// [重要]防止树摇
const keepUnUse = {
  useful: (): void => {
    const _ = {
      UA, UC_UA, IOS_UA, // UA
      pdfa, pdfh, pd, // html parser
      log, oheaders, // global parms
      NOADD_INDEX, URLJOIN_ATTR, SELECT_REGEX, SELECT_REGEX_A, // REGEX
      urlDeal, setResult2, setHomeResult, rc, maoss, getProxyUrl, urljoin2, stringify, jsp, jq, buildUrl, $require, proxy, sniffer, isVideo,
      base64Encode, md5, decodeStr, RSA, // encryption and decryption
      clearItem, // cache
    };
    let temp = _;
    temp.stringify({});
  },
};

export {
  init,
  home,
  homeVod,
  category,
  detail,
  play,
  search,
  keepUnUse
};