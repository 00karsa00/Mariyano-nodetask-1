const allPlayers = require("../data/players.json");
const matchResult = require("../data/match.json")
const repository = require("./repository");

exports.sampleCreate = async (req, res) => {
    await repository.sampleCreate();
    res.send({ status: 1, message: "demo" });
}

exports.createTeam = async (req, res, next) => {
    try {
        let { teamName, players, captain, viceCaptain } = req.body;
        const matchDetails = {
            WK: 0,
            BAT: 0,
            AR: 0,
            BWL: 0,
            team1Name: null,
            team2Name: null,
            team1Payer: 0,
            team2Payer: 0
        }
        if (!teamName) {
            throw new Error('Team name is required');
        }
        if (!players) {
            throw new Error('players name list is required');
        }
        if (!captain) {
            throw new Error('captain name is required');
        }
        if (viceCaptain == captain) {
            throw new Error('captain and vice captain name is same');
        }
        if (!viceCaptain) {
            throw new Error('vice captain name is required');
        }
        if (players.length < 11) {
            throw new Error('must have 11 players required');
        }
        let playerList = [];
        let notFoundPlayer = [];
        let alreadyExitPlayer = [];
        players.map((item, index) => {
            let player = allPlayers.find((details) => details.Player == item);
            if (player) {
                if (!playerList.find((details) => details.Player == player.Player)) {
                    player.score = 0;
                    playerList.push(player);
                    if (!matchDetails.team1Name || matchDetails.team1Name == player.Team) {
                        if (!matchDetails.team1Name) matchDetails.team1Name = player.Team;
                        matchDetails.team1Payer++;
                    } else if (!matchDetails.team2Name || matchDetails.team2Name == player.Team) {
                        if (!matchDetails.team2Name) matchDetails.team2Name = player.Team;
                        matchDetails.team2Payer++;
                    }
                    switch (player.Role) {
                        case "BOWLER": matchDetails.BWL++; break;
                        case "WICKETKEEPER": matchDetails.WK++; break;
                        case "BATTER": matchDetails.BAT++; break;
                        case "ALL-ROUNDER": matchDetails.AR++; break;
                    }
                } else {
                    alreadyExitPlayer.push(item)
                }
            } else {
                notFoundPlayer.push(item)
            }
        })
        if (notFoundPlayer.length) {
            return res.status(201).json({ error: 'Player are not found', players: notFoundPlayer, success: false });
        }
        if (alreadyExitPlayer.length) {
            return res.status(201).json({ error: 'Duplicate player found', players: alreadyExitPlayer, success: false });
        }
        if (matchDetails.BWL < 1) {
            throw new Error(`At least 1 bowler is required`);
        }
        if (matchDetails.BWL > 8) {
            throw new Error(`Maximum of 8 bowler are allowed`);
        }
        if (matchDetails.WK < 1) {
            throw new Error(`At least 1 Wicket Keeper  is required`);
        }
        if (matchDetails.WK > 8) {
            throw new Error(`Maximum of 8 Wicket Keeper are allowed`);
        }
        if (matchDetails.BAT < 1) {
            throw new Error(`At least 1 Batter  is required`);
        }
        if (matchDetails.BAT > 8) {
            throw new Error(`Maximum of 8 Batter are allowed`);
        }
        if (matchDetails.AR < 1) {
            throw new Error(`At least 1 All Rounder is required`);
        }
        if (matchDetails.AR > 8) {
            throw new Error(`Maximum of 8 All Rounder are allowed`);
        }
        await repository.insertDate({
            teamName,
            players: playerList,
            captain,
            viceCaptain,
            team1: matchDetails.team1Name,
            team2: matchDetails.team2Name,
            status: "pending"
        })
        res.status(201).json({ message: "Team Created Successfully", success: true })
    } catch (error) {
        next(error)
    }
}


