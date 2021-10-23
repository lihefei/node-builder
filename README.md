# NodeBuilder 简易编译打包实现

## 安装

```
npm install
```

## 修改环境配置
修改.env.development或.env.production文件中APP_BASE_URL的值
```
APP_BASE_URL=http://xxx.xxx.xxx
```


## 自定义配置打包

编辑项目下build/index.js文件中的```compileBuilder```方法执行参数

```js
compileBuilder({
    replace: {
        oldContent: 'APP_BASE_URL', // 编译需要被替换的内容
        newContent: process.env.APP_BASE_URL // 替换的新内容
    },
    sourceDir: '../src', // 源文件路径（路径相对当前js的目录）
    outputDir: '../dist', // 打包输出路径（路径相对当前js的目录）
    suffix: 'html|css|js' // 需要被编译的文件
})
```
## 自定义配置静态服务启动

编辑项目下build/index.js文件中的```staticServer```方法执行参数

```js
staticServer({
    hostname: '127.0.0.1', // 主机
    port: 3000, // 端口
    root: '../dist', // 静态资源目录
    index: 'index.html', // 入口文件
    gzip: true, // 开启gzip压缩
    compress: 'html|css|js', // 压缩文件类型
    openBrowser: true // 打包完成后自动打开浏览器
});
```


## 运行命令打包

```
npm run dev
```
或
```
npm run build
```

## 查看打包效果
打包完成后浏览器自动打开静态目录预览打包效果