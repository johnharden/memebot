/*
deps for the project:
slackbots - the slackbots node API that interacts and simplifies a ton of API webhook calls for us
request   - will use request to do an actual post for us in node to create the meme later
apiai     - apiai node integration that will make our effort to hook into API.ai a million times easier
*/

var request = require('request');
var SlackBot = require('slackbots'); //slackbot npm
var apiai = require('apiai'); //api npm

//variables for the code (hidden special keys for api.ai/meme generator/slack bot
var variables = require('./variables'); 

//we'll use global as a "temporary" database for the effort of this app
global.user_status = new Array();

//we need to initiate the ai integration w/ api.ai, this will allow us to do requests with the platform
var ai = apiai(variables.api_ai_key);

var bot_params = {
    token: variables.slack_bot_key, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Meme Bot',
	slack_params: {
		
		//default slack parameters, can find more at https://api.slack.com/docs/message-attachments
		default_params: {
			icon_emoji: ':octopus:',
		},
		
		//need the realname of the bot so we can store some info about the bot.
		slack_realname: 'memebot',
		bot_data: {},
		
	}
};

// create a bot 
var bot = new SlackBot(bot_params);

var channels = {};
var groups = {};

bot.on('start', function() {
	console.log('my bot works!');
	
	/*
	there is a distinct difference in the slack system between channels and groups:
	
	bot.getChannels() - get public channels that are accessible to anyone
	bot.getGroups()   - get locked channels that are invite only in the system
	
	we need to store the ids/names of the channels/groups because when the bot returns messages it returns ids
	
	bot.getUsers()    - this will get all users/bots/integrations in the system

	*/
	
	//task 1: we need to create an associative array of both the groups[] and channels[] storing them as such groups = {id1:name, id2: name}
	resp = bot.getChannels();
	resp = bot.getGroups();
	
	
	//task 2: we need to go through the users and create an array of the users to store their current conversation + identify the bots information
	resp = bot.getUsers();
	
});

bot.on('message', function(data) {
	console.log(data);
});
