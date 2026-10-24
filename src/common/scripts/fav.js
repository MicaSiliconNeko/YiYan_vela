/**
 * 收藏的存取层（极简，只依赖 @system.storage）。
 *
 * 为什么单独一个文件、且**绝对不能 import 句子库**：
 *   首页已经把整份句子库打进了自己的页面包；收藏页只需要"存下来的那几条"，
 *   一旦这里 import logic.js / data.js，收藏页就会再复制一份 ~700KB 的数据，
 *   直接逼近 1MB 页面包上限（而且手环内存本来就紧）。
 *
 * 存的是 {t: 正文, f: 出处} 而不是句子下标：
 *   数据一旦重新生成（换句子数、重新排序），下标就全错位了；存正文可保证收藏不漂移。
 */
import storage from '@system.storage';

const KEY = 'fav_v1';
const MAX = 200;          // 收藏条数上限，防止存储无限增长

let cache = null;         // 内存缓存：[{t, f}]，null 表示还没读过

function parse(raw) {
  if (!raw) {
    return [];
  }
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.length !== 'number') {
      return [];
    }
    return v;
  } catch (e) {
    console.error('一言：收藏数据解析失败 ' + e);
    return [];
  }
}

function load(cb) {
  if (cache) {
    cb(cache);
    return;
  }
  try {
    storage.get({
      key: KEY,
      default: '[]',
      success: (data) => {
        cache = parse(data);
        cb(cache);
      },
      fail: (data, code) => {
        console.error('一言：读取收藏失败 code=' + code);
        cache = [];
        cb(cache);
      }
    });
  } catch (e) {
    console.error('一言：读取收藏异常 ' + e);
    cache = [];
    cb(cache);
  }
}

function persist(list, cb) {
  cache = list;
  try {
    storage.set({
      key: KEY,
      value: JSON.stringify(list),
      success: () => {
        if (cb) {
          cb(true);
        }
      },
      fail: (data, code) => {
        console.error('一言：保存收藏失败 code=' + code);
        if (cb) {
          cb(false);
        }
      }
    });
  } catch (e) {
    console.error('一言：保存收藏异常 ' + e);
    if (cb) {
      cb(false);
    }
  }
}

function indexOfText(list, t) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] && list[i].t === t) {
      return i;
    }
  }
  return -1;
}

export default {
  /** 全部收藏，最近的在前 */
  all(cb) {
    load(cb);
  },

  /** 是否已收藏 */
  has(t, cb) {
    load((list) => {
      cb(indexOfText(list, t) >= 0);
    });
  },

  /** 切换收藏：cb(现在是否已收藏, 最新列表, 是否保存成功) */
  toggle(item, cb) {
    load((list) => {
      const i = indexOfText(list, item.t);
      let next;
      let now;
      if (i >= 0) {
        next = list.slice(0, i).concat(list.slice(i + 1));
        now = false;
      } else {
        next = [{ t: item.t, f: item.f || '' }].concat(list);
        if (next.length > MAX) {
          next = next.slice(0, MAX);
        }
        now = true;
      }
      persist(next, (ok) => {
        if (cb) {
          cb(now, next, ok);
        }
      });
    });
  },

  /** 移除指定正文的收藏 */
  remove(t, cb) {
    load((list) => {
      const i = indexOfText(list, t);
      if (i < 0) {
        if (cb) {
          cb(list);
        }
        return;
      }
      const next = list.slice(0, i).concat(list.slice(i + 1));
      persist(next, () => {
        if (cb) {
          cb(next);
        }
      });
    });
  }
};
