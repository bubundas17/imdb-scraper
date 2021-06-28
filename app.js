const cliProgress = require('cli-progress');
const request = require("request")
const requestProgress = require("request-progress")
const fs = require("fs")
const _colors = require('colors');
const path = require('path');
const gunzip = require("gunzip-file")
const csv = require('csv-parser')
const countLinesInFile = require('count-lines-in-file');
const transform = require('stream-transform')
const mongoose = require('mongoose');
const rp = require("request-promise");
const  youtube = require('@yimura/scraper')
const yt = new youtube.default('en-US');

const ImdbDB = require("./models/imdb")
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost/imdb', {
    useCreateIndex: true,
    useNewUrlParser: true
});

const scraper = require("./lib/scraper")

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

// let proxyUri = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all"
let proxyUri = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks4&timeout=1350&country=all&simplified=true"


let proxyList = [
]
// proxy.easyconfig.net/proxy-list?filter=ssl,http,alive

const files = [
    // "https://datasets.imdbws.com/name.basics.tsv.gz",
    // "https://datasets.imdbws.com/title.akas.tsv.gz",
    "https://datasets.imdbws.com/title.basics.tsv.gz",
    // "https://datasets.imdbws.com/title.crew.tsv.gz",
    // "https://datasets.imdbws.com/title.episode.tsv.gz",
    // "https://datasets.imdbws.com/title.principals.tsv.gz",
    "https://datasets.imdbws.com/title.ratings.tsv.gz"
]


async function getProxy() {
    let resp = await rp(proxyUri)

    resp = resp.split("\n").map(data => data.trim()).filter(n => n)

    proxyList = [...new Set(resp)]
    // console.log(proxyList.length)
    return proxyList
}

function randProxy() {
    return proxyList[Math.floor(Math.random() * proxyList.length)];
}

async function downloadFiles() {

    for (file of files) {
        await new Promise(resolve => {
            let isStarted = false
            let filename = path.basename(file);
            const bar1 = new cliProgress.Bar({
                format: filename + ' |' + _colors.cyan('{bar}') + '| {percentage}%',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true,
                fps: 60
            });
            requestProgress(request(file))
                .on("progress", state => {
                    if (!isStarted) {
                        bar1.start(state.size.total, 0)
                        isStarted = true
                    } else {
                        bar1.update(state.size.transferred)
                    }
                })
                .on('end', function () {
                    resolve()
                    bar1.stop()
                })
                .pipe(fs.createWriteStream('temp/' + filename));
        })

    }
}

async function extractFiles() {
    for (file of files) {
        await new Promise(resolve => {
            let filename = path.basename(file, ".gz");
            gunzip("temp/" + filename + ".gz", "temp/" + filename, function () {
                fs.unlinkSync("temp/" + filename + ".gz")
                console.log(filename + " Extracted")
                resolve()
            })

        })
    }
}

function extractNumber(num) {
    num = Number(num)
    if (num.toString() == "NaN") {
        return undefined;
    }
    return num
}

function splitTags(str) {
    if (str == "\\N") {
        return undefined
    }
    return str.split(",")
}


let MovieRrogress = 0

const MovieBasic = transform(async function (record, callback) {
    MovieRrogress++
    // console.log(record);
    if (record.titleType === 'movie' || record.titleType === "tvSeries") {

        // if(extractNumber(record.startYear) < 1990) return callback(null, "");
        // await ImdbDB.findOneAndUpdate({
        //     tconst: record.tconst,
        // }, {
        //     $set: {
        //         title: record.originalTitle,
        //         primaryTitle: record.primaryTitle,
        //         startYear: extractNumber(record.startYear),
        //         endYear: extractNumber(record.endYear),
        //         runtime: extractNumber(record.runtimeMinutes),
        //         genres: splitTags(record.genres)
        //     }
        // }, { upsert: true })

        try {
            await ImdbDB.create({
                tconst: record.tconst,
                titleType: record.titleType,
                isAdult: record.isAdult,
                title: record.originalTitle,
                primaryTitle: record.primaryTitle,
                startYear: extractNumber(record.startYear),
                endYear: extractNumber(record.endYear),
                runtime: extractNumber(record.runtimeMinutes),
                genres: splitTags(record.genres)
            })
        } catch {

        }

    }
    callback(null, "")
}, {
    parallel: 2
})


let RatingRrogress = 0

const RatingFitter = transform(async function (record, callback) {
    RatingRrogress++

    try {
        await ImdbDB.findOneAndUpdate({
            tconst: record.tconst,
        }, {
            $set: {
                rating: {
                    averageRating: record.averageRating,
                    numVotes: record.numVotes
                }
            }
        })
    } catch {

    }

    callback(null, "")
}, {
    parallel: 2
})


