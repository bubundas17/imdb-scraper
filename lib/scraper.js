const rp = require("request-promise");
const cheerio = require('cheerio')
const fetch = require('make-fetch-happen').defaults({
    timeout: 1000 * 120,
    maxSockets: 15,
    retry: {
        retries: 1,
        // maxTimeout: 300,
        // minTimeout: 150
    }
})

const baseURL = "https://www.imdb.com/"

module.exports = {

    scrape(id, proxy) {
        return new Promise(async (resolve, reject) => {
            // var options = {
            //     uri: `${baseURL}/title/${id}`,
            //     transform: function (body) {
            //         return cheerio.load(body);
            //     },
            //     proxy: proxy ? "http://" + proxy : null
            // };


            let fetchcall = null

            if (proxy) {
                let proxySplit = proxy.split(":")
                fetchcall = fetch(`${baseURL}/title/${id}`, {
                    proxy: {
                        protocol: "socks4:",
                        hostname: proxySplit[0],
                        port: proxySplit[1]
                    }
                })
            } else {
                fetchcall = fetch(`${baseURL}/title/${id}`)
            }


            fetchcall.then(data => data.text())
                .then(data => cheerio.load(data))
                .then($ => {
                    const output = {}

                    // Extracting Title
                    output.title = $("div.titleBar > div.title_wrapper > h1")
                        .text()
                        .trim()
                        .replace(/\s\([0-9]...\)$/, "")

                    // Extracting Summery

                    output.summary = $("div.plot_summary > div.summary_text")
                        .clone()    //clone the element
                        .children() //select all the children
                        .remove()   //remove all the children
                        .end()  //again go back to selected element
                        .text()
                        .trim().replace("»", "")


                    output.storyline = $("#titleStoryLine > div:nth-child(3) > p > span").text().trim()

                    output.poster = $("div.poster > a > img").attr("src")
                    output.seasons = [];
                    if ($("#title-episode-widget").length) {
                        for (let a of $("#title-episode-widget > div > div:nth-child(4) > a").get()) {
                            let episode = $(a).text()
                            episode = episode.trim();
                            if (parseInt(episode)) output.seasons.push(parseInt(episode))
                        }
                    }


                    //
                    // $("#titleDetails > div:nth-child(4) > a").get().forEach(function (entry) {
                    //     output.countries.push($(entry).text())
                    // });

                    // output.languages = []
                    // $("#titleDetails > div:nth-child(5) > a").get().forEach(function (entry) {
                    //     output.languages.push($(entry).text())
                    // });


                    $(".txt-block").get().forEach(function (entry) {
                        let text = $(entry).text().trim()

                        const releaseDateTest = /^Release Date(.+)$/gs
                        if (releaseDateTest.test(text)) {
                            output.release = $(entry)
                                .clone()    //clone the element
                                .children() //select all the children
                                .remove()   //remove all the children
                                .end()  //again go back to selected element
                                .text()
                                .trim()
                            output.release = new Date(output.release) == "Invalid Date" ? undefined : new Date(output.release)
                            return;
                        }

                        const countryTest = /^Country(.+)$/gs
                        if (countryTest.test(text)) {
                            output.countries = []
                            cheerio.load(entry)("a").get().forEach(function (entry) {
                                output.countries.push($(entry).text())
                            });
                            return;
                        }

                        const languageTest = /^Language(.+)$/gs
                        if (languageTest.test(text)) {
                            output.languages = []
                            cheerio.load(entry)("a").get().forEach(function (entry) {
                                output.languages.push($(entry).text())
                            });
                            return;
                        }

                        const ProductionCo = /^Production\sCo(.+)$/gs
                        if (ProductionCo.test(text)) {
                            output.productionCo = []
                            cheerio.load(entry)("a").get().forEach(function (entry) {
                                output.productionCo.push($(entry).text().trim())
                                output.productionCo = output.productionCo.filter(v => !v.includes("See more"))
                            });
                            return;
                        }

                        // console.log(text)
                    })


                    let stars = []
                    let directors = []
                    let writers = []

                    let starsTester = /^Star(.+)$/gs
                    let writersTester = /^Writer(.+)$/gs
                    let directorTester = /^Director(.+)$/gs
                    let creatorTester = /^Creator(.+)$/gs
                    let genresTester = /^Genres(.+)$/gs
                    let PlotKeywordsTester = /^Plot\sKeywords(.+)$/gs
                    let CertificateTester = /^Certificate(.+)$/gs


                    $("div.see-more.inline.canwrap").get().forEach(function (entry) {
                        let text = $(entry).text().trim()
                        if (genresTester.test(text)) {
                            text = text.replace(/^Genres:/gs, "").trim()
                            text = text.split("|").map(v => v.trim())
                            text = text.filter(v => !v.includes("See All"))
                            output.genres = text;
                            // output.genres = text.split(",").map(data => data.trim())
                            return
                        }

                        if (PlotKeywordsTester.test(text)) {
                            text = text.replace(/^Plot\sKeywords:/gs, "").trim()
                            text = text.split("|").map(v => v.trim())
                            text = text.filter(v => !v.includes("See All"))
                            output.plotKeywords = text;
                            // output.genres = text.split(",").map(data => data.trim())
                            return
                        }

                    })
                    $("#titleStoryLine > div.txt-block").get().forEach(function (entry) {
                        let text = $(entry).text().trim()

                        if (CertificateTester.test(text)) {
                            text = text.replace(/^Certificate:/gs, "").trim()
                            text = text.split("|").map(v => v.trim())
                            text = text.filter(v => !v.includes("See all"))
                            output.certificate = text;
                            // output.genres = text.split(",").map(data => data.trim())
                            return
                        }
                    })



                        $("div.plot_summary_wrapper > div.plot_summary > div").get().forEach(function (entry) {
                        let text = $(entry).text().trim()
                        if (starsTester.test(text)) {
                            text = text.replace(/^Sta(.+):/gs, "").trim()
                            text = text.split("|")[0].trim()
                            output.stars = text.split(",").map(data => data.trim())
                            return
                        }

                        if (writersTester.test(text)) {
                            text = text.replace(/^Write(.+):/gs, "").trim()
                            text = text.split("|")[0].trim()
                            output.writers = text.split(",").map(data => data.trim())
                            return
                        }

                        if (directorTester.test(text)) {
                            text = text.replace(/^Directo(.+):/gs, "").trim()
                            text = text.split("|")[0].trim()
                            output.directors = text.split(",").map(data => data.trim())
                            return
                        }
                        if (creatorTester.test(text)) {
                            text = text.replace(/^Creato(.+):/gs, "").trim()
                            text = text.split("|")[0].trim()
                            output.creators = text.split(",").map(data => data.trim())
                            return
                        }


                    });


                    resolve(output)
                }).catch(reject)

        })
    }


}