// const scraper = require("./lib/scraper")

// scraper.scrape("tt0000009").then(console.log)
// scraper.scrape("tt0000679").then(console.log)
// scraper.scrape("tt4154756").then(console.log)




const  youtube = require('@yimura/scraper')

// This will set the language to French from France globally
const yt = new youtube.default('en-US');

// Sets the language communicated to YouTube to Dutch from Belgium for this search
const results = yt.search('Infinity War Trailer', {
    searchType: 'video' // video is the default search type
});

results.then(console.log)