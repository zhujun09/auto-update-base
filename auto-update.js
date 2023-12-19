/**
 * 获取build之后app.js标签的哈希值（文件指纹）
 * 每次build都会生成一个新的哈希字符串，避免缓存问题, 也可作为版本管理的版本号
 * 文件指纹通常有两个用途：
 *    版本管理： 在发布版本时，通过文件指纹来区分 修改的文件 和 未修改的文件。
 *    使用缓存： 未修改的文件，文件指纹保持不变，浏览器继续使用缓存访问。
 * @date 2023/12/05
 * @author zhujun
 */

import { Notification } from 'element-ui'
let instanceNotification = null
let timer = null
let oldVersion = ''
let newVersion = ''
let isIngore = false
const isDev = process.env.NODE_ENV === 'development'
const timeInterval = 1 * 60 * 1000 // 1分钟
console.log(`%c` + `auto-update.js` + ` is running`, `border:1px dashed #0709FF;font-weight: bold; color: #0709FF;padding: 4px 12px; border-radius: 4px;`)

/**
 * 获取app.js 的哈希值
 * @param {array} scripts - scripts标签元素
 */
function getAppHash(scripts) {
  let version = ''
  for (let i = 0; i < scripts.length; i++) {
    let src = scripts[i].getAttribute('src')
    if (src && src.search(/app./) !== -1) {
      // 正则返回中间版本号(如果没有，返回空)
      let regRes = /app\.(.*?).js/
      if (regRes.test(src)) version = regRes.exec(src)?.[1]
    }
  }
  return version
}

/**
 * 获取初始页面中的 script 来获取app.js 的哈希值
 */
function getLocalHash() {
  return getAppHash(document.querySelectorAll('script'))
}

// 获取页面（index.html）的app.js哈希值
function checkHash() {
  return new Promise((resolve, reject) => {
    // 加上时间戳，防止缓存
    fetch(`${ location.pathname }?t=` + Date.now()).then(async res => {
      let html = await res.text()
      // 转成字符串判断
      let doc = new DOMParser().parseFromString(html, 'text/html')
      let newVersion = getAppHash(doc.querySelectorAll('script'))
      resolve(newVersion)
    }).catch(err => {
      console.log('获取版本号失败', err)
      reject(err)
    })
  })
}

window.__reload = function() {
  location.reload()
}

window.__ingore = async function() {
  isIngore = true
  oldVersion = await checkHash()
  instanceNotification.close()
  instanceNotification = null
}

// 生产环境调用
!isDev && update()

function update() {
  clearInterval(timer)
  // 定时执行，自动更新逻辑(每10s检测一次 )
  timer = setInterval(async () => {
    // 旧的 version
    if (!isIngore) {
      oldVersion = getLocalHash()
    }
    // 新的版本线上服务器返回
    newVersion = await checkHash()
    // 如果不一样，就进行刷新
    if (oldVersion && newVersion) {
      if (oldVersion !== newVersion && !instanceNotification) {
        instanceNotification = Notification({
          title: '发现新的版本~',
          type: 'info',
          duration: 0,
          showClose: false,
          dangerouslyUseHTMLString: true,
          customClass: 'auto-update-notification',
          message: `
          <div class="update">
            <button class="update-btn danger" onClick="__ingore()">忽略此次</button>
            <button class="update-btn success" onClick="__reload()">立即更新</button>
          </div>`
        })
      }
    }
  }, timeInterval)
}

