const fs = require('fs');
const path = require('path');
const glob = require('glob');
const CopyPlugin = require('copy-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const entryScripts = {
    'background.js': './src/background.js',

    ...glob.sync('./src/*.js').filter(file => !file.match(/background.js/)).reduce((obj, file) => {
        obj[file] = file;
        return obj;
    }, {})
}

/** Read the changelog.md file to determine the latest package version */
function getVersion() {
    const changelog = fs.readFileSync('changelog.md', 'utf-8')

    let version = null;
    changelog.split(/\r?\n/).forEach(line => {
        if (line.startsWith('Version') && !version) {
            version = line.replace('Version ','');
        }
    });

    return version;
}

/**
 * Transform the manifest with variables collected at build time.
 * Currently this only includes the version which gets collected from the changelog
 *
 * @param content
 * @returns {string}
 */
function transformManifest(content) {
    let manifest = JSON.parse(content.toString());

    manifest.version = getVersion();

    return JSON.stringify(manifest, null, 2);
}


module.exports = [
    {
        entry: entryScripts,
        devtool: 'inline-source-map',
        output: {
            filename: '[name]',
            path: path.resolve(__dirname, './build/')
        },
        plugins: [
            new CleanWebpackPlugin(),
            new CopyPlugin({
                patterns: [
                    { from: 'src/images', to: './src/images' },
                    { from: 'src/index.html', to: './src/index.html' },
                    {
                        from: 'manifest.json',
                        to: './manifest.json',
                        transform: transformManifest
                    }
                ],
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.js$/,
                    include: path.resolve(__dirname, 'src'),
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [ '@babel/preset-react' ]
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: [ 'style-loader', 'css-loader' ]
                },
                {
                    test: /\.scss$/,
                    use: ['style-loader', 'css-loader', 'sass-loader']
                }
            ]
        }
    }
]