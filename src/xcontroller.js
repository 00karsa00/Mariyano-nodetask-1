const allPlayers = require("../data/players.json");
const matchResult = require("../data/match.json")
const repository = require("./repository");

exports.sampleCreate =  async (req, res) => {
    await repository.sampleCreate();
    res.send({status: 1, message: "demo"});
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
        let result = await repository.findAll({status: "pending"});
        if(!result.length) {
            return res.status(201).json({ message:"All team result  is already upto dated" , success: false})
        }
        let scoreForEachPalyer = {};
        const addPlayerInObject = (player) => {
            scoreForEachPalyer[player] = {
                run : 0,
                foure : 0,
                six : 0,
                isOut : 0,
                wickets : 0,
                bowledORlbw : 0,
                maintainOver : 0,
                catchs : 0,
                stumping : 0,
                runOut : 0,
                score: 0
            };
        }
        const battingScore = (item) => {
            let player = scoreForEachPalyer[item.batter];
            player.score += item.batsman_run;
            player.run += item.batsman_run;
            if(item.batsman_run == 4) {
                player.foure++;
                player.score += 1
            }
            if(item.batsman_run == 6) {
                player.six++;
                player.score += 2
            }
            if(item.batsman_run == 6) {
                player.six++;
                player.score += 2
            }
            if(player.run == 30) {
                player.score += 4
            }
            if(player.run == 50) {
                player.score += 8
            }
            if(player.run == 100) {
                player.score += 16
            }
            if(item.isWicketDelivery == 1){
                player.isOut = 1;
                if(player.Role != 'BOWLER') player.score -= 2;
            } 
            console.log(`${item.batter}`)
        }
        const bowlingScore = (item) => {
            let player = scoreForEachPalyer[item.bowler];
            player.score += 25;
            player.wickets++;
            if (["bowled", "lbw"].includes(item.kind)) {
                player.bowledORlbw++;
                player.score += 8; 
            }
            if (item.kind == 'caught and bowled') {
                player.catchs++;
                player.score += 8;
            }
            if (player.wickets == 3) {
                player.score += 4;
            }
            if (player.wickets == 4) {
                player.score += 8;
            }
            if (player.wickets == 5) {
                player.score += 16;
            }
            if (player.catchs == 3) {
                player.score += 4;
            }
        }
        const fielderScore = (item) => {
            let player = scoreForEachPalyer[item.fielders_involved];
            console.log("fielderScore => ",item)
            if (item.kind == 'caught') {
                player.catchs++;
                player.score += 8;
            }
            if (item.kind == 'run out') {
                player.runOut++;
                player.score += 6;
            }
            if (item.kind == 'stumping') {
                player.stumping++;
                player.score += 12;
            }
            if (player.catchs == 3) {
                player.score += 4;
            }
        }
        const maintainOverScore = (playerName) => {
            let player = scoreForEachPalyer[playerName];
            player.score +=  12;
            player.maintainOver++;
        }
        let over=-1, run=0, bowller="";
        matchResult.map(async (item) => {
            // Batting details
            console.log("item => ", JSON.stringify(item))
            if (!scoreForEachPalyer[item.batter]) {
                addPlayerInObject(item.batter)
            }
            if (!scoreForEachPalyer[item.bowler]) {
                addPlayerInObject(item.bowler)
            }
            if (item.batsman_run > 0 || item.isWicketDelivery == 1) {
                // await battingScore(item)
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
                // await bowlingScore(item);
                let playerbower = scoreForEachPalyer[item.bowler];
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
                if (item.fielders_involved != "NA") {
                    // await fielderScore(item);  
                    if (!scoreForEachPalyer[item.fielders_involved]) {
                        await addPlayerInObject(item.fielders_involved)
                    }
                    let playerFielder = scoreForEachPalyer[item.fielders_involved];
                    // console.log("playerFielder => ",playerFielder)
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
            // Check last over is maintain over;
            if (over != item.overs) {
                console.log("complted  over => ", over)
                console.log("complted bowller => ", bowller)
                console.log("complted run => ", run)
                if (over >= 0 && run == 0) {
                    // maintainOverScore(bowller)
                    let playerOver = scoreForEachPalyer[bowller];
                    playerOver.score += 12;
                    playerOver.maintainOver++;
                }
                over = item.overs;
                bowller = item.bowler;
                run = 0;
            }
            run += item.total_run;
            console.log(`test ${over} => ${run}`)
        })
        // allPlayers.map((item) => {
        //     let battingSatitics = matchResult.filter(details => item.Player == details.batter);
        //     item.run = 0;
        //     item.foure = 0;
        //     item.six = 0;
        //     item.isOut = 0;
        //     battingSatitics.map(scores => {
        //         item.run += scores.batsman_run;
        //         if(scores.batsman_run == 4) item.foure++;
        //         if(scores.batsman_run == 6) item.six++;
        //         if(scores.isWicketDelivery == 1) item.isOut =1;
        //     })
        //     let bowlerSatitics = matchResult.filter(details => item.Player == details.bowler);
        //     item.wickets = 0;
        //     item.bowledORlbw = 0;
        //     item.maintainOver = 0;
        //     item.catchs = 0;	
        //     let over = -1, run =0;
        //     bowlerSatitics.map(scores => {
        //         if(scores.isWicketDelivery == 1) {
        //             item.wickets++;
        //             if(["bowled","lbw"].includes(scores.kind)) {
        //                 item.bowledORlbw++;
        //             }
        //             if(scores.kind == 'caught and bowled') {
        //                 item.catchs;
        //             }
        //             if(over != scores.overs) {
        //                 if(over >= 0 && run == 0) {
        //                     item.maintainOver++
        //                 }
        //                 over=scores.overs;
        //                 run=0;
        //             }
        //             run+=scores.total_run
        //         }
        //     })
        //     let fieldingSatitics = matchResult.filter(details => item.Player == details.fielders_involved);
        //     item.stumping= 0;
        //     item.runOut= 0;
        //     fieldingSatitics.map(scores => {
        //         if(scores.kind == 'caught')  {
        //             item.catchs++;
        //         }          
        //         if(scores.kind == 'run out')  {
        //             item.runOut++;
        //         }          
        //         if(scores.kind == 'stumping')  {
        //             item.stumping++;
        //         }          
        //     })
        // });
        // allPlayers.map(item => {
        //     item.score = item.run;
        //     // Each Boundary add 1 Bonus
        //     item.score += item.foure *1;
        //     // Each Boundary add 2 Bonus
        //     item.score += item.six *2;
        //     // More then 30 run scored add 4 Bonus
        //     if(item.run >= 30 ) {
        //         item.score += 4;
        //     }
        //     // More then 50 run scored add 4 Bonus
        //     if(item.run >= 50 ) {
        //         item.score += 8;
        //     }
        //     // More then 50 run scored add 4 Bonus
        //     if(item.run >= 100) {
        //         item.score += 16;
        //     }
        //     // batter out -2 for the existing score if bower out not applycable
        //     if(item.isOut == 1 && item.Role != 'BOWLER') {
        //         item.score -= 2
        //     }
        //     // each wicketd by bower added 25 bounce
        //     item.score += item.wickets * 25;
        //     item.score += item.maintainOver * 12;
        //     if(item.bowledORlbw > 0) {
        //         item.score += item.bowledORlbw * 8;
        //     }
        //     if(item.wickets >= 3) {
        //         item.score += 4;
        //     }
        //     if(item.wickets >= 4) {
        //         item.score += 8;
        //     }
        //     if(item.wickets >= 5) {
        //         item.score += 16;
        //     }
        //     item.score += item.catchs * 8;
        //     item.score += item.stumping * 12;
        //     item.score += item.runOut * 6;
        //     if(item.catchs >= 3) {
        //         item.score += 4;
        //     }
        // })
        // let newPalyerlist = allPlayers.filter((item) =>  item.score > 0)
        let updates = result.map(item => {
            player.score = scoreForEachPalyer[item.Player];
            // item.players.map(player => {
            //     let playerStatici = newPalyerlist.find(satisfies => satisfies.Player == player.Player)
            //     if(playerStatici) {
            //         player.score += playerStatici.score;
            //         if(player.Player == item.captain) {
            //             player.score = player.score * 2;
            //         }
            //         if(player.Player == item.viceCaptain) {
            //             player.score = player.score * 1.5;
            //         }
            //     }
            // })
            item.players.map(player => {
                let playerstatistics = scoreForEachPalyer[item.Player];
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
            return  {
                filter: {
                    _id: item._id,
                },
                update: {
                    $set : {
                        status: "complated",
                        players: item.players
                    }
                }
            }
        })
        await repository.updateAll(updates);
        res.status(201).json({ message: "match result updated successfully" , success: true })
    } catch (error) {
        next(error)
    }
}