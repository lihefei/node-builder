const fs = require('fs'); //文件模块
const path = require('path'); //系统路径模块
const dotenv = require("dotenv"); // 环境变量加载工具

const args = process.argv; // 获取node命令参数
const envPath = (args.length > 3 && args[2] === '--mode' && args[3]) ? ('.env.' + args[3]) : '.env.production'; // 环境配置路径名
dotenv.config({ path: envPath }); // 加载配置文件

console.log(process.env.APP_BASE_URL)

/**
 * 编译打包
 * @param {*} options.replace.oldContent 原始内容
 * @param {*} options.replace.newContent 新内容
 * @param {*} options.sourceDir 源码路径(相对当前文件目录)
 * @param {*} options.outputDir 输出路径(相对当前文件目录)
 * @param {*} options.suffix 需要编译的文件格式(多个格式中间以|分隔)
 */
function compileBuilder(options) {
    const defaults = {
        replace: {
            oldContent: '',
            newContent: ''
        },
        sourceDir: '../src',
        outputDir: '../dist',
        suffix: ''
    }
    const settings = Object.assign({}, defaults, options);
    const outputDir = path.join(__dirname, settings.outputDir); //输出文件夹
    const sourceDir = path.join(__dirname, settings.sourceDir); //源代码文件夹

    // 删除文件或文件夹
    deleteFileSync(outputDir);
    // 复制文件或文件夹
    copyFileSync(sourceDir, outputDir, (filePath) => {
        const { suffix } = settings;
        const { oldContent, newContent } = settings.replace;

        // 替换文件内容
        replaceFileSync(filePath, oldContent, newContent, suffix);
    });
}

/**
 * 同步复制文件或文件夹
 * @param {String} fromPath 源始路径，参数可以是文件或文件夹
 * @param {String} toPath 目标路径，参数可以是文件或文件夹
 * @param {Function} cb 复制完文件(非文件夹)后执行的方法
 */
function copyFileSync(fromPath, toPath, cb) {
    try {
        fs.accessSync(toPath);
    } catch (err) {
        fs.mkdirSync(toPath)
    }

    const filenames = fs.readdirSync(fromPath);
    filenames.forEach((filename) => {
        const newFromPath = path.join(fromPath, filename);
        const newToPath = path.join(toPath, filename);
        const stat = fs.statSync(newFromPath);

        if (stat.isFile()) {
            fs.copyFileSync(newFromPath, newToPath);
            cb && cb(newToPath);
        }
        if (stat.isDirectory()) {
            copyFileSync(newFromPath, newToPath, cb);
        }
    })
}

/**
 * 同步替换文件内容
 * @param {String} filePath 文件路径
 * @param {*} oldContent 原始内容
 * @param {*} newContent 新内容
 * @param {String} suffix 后缀名，多个中间以|分隔
 */
function replaceFileSync(filePath, oldContent, newContent, suffix) {
    // 文件存在且类型是文件
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile() && oldContent && newContent) {
        // 获取路径后缀并去除前面的点
        let ext = path.extname(filePath);
        ext = ext ? ext.slice(1) : '';

        // 如果没有指定后缀，或者指定了后缀且匹配路径后缀，执行替换
        if (!suffix || (suffix.includes(ext))) {
            const data = fs.readFileSync(filePath); // 读取文件
            const content = data.toString().replace(oldContent, newContent); // 将原始内容替换为新内容
            fs.writeFileSync(filePath, content); // 写入文件
        }
    }
}


/**
 * 同步删除文件或文件夹
 * @param {String} filePath 文件路径，参数可以是文件或文件夹
 */
function deleteFileSync(filePath) {
    // 检测文件是否存在
    if (fs.existsSync(filePath)) {
        // 检测文件是目录
        if (fs.statSync(filePath).isDirectory()) {
            // 获取目录内所有文件名
            const filenames = fs.readdirSync(filePath);
            filenames.forEach((filename) => {
                const currentPath = path.join(filePath, filename);
                if (fs.statSync(currentPath).isDirectory()) {
                    deleteFileSync(currentPath);
                } else {
                    fs.unlinkSync(currentPath);
                }
            });
            fs.rmdirSync(filePath);
        } else {
            fs.unlinkSync(filePath);
        }
    }
}

