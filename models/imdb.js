let mongoose = require('mongoose');

let Schema = mongoose.Schema({
    tconst: {type: String, unique: true, index: 1},
    title: String,
    primaryTitle: String,
    runtime: Number,
    startYear: Number,
    endYear: Number,
    rating: {
        averageRating: Number,
        numVotes: Number
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
    story: String,
    summary: String,
});

module.exports = mongoose.model('imdb', Schema);