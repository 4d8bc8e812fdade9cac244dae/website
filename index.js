process.on('uncaughtException', (e) => console.error(e.stack))

const fs = require('fs')

function readPath(path) {
    return fs.readFileSync(require('path').join(__dirname, path))
}

const config = {
    assetsPath: '/assets/',
    exampleFilePath: 'frontend/systemPaths/debug/',
    examplePath: '/debug/',
    notFound: readPath('frontend/systemPaths/notfound/index.html'),
    port: null
}

const ServerClass = require('./server')
const server = new ServerClass(config.port)
try {
    server.startHttp()
} catch {}
try {
    server.startHttps(
        fs.readFileSync('/etc/letsencrypt/live/nekoisa.dev/privkey.pem'),
        fs.readFileSync('/etc/letsencrypt/live/nekoisa.dev/fullchain.pem')
    )
} catch {}

const domainMap = [
    {
        name: 'nekoisa.dev',
        custom: false
    },
    {
        name: 'doin-your.mom',
        custom: {
            pathMap: [
                {
                    pathName: '',
                    pathFile: readPath('./frontend/systemPaths/domains/doin-your.mom/index.html'),
                    runAsJavascript: false,
                },
                {
                    pathName: '/0.png',
                    pathFile: readPath('./frontend/systemPaths/domains/doin-your.mom/index.html'),
                    runAsJavascript: false,
                },
            ],
            assets: [],
            example: [],
            notFound: readPath('./frontend/systemPaths/domains/global/nginx_notfound.html'),
            toggles: {
                assets: false,
                example: false,
                notFound: true,
            }
        }
    },
    {
        name: 'ifyouseethisyoulikemenkissing.xyz',
        custom: {
            pathMap: [],
            assets: [],
            example: [],
            notFound: readPath('./frontend/systemPaths/domains/global/nginx_notfound.html'),
            toggles: {
                assets: false,
                example: false,
                notFound: true,
            }
        }
    }
]

const pathMap = [
    {
        pathName: '',
        pathFile: readPath('./frontend/paths/main/index.html'),
        runAsJavascript: false,
    },
    {
        pathName: '/dns',
        pathFile: readPath('./frontend/paths/domains/index.html'),
        runAsJavascript: false,
    },
    {
        pathName: '/domain',
        pathFile: readPath('./frontend/paths/domains/index.js'),
        runAsJavascript: true,
        allowedTypes: ['POST']
    },
    {
        pathName: '/robots.txt',
        pathFile: readPath('./assets/robots.txt'),
        runAsJavascript: false,
    },
    {
        pathName: '/easymc/tokens',
        pathFile: readPath('./frontend/paths/easymc/scraper.html'),
        runAsJavascript: false,
    },
    {
        pathName: '/info',
        pathFile: readPath('./frontend/scripts/info.js'),
        runAsJavascript: true
    },
    {
        pathName: '/headers',
        pathFile: readPath('./frontend/scripts/headers.js'),
        runAsJavascript: true
    },
    {
        pathName: '/countries',
        pathFile: readPath('./frontend/paths/countries/index.html'),
        runAsJavascript: false
    },
    {
        pathName: '/owoify',
        pathFile: readPath('./frontend/paths/owoify/index.html'),
        runAsJavascript: false
    },
    {
        pathName: '/.well-known/discord',
        pathFile: readPath('./assets/discord'),
        runAsJavascript: false
    },
]

const assets = [
    {
        pathName: 'style.css',
        pathFile: readPath('./assets/style.css')
    },
    {
        pathName: 'domains',
        pathFile: readPath('domains.json')
    },
    {
        pathName: 'rickroll.mp4',
        pathFile: readPath('./assets/rickroll.mp4')
    },
    {
        pathName: 'bomb.mid',
        pathFile: readPath('./assets/bomb.mid')
    },
    {
        pathName: 'countries.json',
        pathFile: readPath('./assets/countries.json')
    },
    {
        pathName: 'bomb.zip',
        pathFile: readPath('./assets/bomb.zip')
    },
]

const example = []

fs.readdirSync(config.exampleFilePath).forEach(dir => {
    example.push({
        pathName: dir,
        pathFile: readPath(`${config.exampleFilePath}/${dir}`)
    })
})

