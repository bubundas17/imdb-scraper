let mongoose = require('mongoose');

let Schema = mongoose.Schema({
    tconst: {type: String, unique: true, index: 1},
    title: String,
    titleType: {type: String, index: 1},
    primaryTitle: String,
    runtime: Number,
    startYear: Number,
    endYear: Number,
    rating: {
        averageRating: Number,
        numVotes: Number
    },
    yt: {
        title: String,
        link: String,
        videoID: String
    },
    poster: String,
    directors: [
        String
    ],
    countries: [
        String
    ],
    languages: [
        String
    ],
    release: Date,
    writers: [
        String
    ],
    stars: [
        String
    ],
    creators: [
        String
    ],
    genres: [
        String
    ],
    seasons: [
        Number
    ],
    plotKeywords: [
        String
    ],
    certificate: [
        String
    ],
    productionCo: {
        String
    },
    isAdult: {type: Boolean},
    story: String,
    summary: String,
    scraped: {type: Boolean, default: false},
    tyExtracted: {type: Boolean, default: false},
});

module.exports = mongoose.model('imdb', Schema);