import _ from "lodash";
import got from "got";
import * as cheerio from "cheerio";

const normalizePlayerName = (playerName) => {
    return playerName
        .replace(/[^a-zA-Z ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const PlayerRank = (playerName, rank) => {
    return {
        playerName: normalizePlayerName(playerName),
        rank,
    };
};

const sites = [
    {
        url: "https://theathletic.com/4307966/2023/03/29/nfl-draft-2023-prospect-rankings-board/",
        selector: ".fc-name",
        name: "The Athletic",
        callback: ($, $selected) => {
            const siteRankings = [];
            $selected.each((playerRank, el) => {
                const firstName = $(el).find(".fc-player-first-name").text();
                const lastName = $(el).find(".fc-player-last-name").text();

                const playerName = `${firstName} ${lastName}`;

                siteRankings.push(PlayerRank(playerName, playerRank + 1));
            });

            return siteRankings;
        },
    },
    {
        url: "https://www.nfl.com/news/daniel-jeremiah-s-top-50-2023-nfl-draft-prospect-rankings-4-0",
        selector: ".nfl-o-ranked-item",
        name: "Daniel Jeremiah 4.0",
        callback: ($, $selected) => {
            const siteRankings = [];
            $selected.each((playerRank, el) => {
                const playerName = $(el).find("a").text();

                siteRankings.push(PlayerRank(playerName, playerRank + 1));
            });

            return siteRankings;
        },
    },
    {
        url: "https://bleacherreport.com/articles/10071212-2023-nfl-draft-big-board-br-nfl-scouting-depts-rankings-as-draft-nears",
        selector: "#slide1 p",
        name: "Bleacher Report",
        callback: ($, $selected) => {
            const siteRankings = [];
            $selected.each((playerRank, el) => {
                if (playerRank <= 1) return;
                const playerName = $(el).text();

                //
                const name = playerName.slice(
                    playerName.indexOf(". ") + 2,
                    playerName.lastIndexOf(", ") - 4
                );

                siteRankings.push(PlayerRank(name, playerRank - 1));
            });

            return siteRankings;
        },
    },
];

const getPlayerRanksFromSite = async ({ url, selector, callback }) => {
    const allRankings = [];

    try {
        const { body: html } = await got(url);
        const $ = cheerio.load(html);
        const $selected = $(selector);

        const siteRankings = callback($, $selected);

        allRankings.push(...siteRankings);

        return allRankings;
    } catch (error) {
        console.log("ERROR:", error);
    }
};

const getAllPlayerRankings = async () => {
    const allRankings = [];

    for (const site of sites) {
        const siteRankings = await getPlayerRanksFromSite(site);

        allRankings.push(...siteRankings);
    }

    const rankings = _.chain(allRankings)
        .groupBy("playerName")
        .map((playerRankings, playerName) => {
            const rank = _.meanBy(playerRankings, "rank");

            return PlayerRank(playerName, rank);
        })
        .orderBy("rank", "asc")
        .value();

    return JSON.stringify(rankings);
};

console.log(await getAllPlayerRankings());

// console.log(await getPlayerRanksFromSite(sites[3]));