exports.processResult = async (req, res, next) => {
    try {
        let result = await repository.findAll({ status: "pending" });
        if (!result.length) {
            return res.status(201).json({ message: "All team result  is already upto dated", success: false })
        }
        let scoreForEachPalyer = {};
        const addPlayerInObject = (player) => {
            scoreForEachPalyer[player] = {
                run: 0,
                foure: 0,
                six: 0,
                isOut: 0,
                wickets: 0,
                bowledORlbw: 0,
                maintainOver: 0,
                catchs: 0,
                stumping: 0,
                runOut: 0,
                score: 0,
                overs: {}
            };
        }
        matchResult.map(async (item) => {
            if (!scoreForEachPalyer[item.batter]) {
                addPlayerInObject(item.batter)
            }
            if (!scoreForEachPalyer[item.bowler]) {
                addPlayerInObject(item.bowler)
            }
            let playerbower = scoreForEachPalyer[item.bowler];
            if(playerbower.overs[item.overs]) {
                playerbower.overs[item.overs].push(item.total_run)
            } else {
                playerbower.overs[item.overs] = [item.total_run]
            }
          
            // update over is maintain over;
            if(playerbower.overs[item.overs].length == 6 && playerbower.overs[item.overs].reduce((a,b) => a+b) == 0) {
                playerbower.score += 12;
                playerbower.maintainOver++;
            }

            // update player batting score.
            if (item.batsman_run > 0 || item.isWicketDelivery == 1) {
                let playerBatter = scoreForEachPalyer[item.batter];
                playerBatter.score += item.batsman_run;
                playerBatter.run += item.batsman_run;
                if (item.batsman_run == 4) {
                    playerBatter.foure++;
                    playerBatter.score += 1
                }
                if (item.batsman_run == 6) {
                    playerBatter.six++;
                    playerBatter.score += 2
                }
                if (playerBatter.run == 30) {
                    playerBatter.score += 4
                }
                if (playerBatter.run == 50) {
                    playerBatter.score += 8
                }
                if (playerBatter.run == 100) {
                    playerBatter.score += 16
                }
                if (item.isWicketDelivery == 1) {
                    playerBatter.isOut = 1;
                    if (playerBatter.Role != 'BOWLER') {
                        playerBatter.score -= 2
                    };
                }
            }
            if (item.isWicketDelivery == 1) {
                // update player bowlling score.
                playerbower.score += 25;
                playerbower.wickets++;
                if (["bowled", "lbw"].includes(item.kind)) {
                    playerbower.bowledORlbw++;
                    playerbower.score += 8;
                }
                if (item.kind == 'caught and bowled') {
                    playerbower.catchs++;
                    playerbower.score += 8;
                }
                if (playerbower.wickets == 3) {
                    playerbower.score += 4;
                }
                if (playerbower.wickets == 4) {
                    playerbower.score += 8;
                }
                if (playerbower.wickets == 5) {
                    playerbower.score += 16;
                }
                if (playerbower.catchs == 3) {
                    playerbower.score += 4;
                }
                // update player fielding score. 
                if (item.fielders_involved != "NA") {
                    if (!scoreForEachPalyer[item.fielders_involved]) {
                        addPlayerInObject(item.fielders_involved)
                    }
                    let playerFielder = scoreForEachPalyer[item.fielders_involved];
                    if (item.kind == 'caught') {
                        playerFielder.catchs++;
                        playerFielder.score += 8;
                    }
                    if (item.kind == 'run out') {
                        playerFielder.runOut++;
                        playerFielder.score += 6;
                    }
                    if (item.kind == 'stumping') {
                        playerFielder.stumping++;
                        playerFielder.score += 12;
                    }
                    if (playerFielder.catchs == 3) {
                        playerFielder.score += 4;
                    }
                }
            }

        })
        let updates = result.map(item => {
            item.players.map(player => {
                let playerstatistics = scoreForEachPalyer[player.Player];
                if (playerstatistics) {
                    player.score += playerstatistics.score;
                    if (player.Player == item.captain) {
                        player.score = player.score * 2;
                    }
                    if (player.Player == item.viceCaptain) {
                        player.score = player.score * 1.5;
                    }
                }
            })
            return {
                filter: {
                    _id: item._id,
                },
                update: {
                    $set: {
                        status: "complated",
                        players: item.players
                    }
                }
            }
        })
        await repository.updateAll(updates);
        res.status(201).json({ message: "match result updated successfully", success: true })
    } catch (error) {
        next(error)
    }
}


exports.teamResult = async (req, res, next) => {
    try {
        let result = await repository.findAll({ status: "complated" });
        result.map(item => {
            item.totalScore = 0;
            item.players.map(player => {
                item.totalScore += player.score; 
            })
        })
        let heightScore = 0;
        result.sort((a, b) => b.totalScore - a.totalScore);
        heightScore = result.length ?  result[0].totalScore : 0; 
        result.map((item) => {
            if(heightScore == item.totalScore) {
                item.result = "Winning";
            } else {
                item.result = "Lose";
            }
        })
        res.status(201).json({result, message: "match result updated successfully", success: true })
    } catch (error) {
        next(error)
    }
}