async function indexData() {
    for (file of files) {
        await new Promise(resolve => {
            let filename = path.basename(file, ".gz");

            console.log("Starting To index " + filename)
            filename = __dirname + "/temp/" + filename
            countLinesInFile(filename, (error, numberOfLines) => {
                const bar1 = new cliProgress.Bar({
                    format: path.basename(file, ".gz") + ' index |' + _colors.blue('{bar}') + '| {percentage}% | {value}/{total}',
                    barCompleteChar: '\u2588',
                    barIncompleteChar: '\u2591',
                    hideCursor: true,
                    fps: 60
                });


                if (path.basename(file, ".gz") == "title.basics.tsv") {
                    bar1.start(numberOfLines - 1, MovieRrogress)

                    setInterval(function () {
                        bar1.update(MovieRrogress)
                    }, 100)
                    var s = fs.createReadStream(filename)
                    s.pipe(csv({separator: '\t'}))
                        .pipe(MovieBasic)
                        .on("finish", function () {
                            bar1.stop()
                            resolve()
                        })
                } else {

                    bar1.start(numberOfLines - 1, RatingRrogress)
                    setInterval(function () {
                        bar1.update(RatingRrogress)
                    }, 100)


                    var s = fs.createReadStream(filename)
                    s.pipe(csv({separator: '\t'}))
                        .pipe(RatingFitter)
                        .on("finish", function () {
                            bar1.stop()
                            resolve()
                        })

                }

            });
        })
    }
}


async function ScrapeYtTrailer(){
    return new Promise(async resolve => {
        let documents = await ImdbDB.find({tyExtracted: false, "rating.numVotes": {$gte: 1000}, startYear:  {$gte: 1995}}).count()
        let corsor = await ImdbDB.find({tyExtracted: false, "rating.numVotes": {$gte: 1000}, startYear:  {$gte: 1995}}).lean().cursor()
        const bar1 = new cliProgress.Bar({
            format: ' Scraper |' + _colors.blue('{bar}') + '| {percentage}% | {value}/{total}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            fps: 60
        });
        let progress = 0
        bar1.start(documents, 0)
        corsor.eachAsync(async (doc) => {
            let reqtry = 0;
            let maxtry = 25;
            while(reqtry < maxtry){
                try {
                    let data = await yt.search(doc.primaryTitle + " Trailer", {
                        searchType: 'video'
                    })
                    let video = data.videos[0];
                    await ImdbDB.findOneAndUpdate({tconst: doc.tconst}, {$set: {yt: {title: video.title, link: video.link, duration: video.duration, videoID: video.id}, tyExtracted: true}})
                    progress++
                    bar1.update(progress)
                    return true;
                } catch(e) {
                    reqtry ++;
                    console.log("YT FETCh ERROR")
                }
            }
            progress++
            console.log("error")
            return 0
    }, {parallel: 50})
})
}


async function scrapeData() {
    return new Promise(async resolve => {
        // let documents = await ImdbDB.find({ summary: null, startYear: { $lte: 2019 }, tconst: "tt0988824" }).count()
        // let corsor = await ImdbDB.find({ summary: null, startYear: { $lte: 2019 }, tconst: "tt0988824"  }).lean().cursor()
        let documents = await ImdbDB.find({scraped: false}).count()
        let corsor = await ImdbDB.find({scraped: false}).lean().cursor()
        // corsor.sort({startYear: -1})
        const bar1 = new cliProgress.Bar({
            format: ' Scraper |' + _colors.blue('{bar}') + '| {percentage}% | {value}/{total}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            fps: 60
        });
        let progress = 0
        bar1.start(documents, 0)
        corsor.eachAsync(async (doc) => {
            let reqtry = 0;
            let maxtry = 25;
            while(reqtry < maxtry){
                try {
                    let data = await scraper.scrape(doc.tconst, randProxy())
                    data.title = undefined;
                    delete data.title
                    data.story = data.storyline
                    // data.title = undefined
                    // console.log(data)
                    await ImdbDB.findOneAndUpdate({tconst: doc.tconst}, {$set: {...data, scraped: true}})
                     progress++
                     bar1.update(progress)
                     return 1;
                } catch (e) {
                    reqtry ++;
                    // console.log(e)
                }
            }
            progress++
            console.log("error")
            return 0

        }, {parallel: 500})


    })

}


var db = mongoose.connection;
db.once('open', async function () {
    console.log("MongoDb Connected!");
    // await downloadFiles()
    // await extractFiles()
    // await indexData()
    // await getProxy()
    // await scrapeData()
    await ScrapeYtTrailer()
});






