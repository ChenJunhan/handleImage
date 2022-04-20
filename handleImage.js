/*
 * 上传图片处理
 * @Author: ChenJunhan 
 * @Date: 2022-04-19 17:19:34 
 * @Last Modified by: ChenJunhan
 * @Last Modified time: 2022-04-20 16:14:02
 */

// import EXIF from 'exif-js' // 模块导入
(function (root, factory) {
	/* CommonJS */
  if (typeof exports == 'object') module.exports = factory()

  /* AMD module */
  else if (typeof define == 'function' && define.amd) define(factory)

  /* Global */
  else root.IH = factory()

})(this, function () {
  var IH = {

    /**
     * 可传的参数
     * @param {String} inputType 上传图片形式 path-文件路径 / file-文件 / base64
     * @param {String} outputType 生成图片形式 path-文件路径 / file-文件流 / base64
     * @param {String} imgType 图片base64格式
     * @param {Number} compressPixel 图片压缩宽高度像素
     * @param {Boolean} isCompress 是否需要压缩
     * @param {Function} success 成功回调
     * @param {Function} fail 失败回调
     */
    params: { 
    }, 

    imgType: 'png', // 默认图片转换格式
  
    isSupportAutoRotate: false, // 浏览器是否支持自动翻转
  
    compressPixel: 1920, // 默认压缩像素

    /**
     * 文件转base64
     * @param {File} files
     * @return {*} 
     */
    fileToBase64 (files) {
      return new Promise((resolve, reject) => {
        let reader = new FileReader()
        reader.onload = function(e) {
          resolve(e.target.result)
        }
        reader.readAsDataURL(files)
      })
    },
  
  
    /**
     * base64转文件
     * @param {String}} dataurl base64
     * @param {String} filename 文件名
     * @return {*} 
     */
    base64toFile (dataurl, filename) {
      let arr = dataurl.split(',')
      let mime = arr[0].match(/:(.*?);/)[1]
      let bstr = atob(arr[1])
      let n = bstr.length
      let u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], filename, {type: mime})
    },
  
  
    /**
     *  路径转base64
     * @param {String} path 文件路径
     * @param {String} type base64格式
     * @return {*} 
     */
    pathToBase64 (path, type) {
      type = `image/${type || this.imgType}`
      return new Promise((resolve, reject) => {
        let image = new Image()
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = path
        image.onload = () => {
          var canvas = document.createElement('canvas')
          var context = canvas.getContext('2d')
          let minwidth = image.width
          let minheight = image.height
          canvas.width = minwidth
          canvas.height = minheight
          context.drawImage(image, 0, 0, minwidth,minheight)
          let dataURL = canvas.toDataURL(type, 0.9)
          resolve(dataURL)
          console.log(dataURL)
        }
      })
    },
  
  
    /**
     * 处理图片旋转
     * @param {Array}} imgList 图片列表
     * @param {*} params
     * @return {*} 
     */
    async imageRotate(imgList, params = {}) { 
      this.params = params
      let transformMethod = params.inputType === 'path' ? this.pathToBase64 : this.fileToBase64
      let temp = []
      try {
        for (let i = 0; i < imgList.length; i++) {
          if (params.inputType === 'base64') {
            temp.push(imgList[i])
            continue
          }
          let v = await transformMethod.bind(this)(imgList[i])
          temp.push(v)
        }
        imgList = [...temp]
        temp = []
        for (let i = 0; i < imgList.length; i++) {
          let img = await this._rotateInfo(imgList[i])
          temp.push(img)
        }
        params.success(temp)
        return temp
      } catch (error) {
        params.fail && self.params.fail(error)
        console.error(error)
      }
    },
  
  
    /**
     * 旋转处理
     * @param {*} items 图片
     * @return {*} 
     */
    _rotateInfo (items) {
      var imgType = `image/${this.params.imgType || this.imgType}`
      var compressPixel = this.params.compressPixel || self.compressPixel
      return new Promise((resolve, reject) => {
        let imgs = new Image()
        imgs.src = items
        let canvas = document.createElement("canvas")
        let context= canvas.getContext("2d")
        let self = this
        imgs.onload = function() {
          try {
            EXIF.getData(imgs, function () { // 获取图片信息
              let type = EXIF.getTag(this, 'Orientation') || 1
              if (self.isSupportAutoRotate) type = 1
              let minWidth = imgs.width
              let minheight = imgs.height
              if (self.params.isCompress) { // 是否需要对图片进行压缩，默认压缩像素为1920
                if (minWidth > minheight) {
                  if (minWidth > compressPixel) {
                    minheight = (compressPixel / minWidth) * minheight
                    minWidth = compressPixel
                  }
                } else {
                  if (minheight > compressPixel) {
                    minWidth = (compressPixel / minheight) * minWidth
                    minheight = compressPixel
                  }
                }
              }
              console.log('exif:', type, self.isSupportAutoRotate, EXIF.getTag(this, 'Orientation'))
              switch (type) {
                case 1: // 正常可以压缩图片
                  canvas.width = minWidth
                  canvas.height = minheight
                  context.rotate(0 * Math.PI / 180)
                  context.drawImage(imgs, 0, 0, minWidth, minheight)
                  break
                case 6: // 顺时针旋转90度
                  canvas.width = minheight
                  canvas.height = minWidth
                  context.rotate(90 * Math.PI / 180)
                  context.drawImage(imgs, 0, -minheight, minWidth, minheight)
                  break
                case 8: // 逆时针 90
                  canvas.width = minheight
                  canvas.height = minWidth
                  context.rotate(-90 * Math.PI / 180)
                  context.drawImage(imgs, -minWidth, 0, minWidth, minheight)
                  break
                case 3: // 转180度
                  canvas.width = minWidth
                  canvas.height = minheight
                  context.rotate(180 * Math.PI / 180)
                  context.drawImage(imgs, -minWidth,-minheight, minWidth, minheight)
                  break
              }
              if (self.params.outputType === 'base64') { // 返回base64
                let base64 = canvas.toDataURL(imgType, 0.9)
                resolve(base64)
              } else if (self.params.outputType === 'file') { // 返回文件流格式
                let base64 = canvas.toDataURL(imgType, 0.9)
                let file = self.base64toFile(base64, `${+new Date()}.png`)
                resolve(file)
              } else { // 返回文件的存在URL
                canvas.toBlob((blob)=>{
                  let url = URL.createObjectURL(blob) // 获取当前文件的一个内存URL
                  resolve(url)
                },"image/png", 0.9)
              }
            })
          } catch (error) {
            self.params.fail && self.params.fail(error)
            console.error(error)
          }
        }
      })
    },
  
  
    /**
     * 检查浏览器是否支持自动翻转图片
     * @return {Boolean} 
     */
    checkBrowserOrientation() {
      return new Promise((resolve, reject) => {
        // black+white 3x2 JPEG, with the following meta information set:
        // - EXIF Orientation: 6 (Rotated 90° CCW)
        // Image data layout (B=black, F=white):
        // BFF
        // BBB
        let testImageURL =
        'data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAA' +
        'AAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA' +
        'QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE' +
        'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAIAAwMBEQACEQEDEQH/x' +
        'ABRAAEAAAAAAAAAAAAAAAAAAAAKEAEBAQADAQEAAAAAAAAAAAAGBQQDCAkCBwEBAAAAAAA' +
        'AAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AG8T9NfSMEVMhQ' +
        'voP3fFiRZ+MTHDifa/95OFSZU5OzRzxkyejv8ciEfhSceSXGjS8eSdLnZc2HDm4M3BxcXw' +
        'H/9k='
        let isSupport = false
        let img = document.createElement('img')
        img.onload = function () {
          // Check if the browser supports automatic image orientation:
          isSupport = img.width === 2 && img.height === 3
          resolve(isSupport)
        }
        img.src = testImageURL
      })
    },
    
  
    /**
     * 初始化
     */
    async init() {
      this.isSupportAutoRotate = await this.checkBrowserOrientation()
    }
  }
  IH.init()
  
  return IH
})