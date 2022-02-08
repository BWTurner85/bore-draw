export const leagueMap = {
  "unmatched": {
    "bet365": [
      "Australia Friendlies",
      "England National League North",
      "England National League South",
      "England Southern League Division One",
      "England Northern League Division One",
      "England League Cup Women",
      "Northern Ireland Premier",
      "Northern Ireland Reserve League",
      "Wales Premier League"
    ],
    "betfair": [
      "English FA Women's Super League Cup"
    ]
  },
  
  "normalisers": [
    { find: /^Australia /, replace: 'Australian ' },
    { find: /^England /, replace: 'English ' },
    { find: /^Scotland /, replace: 'Scottish ' },
    { find: /^Belgium /, replace: 'Belgium ' },
    { find: /^Chile /, replace: 'Chilean ' },
    { find: /^Colombia /, replace: 'Colombian ' },
    { find: /^Costa Rica /, replace: 'Costa Rican ' },
    { find: /^France /, replace: 'French ' }
  ],

  "mappings": [
    { "bet365": "AFC Asian Cup Women",  "betfair": "AFC Ladies Asian Cup" },
    { "bet365": "Algeria Division 2", "betfair": "Algerian Ligue 2"  },
    { "bet365": "Australia A-League", "betfair": "Australian A-League Men"  },
    { "bet365": "Australia A-League Women", "betfair": "Australian A-League Women"  },
    { "bet365": "Czech Republic First League", "betfair": "Czech 1 Liga" },
    { "bet365": "England EFL Cup", "betfair": "English Football League Cup"  },
    { "bet365": "England Isthmian Cup", "betfair": "English Isthmian League Cup" },
    { "bet365": "England U23 Development League", "betfair": "England U23 Pro Development League" },
    { "bet365": "Germany Bundesliga I", "betfair": "German Bundesliga" },
  ]
}