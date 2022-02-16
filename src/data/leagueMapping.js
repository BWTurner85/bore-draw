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
    { find: /^Algeria /, replace: 'Algerian ' },
    { find: /^Argentina /, replace: 'Argentinian ' },
    { find: /^Australia /, replace: 'Australian ' },
    { find: /^Bahrain /, replace: 'Bahraini ' },
    { find: /^Belgium /, replace: 'Belgium ' },
    { find: /^Chile /, replace: 'Chilean ' },
    { find: /^Colombia /, replace: 'Colombian ' },
    { find: /^Costa Rica /, replace: 'Costa Rican ' },
    { find: /^England /, replace: 'English ' },
    { find: /^France /, replace: 'French ' },
    { find: /^Germany /, replace: 'German ' },
    { find: /^Italy /, replace: 'Italian ' },
    { find: /^Portugal /, replace: 'Portuguese ' },
    { find: /^Scotland /, replace: 'Scottish ' },
    { find: /^Spain /, replace: 'Spanish ' },
    { find: /^Turkey /, replace: 'Turkish ' },

  ],

  "mappings": [
    { "bet365": "AFC Asian Cup Women",  "betfair": "AFC Ladies Asian Cup" },
    { "bet365": "Algerian Division 2", "betfair": "Algerian Ligue 2"  },
    { "bet365": "Australian A-League", "betfair": "Australian A-League Men"  },
    { "bet365": "Australian A-League Women", "betfair": "Australian A-League Women"  },
    { "bet365": "Czech Republic First League", "betfair": "Czech 1 Liga" },
    { "bet365": "English EFL Cup", "betfair": "English Football League Cup"  },
    { "bet365": "English Isthmian Cup", "betfair": "English Isthmian League Cup" },
    { "bet365": "English U23 Development League", "betfair": "England U23 Pro Development League" },
    { "bet365": "German Bundesliga I", "betfair": "German Bundesliga" },
  ]
}