/**
 * 静态服务器
 * @param {String} options.hostname 主机
 * @param {Number} options.port 端口
 * @param {String} options.root 静态资源目录
 * @param {String} options.index 入口页面
 * @param {Boolean} options.gzip 是否开启gzip压缩
 * @param {String} options.compress 指定压缩的文件格式(多个格式中间以|分隔)
 * @param {Boolean} options.openBrowser 自动打开默认浏览器
 */
function staticServer(options) {

    const http = require('http');
    const url = require('url');
    const zlib = require('zlib');
    const mime = require('mime-types');

    const defaults = {
        hostname: 'localhost',
        port: 80,
        root: '../dist',
        index: 'index.html',
        gzip: true,
        compress: 'html|css|js',
        openBrowser: false
    }

    const settings = Object.assign({}, defaults, options); // 合并配置

    const rootPath = path.join(__dirname, settings.root); // 获取静态根目录路径

    //创建服务程序
    const server = http.createServer((request, response) => {

        let pathname = url.parse(request.url).pathname; //获得请求url路径
        const filePath = path.join(rootPath, pathname.slice(-1) === '/' ? settings.index : pathname); // 如果url是/，默认加载index页面

        // 检测文件是否存在
        if (fs.existsSync(filePath)) {
            try {
                const mimeType = mime.lookup(filePath); //读取文件mime类型
                response.setHeader("Content-Type", mimeType || 'text/plain');

                const raw = fs.createReadStream(filePath); // 以流的形式读取文件
                const ext = path.extname(filePath).slice(1); // 获得文件扩展名
                const acceptEncoding = request.headers['accept-encoding'];
                const gzipExt = settings.gzip && settings.compress.includes(ext); // 开启了gzip压缩，且文件类型在压缩格式范围内

                if (gzipExt && acceptEncoding.includes('gzip')) {
                    response.writeHead(200, "Ok", { 'Content-Encoding': 'gzip' });
                    raw.pipe(zlib.createGzip()).pipe(response);
                } else if (gzipExt && acceptEncoding.includes('deflate')) {
                    response.writeHead(200, "Ok", { 'Content-Encoding': 'deflate' });
                    raw.pipe(zlib.createDeflate()).pipe(response);
                } else {
                    response.writeHead(200, "Ok");
                    raw.pipe(response);
                }

            } catch (err) {
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end(err);
            }
        } else {
            //如果文件不存在返回404
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.write("This request URL " + pathname + " was not found on this server.");
            response.end();
        }

    });

    // 打开默认浏览器
    const openDefaultBrowser = (url) => {
        const { exec } = require('child_process');
        console.log(process.platform)
        switch (process.platform) {
            case "darwin":
                exec('open ' + url);
                break;
            case "win32":
                exec('start ' + url);
                break;
            default:
                exec('xdg-open', [url]);
        }
    }

    //监听主机端口
    const { hostname, port, openBrowser } = settings;
    server.listen(port, hostname, () => {
        const url = `http://${hostname}:${port}`
        console.log(`服务器运行在 ${url}`);
        openBrowser && openDefaultBrowser(url); // 打开默认浏览器
    });
}


// 编译打包
compileBuilder({
    replace: {
        oldContent: 'APP_BASE_URL',
        newContent: process.env.APP_BASE_URL
    },
    sourceDir: '../src',
    outputDir: '../dist',
    suffix: 'html|css|js'
});

// 启动静态服务器
staticServer({
    hostname: '127.0.0.1',
    port: 3000,
    root: '../dist',
    index: 'index.html',
    gzip: true,
    compress: 'html|css|js',
    openBrowser: true
});