server.on('request', (req, res) => {
    let host = ''
    let domain = domainMap[0]
    let path = req.url || ''
    if (req && req.headers && req.headers['host']) host = req.headers['host']
    if (host) domain = domainMap.find(domain => domain.name === host)
    else domain = domainMap[0]
    if (!req.method) req.method = 'GET'
    if (path.endsWith('/')) path = path.slice(0, -1)

    if (!domain || !domain.custom) {
        if (path.startsWith(config.assetsPath)) {
            const requestedFilePath = path.substring(config.assetsPath.length)
    
            const requestedFile = assets.find(asset => asset.pathName === requestedFilePath)
    
            if (requestedFile) {
                res.statusCode = 200
                res.write(requestedFile.pathFile)
                res.end()
            } else {
                res.statusCode = 404
                res.write(config.notFound)
                res.end()
            }
    
            return
        }
    
        if (path.startsWith(config.examplePath)) {
            const requestedFilePath = path.substring(config.examplePath.length)
    
            const requestedFile = example.find(example => example.pathName === requestedFilePath)
    
            if (requestedFile) {
                res.statusCode = 200
                res.write(requestedFile.pathFile)
                res.end()
            } else {
                res.statusCode = 404
                res.write(config.notFound)
                res.end()
            }
    
            return
        }
        
        const foundPath = pathMap.find(pathData => pathData.pathName === path)
    
        if (foundPath) {
            if (foundPath.allowedTypes) {
                const allowed = foundPath.allowedTypes.findIndex(type => type === req.method)
                if (allowed === -1) {
                    res.statusCode = 400
                    res.write(`Invalid request method: ${req.method} expected ${foundPath.allowedTypes.join(' ')}`)
                    res.end()
                    return
                }
            }
            if (foundPath.runAsJavascript) {
                try {
                    eval(foundPath.pathFile.toString())(req, res)
                } catch (e) {
                    res.statusCode = 500
                    res.write(`500 Internal server error: ${e.message ? e.message : 'Unknown error'}`)
                    res.end()
                }
                return
            } else {
                res.statusCode = 200
                res.write(foundPath.pathFile)
                res.end()
                return
            }
        } else {
            res.statusCode = 404
            res.write(config.notFound)
            res.end()
        }
    } else { // AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
        if (domain.custom.toggles && domain.custom.toggles.assets && domain.custom.assets) {
            if (path.startsWith(config.assetsPath)) {
                const requestedFilePath = path.substring(config.assetsPath.length)
        
                const requestedFile = domain.assets.find(asset => asset.pathName === requestedFilePath)
        
                if (requestedFile) {
                    res.statusCode = 200
                    res.write(requestedFile.pathFile)
                    res.end()
                } else {
                    res.statusCode = 404
                    if (domain.custom.toggles && domain.custom.toggles.notFound && domain.custom.notFound) res.write(domain.custom.notFound)
                    else res.write(config.notFound)
                    res.end()
                }
        
                return
            }
        }

        if (domain.custom.toggles && domain.custom.toggles.example && domain.custom.example) {
            if (path.startsWith(config.examplePath)) {
                const requestedFilePath = path.substring(config.examplePath.length)
        
                const requestedFile = domain.assets.find(asset => asset.pathName === requestedFilePath)
        
                if (requestedFile) {
                    res.statusCode = 200
                    res.write(requestedFile.pathFile)
                    res.end()
                } else {
                    res.statusCode = 404
                    if (domain.custom.toggles && domain.custom.toggles.notFound && domain.custom.notFound) res.write(domain.custom.notFound)
                    else res.write(config.notFound)
                    res.end()
                }
        
                return
            }
        }
        
        if (domain.custom.toggles && domain.custom.pathMap) {
            const foundPath = domain.custom.pathMap.find(pathData => pathData.pathName === path)

            if (foundPath) {
                if (foundPath.allowedTypes) {
                    const allowed = foundPath.allowedTypes.findIndex(type => type === req.method)
                    if (allowed === -1) {
                        res.statusCode = 400
                        res.write(`Invalid request method: ${req.method} expected ${foundPath.allowedTypes.join(' ')}`)
                        res.end()
                        return
                    }
                }
                if (foundPath.runAsJavascript) {
                    try {
                        eval(foundPath.pathFile.toString())(req, res)
                    } catch (e) {
                        res.statusCode = 500
                        res.write(`500 Internal server error: ${e.message ? e.message : 'Unknown error'}`)
                        res.end()
                    }
                    return
                } else {
                    res.statusCode = 200
                    res.write(foundPath.pathFile)
                    res.end()
                    return
                }
            } else {
                res.statusCode = 404
                if (domain.custom.toggles && domain.custom.toggles.notFound && domain.custom.notFound) res.write(domain.custom.notFound)
                else res.write(config.notFound)
                res.end()
            }
        }
    }
})