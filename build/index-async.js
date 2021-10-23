const args = process.argv; // 获取node命令参数
const envPath = '.env' + (args[2] === '--mode' && args[3] ? `.${args[3]}` : ''); // 获取环境配置文件名
const dotenv = require("dotenv");
dotenv.config({ path: envPath }); // 配置环境
console.log(process.env.APP_BASE_URL)

const fs = require('fs'); //文件模块
const path = require('path'); //系统路径模块


compiler({
    original: /APP_BASE_URL/,
    target: process.env.APP_BASE_URL
})

/**
 * 异步复制文件或文件夹
 * @param {*} fromPath 源始路径，参数可以是文件或文件夹
 * @param {*} toPath 目标路径，参数可以是文件或文件夹
 */
function copyFileAsync(fromPath, toPath) {
    return new Promise((resolve, reject) => {
        fs.access(fromPath, err => {
            if (err) reject(err)
            fs.stat(fromPath, (err, stats) => {
                //如果是文件
                if (stats.isFile()) {
                    fs.copyFile(fromPath, toPath, (err) => {
                        err ? reject(err) : resolve();
                    });
                } else {
                    fs.access(toPath, err => {
                        // 如果不存在则创建
                        new Promise((resv, rejt) => {
                            err ? fs.mkdir(toPath, err => (err ? rejt(err) : resv())) : resv();
                        }).then(() => {
                            fs.readdir(fromPath, (err, filenames) => {
                                if (err) reject(err)
                                Promise.all(filenames.map(filename => {
                                    return new Promise((res, rej) => {
                                        let newFromPath = path.join(fromPath, filename)
                                        let newToPath = path.join(toPath, filename)
                                        fs.stat(newFromPath, (err, stats) => {
                                            if (err) rej(err)
                                                //如果是文件
                                            if (stats.isFile()) {
                                                fs.copyFile(newFromPath, newToPath, (err) => {
                                                    err ? rej(err) : res();
                                                });
                                            } else {
                                                //如果是目录递归调用
                                                res(copyFileAsync(newFromPath, newToPath))
                                            }
                                        })
                                    });
                                })).then(() => {
                                    resolve()
                                }).catch(reject);
                            });
                        }).catch(reject);
                    });
                }
            });
        })
    })
}

/**
 * 异步删除文件或文件夹
 * @param {*} targetPath 目标路径，参数可以是文件或文件夹
 */
function deleteFileAsync(targetPath) {
    return new Promise((resolve, reject) => {
        fs.access(targetPath, err => {
            if (err) reject(err)
            fs.stat(targetPath, (err, stats) => {
                if (err) reject(err)
                if (stats.isFile()) {
                    fs.unlink(targetPath, err => {
                        if (err) reject(err)
                        resolve()
                    })
                } else {
                    fs.readdir(targetPath, (err, filenames) => {
                        if (err) reject(err)
                        Promise.all(filenames.map(filename => {
                            return new Promise((res, rej) => {
                                let filePath = path.join(targetPath, filename)
                                fs.stat(filePath, (err, stats) => {
                                    if (err) rej(err)
                                        //如果是文件
                                    if (stats.isFile()) {
                                        fs.unlink(filePath, err => {
                                            if (err) rej(err)
                                            res()
                                        })
                                    } else {
                                        //如果是目录递归调用
                                        res(deleteFileAsync(filePath))
                                    }
                                })
                            })
                        })).then(() => {
                            fs.rmdir(targetPath, err => {
                                if (err) reject(err)
                                resolve()
                            })
                        }).catch(reject)
                    })
                }
            });
        })
    })
}




/**
 * 打包编译
 * @param {*} options.original 原始内容
 * @param {*} options.target 目标内容
 */
function compiler(options = {}) {
    const { original, target } = options;
    const distPath = path.join(__dirname, '../dist'); //历史打包生成的文件夹
    const srcPath = path.join(__dirname, '../src'); //源代码文件夹

    // 删除文件或文件夹
    deleteFileAsync(distPath).then((resolve) => {
        console.log('删除成功');

        // 复制文件或文件夹
        copyFileAsync(srcPath, distPath).then((resolve) => {
            console.log('复制成功');

            const mainPath = path.join(distPath, '/index.js'); // 待修改文件路径
            // 检测文件是否存在
            fs.access(mainPath, err => {
                if (err) {
                    throw `${mainPath}文件不存在`
                }
                // 读取文件内容
                fs.readFile(mainPath, (err, data) => {
                    if (err) {
                        throw `读取${mainPath}文件失败`
                    }
                    // 将原始内容替换为目标内容
                    const content = data.toString().replace(original, target);

                    // 写入文件
                    fs.writeFile(mainPath, content, (err) => {
                        if (err) {
                            throw `写入${mainPath}文件失败`
                        }
                        console.log(`写入${mainPath}文件成功`);
                    })
                });
            })

        }).catch(e => {
            console.log(e)
        });

    }).catch(e => {
        console.log(e)
    });
}